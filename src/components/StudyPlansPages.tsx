import { useMemo, useState, type ReactNode } from 'react';
import { Link, Navigate, useParams } from 'react-router-dom';
import Navbar from './layout/Navbar';
import { getPageByRoute, getPracticeProblems, type DocPage } from '../lib/contentTree';
import { isSolved } from '../lib/mastery';
import { useGamification } from '../contexts/GamificationContext';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { useDocumentMeta } from '../lib/useDocumentMeta';
import { CATALOG } from '../data/practiceCatalog';
import {
  PROJECT_SHEETS,
  RESEARCH_TRACKS,
  STUDY_PLANS,
  findResearchTrack,
  findStudyPlan,
  type PlanStep,
  type StudyPlan,
} from '../data/studyPlans';
import ResearchArchitectureDiagram from '../viz/ResearchArchitectureDiagram';
import { CategoryWidgetCard } from './widgets/CategoryWidgetCard';

/* ---------------- shared ---------------- */

export const STUDY_TABS = [
  { to: '/study-plans', label: 'Study plans' },
  { to: '/research', label: 'Research papers' },
  { to: '/projects', label: 'Projects' },
];

interface ResolvedStep {
  title: string;
  to?: string;
  kind: PlanStep['kind'];
  difficulty?: string;
  note?: string;
  done: boolean;
}

function useStepResolver() {
  const { events } = useGamification();
  const byId = useMemo(() => new Map(getPracticeProblems().map((p) => [p.problemId, p])), []);
  return (step: PlanStep): ResolvedStep => {
    if (step.kind === 'problem') {
      const page: DocPage | undefined = byId.get(step.id);
      return {
        kind: 'problem',
        title: page?.title ?? step.id,
        to: page?.route,
        difficulty: page?.difficulty,
        note: step.note,
        done: page ? isSolved(page, events) : false,
      };
    }
    if (step.kind === 'read') {
      const page = getPageByRoute(step.route);
      return { kind: 'read', title: page?.title ?? step.route, to: step.route, note: step.note, done: false };
    }
    return { kind: 'todo', title: step.title, note: step.note, done: false };
  };
}

function planCounts(steps: ResolvedStep[]) {
  const problems = steps.filter((s) => s.kind === 'problem');
  return {
    problems: problems.length,
    passed: problems.filter((s) => s.done).length,
    readings: steps.filter((s) => s.kind === 'read').length,
    missing: steps.filter((s) => s.kind === 'todo').length,
  };
}

function countsLine(c: ReturnType<typeof planCounts>) {
  const parts = [`${c.problems} problems`];
  if (c.readings) parts.push(`${c.readings} ${c.readings === 1 ? 'reading' : 'readings'}`);
  parts.push(`${c.passed} passed`);
  if (c.missing) parts.push(`${c.missing} still to write`);
  return parts.join(' · ');
}

function Shell({ children }: { children: ReactNode }) {
  return (
    <div className="nb-theme" style={{ minHeight: '100vh' }}>
      <Navbar />
      <main className="nm-landing-shell" style={{ maxWidth: 860, padding: 'clamp(2rem, 5vw, 3.5rem) 0 4rem' }}>
        {children}
      </main>
    </div>
  );
}

function Tabs({ current }: { current: string }) {
  return (
    <nav aria-label="Study sections" style={{ display: 'flex', gap: '1.25rem', flexWrap: 'wrap', marginBottom: '1.5rem', fontSize: '0.95rem' }}>
      {STUDY_TABS.map((tab) => (
        <Link
          key={tab.to}
          to={tab.to}
          aria-current={tab.to === current ? 'page' : undefined}
          style={{
            color: tab.to === current ? 'var(--nb-ink)' : 'var(--nb-cobalt)',
            fontWeight: tab.to === current ? 700 : 400,
            textDecoration: tab.to === current ? 'underline' : 'none',
            textUnderlineOffset: 4,
          }}
        >
          {tab.label}
        </Link>
      ))}
    </nav>
  );
}

const h1Style = { fontSize: 'clamp(1.8rem, 4vw, 2.6rem)', margin: '0 0 0.75rem' } as const;
const metaStyle = { margin: '0.5rem 0 0', fontSize: '0.88rem', color: 'var(--nb-ink-soft)' } as const;
const listStyle = { margin: '1.5rem 0 0', padding: 0, listStyle: 'none', borderTop: '1px solid var(--nb-rule)' } as const;

function kindLabel(s: ResolvedStep) {
  if (s.kind === 'read') return 'Read';
  if (s.kind === 'todo') return 'Not written yet';
  return s.difficulty ?? 'Problem';
}

function StepRow({ index, step, active, onSelect }: { index: number; step: ResolvedStep; active?: boolean; onSelect?: () => void }) {
  const body = (
    <>
      <span className="nb-hand" style={{ color: 'var(--nb-ink-soft)' }}>{String(index + 1).padStart(2, '0')}</span>
      <span style={{ color: step.kind === 'todo' ? 'var(--nb-ink-soft)' : 'var(--nb-ink)' }}>
        {step.title}
        {step.done && <span style={{ color: 'var(--nb-green)' }}> ✓ passed</span>}
        {step.note && <span style={{ display: 'block', fontSize: '0.84rem', color: 'var(--nb-ink-soft)', marginTop: 2 }}>{step.note}</span>}
      </span>
      <span style={{ fontSize: '0.82rem', color: 'var(--nb-ink-soft)', whiteSpace: 'nowrap' }}>{kindLabel(step)}</span>
    </>
  );
  const grid = { display: 'grid', gridTemplateColumns: '2.2rem 1fr auto', gap: '1rem', padding: '0.8rem 0.5rem', alignItems: 'baseline', textDecoration: 'none' } as const;
  return (
    <li
      style={{ borderBottom: '1px solid var(--nb-rule)', background: active ? 'var(--nb-paper-alt)' : undefined, borderLeft: active ? '3px solid var(--nb-cobalt)' : '3px solid transparent' }}
      onMouseEnter={onSelect}
      onFocus={onSelect}
    >
      {step.to ? (
        <Link to={step.to} style={grid}>{body}</Link>
      ) : (
        <div style={grid}>{body}</div>
      )}
    </li>
  );
}

/* ---------------- /study-plans ---------------- */

export function StudyPlansPage() {
  const resolve = useStepResolver();
  useDocumentTitle('Study plans');
  useDocumentMeta('Study plans', 'Named study plans that combine practice problems and Learn pages: build micrograd, a transformer, RAG and an agent from scratch.');
  const curated = useMemo(() => new Map(getPracticeProblems().map((p) => [p.problemId, p])), []);
  const { events } = useGamification();

  return (
    <Shell>
      <Tabs current="/study-plans" />
      <h1 className="nb-heading" style={h1Style}>Study plans</h1>
      <p className="nb-body" style={{ fontSize: '1.05rem', maxWidth: 640, margin: 0 }}>
        Each plan is an ordered list of readings and problems that builds one thing from scratch. Problems run in the browser and check your code against tests.
      </p>

      <h2 className="nb-heading" style={{ fontSize: '1.3rem', margin: '2.25rem 0 0' }}>Build from scratch</h2>
      <ul className="nm-category-widget-grid">
        {STUDY_PLANS.map((plan) => {
          const c = planCounts(plan.steps.map(resolve));
          return (
            <CategoryWidgetCard
              key={plan.slug}
              title={plan.title}
              to={`/study-plans/${plan.slug}`}
              summary={plan.summary}
              level={plan.level}
              countText={countsLine(c)}
              totalCount={c.problems}
              passedCount={c.passed}
              topic={plan.slug}
            />
          );
        })}
      </ul>

      <h2 className="nb-heading" style={{ fontSize: '1.3rem', margin: '2.5rem 0 0' }}>Practice sheets</h2>
      <p className="nb-body" style={{ margin: '0.5rem 0 0' }}>Sets of standalone problems on one subject, easiest first.</p>
      <ul className="nm-category-widget-grid">
        {CATALOG.map((track) => {
          const pages = track.problems.flatMap((id) => (curated.get(id) ? [curated.get(id)!] : []));
          const passed = pages.filter((pg) => isSolved(pg, events)).length;
          const countLabel = `${pages.length} problems${passed > 0 ? ` · ${passed} passed` : ''}`;
          return (
            <CategoryWidgetCard
              key={track.slug}
              title={track.title}
              to={`/practice/track/${track.slug}`}
              summary={track.summary}
              level={track.level}
              countText={countLabel}
              totalCount={pages.length}
              passedCount={passed}
              topic={track.slug}
            />
          );
        })}
      </ul>
    </Shell>
  );
}

/* ---------------- /study-plans/:slug ---------------- */

export function StudyPlanPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const plan = findStudyPlan(slug);
  const resolve = useStepResolver();
  useDocumentTitle(plan ? `${plan.title}: study plan` : 'Study plan');
  useDocumentMeta(plan?.title ?? 'Study plan', plan?.summary);
  if (!plan) return <Navigate to="/study-plans" replace />;

  const steps = plan.steps.map(resolve);
  const c = planCounts(steps);
  const next = steps.find((s) => s.kind === 'problem' && !s.done && s.to);

  return (
    <Shell>
      <Link to="/study-plans" className="nb-hand" style={{ color: 'var(--nb-cobalt)', textDecoration: 'none' }}>← all study plans</Link>
      <h1 className="nb-heading" style={{ ...h1Style, marginTop: '0.75rem' }}>{plan.title}</h1>
      <p className="nb-body" style={{ fontSize: '1.05rem', maxWidth: 640, margin: 0 }}>{plan.summary}</p>
      <p style={metaStyle}>{plan.level} · {countsLine(c)}</p>
      {next?.to && (
        <p className="nb-body" style={{ margin: '1rem 0 0' }}>
          Next unsolved: <Link to={next.to} style={{ color: 'var(--nb-cobalt)' }}>{next.title}</Link>
        </p>
      )}
      {c.missing > 0 && (
        <p className="nb-body" style={{ margin: '1.25rem 0 0', padding: '0.8rem 1rem', borderLeft: '3px solid var(--nb-amber, var(--nb-cobalt))', background: 'var(--nb-paper-alt)' }}>
          {c.missing} {c.missing === 1 ? 'step is' : 'steps are'} not written yet. They are listed so you can see the whole build; the rest of the plan works without them.
        </p>
      )}
      <ol style={{ ...listStyle, marginTop: '2rem' }}>
        {steps.map((step, i) => <StepRow key={i} index={i} step={step} />)}
      </ol>
      {c.problems > 0 && <PlanCertificate plan={plan} problems={c.problems} passed={c.passed} />}
    </Shell>
  );
}

/** A printable certificate once every problem in the plan passes. It is made in
 * the browser from saved progress, so it says so instead of claiming verification. */
export function PlanCertificate({ plan, problems, passed }: { plan: StudyPlan; problems: number; passed: number }) {
  const { displayName } = useGamification();
  const [name, setName] = useState(displayName === 'Learner' ? '' : displayName);
  if (passed < problems) {
    return (
      <p className="nb-body" style={{ ...metaStyle, marginTop: '2rem' }}>
        Pass all {problems} problems to get a certificate for this plan ({passed} of {problems} passed).
      </p>
    );
  }
  const issued = new Date(Date.now()).toLocaleDateString('en-GB', { day: 'numeric', month: 'long', year: 'numeric' });
  return (
    <section aria-labelledby="certificate-heading" style={{ marginTop: '2.5rem' }}>
      <h2 id="certificate-heading" className="nb-heading" style={{ fontSize: '1.4rem', margin: '0 0 0.75rem' }}>Your certificate</h2>
      <label className="nm-certificate-name">
        Name on the certificate
        <input value={name} onChange={(e) => setName(e.target.value)} placeholder="Your name" maxLength={60} />
      </label>
      <div className="nm-certificate" role="img" aria-label={`Certificate: ${name || 'Learner'} completed ${plan.title}`}>
        <p className="nm-certificate-kicker">Neural Mastery · Study plan certificate</p>
        <p className="nm-certificate-name-line">{name || 'Learner'}</p>
        <p>completed <strong>{plan.title}</strong>, passing all {problems} problems.</p>
        <p className="nm-certificate-meta">Issued {issued} · neuralmasteryai.com/study-plans/{plan.slug}</p>
        <p className="nm-certificate-meta">Generated in this browser from saved progress.</p>
      </div>
      <button type="button" className="nm-button nm-button-primary" style={{ marginTop: '1rem', background: 'var(--nb-cobalt)' }} onClick={() => window.print()}>
        Print or save as PDF
      </button>
    </section>
  );
}

/* ---------------- /research ---------------- */

export function ResearchListPage() {
  const resolve = useStepResolver();
  useDocumentTitle('Research paper tracks');
  useDocumentMeta('Research paper tracks', 'Rebuild landmark AI papers in small steps: Attention Is All You Need, ResNet, GPT-2, LoRA, DPO, ViT and Word2Vec.');
  return (
    <Shell>
      <Tabs current="/research" />
      <h1 className="nb-heading" style={h1Style}>Research paper tracks</h1>
      <p className="nb-body" style={{ fontSize: '1.05rem', maxWidth: 640, margin: 0 }}>
        Each track breaks one paper into small steps, one part of its architecture at a time. A diagram shows which part the current step builds.
      </p>
      <ul className="nm-category-widget-grid" style={{ marginTop: '2rem' }}>
        {RESEARCH_TRACKS.map((track) => {
          const c = planCounts(track.steps.map((s) => resolve(s.step)));
          return (
            <CategoryWidgetCard
              key={track.slug}
              title={track.paper}
              to={`/research/${track.slug}`}
              summary={track.summary}
              level={track.level}
              countText={`${track.steps.length} steps · ${track.authors}, ${track.year}`}
              totalCount={c.problems}
              passedCount={c.passed}
              topic={track.slug}
            />
          );
        })}
      </ul>
      <p className="nb-body" style={{ marginTop: '2rem' }}>
        New to reading papers? Start with <Link to="/docs/research-engineering/how-to-read-ai-papers" style={{ color: 'var(--nb-cobalt)' }}>How to Read AI Papers</Link>.
      </p>
    </Shell>
  );
}

/* ---------------- /research/:slug ---------------- */

export function ResearchTrackPage() {
  const { slug = '' } = useParams<{ slug: string }>();
  const track = findResearchTrack(slug);
  const resolve = useStepResolver();
  const [hovered, setHovered] = useState<number | null>(null);
  useDocumentTitle(track ? `${track.paper}: research track` : 'Research track');
  useDocumentMeta(track?.paper ?? 'Research track', track ? `${track.summary} ${track.steps.length} small steps.` : undefined);
  if (!track) return <Navigate to="/research" replace />;

  const steps = track.steps.map((s) => ({ ...resolve(s.step), title: s.title, block: s.block, target: resolve(s.step) }));
  const firstOpen = steps.findIndex((s) => s.kind === 'problem' && !s.done);
  const current = hovered ?? (firstOpen === -1 ? 0 : firstOpen);
  const doneBlocks = new Set(
    track.blocks.map((_, b) => b).filter((b) => {
      const own = steps.filter((s) => s.block === b && s.kind === 'problem');
      return own.length > 0 && own.every((s) => s.done);
    }),
  );
  const c = planCounts(steps);

  return (
    <Shell>
      <Link to="/research" className="nb-hand" style={{ color: 'var(--nb-cobalt)', textDecoration: 'none' }}>← all papers</Link>
      <h1 className="nb-heading" style={{ ...h1Style, marginTop: '0.75rem' }}>{track.paper}</h1>
      <p style={{ ...metaStyle, marginTop: 0 }}>
        {track.authors}, {track.year} · <a href={track.arxiv} target="_blank" rel="noreferrer" style={{ color: 'var(--nb-cobalt)' }}>Read the paper</a>
      </p>
      <p className="nb-body" style={{ fontSize: '1.05rem', maxWidth: 640, margin: '0.75rem 0 0' }}>{track.summary}</p>
      <p style={metaStyle}>{track.level} · {track.steps.length} steps · {countsLine(c)}</p>

      <div className="nm-research-layout" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '1.5rem', marginTop: '2rem', alignItems: 'start' }}>
        <div style={{ position: 'sticky', top: 80 }}>
          <ResearchArchitectureDiagram
            title={track.paper}
            blocks={track.blocks}
            activeBlock={steps[current].block}
            doneBlocks={doneBlocks}
            onSelectBlock={(b) => {
              const i = steps.findIndex((s) => s.block === b);
              if (i !== -1) setHovered(i);
            }}
          />
          <p style={{ ...metaStyle, textAlign: 'center' }}>
            Step {current + 1}: {steps[current].title}
          </p>
        </div>
        <ol style={{ ...listStyle, margin: 0 }} onMouseLeave={() => setHovered(null)}>
          {steps.map((step, i) => (
            <StepRow
              key={i}
              index={i}
              step={{ ...step, note: step.target.kind === 'problem' ? [step.target.title, step.note].filter(Boolean).join(' · ') : step.note ?? step.target.title }}
              active={i === current}
              onSelect={() => setHovered(i)}
            />
          ))}
        </ol>
      </div>
    </Shell>
  );
}

/* ---------------- /projects ---------------- */

export function ProjectsPage() {
  const resolve = useStepResolver();
  useDocumentTitle('Project sheets');
  useDocumentMeta('Project sheets', 'Portfolio projects by field: a RAG app, an agent with tools, an evaluation harness, a LoRA fine-tune, batched serving and a voice assistant.');

  return (
    <Shell>
      <Tabs current="/projects" />
      <h1 className="nb-heading" style={h1Style}>Project sheets</h1>
      <p className="nb-body" style={{ fontSize: '1.05rem', maxWidth: 640, margin: 0 }}>
        Larger builds you run on your own machine. Each sheet lists the milestones, how to tell you are done, and the problems and pages that prepare you.
      </p>

      <ul className="nm-category-widget-grid" style={{ marginTop: '2rem' }}>
        {PROJECT_SHEETS.map((sheet) => {
          const prepSteps = sheet.prepare.map(resolve);
          const passedCount = prepSteps.filter((s) => s.done).length;
          return (
            <CategoryWidgetCard
              key={sheet.slug}
              title={sheet.title}
              to={`#${sheet.slug}`}
              summary={sheet.summary}
              level={`${sheet.field} · ${sheet.level}`}
              countText={`${sheet.milestones.length} milestones · ${sheet.prepare.length} prep steps`}
              totalCount={sheet.prepare.length}
              passedCount={passedCount}
              topic={sheet.slug}
            />
          );
        })}
      </ul>

      {PROJECT_SHEETS.map((sheet) => {
        const plan = sheet.plan ? findStudyPlan(sheet.plan) : undefined;
        return (
          <section key={sheet.slug} id={sheet.slug} style={{ marginTop: '2.5rem', paddingTop: '1.5rem', borderTop: '1px solid var(--nb-rule)', scrollMarginTop: 80 }}>
            <p style={{ ...metaStyle, margin: 0, textTransform: 'uppercase', letterSpacing: '0.06em', fontSize: '0.75rem' }}>{sheet.field} · {sheet.level}</p>
            <h2 className="nb-heading" style={{ fontSize: '1.35rem', margin: '0.35rem 0 0.5rem' }}>{sheet.title}</h2>
            <p className="nb-body" style={{ margin: 0 }}>{sheet.summary}</p>
            <h3 style={{ fontSize: '0.95rem', margin: '1.25rem 0 0.4rem' }}>Milestones</h3>
            <ol className="nb-body" style={{ margin: 0, paddingLeft: '1.4rem' }}>
              {sheet.milestones.map((m) => <li key={m} style={{ marginBottom: 4 }}>{m}</li>)}
            </ol>
            <h3 style={{ fontSize: '0.95rem', margin: '1rem 0 0.4rem' }}>Done when</h3>
            <ul className="nb-body" style={{ margin: 0, paddingLeft: '1.4rem' }}>
              {sheet.doneWhen.map((m) => <li key={m} style={{ marginBottom: 4 }}>{m}</li>)}
            </ul>
            <h3 style={{ fontSize: '0.95rem', margin: '1rem 0 0.4rem' }}>Prepare with</h3>
            <ul className="nb-body" style={{ margin: 0, paddingLeft: '1.4rem' }}>
              {plan && (
                <li style={{ marginBottom: 4 }}>
                  Study plan: <Link to={`/study-plans/${plan.slug}`} style={{ color: 'var(--nb-cobalt)' }}>{plan.title}</Link>
                </li>
              )}
              {sheet.prepare.map((s, i) => {
                const step = resolve(s);
                return (
                  <li key={i} style={{ marginBottom: 4 }}>
                    {step.kind === 'read' ? 'Read: ' : 'Problem: '}
                    {step.to ? <Link to={step.to} style={{ color: 'var(--nb-cobalt)' }}>{step.title}</Link> : step.title}
                    {step.done && <span style={{ color: 'var(--nb-green)' }}> ✓</span>}
                  </li>
                );
              })}
            </ul>
          </section>
        );
      })}

      <p className="nb-body" style={{ marginTop: '2.5rem' }}>
        More project ideas, ordered by difficulty: <Link to="/docs/projects/the-project-ladder" style={{ color: 'var(--nb-cobalt)' }}>The Project Ladder</Link>.
      </p>
    </Shell>
  );
}
