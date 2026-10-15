import { lazy, Suspense, useState } from 'react';
import { Link } from 'react-router-dom';
import type { PracticeProblem } from '../../lib/practiceProblem';
import type { DocPage } from '../../lib/contentTree';
import VectorOpsPlayground, { getVectorOpSpec } from './VectorOpsPlayground';
import LiveComputation, { getLiveConceptForTopic } from '../home/LiveComputation';
import {
  ClockIcon,
  SparkleIcon,
  ZapIcon,
  BookOpenIcon,
} from '../icons/PracticeIcons';
import type { MasteryTier } from '../../lib/gamification';
import { trackForProblem } from '../../data/practiceCatalog';
import TrackStageMap from './TrackStageMap';
import PlainMarkdown from './PlainMarkdown';

const TwoPointersSlidingWindowExplorer = lazy(() => import('../../viz/TwoPointersSlidingWindowExplorer'));
const GraphTreeTraversalExplorer = lazy(() => import('../../viz/GraphTreeTraversalExplorer'));

/** DSA topics (two pointers/sliding window, trees, graphs) don't fit any of
 * LiveComputation's 6 AI/ML concepts -- mapping them there would mislabel
 * a real algorithm as "Attention" or "Gradient descent". These topics
 * already have real, general-purpose Visual Lab explorers (shipped
 * separately for /docs/visual-lab) that need no problem-specific props, so
 * they're reused here rather than forcing an inaccurate AI-concept match or
 * showing nothing. */
type DsaExplorer = 'two-pointers' | 'graph-tree';
function getDsaExplorerForTopic(topic?: string): DsaExplorer | null {
  const t = (topic || '').toLowerCase();
  if (t.includes('two pointer') || t.includes('sliding window') || t.includes('arrays / hashing')) return 'two-pointers';
  if (t.includes('tree') || t.includes('binary search') || t.includes('graph')) return 'graph-tree';
  return null;
}

/** Real, mechanically-generated, per-problem "how to solve" steps built
 * from problem.hints -- the one piece of "how to solve this" content
 * guaranteed to be problem-specific for all 1,549+ problems, unlike
 * LiveComputation's 6 shared AI-concept scenes (which only fit a narrow
 * slice of problems and must never be shown as a stand-in for problems
 * they don't actually match). */
function StepByStepWalkthrough({ problem }: { problem: PracticeProblem }) {
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--nm-accent-secondary)',
          marginBottom: 10,
        }}
      >
        How to Solve This, Step by Step
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
        <div
          style={{
            padding: '10px 12px',
            borderRadius: 6,
            background: 'var(--nm-surface-alt)',
            border: '1px solid var(--nm-border)',
            borderLeft: '3px solid var(--nm-accent-secondary)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--nm-accent-secondary)', marginBottom: 3 }}>
            Step 1: Frame the Goal &amp; Invariants
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--nm-text-primary)', lineHeight: 1.5 }}>
            {problem.hints?.small ?? 'Identify the exact inputs and return shapes expected by the signature.'}
          </div>
        </div>

        <div
          style={{
            padding: '10px 12px',
            borderRadius: 6,
            background: 'var(--nm-surface-alt)',
            border: '1px solid var(--nm-border)',
            borderLeft: '3px solid var(--nm-accent-teal)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--nm-accent-teal)', marginBottom: 3 }}>
            Step 2: Implementation Walkthrough
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--nm-text-primary)', lineHeight: 1.5 }}>
            {problem.hints?.strong ?? 'Iterate through the required operations and accumulate or transform intermediate values.'}
          </div>
        </div>

        <div
          style={{
            padding: '10px 12px',
            borderRadius: 6,
            background: 'var(--nm-surface-alt)',
            border: '1px solid var(--nm-border)',
            borderLeft: '3px solid var(--nm-accent-purple)',
          }}
        >
          <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--nm-accent-purple)', marginBottom: 3 }}>
            Step 3: Core Concept &amp; Numerical Properties
          </div>
          <div style={{ fontSize: 12.5, color: 'var(--nm-text-primary)', lineHeight: 1.5 }}>
            {problem.hints?.concept ?? `Fundamental computation applied in ${problem.topic}.`}
          </div>
        </div>
      </div>
    </div>
  );
}

/** The specific skills/concepts this problem exercises, each linking to the
 * lesson that teaches it -- e.g. a dict-counting problem links to Python
 * dictionaries and loop constructs, not just a generic "Fundamentals" page.
 * Shared between the Description tab's "Used In" block and the Worked
 * Intuition tab (which previously had no related-links section at all). */
function RelatedSkillsLinks({ problem }: { problem: PracticeProblem }) {
  if (!problem.conceptConnections || problem.conceptConnections.length === 0) return null;
  return (
    <div>
      <div
        style={{
          fontSize: 11,
          fontWeight: 700,
          textTransform: 'uppercase',
          letterSpacing: '0.06em',
          color: 'var(--nm-text-muted)',
          marginBottom: 8,
        }}
      >
        Related Skills
      </div>
      <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
        {problem.conceptConnections.map((conn, i) => (
          <Link
            key={i}
            to={conn.route}
            title={conn.description}
            style={{
              display: 'inline-flex',
              alignItems: 'center',
              gap: 6,
              fontSize: 12,
              fontWeight: 500,
              color: 'var(--nm-text-primary)',
              padding: '4px 10px',
              borderRadius: 6,
              background: 'var(--nm-surface-alt)',
              border: '1px solid var(--nm-border)',
              textDecoration: 'none',
            }}
          >
            <BookOpenIcon size={13} color="var(--nm-accent-secondary)" />
            <span>{conn.title}</span>
          </Link>
        ))}
      </div>
    </div>
  );
}

interface ProblemPanelProps {
  problem: PracticeProblem;
  mdxContent?: React.ReactNode;
  solved?: boolean;
  masteryTier?: MasteryTier | null;
  relatedLesson?: DocPage;
  onHintViewed?: () => void;
  onExpandFocus?: () => void;
  isFocused?: boolean;
}

const DIFFICULTY_ACCENT: Record<string, string> = {
  easy: 'var(--nm-accent-primary)',
  medium: 'var(--nm-accent-warn)',
  hard: 'var(--nm-accent-danger)',
};

export default function ProblemPanel({
  problem,
  mdxContent,
  solved,
  masteryTier: _masteryTier,
  relatedLesson,
  onHintViewed,
  onExpandFocus,
  isFocused,
}: ProblemPanelProps) {
  const [hintLevel, setHintLevel] = useState<number>(0);
  const [showAiDrawer, setShowAiDrawer] = useState<boolean>(false);
  const [activeTab, setActiveTab] = useState<'problem' | 'intuition'>('problem');

  const difficultyColor = DIFFICULTY_ACCENT[problem.difficulty] ?? 'var(--nm-accent-danger)';
  const track = trackForProblem(problem.id);
  const projectTrack = track?.kind === 'project' ? track : undefined;
  const vectorOpSpec = projectTrack ? null : getVectorOpSpec(problem);
  const liveConcept = projectTrack ? null : getLiveConceptForTopic(problem.topic, problem.title);
  const dsaExplorer = !vectorOpSpec && !liveConcept ? getDsaExplorerForTopic(problem.topic) : null;

  const handleSelectHintLevel = (level: number) => {
    setHintLevel(level);
    if (level > 0 && onHintViewed) {
      onHintViewed();
    }
  };

  return (
    <div
      style={{
        display: 'flex',
        flexDirection: 'column',
        height: '100%',
        background: 'var(--nm-surface)',
        color: 'var(--nm-text-primary)',
        overflow: 'hidden',
      }}
    >
      {/* Header bar -- tab buttons (Description/Worked Intuition/Need Help?/
          Focus), not real content; excluded from the search index so it
          doesn't pollute every practice page's search snippet. */}
      <div
        data-pagefind-ignore
        style={{
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
          padding: '8px 12px',
          borderBottom: '1px solid var(--nm-border)',
          background: 'var(--nm-surface-alt)',
          flexWrap: 'wrap',
          gap: 6,
          flexShrink: 0,
        }}
      >
        <div style={{ display: 'flex', gap: 4, flexWrap: 'wrap' }}>
          <button
            type="button"
            onClick={() => setActiveTab('problem')}
            style={{
              background: activeTab === 'problem' ? 'var(--nm-surface)' : 'transparent',
              border: `1px solid ${activeTab === 'problem' ? 'var(--nm-border)' : 'transparent'}`,
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 600,
              color: activeTab === 'problem' ? 'var(--nm-text-primary)' : 'var(--nm-text-muted)',
              cursor: 'pointer',
            }}
          >
            Description
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('intuition')}
            style={{
              background: activeTab === 'intuition' ? 'var(--nm-surface)' : 'transparent',
              border: `1px solid ${activeTab === 'intuition' ? 'var(--nm-border)' : 'transparent'}`,
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 600,
              color: activeTab === 'intuition' ? 'var(--nm-text-primary)' : 'var(--nm-text-muted)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <span>Worked Intuition</span>
            {vectorOpSpec && (
              <span
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  padding: '1px 5px',
                  borderRadius: 4,
                  background: 'color-mix(in srgb, var(--nm-accent-secondary) 15%, transparent)',
                  color: 'var(--nm-accent-secondary)',
                }}
              >
                Interactive
              </span>
            )}
          </button>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <button
            type="button"
            onClick={() => setShowAiDrawer(!showAiDrawer)}
            style={{
              background: 'transparent',
              border: '1px solid var(--nm-border)',
              borderRadius: 6,
              padding: '4px 10px',
              fontSize: 12,
              fontWeight: 600,
              color: showAiDrawer ? 'var(--nm-accent-purple)' : 'var(--nm-text-secondary)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              gap: 5,
            }}
          >
            <SparkleIcon size={14} color="var(--nm-accent-purple)" />
            <span>Need Help?</span>
          </button>

          {onExpandFocus && (
            <button
              type="button"
              onClick={onExpandFocus}
              title={isFocused ? 'Restore Workspace Layout' : 'Focus Reading Mode'}
              style={{
                background: 'transparent',
                border: '1px solid var(--nm-border)',
                borderRadius: 6,
                padding: '4px 8px',
                fontSize: 12,
                color: 'var(--nm-text-muted)',
                cursor: 'pointer',
              }}
            >
              {isFocused ? 'Exit Focus' : 'Focus'}
            </button>
          )}
        </div>
      </div>

      {/* Main Content Area */}
      <div style={{ flex: 1, overflowY: 'auto', overflowX: 'hidden', padding: 'clamp(12px, 3vw, 20px)' }}>
        {activeTab === 'problem' ? (
          <div style={{ maxWidth: '100%', overflowWrap: 'break-word' }}>
            {/* Title & Understated Metadata Badges */}
            <div style={{ marginBottom: 20 }}>
              <h1 style={{ margin: '0 0 12px', fontSize: 21, fontWeight: 700, color: 'var(--nm-text-primary)', overflowWrap: 'break-word' }}>
                {problem.title}
              </h1>

              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8, alignItems: 'center' }}>
                {/* One primary accent: Difficulty */}
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.04em',
                    padding: '3px 8px',
                    borderRadius: 4,
                    background: `color-mix(in srgb, ${difficultyColor} 12%, transparent)`,
                    color: difficultyColor,
                    border: `1px solid color-mix(in srgb, ${difficultyColor} 25%, transparent)`,
                  }}
                >
                  {problem.difficulty}
                </span>
                {/* A real space text node between pills: the flex `gap`
                    above only adds visual spacing, not a text-content
                    space, so a raw-DOM-text consumer (Pagefind's search
                    excerpts, most visibly) read adjacent pills as one
                    run-on word ("mediumAgent Memory..."). */}
                {' '}

                {/* Neutral topic pill */}
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    padding: '3px 8px',
                    borderRadius: 4,
                    background: 'var(--nm-surface-alt)',
                    color: 'var(--nm-text-secondary)',
                    border: '1px solid var(--nm-border)',
                  }}
                >
                  {track?.title ?? problem.topic}
                </span>
                {' '}

                {/* Neutral time pill */}
                <span
                  style={{
                    fontSize: 11,
                    fontWeight: 500,
                    padding: '3px 8px',
                    borderRadius: 4,
                    color: 'var(--nm-text-muted)',
                    display: 'inline-flex',
                    alignItems: 'center',
                    gap: 4,
                  }}
                >
                  <ClockIcon size={12} color="var(--nm-text-muted)" />
                  {problem.estimatedTime}
                </span>

                {/* Solved Status */}
                {solved && (
                  <span
                    style={{
                      fontSize: 11.5,
                      fontWeight: 700,
                      padding: '3px 8px',
                      borderRadius: 4,
                      display: 'inline-flex',
                      alignItems: 'center',
                      gap: 5,
                      background: 'color-mix(in srgb, var(--nm-accent-primary) 12%, transparent)',
                      color: 'var(--nm-accent-primary)',
                      border: '1px solid color-mix(in srgb, var(--nm-accent-primary) 30%, transparent)',
                    }}
                  >
                    ✓ Solved
                  </span>
                )}
              </div>

              {/* Clean Library Policy Banner (No rainbow gradient) */}
              {problem.libraryPolicyText && (
                <div
                  style={{
                    marginTop: 14,
                    padding: '8px 12px',
                    borderRadius: 6,
                    background: 'var(--nm-surface-alt)',
                    border: '1px solid var(--nm-border)',
                    borderLeft: '3px solid var(--nm-accent-secondary)',
                    color: 'var(--nm-text-secondary)',
                    fontSize: 12,
                    fontWeight: 500,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 8,
                  }}
                >
                  <ZapIcon size={14} color="var(--nm-accent-secondary)" />
                  <span>{problem.libraryPolicyText}</span>
                </div>
              )}
            </div>

            {/* Item G: Study this concept first */}
            {relatedLesson && (
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  gap: 12,
                  padding: '10px 14px',
                  borderRadius: 8,
                  background: 'color-mix(in srgb, var(--nm-accent-secondary) 8%, var(--nm-surface))',
                  border: '1px solid color-mix(in srgb, var(--nm-accent-secondary) 25%, var(--nm-border))',
                  marginBottom: 16,
                  flexWrap: 'wrap',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 8, minWidth: 0, flex: '1 1 200px' }}>
                  <BookOpenIcon size={14} color="var(--nm-accent-secondary)" />
                  <span style={{ fontSize: 12.5, color: 'var(--nm-text-secondary)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    New to this topic? <strong style={{ color: 'var(--nm-text-primary)' }}>{relatedLesson.title}</strong>
                  </span>
                </div>
                <Link
                  to={relatedLesson.route}
                  style={{
                    fontSize: 12,
                    fontWeight: 700,
                    color: 'var(--nm-accent-secondary)',
                    textDecoration: 'none',
                    whiteSpace: 'nowrap',
                    flexShrink: 0,
                  }}
                >
                  Study this concept first →
                </Link>
              </div>
            )}

            {/* Item B: Live Interactive Computation Visual at top of problem
                (or, in a project track, where this stage sits in the build) */}
            {projectTrack ? (
              <TrackStageMap track={projectTrack} problemId={problem.id} />
            ) : vectorOpSpec ? (
              <div style={{ marginBottom: 20 }}>
                <VectorOpsPlayground spec={vectorOpSpec} />
              </div>
            ) : liveConcept ? (
              <div style={{ marginBottom: 20 }}>
                <LiveComputation lockConcept={liveConcept} hideTabs />
              </div>
            ) : dsaExplorer === 'two-pointers' ? (
              <div style={{ marginBottom: 20 }}>
                <Suspense fallback={<div style={{ padding: '2rem 0', color: 'var(--nm-text-muted)' }}>Loading visualization…</div>}>
                  <TwoPointersSlidingWindowExplorer />
                </Suspense>
              </div>
            ) : dsaExplorer === 'graph-tree' ? (
              <div style={{ marginBottom: 20 }}>
                <Suspense fallback={<div style={{ padding: '2rem 0', color: 'var(--nm-text-muted)' }}>Loading visualization…</div>}>
                  <GraphTreeTraversalExplorer />
                </Suspense>
              </div>
            ) : null}
            {/* No step-by-step box up front: it printed the hints (often the
                whole algorithm) before the learner had tried anything. They
                stay behind "Need Help?" and in the Worked Intuition tab. */}

            {/* Mission Box: Whitespace and typographic discipline */}
            <div
              style={{
                borderLeft: '3px solid var(--nm-accent-secondary)',
                padding: '8px 14px',
                background: 'color-mix(in srgb, var(--nm-accent-secondary) 6%, var(--nm-surface))',
                marginBottom: 20,
              }}
            >
              <div
                style={{
                  fontSize: 11,
                  fontWeight: 700,
                  textTransform: 'uppercase',
                  letterSpacing: '0.06em',
                  color: 'var(--nm-accent-secondary)',
                  marginBottom: 4,
                }}
              >
                Why it matters
              </div>
              <div style={{ fontSize: 13.5, lineHeight: 1.55, color: 'var(--nm-text-primary)' }}>
                {problem.mission}
              </div>
            </div>

            {/* Related Skills -- the Mission box above already states why
                this problem matters, so this no longer repeats that same
                sentence under a second "Why This Matters" header (the two
                blocks previously showed identical text back-to-back). */}
            <div style={{ marginBottom: 22 }}>
              <RelatedSkillsLinks problem={problem} />
            </div>

            {/* Task Description */}
            <div style={{ marginBottom: 22 }}>
              <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--nm-text-muted)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Task
              </h3>
              <div style={{ fontSize: 13.5, lineHeight: 1.6, margin: 0, color: 'var(--nm-text-primary)' }}>
                <PlainMarkdown text={problem.taskDescription} />
              </div>
            </div>

            {/* Expected Function Signature */}
            <div style={{ marginBottom: 22 }}>
              <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--nm-text-muted)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Function Signature
              </h3>
              <pre
                style={{
                  margin: 0,
                  padding: '10px 14px',
                  borderRadius: 6,
                  background: 'var(--nm-surface-alt)',
                  border: '1px solid var(--nm-border)',
                  fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                  fontSize: 12.5,
                  color: 'var(--nm-text-primary)',
                  overflowX: 'auto',
                  WebkitOverflowScrolling: 'touch',
                  whiteSpace: 'pre-wrap',
                  wordBreak: 'break-word',
                  maxWidth: '100%',
                  boxSizing: 'border-box',
                }}
              >
                {problem.functionSignature}
              </pre>
            </div>

            {/* Examples Preview */}
            <div style={{ marginBottom: 22 }}>
              <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--nm-text-muted)', margin: '0 0 8px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Examples
              </h3>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {problem.testCases
                  .filter((tc) => !tc.hidden)
                  .map((tc, idx) => (
                    <div
                      key={tc.id}
                      style={{
                        padding: '10px 14px',
                        borderRadius: 6,
                        background: 'var(--nm-surface-alt)',
                        border: '1px solid var(--nm-border)',
                        fontSize: 12.5,
                        fontFamily: 'ui-monospace, SFMono-Regular, Menlo, Consolas, monospace',
                        maxWidth: '100%',
                        boxSizing: 'border-box',
                      }}
                    >
                      <div style={{ fontWeight: 600, color: 'var(--nm-text-secondary)', marginBottom: 4, fontFamily: 'inherit' }}>
                        Example {idx + 1}: {tc.label}
                      </div>
                      <div style={{ color: 'var(--nm-text-primary)', overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                        <span style={{ color: 'var(--nm-text-muted)' }}>Input: </span>
                        {JSON.stringify(tc.input)}
                      </div>
                      <div style={{ color: 'var(--nm-accent-primary)', marginTop: 3, overflowWrap: 'anywhere', wordBreak: 'break-word' }}>
                        <span style={{ color: 'var(--nm-text-muted)' }}>Output: </span>
                        {tc.expectError ? `Raises ${tc.expectError}` : JSON.stringify(tc.expectedOutput)}
                      </div>
                      {tc.description && (
                        <div style={{ color: 'var(--nm-text-muted)', fontSize: 12, marginTop: 4, fontFamily: 'sans-serif', overflowWrap: 'break-word' }}>
                          Explanation: {tc.description}
                        </div>
                      )}
                    </div>
                  ))}
              </div>
            </div>

            {/* Constraints */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 12, fontWeight: 700, color: 'var(--nm-text-muted)', margin: '0 0 6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Constraints
              </h3>
              <ul style={{ margin: 0, paddingLeft: 18, fontSize: 13, lineHeight: 1.6, color: 'var(--nm-text-primary)' }}>
                {problem.constraints.map((c, i) => (
                  <li key={i}>{c}</li>
                ))}
              </ul>
            </div>
          </div>
        ) : (
          /* Intuition Tab: structured step-by-step + related-skills content
             is data-driven (problem.hints / problem.conceptConnections) and
             genuinely per-problem, so it always renders here -- previously
             it only showed up when a problem had no matching MDX content
             page, which was nearly every problem (most practice problems
             DO have one), so this tab was silently skipping its own most
             useful content for almost every real visitor. The MDX writeup
             (Overview/Task/reference Solution), when present, still renders
             below it as supplementary depth, not a replacement. */
          <div>
            {vectorOpSpec && (
              <VectorOpsPlayground spec={vectorOpSpec} />
            )}

            {!mdxContent && (
              <div style={{ marginTop: vectorOpSpec ? 16 : 0, marginBottom: 18, lineHeight: 1.6, color: 'var(--nm-text-primary)', fontSize: 13.5 }}>
                <h3 style={{ fontSize: 15, fontWeight: 700, margin: '0 0 6px', color: 'var(--nm-text-primary)' }}>
                  Worked Intuition &amp; Problem Walkthrough
                </h3>
                <p style={{ margin: '0 0 10px', color: 'var(--nm-text-secondary)', fontSize: 13 }}>
                  {problem.mission}
                </p>
                <div style={{ fontSize: 12.5, color: 'var(--nm-text-muted)', lineHeight: 1.5 }}>
                  {problem.taskDescription}
                </div>
              </div>
            )}

            {/* Step-by-Step Walkthrough -- present unless this is a project
                track, whose written intuition page already walks the stage
                (and whose hints stay behind the hint button, not up front) */}
            {!projectTrack && (
              <div style={{ marginTop: mdxContent && vectorOpSpec ? 16 : 0 }}>
                <StepByStepWalkthrough problem={problem} />
              </div>
            )}

            {/* Related Skills: the concept links previously only shown on
                the Description tab -- a learner reading the Worked
                Intuition walkthrough is exactly who needs "which lesson
                teaches this skill" links, not just someone reading the
                bare problem statement. */}
            {problem.conceptConnections && problem.conceptConnections.length > 0 && (
              <div style={{ marginTop: 18 }}>
                <RelatedSkillsLinks problem={problem} />
              </div>
            )}

            {mdxContent ? (
              <div className="prose nm-prose-compact" style={{ marginTop: 22, paddingTop: 18, borderTop: '1px solid var(--nm-border)' }}>
                {mdxContent}
              </div>
            ) : (
              problem.constraints && problem.constraints.length > 0 && (
                <div style={{ marginTop: 18, lineHeight: 1.6, fontSize: 13.5 }}>
                  <div style={{ fontSize: 11, fontWeight: 700, textTransform: 'uppercase', color: 'var(--nm-text-muted)', marginBottom: 6 }}>
                    Constraints to Keep in Mind
                  </div>
                  <ul style={{ margin: 0, paddingLeft: 18, fontSize: 12.5, color: 'var(--nm-text-secondary)', lineHeight: 1.6 }}>
                    {problem.constraints.map((c, i) => (
                      <li key={i}>{c}</li>
                    ))}
                  </ul>
                </div>
              )
            )}
          </div>
        )}
      </div>

      {/* Progressive AI Assistance Drawer */}
      {showAiDrawer && problem.hints && (
        <div
          style={{
            borderTop: '1px solid var(--nm-border)',
            background: 'var(--nm-surface-alt)',
            padding: 16,
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 }}>
            <span style={{ fontWeight: 600, fontSize: 12.5, color: 'var(--nm-text-primary)', display: 'flex', alignItems: 'center', gap: 6 }}>
              <SparkleIcon size={14} color="var(--nm-accent-purple)" />
              <span>Progressive Guidance</span>
            </span>
            <button
              type="button"
              onClick={() => setShowAiDrawer(false)}
              style={{ background: 'transparent', border: 'none', color: 'var(--nm-text-muted)', cursor: 'pointer', fontSize: 13 }}
            >
              ✕
            </button>
          </div>

          <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
            <button
              type="button"
              onClick={() => handleSelectHintLevel(1)}
              style={{
                fontSize: 12,
                padding: '4px 10px',
                borderRadius: 4,
                border: `1px solid ${hintLevel >= 1 ? 'var(--nm-accent-purple)' : 'var(--nm-border)'}`,
                background: hintLevel >= 1 ? 'color-mix(in srgb, var(--nm-accent-purple) 15%, transparent)' : 'var(--nm-surface)',
                color: hintLevel >= 1 ? 'var(--nm-accent-purple)' : 'var(--nm-text-secondary)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Hint 1: Direction
            </button>
            <button
              type="button"
              onClick={() => handleSelectHintLevel(2)}
              style={{
                fontSize: 12,
                padding: '4px 10px',
                borderRadius: 4,
                border: `1px solid ${hintLevel >= 2 ? 'var(--nm-accent-purple)' : 'var(--nm-border)'}`,
                background: hintLevel >= 2 ? 'color-mix(in srgb, var(--nm-accent-purple) 15%, transparent)' : 'var(--nm-surface)',
                color: hintLevel >= 2 ? 'var(--nm-accent-purple)' : 'var(--nm-text-secondary)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Hint 2: Approach
            </button>
            <button
              type="button"
              onClick={() => handleSelectHintLevel(3)}
              style={{
                fontSize: 12,
                padding: '4px 10px',
                borderRadius: 4,
                border: `1px solid ${hintLevel >= 3 ? 'var(--nm-accent-purple)' : 'var(--nm-border)'}`,
                background: hintLevel >= 3 ? 'color-mix(in srgb, var(--nm-accent-purple) 15%, transparent)' : 'var(--nm-surface)',
                color: hintLevel >= 3 ? 'var(--nm-accent-purple)' : 'var(--nm-text-secondary)',
                fontWeight: 600,
                cursor: 'pointer',
              }}
            >
              Key Concept
            </button>
          </div>

          {hintLevel === 0 && (
            <div style={{ fontSize: 12, color: 'var(--nm-text-muted)' }}>
              Select a guidance level above to see hints without spoiling the answer.
            </div>
          )}
          {hintLevel >= 1 && (
            <div style={{ fontSize: 13, color: 'var(--nm-text-primary)', marginBottom: 8, lineHeight: 1.5 }}>
              <strong>Hint 1:</strong> {problem.hints.small}
            </div>
          )}
          {hintLevel >= 2 && (
            <div style={{ fontSize: 13, color: 'var(--nm-text-primary)', marginBottom: 8, lineHeight: 1.5 }}>
              <strong>Hint 2:</strong> {problem.hints.strong}
            </div>
          )}
          {hintLevel >= 3 && (
            <div style={{ fontSize: 13, color: 'var(--nm-text-primary)', lineHeight: 1.5 }}>
              <strong>Concept:</strong> {problem.hints.concept}
            </div>
          )}
        </div>
      )}
    </div>
  );
}
