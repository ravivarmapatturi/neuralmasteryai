import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';

const LAYERS = [
  {
    key: 'static',
    label: 'Types & static analysis',
    cost: 'cheapest -- runs before any test',
    desc: 'A strict type checker and a linter with real rules (not just style) catch a meaningful share of AI-generated mistakes cheaply and deterministically, before a single test even runs.',
  },
  {
    key: 'spec',
    label: 'Executable spec (tests written first)',
    cost: 'the actual gate',
    desc: 'Acceptance criteria written as tests before the agent implements, so "done" has a mechanical definition instead of a subjective one -- RLVR\'s verifier idea, applied to human-agent collaboration instead of RL training.',
  },
  {
    key: 'property',
    label: 'Property-based / invariant tests',
    cost: 'catches a different class of bug',
    desc: 'Checks a general property (idempotency, round-trip encode/decode, no-crash-on-any-input) instead of a fixed set of example inputs -- an agent can satisfy 3 example tests with a solution that is wrong in general; tools like Hypothesis (Python) and fast-check (JS) generate the inputs that find that gap.',
  },
  {
    key: 'critic',
    label: 'Independent second-model critic',
    cost: 'only checks what it can check',
    desc: 'A second, independent agent or model reviews the first one\'s output -- a real, current practice, distinct from the first agent re-reading its own work. The real limit: it only helps for properties the critic can actually evaluate, it is not a substitute for an executable spec.',
  },
  {
    key: 'human',
    label: 'Human judgment (intent)',
    cost: 'still fundamentally required',
    desc: 'Did the code do the right thing, not just a checkable thing -- no layer above eliminates the need for human judgment on intent. Spec-driven verification narrows how much of the diff needs that judgment; it does not remove the need for it.',
  },
];

/** Cheapest/most-mechanical checks run first, human judgment on intent is
 * the one layer none of the others substitute for -- click a layer to see
 * exactly what it catches and where it stops. */
export default function VerificationLayersDiagram() {
  const t = useVizTokens();
  const [active, setActive] = useState('spec');
  const color = t.accentPrimary;
  const humanColor = t.accentWarn;
  const info = LAYERS.find((l) => l.key === active)!;

  return (
    <VisualizationContainer footer={info.desc}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {LAYERS.map((l) => {
          const isActive = active === l.key;
          const isHuman = l.key === 'human';
          const c = isHuman ? humanColor : color;
          return (
            <div
              key={l.key}
              onClick={() => setActive(l.key)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setActive(l.key);
                }
              }}
              style={{
                cursor: 'pointer',
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                gap: 10,
                padding: '0.6rem 0.85rem',
                borderRadius: 8,
                background: isActive ? `${c}18` : t.surfaceAlt,
                border: `1.5px solid ${isActive ? c : t.border}`,
              }}
            >
              <span style={{ fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? c : t.textPrimary }}>{l.label}</span>
              <span style={{ fontSize: 10, fontWeight: 700, color: c, textAlign: 'right' }}>{l.cost}</span>
            </div>
          );
        })}
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        Each layer above narrows how much of a diff needs a human to look at it -- none of them, including the critic, eliminate the bottom layer entirely.
      </div>
    </VisualizationContainer>
  );
}
