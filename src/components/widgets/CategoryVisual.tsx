import { useVizTokens } from '../../theme/vizTokens';

export interface CategoryVisualProps {
  topic?: string;
  className?: string;
}

export function CategoryVisual({ topic = 'generic', className }: CategoryVisualProps) {
  const t = useVizTokens();

  // Normalize topic key
  const key = topic.toLowerCase().trim();

  // 1. Micrograd / Autograd DAG (Scalar Value graph with forward and backward gradients)
  if (key.includes('micrograd') || key.includes('autograd')) {
    return (
      <svg viewBox="0 0 56 40" className={className} aria-hidden="true" focusable="false" style={{ width: '100%', height: '100%' }}>
        {/* Input nodes */}
        <circle cx="9" cy="11" r="4.5" fill={t.surface} stroke={t.accentSecondary} strokeWidth="1.2" />
        <circle cx="9" cy="27" r="4.5" fill={t.surface} stroke={t.accentSecondary} strokeWidth="1.2" />
        {/* Addition node */}
        <circle cx="27" cy="19" r="5" fill={t.surface} stroke={t.accentSecondary} strokeWidth="1.2" />
        <text x="27" y="21.5" fontSize="7" fontWeight="bold" textAnchor="middle" fill={t.accentSecondary}>+</text>
        {/* Loss node */}
        <circle cx="47" cy="19" r="5.5" fill={t.surface} stroke={t.accentPrimary} strokeWidth="1.2" />
        <text x="47" y="21.5" fontSize="7" fontWeight="bold" textAnchor="middle" fill={t.accentPrimary}>L</text>
        {/* Forward connections */}
        <path d="M13.5 12.5L22 17" stroke={t.accentSecondary} strokeWidth="1.2" strokeLinecap="round" />
        <path d="M13.5 25.5L22 21" stroke={t.accentSecondary} strokeWidth="1.2" strokeLinecap="round" />
        <path d="M32 19H41.5" stroke={t.accentSecondary} strokeWidth="1.2" strokeLinecap="round" />
        {/* Backward gradient backprop arrow */}
        <path d="M43 27H27C22 27 18 29 14 32" stroke={t.accentWarn} strokeWidth="1.1" strokeDasharray="2 1.5" strokeLinecap="round" fill="none" />
        <path d="M17 30L14 32L16.5 34" stroke={t.accentWarn} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    );
  }

  // 2. Transformer / Attention (Causal Attention Mask Grid with Softmax)
  if (key.includes('transformer') || key.includes('attention')) {
    return (
      <svg viewBox="0 0 56 40" className={className} aria-hidden="true" focusable="false" style={{ width: '100%', height: '100%' }}>
        {/* Q*K^T label */}
        <text x="5" y="8" fontSize="5.5" fontWeight="bold" fill={t.textMuted}>Q·Kᵀ</text>
        {/* 4x4 Attention Weight Grid with Causal Masking */}
        {/* Row 0 */}
        <rect x="14" y="6" width="6" height="6" rx="1" fill={t.accentSecondary} opacity="0.95" />
        <rect x="22" y="6" width="6" height="6" rx="1" fill={t.border} opacity="0.15" />
        <rect x="30" y="6" width="6" height="6" rx="1" fill={t.border} opacity="0.15" />
        <rect x="38" y="6" width="6" height="6" rx="1" fill={t.border} opacity="0.15" />
        {/* Row 1 */}
        <rect x="14" y="14" width="6" height="6" rx="1" fill={t.accentSecondary} opacity="0.45" />
        <rect x="22" y="14" width="6" height="6" rx="1" fill={t.accentSecondary} opacity="0.85" />
        <rect x="30" y="14" width="6" height="6" rx="1" fill={t.border} opacity="0.15" />
        <rect x="38" y="14" width="6" height="6" rx="1" fill={t.border} opacity="0.15" />
        {/* Row 2 */}
        <rect x="14" y="22" width="6" height="6" rx="1" fill={t.accentSecondary} opacity="0.3" />
        <rect x="22" y="22" width="6" height="6" rx="1" fill={t.accentSecondary} opacity="0.6" />
        <rect x="30" y="22" width="6" height="6" rx="1" fill={t.accentPrimary} opacity="0.95" />
        <rect x="38" y="22" width="6" height="6" rx="1" fill={t.border} opacity="0.15" />
        {/* Row 3 */}
        <rect x="14" y="30" width="6" height="6" rx="1" fill={t.accentSecondary} opacity="0.4" />
        <rect x="22" y="30" width="6" height="6" rx="1" fill={t.accentSecondary} opacity="0.25" />
        <rect x="30" y="30" width="6" height="6" rx="1" fill={t.accentSecondary} opacity="0.75" />
        <rect x="38" y="30" width="6" height="6" rx="1" fill={t.accentPrimary} opacity="0.9" />
        {/* Causal mask partition line */}
        <line x1="21" y1="5" x2="45" y2="31" stroke={t.accentWarn} strokeWidth="1" strokeDasharray="2 1.5" />
        {/* Output token indicator */}
        <circle cx="50" cy="20" r="3" fill={t.surface} stroke={t.accentTeal} strokeWidth="1.2" />
        <path d="M48 20L52 20M50 18L52 20L50 22" stroke={t.accentTeal} strokeWidth="0.8" strokeLinecap="round" strokeLinejoin="round" />
      </svg>
    );
  }

  // 3. RAG / Retrieval (Retrieve-then-Generate flow with document chunks, vector search, context prompt)
  if (key.includes('rag') || key.includes('retriev')) {
    return (
      <svg viewBox="0 0 56 40" className={className} aria-hidden="true" focusable="false" style={{ width: '100%', height: '100%' }}>
        {/* Document chunks */}
        <rect x="4" y="9" width="10" height="4" rx="1" fill={t.surface} stroke={t.accentSecondary} strokeWidth="1" />
        <rect x="4" y="15" width="10" height="4" rx="1" fill={t.surface} stroke={t.accentSecondary} strokeWidth="1" />
        <rect x="4" y="21" width="10" height="4" rx="1" fill={t.surface} stroke={t.accentPrimary} strokeWidth="1.3" />
        <rect x="4" y="27" width="10" height="4" rx="1" fill={t.surface} stroke={t.accentSecondary} strokeWidth="1" />
        {/* Vector search similarity funnel */}
        <path d="M16 13L24 17V23L16 27" stroke={t.accentSecondary} strokeWidth="1" strokeLinejoin="round" fill={t.surfaceAlt} opacity="0.6" />
        <line x1="19" y1="20" x2="27" y2="20" stroke={t.accentPrimary} strokeWidth="1.5" strokeLinecap="round" />
        {/* Prompt Context Box */}
        <rect x="29" y="11" width="10" height="18" rx="2" fill={t.surface} stroke={t.accentPurple} strokeWidth="1.1" />
        <line x1="31.5" y1="15" x2="36.5" y2="15" stroke={t.accentPurple} strokeWidth="1" strokeLinecap="round" />
        <line x1="31.5" y1="19" x2="36.5" y2="19" stroke={t.accentPurple} strokeWidth="1" strokeLinecap="round" />
        <line x1="31.5" y1="23" x2="35.5" y2="23" stroke={t.accentPurple} strokeWidth="1" strokeLinecap="round" />
        {/* Arrow to LLM Generation */}
        <path d="M40 20H43" stroke={t.textSecondary} strokeWidth="1.1" strokeLinecap="round" />
        {/* Generated Grounded Answer */}
        <rect x="44" y="9" width="9" height="22" rx="2" fill={t.accentPrimary} opacity="0.15" />
        <rect x="44" y="9" width="9" height="22" rx="2" stroke={t.accentPrimary} strokeWidth="1.1" />
        <path d="M46 14H51M46 18H51M46 22H51M46 26H49" stroke={t.accentPrimary} strokeWidth="0.9" strokeLinecap="round" />
      </svg>
    );
  }

  // 4. Agents / Loop (Perceive -> Reason -> Act -> Observe Loop)
  if (key.includes('agent')) {
    return (
      <svg viewBox="0 0 56 40" className={className} aria-hidden="true" focusable="false" style={{ width: '100%', height: '100%' }}>
        {/* Center Loop with 3 Nodes */}
        {/* Node 1: Reason / Model (Top) */}
        <circle cx="28" cy="10" r="6" fill={t.surface} stroke={t.accentPurple} strokeWidth="1.2" />
        <path d="M25.5 10H30.5M28 7.5V12.5" stroke={t.accentPurple} strokeWidth="1" strokeLinecap="round" />
        {/* Node 2: Act / Tool (Bottom Right) */}
        <circle cx="43" cy="27" r="6" fill={t.surface} stroke={t.accentSecondary} strokeWidth="1.2" />
        <path d="M41 25L45 29M45 25L41 29" stroke={t.accentSecondary} strokeWidth="1" strokeLinecap="round" />
        {/* Node 3: Environment / Observe (Bottom Left) */}
        <circle cx="13" cy="27" r="6" fill={t.surface} stroke={t.accentTeal} strokeWidth="1.2" />
        <rect x="10.5" y="24.5" width="5" height="5" rx="1" stroke={t.accentTeal} strokeWidth="1" fill="none" />
        {/* Connecting Curved Flow Arrows */}
        <path d="M34 11C39 14 43 18 43 21" stroke={t.accentSecondary} strokeWidth="1.1" strokeLinecap="round" fill="none" />
        <path d="M42 20L44 21L44.5 19" stroke={t.accentSecondary} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M37 28C31 31 25 31 19 28" stroke={t.accentTeal} strokeWidth="1.1" strokeLinecap="round" fill="none" />
        <path d="M22 29.5L19 28L21.5 26.5" stroke={t.accentTeal} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M13 21C13 16 17 12 22 10" stroke={t.accentPurple} strokeWidth="1.1" strokeLinecap="round" fill="none" />
        <path d="M20 9L22 10L20.5 12" stroke={t.accentPurple} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    );
  }

  // 5. Specify, Verify, Debug (Tests Pass / Fail / Fixed)
  if (key.includes('specify') || key.includes('verify') || key.includes('debug')) {
    return (
      <svg viewBox="0 0 56 40" className={className} aria-hidden="true" focusable="false" style={{ width: '100%', height: '100%' }}>
        <rect x="6" y="6" width="44" height="28" rx="3" fill={t.surface} stroke={t.border} strokeWidth="1" />
        <line x1="6" y1="13" x2="50" y2="13" stroke={t.border} strokeWidth="1" />
        <circle cx="11" cy="9.5" r="1.5" fill={t.accentDanger} />
        <circle cx="16" cy="9.5" r="1.5" fill={t.accentWarn} />
        <circle cx="21" cy="9.5" r="1.5" fill={t.accentPrimary} />
        {/* Test 1: Passed */}
        <path d="M11 18.5L13 20.5L17 16.5" stroke={t.accentPrimary} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <line x1="21" y1="18.5" x2="38" y2="18.5" stroke={t.textPrimary} strokeWidth="1.2" strokeLinecap="round" />
        {/* Test 2: Debugged -> Passed */}
        <path d="M11 26.5L15 22.5M15 26.5L11 22.5" stroke={t.accentDanger} strokeWidth="1" strokeLinecap="round" />
        <path d="M18 24.5H23M21.5 23L23 24.5L21.5 26" stroke={t.accentWarn} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M27 25L29 27L33 23" stroke={t.accentPrimary} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <line x1="36" y1="25" x2="45" y2="25" stroke={t.textSecondary} strokeWidth="1.2" strokeLinecap="round" />
      </svg>
    );
  }

  // 6. NumPy & Tensors (Matrix array broadcasting)
  if (key.includes('numpy') || key.includes('tensor')) {
    return (
      <svg viewBox="0 0 56 40" className={className} aria-hidden="true" focusable="false" style={{ width: '100%', height: '100%' }}>
        {/* 3x3 Array grid */}
        {[0, 1, 2].map((r) =>
          [0, 1, 2].map((c) => (
            <rect
              key={`${r}-${c}`}
              x={6 + c * 8}
              y={8 + r * 8}
              width="6.5"
              height="6.5"
              rx="1"
              fill={r === c ? t.accentSecondary : t.surface}
              stroke={r === c ? t.accentSecondary : t.border}
              strokeWidth="0.9"
              opacity={r === c ? 0.9 : 0.65}
            />
          ))
        )}
        <text x="34" y="22" fontSize="8" fontWeight="bold" fill={t.textSecondary} textAnchor="middle">+</text>
        {/* Broadcast Column Vector */}
        {[0, 1, 2].map((r) => (
          <rect
            key={`v-${r}`}
            x={42}
            y={8 + r * 8}
            width="6.5"
            height="6.5"
            rx="1"
            fill={t.accentTeal}
            stroke={t.accentTeal}
            strokeWidth="0.9"
            opacity="0.9"
          />
        ))}
        <text x="45.5" y="37" fontSize="5" fill={t.textMuted} textAnchor="middle">[N, 1]</text>
      </svg>
    );
  }

  // 7. Tokenizer & BPE (Merge tree)
  if (key.includes('token')) {
    return (
      <svg viewBox="0 0 56 40" className={className} aria-hidden="true" focusable="false" style={{ width: '100%', height: '100%' }}>
        <rect x="7" y="27" width="8" height="8" rx="1.5" fill={t.surface} stroke={t.border} strokeWidth="1" />
        <text x="11" y="33" fontSize="6" fill={t.textPrimary} textAnchor="middle">b</text>
        <rect x="18" y="27" width="8" height="8" rx="1.5" fill={t.surface} stroke={t.border} strokeWidth="1" />
        <text x="22" y="33" fontSize="6" fill={t.textPrimary} textAnchor="middle">p</text>
        <rect x="29" y="27" width="8" height="8" rx="1.5" fill={t.surface} stroke={t.border} strokeWidth="1" />
        <text x="33" y="33" fontSize="6" fill={t.textPrimary} textAnchor="middle">e</text>
        <rect x="40" y="27" width="8" height="8" rx="1.5" fill={t.surface} stroke={t.border} strokeWidth="1" />
        <text x="44" y="33" fontSize="6" fill={t.textPrimary} textAnchor="middle">_</text>
        {/* Merges */}
        <path d="M22 27V21M33 27V21H22" stroke={t.accentSecondary} strokeWidth="1" strokeLinejoin="round" fill="none" />
        <rect x="23" y="14" width="13" height="7" rx="1.5" fill={t.surface} stroke={t.accentSecondary} strokeWidth="1" />
        <text x="29.5" y="19.5" fontSize="5.5" fontWeight="bold" fill={t.accentSecondary} textAnchor="middle">pe</text>
        <path d="M11 27V10H29.5V14" stroke={t.accentPrimary} strokeWidth="1" strokeLinejoin="round" fill="none" />
        <rect x="15" y="4" width="18" height="7" rx="1.5" fill={t.surface} stroke={t.accentPrimary} strokeWidth="1.2" />
        <text x="24" y="9.5" fontSize="5.5" fontWeight="bold" fill={t.accentPrimary} textAnchor="middle">bpe</text>
      </svg>
    );
  }

  // 8. Optimizers (Contour Ellipses with Momentum Trajectory)
  if (key.includes('optim')) {
    return (
      <svg viewBox="0 0 56 40" className={className} aria-hidden="true" focusable="false" style={{ width: '100%', height: '100%' }}>
        <ellipse cx="32" cy="20" rx="20" ry="14" stroke={t.border} strokeWidth="0.9" opacity="0.45" fill="none" />
        <ellipse cx="32" cy="20" rx="13" ry="9" stroke={t.border} strokeWidth="0.9" opacity="0.75" fill="none" />
        <ellipse cx="32" cy="20" rx="6" ry="4" stroke={t.border} strokeWidth="1" fill="none" />
        <circle cx="32" cy="20" r="1.5" fill={t.accentPrimary} />
        {/* Oscillating SGD */}
        <path d="M13 10L16 26L21 14L25 24L28 18" stroke={t.accentWarn} strokeWidth="1" strokeLinecap="round" strokeDasharray="1.5 1.5" fill="none" />
        {/* Momentum curve */}
        <path d="M13 10C17 12 24 16 31 19.5" stroke={t.accentSecondary} strokeWidth="1.6" strokeLinecap="round" fill="none" />
        <path d="M28 19L31 19.5L29.5 17.5" stroke={t.accentSecondary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
      </svg>
    );
  }

  // 9. Loss Functions (Loss Curve with Asymptotic Minimum)
  if (key.includes('loss')) {
    return (
      <svg viewBox="0 0 56 40" className={className} aria-hidden="true" focusable="false" style={{ width: '100%', height: '100%' }}>
        <path d="M8 8V32H48" stroke={t.border} strokeWidth="1.2" strokeLinecap="round" fill="none" />
        <line x1="8" y1="28" x2="48" y2="28" stroke={t.border} strokeWidth="0.8" strokeDasharray="2 2" />
        <path d="M10 10C13 18 19 25 32 27C38 27.5 44 28 47 28" stroke={t.accentSecondary} strokeWidth="1.4" strokeLinecap="round" fill="none" />
        <path d="M10 16C14 24 20 27.5 28 28C36 28 44 28 47 28" stroke={t.accentTeal} strokeWidth="1.2" strokeDasharray="2.5 1.5" strokeLinecap="round" fill="none" />
        <circle cx="32" cy="27" r="2" fill={t.accentPrimary} />
      </svg>
    );
  }

  // 10. Evaluation Metrics (ROC / AUC Curve)
  if (key.includes('eval') || key.includes('metric')) {
    return (
      <svg viewBox="0 0 56 40" className={className} aria-hidden="true" focusable="false" style={{ width: '100%', height: '100%' }}>
        <path d="M10 8V32H48" stroke={t.border} strokeWidth="1.2" strokeLinecap="round" fill="none" />
        <line x1="10" y1="32" x2="46" y2="10" stroke={t.textMuted} strokeWidth="0.8" strokeDasharray="2 2" />
        <path d="M10 32V14C12 11 20 10 46 10V32H10Z" fill={t.accentPrimary} opacity="0.12" />
        <path d="M10 32C11 18 17 11 30 10.5C36 10.2 42 10 46 10" stroke={t.accentPrimary} strokeWidth="1.6" strokeLinecap="round" fill="none" />
        <circle cx="21" cy="13" r="2.2" fill={t.accentWarn} stroke={t.surface} strokeWidth="0.8" />
        <text x="32" y="24" fontSize="5.5" fontWeight="bold" fill={t.accentPrimary}>AUC</text>
      </svg>
    );
  }

  // 11. Python for AI (Clean Syntax & AST Block)
  if (key.includes('python')) {
    return (
      <svg viewBox="0 0 56 40" className={className} aria-hidden="true" focusable="false" style={{ width: '100%', height: '100%' }}>
        <rect x="6" y="6" width="44" height="28" rx="3" fill={t.surface} stroke={t.border} strokeWidth="1" />
        <text x="10" y="14" fontSize="6" fontFamily="monospace" fontWeight="bold" fill={t.accentSecondary}>def</text>
        <text x="24" y="14" fontSize="6" fontFamily="monospace" fill={t.textPrimary}>step(x):</text>
        <line x1="16" y1="19" x2="40" y2="19" stroke={t.accentTeal} strokeWidth="1.5" strokeLinecap="round" />
        <line x1="16" y1="24" x2="34" y2="24" stroke={t.textSecondary} strokeWidth="1.5" strokeLinecap="round" />
        <text x="16" y="31" fontSize="6" fontFamily="monospace" fontWeight="bold" fill={t.accentPrimary}>return</text>
        <line x1="38" y1="29.5" x2="44" y2="29.5" stroke={t.accentPrimary} strokeWidth="1.5" strokeLinecap="round" />
      </svg>
    );
  }

  // 12. Mathematics for AI (Orthogonal Projection & Geometry)
  if (key.includes('math')) {
    return (
      <svg viewBox="0 0 56 40" className={className} aria-hidden="true" focusable="false" style={{ width: '100%', height: '100%' }}>
        <line x1="8" y1="32" x2="48" y2="32" stroke={t.border} strokeWidth="1.1" />
        <line x1="8" y1="32" x2="8" y2="8" stroke={t.border} strokeWidth="1.1" />
        <line x1="8" y1="32" x2="44" y2="16" stroke={t.textMuted} strokeWidth="1" strokeDasharray="2 1.5" />
        <line x1="8" y1="32" x2="30" y2="10" stroke={t.accentSecondary} strokeWidth="1.6" strokeLinecap="round" />
        <path d="M28 11.5L30 10L30.5 12.5" stroke={t.accentSecondary} strokeWidth="1.6" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <text x="32" y="9" fontSize="6" fontWeight="bold" fill={t.accentSecondary}>v</text>
        <line x1="30" y1="10" x2="35" y2="20" stroke={t.accentWarn} strokeWidth="1" strokeDasharray="1.5 1.5" />
        <line x1="8" y1="32" x2="35" y2="20" stroke={t.accentPrimary} strokeWidth="1.6" strokeLinecap="round" />
        <text x="26" y="27" fontSize="5.5" fontWeight="bold" fill={t.accentPrimary}>proj(v)</text>
      </svg>
    );
  }

  // 13. Classical Machine Learning (Classification Margin & Decision Boundary)
  if (key.includes('classical')) {
    return (
      <svg viewBox="0 0 56 40" className={className} aria-hidden="true" focusable="false" style={{ width: '100%', height: '100%' }}>
        <rect x="6" y="6" width="44" height="28" rx="2" stroke={t.border} strokeWidth="1" fill={t.surface} />
        {/* Class 1 (Circles) */}
        <circle cx="14" cy="12" r="2" fill={t.accentSecondary} />
        <circle cx="20" cy="10" r="2" fill={t.accentSecondary} />
        <circle cx="16" cy="18" r="2" fill={t.accentSecondary} />
        <circle cx="23" cy="15" r="2" fill={t.accentSecondary} />
        {/* Class 2 (Squares) */}
        <rect x="33" y="21" width="3.5" height="3.5" rx="0.5" fill={t.accentTeal} />
        <rect x="40" y="23" width="3.5" height="3.5" rx="0.5" fill={t.accentTeal} />
        <rect x="35" y="27" width="3.5" height="3.5" rx="0.5" fill={t.accentTeal} />
        <rect x="42" y="17" width="3.5" height="3.5" rx="0.5" fill={t.accentTeal} />
        {/* Linear Decision Hyperplane */}
        <line x1="12" y1="28" x2="44" y2="8" stroke={t.accentPrimary} strokeWidth="1.4" />
        {/* Margins */}
        <line x1="16" y1="31" x2="48" y2="11" stroke={t.accentPrimary} strokeWidth="0.8" strokeDasharray="2 1.5" opacity="0.5" />
        <line x1="8" y1="25" x2="40" y2="5" stroke={t.accentPrimary} strokeWidth="0.8" strokeDasharray="2 1.5" opacity="0.5" />
      </svg>
    );
  }

  // 14. Neural Networks (Perceptron Layer Synapses)
  if (key.includes('neural') || key.includes('deep-learning')) {
    return (
      <svg viewBox="0 0 56 40" className={className} aria-hidden="true" focusable="false" style={{ width: '100%', height: '100%' }}>
        {[10, 20, 30].map((y1) =>
          [7, 15, 24, 33].map((y2) => (
            <line key={`${y1}-${y2}`} x1="12" y1={y1} x2="28" y2={y2} stroke={t.border} strokeWidth="0.8" opacity="0.6" />
          ))
        )}
        {[7, 15, 24, 33].map((y1) =>
          [14, 26].map((y2) => (
            <line key={`h-${y1}-${y2}`} x1="28" y1={y1} x2="44" y2={y2} stroke={t.border} strokeWidth="0.8" opacity="0.6" />
          ))
        )}
        {[10, 20, 30].map((y) => (
          <circle key={`in-${y}`} cx="12" cy={y} r="3" fill={t.surface} stroke={t.accentSecondary} strokeWidth="1.2" />
        ))}
        {[7, 15, 24, 33].map((y) => (
          <circle key={`hid-${y}`} cx="28" cy={y} r="3" fill={t.surface} stroke={t.accentPurple} strokeWidth="1.2" />
        ))}
        {[14, 26].map((y) => (
          <circle key={`out-${y}`} cx="44" cy={y} r="3" fill={t.surface} stroke={t.accentPrimary} strokeWidth="1.2" />
        ))}
      </svg>
    );
  }

  // 15. LLM Internals & Inference (KV Cache & Autoregressive Next-Token Step)
  if (key.includes('llm') || key.includes('inference')) {
    return (
      <svg viewBox="0 0 56 40" className={className} aria-hidden="true" focusable="false" style={{ width: '100%', height: '100%' }}>
        <text x="6" y="9" fontSize="5" fontWeight="bold" fill={t.textMuted}>KV CACHE</text>
        <rect x="6" y="12" width="7" height="14" rx="1.5" fill={t.accentSecondary} opacity="0.75" />
        <rect x="15" y="12" width="7" height="14" rx="1.5" fill={t.accentSecondary} opacity="0.75" />
        <rect x="24" y="12" width="7" height="14" rx="1.5" fill={t.accentSecondary} opacity="0.75" />
        <path d="M33 19H38M36.5 17L38.5 19L36.5 21" stroke={t.accentPrimary} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <rect x="40" y="12" width="9" height="14" rx="1.5" fill={t.surface} stroke={t.accentPrimary} strokeWidth="1.3" />
        <text x="44.5" y="21" fontSize="6" fontWeight="bold" fill={t.accentPrimary} textAnchor="middle">t₊₁</text>
        <line x1="6" y1="31" x2="49" y2="31" stroke={t.border} strokeWidth="1" />
        <circle cx="20" cy="31" r="1.5" fill={t.textMuted} />
        <circle cx="44.5" cy="31" r="2" fill={t.accentPrimary} />
        <text x="28" y="37" fontSize="5" fill={t.textMuted} textAnchor="middle">O(1) decode</text>
      </svg>
    );
  }

  // 16. ML Systems & MLOps (Deployment Canary & Pipeline Traffic Routing)
  if (key.includes('mlops') || key.includes('system')) {
    return (
      <svg viewBox="0 0 56 40" className={className} aria-hidden="true" focusable="false" style={{ width: '100%', height: '100%' }}>
        <rect x="5" y="14" width="12" height="12" rx="2" fill={t.surface} stroke={t.accentSecondary} strokeWidth="1.1" />
        <text x="11" y="22" fontSize="5" fill={t.accentSecondary} textAnchor="middle">Model</text>
        <path d="M17 20H26" stroke={t.textSecondary} strokeWidth="1.1" />
        <polygon points="26,17 31,20 26,23" fill={t.accentWarn} />
        <path d="M31 18L37 12H48" stroke={t.accentPrimary} strokeWidth="1.4" strokeLinecap="round" fill="none" />
        <text x="49" y="10" fontSize="4.5" fill={t.accentPrimary}>90%</text>
        <path d="M31 22L37 28H48" stroke={t.accentWarn} strokeWidth="1" strokeLinecap="round" fill="none" />
        <text x="49" y="32" fontSize="4.5" fill={t.accentWarn}>10%</text>
      </svg>
    );
  }

  // 17. Coding Interview (Linked List & Two Pointer Traversal)
  if (key.includes('interview') || key.includes('coding') || key.includes('dsa') || key.includes('algo')) {
    return (
      <svg viewBox="0 0 56 40" className={className} aria-hidden="true" focusable="false" style={{ width: '100%', height: '100%' }}>
        {[8, 20, 32, 44].map((x) => (
          <circle key={x} cx={x} cy="18" r="4.5" fill={t.surface} stroke={t.accentSecondary} strokeWidth="1.1" />
        ))}
        <path d="M12.5 18H15.5M24.5 18H27.5M36.5 18H39.5" stroke={t.border} strokeWidth="1.2" strokeLinecap="round" />
        <path d="M20 30V24M18.5 25.5L20 24L21.5 25.5" stroke={t.accentTeal} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <text x="20" y="36" fontSize="5" fontWeight="bold" fill={t.accentTeal} textAnchor="middle">slow (1x)</text>
        <path d="M44 30V24M42.5 25.5L44 24L45.5 25.5" stroke={t.accentPrimary} strokeWidth="1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <text x="44" y="36" fontSize="5" fontWeight="bold" fill={t.accentPrimary} textAnchor="middle">fast (2x)</text>
      </svg>
    );
  }

  // 18. ResNet / Residual Skip Connection: F(x) + x
  if (key.includes('resnet') || key.includes('residual')) {
    return (
      <svg viewBox="0 0 56 40" className={className} aria-hidden="true" focusable="false" style={{ width: '100%', height: '100%' }}>
        {/* Input x */}
        <circle cx="9" cy="20" r="3.5" fill={t.surface} stroke={t.accentSecondary} strokeWidth="1.2" />
        <text x="9" y="22" fontSize="5.5" fontWeight="bold" fill={t.accentSecondary} textAnchor="middle">x</text>
        {/* Main path: Weight layer 1 and 2 */}
        <path d="M12.5 20H17" stroke={t.accentSecondary} strokeWidth="1.2" />
        <rect x="17" y="14" width="10" height="12" rx="1.5" fill={t.surface} stroke={t.accentSecondary} strokeWidth="1.1" />
        <text x="22" y="22" fontSize="5" fontWeight="bold" fill={t.textPrimary} textAnchor="middle">W₁</text>
        <path d="M27 20H30" stroke={t.accentSecondary} strokeWidth="1.2" />
        <rect x="30" y="14" width="10" height="12" rx="1.5" fill={t.surface} stroke={t.accentSecondary} strokeWidth="1.1" />
        <text x="35" y="22" fontSize="5" fontWeight="bold" fill={t.textPrimary} textAnchor="middle">W₂</text>
        <path d="M40 20H44" stroke={t.accentSecondary} strokeWidth="1.2" />
        {/* Addition node: F(x) + x */}
        <circle cx="47" cy="20" r="4" fill={t.surface} stroke={t.accentPrimary} strokeWidth="1.2" />
        <text x="47" y="22.5" fontSize="7" fontWeight="bold" fill={t.accentPrimary} textAnchor="middle">+</text>
        {/* Identity skip arc over the layers */}
        <path d="M9 16.5V8C9 6 12 5 16 5H40C44 5 47 6 47 16" stroke={t.accentTeal} strokeWidth="1.4" strokeLinecap="round" fill="none" />
        <path d="M45.5 13.5L47 16L48.5 13.5" stroke={t.accentTeal} strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <text x="28" y="35" fontSize="5" fontWeight="bold" fill={t.accentPrimary} textAnchor="middle">F(x) + x</text>
      </svg>
    );
  }

  // 19. LoRA / Low-Rank Adaptation: W₀ + B · A
  if (key.includes('lora') || key.includes('peft') || key.includes('adapter')) {
    return (
      <svg viewBox="0 0 56 40" className={className} aria-hidden="true" focusable="false" style={{ width: '100%', height: '100%' }}>
        {/* Frozen Base Matrix W0 (d x k) */}
        <rect x="6" y="8" width="16" height="24" rx="2" fill={t.surface} stroke={t.textMuted} strokeWidth="1.2" strokeDasharray="2 1.5" />
        <text x="14" y="19" fontSize="6" fontWeight="bold" fill={t.textMuted} textAnchor="middle">W₀</text>
        <text x="14" y="26" fontSize="4.5" fill={t.textMuted} textAnchor="middle">frozen</text>
        {/* Plus sign */}
        <text x="27" y="22" fontSize="8" fontWeight="bold" fill={t.accentSecondary} textAnchor="middle">+</text>
        {/* Low-rank Matrix B (d x r) */}
        <rect x="33" y="8" width="6" height="24" rx="1.5" fill={t.accentPrimary} opacity="0.8" />
        <text x="36" y="22" fontSize="5.5" fontWeight="bold" fill={t.surface} textAnchor="middle">B</text>
        {/* Low-rank Matrix A (r x k) */}
        <rect x="42" y="17" width="10" height="6" rx="1.5" fill={t.accentTeal} opacity="0.85" />
        <text x="47" y="22" fontSize="5.5" fontWeight="bold" fill={t.surface} textAnchor="middle">A</text>
        <text x="41" y="36" fontSize="5" fontWeight="bold" fill={t.accentPrimary} textAnchor="middle">rank r</text>
      </svg>
    );
  }

  // 20. DPO / Direct Preference Optimization: Policy Ratio & Implicit Reward
  if (key.includes('dpo') || key.includes('preference') || key.includes('rlhf')) {
    return (
      <svg viewBox="0 0 56 40" className={className} aria-hidden="true" focusable="false" style={{ width: '100%', height: '100%' }}>
        {/* Prompt */}
        <rect x="4" y="15" width="10" height="10" rx="2" fill={t.surface} stroke={t.accentSecondary} strokeWidth="1.1" />
        <text x="9" y="22" fontSize="5" fontWeight="bold" fill={t.accentSecondary} textAnchor="middle">x</text>
        <path d="M14 18L21 11" stroke={t.accentPrimary} strokeWidth="1.2" strokeLinecap="round" />
        <path d="M14 22L21 29" stroke={t.accentDanger} strokeWidth="1.2" strokeLinecap="round" />
        {/* Chosen yw (winner) */}
        <rect x="22" y="6" width="18" height="10" rx="2" fill={t.surface} stroke={t.accentPrimary} strokeWidth="1.3" />
        <text x="27" y="13" fontSize="5" fontWeight="bold" fill={t.accentPrimary}>y<tspan fontSize="4" dy="1">w</tspan></text>
        <path d="M34 11L36 13L39 9" stroke={t.accentPrimary} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {/* Rejected yl (loser) */}
        <rect x="22" y="24" width="18" height="10" rx="2" fill={t.surface} stroke={t.accentDanger} strokeWidth="1.1" />
        <text x="27" y="31" fontSize="5" fontWeight="bold" fill={t.accentDanger}>y<tspan fontSize="4" dy="1">l</tspan></text>
        <path d="M34 27L38 31M38 27L34 31" stroke={t.accentDanger} strokeWidth="1" strokeLinecap="round" />
        {/* Margin bracket / gradient flow */}
        <path d="M43 11H47C49 11 50 14 50 20C50 26 49 29 47 29H43" stroke={t.accentPurple} strokeWidth="1.2" fill="none" />
        <text x="51" y="22" fontSize="6" fontWeight="bold" fill={t.accentPurple} textAnchor="middle">β</text>
      </svg>
    );
  }

  // 21. Vision Transformer (ViT) / Multimodal: 16x16 Patches to Linear Projection
  if (key.includes('vit') || key.includes('vision') || key.includes('multimodal')) {
    return (
      <svg viewBox="0 0 56 40" className={className} aria-hidden="true" focusable="false" style={{ width: '100%', height: '100%' }}>
        {/* 3x3 Image Patch Grid */}
        {[0, 1, 2].map((r) =>
          [0, 1, 2].map((c) => (
            <rect
              key={`p-${r}-${c}`}
              x={5 + c * 7}
              y={7 + r * 7}
              width="6"
              height="6"
              rx="0.5"
              fill={t.surface}
              stroke={t.accentSecondary}
              strokeWidth="0.8"
            />
          ))
        )}
        {/* Projection arrow */}
        <path d="M28 17H34M32 15L34 17L32 19" stroke={t.accentPurple} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {/* Linear projection token sequence */}
        {[0, 1, 2, 3].map((i) => (
          <g key={`tok-${i}`}>
            <rect x={36 + i * 4.5} y={11} width="3.5" height="12" rx="1" fill={i === 0 ? t.accentPrimary : t.accentTeal} opacity={i === 0 ? 0.95 : 0.7} />
          </g>
        ))}
        <text x="36" y="30" fontSize="5" fontWeight="bold" fill={t.accentPrimary}>[CLS] + pos</text>
      </svg>
    );
  }

  // 22. Word2Vec: Skip-Gram / CBOW Target & Context Projection
  if (key.includes('word2vec') || key.includes('embedding')) {
    return (
      <svg viewBox="0 0 56 40" className={className} aria-hidden="true" focusable="false" style={{ width: '100%', height: '100%' }}>
        {/* Target word */}
        <rect x="5" y="15" width="13" height="10" rx="2" fill={t.surface} stroke={t.accentPrimary} strokeWidth="1.3" />
        <text x="11.5" y="22" fontSize="5.5" fontWeight="bold" fill={t.accentPrimary} textAnchor="middle">w(t)</text>
        {/* Embedding Hidden Layer */}
        <path d="M18 20H25" stroke={t.textSecondary} strokeWidth="1.1" />
        <circle cx="28" cy="20" r="4.5" fill={t.accentPurple} opacity="0.85" />
        <text x="28" y="22" fontSize="5" fontWeight="bold" fill={t.surface} textAnchor="middle">W</text>
        {/* Context Words Projections */}
        <path d="M31.5 17L38 10" stroke={t.accentSecondary} strokeWidth="1.1" />
        <path d="M32.5 20H38" stroke={t.accentSecondary} strokeWidth="1.1" />
        <path d="M31.5 23L38 30" stroke={t.accentSecondary} strokeWidth="1.1" />
        <rect x="38" y="6" width="14" height="8" rx="1.5" fill={t.surface} stroke={t.accentSecondary} strokeWidth="1" />
        <text x="45" y="12" fontSize="4.5" fill={t.textPrimary} textAnchor="middle">w(t-1)</text>
        <rect x="38" y="16" width="14" height="8" rx="1.5" fill={t.surface} stroke={t.accentSecondary} strokeWidth="1" />
        <text x="45" y="22" fontSize="4.5" fill={t.textPrimary} textAnchor="middle">w(t+1)</text>
        <rect x="38" y="26" width="14" height="8" rx="1.5" fill={t.surface} stroke={t.accentSecondary} strokeWidth="1" />
        <text x="45" y="32" fontSize="4.5" fill={t.textPrimary} textAnchor="middle">w(t+2)</text>
      </svg>
    );
  }

  // 23. Voice Assistant / Speech Audio: Waveform to Speech Tokens to Voice
  if (key.includes('voice') || key.includes('speech') || key.includes('audio')) {
    return (
      <svg viewBox="0 0 56 40" className={className} aria-hidden="true" focusable="false" style={{ width: '100%', height: '100%' }}>
        {/* Audio Waveform Bars */}
        {[4, 8, 12, 16, 20].map((x, idx) => {
          const heights = [10, 18, 26, 16, 8];
          const h = heights[idx];
          return (
            <rect
              key={`bar-${x}`}
              x={x}
              y={20 - h / 2}
              width="2.5"
              height={h}
              rx="1.2"
              fill={t.accentSecondary}
            />
          );
        })}
        {/* VAD / STT Model block */}
        <path d="M23 20H28" stroke={t.textSecondary} strokeWidth="1.1" />
        <rect x="28" y="11" width="11" height="18" rx="2" fill={t.surface} stroke={t.accentPrimary} strokeWidth="1.2" />
        <text x="33.5" y="18" fontSize="4.5" fontWeight="bold" fill={t.accentPrimary} textAnchor="middle">STT</text>
        <text x="33.5" y="25" fontSize="4" fill={t.textMuted} textAnchor="middle">VAD</text>
        {/* Synthesized Output Wave */}
        <path d="M39 20H43" stroke={t.textSecondary} strokeWidth="1.1" />
        <path d="M44 14C47 16 47 24 44 26M47 10C51 14 51 26 47 30" stroke={t.accentTeal} strokeWidth="1.4" strokeLinecap="round" fill="none" />
      </svg>
    );
  }

  // 24. Distributed Systems & Software System Design: Load Balancer + Multi-Region Replicas + Cache
  if (key.includes('software-system-design') || key.includes('distributed') || key.includes('system-design') || key.includes('scale')) {
    return (
      <svg viewBox="0 0 56 40" className={className} aria-hidden="true" focusable="false" style={{ width: '100%', height: '100%' }}>
        {/* Client */}
        <circle cx="8" cy="20" r="3.5" fill={t.surface} stroke={t.textSecondary} strokeWidth="1.1" />
        <path d="M12 20H17" stroke={t.textSecondary} strokeWidth="1.1" />
        {/* Load Balancer */}
        <rect x="17" y="11" width="8" height="18" rx="2" fill={t.surface} stroke={t.accentPurple} strokeWidth="1.2" />
        <text x="21" y="21" fontSize="4.5" fontWeight="bold" fill={t.accentPurple} textAnchor="middle">LB</text>
        {/* Service Replicas (Primary & Secondary) */}
        <path d="M25 15L32 10" stroke={t.accentSecondary} strokeWidth="1" />
        <path d="M25 25L32 30" stroke={t.accentSecondary} strokeWidth="1" />
        <rect x="32" y="6" width="10" height="8" rx="1.5" fill={t.surface} stroke={t.accentSecondary} strokeWidth="1" />
        <text x="37" y="12" fontSize="4.5" fill={t.textPrimary} textAnchor="middle">Svr 1</text>
        <rect x="32" y="26" width="10" height="8" rx="1.5" fill={t.surface} stroke={t.accentSecondary} strokeWidth="1" />
        <text x="37" y="32" fontSize="4.5" fill={t.textPrimary} textAnchor="middle">Svr 2</text>
        {/* Distributed Cache / DB Storage */}
        <rect x="45" y="14" width="8" height="12" rx="1.5" fill={t.surface} stroke={t.accentTeal} strokeWidth="1.2" />
        <line x1="45" y1="18" x2="53" y2="18" stroke={t.accentTeal} strokeWidth="0.8" />
        <text x="49" y="23" fontSize="4.5" fontWeight="bold" fill={t.accentTeal} textAnchor="middle">DB</text>
      </svg>
    );
  }

  // 25. Agent Protocols / MCP / Interop: Tool Protocol & Client-Server Schema
  if (key.includes('protocol') || key.includes('mcp') || key.includes('interop')) {
    return (
      <svg viewBox="0 0 56 40" className={className} aria-hidden="true" focusable="false" style={{ width: '100%', height: '100%' }}>
        {/* Host/Client */}
        <rect x="5" y="10" width="12" height="20" rx="2" fill={t.surface} stroke={t.accentSecondary} strokeWidth="1.2" />
        <text x="11" y="21" fontSize="5" fontWeight="bold" fill={t.accentSecondary} textAnchor="middle">Host</text>
        {/* Bidirectional JSON-RPC messages */}
        <path d="M18 16H36" stroke={t.accentTeal} strokeWidth="1.2" strokeLinecap="round" />
        <path d="M34 14L36 16L34 18" stroke={t.accentTeal} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        <path d="M36 24H18" stroke={t.accentPrimary} strokeWidth="1.2" strokeLinecap="round" />
        <path d="M20 22L18 24L20 26" stroke={t.accentPrimary} strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {/* MCP Server / Tools */}
        <rect x="37" y="10" width="14" height="20" rx="2" fill={t.surface} stroke={t.accentPurple} strokeWidth="1.2" />
        <text x="44" y="19" fontSize="5" fontWeight="bold" fill={t.accentPurple} textAnchor="middle">MCP</text>
        <text x="44" y="25" fontSize="4" fill={t.accentPurple} textAnchor="middle">tools</text>
        <text x="27" y="34" fontSize="4.5" fontWeight="bold" fill={t.textMuted} textAnchor="middle">JSON-RPC</text>
      </svg>
    );
  }

  // 26. Batched Serving & Continuous Batching: Queue + Paged Slots
  if (key.includes('batch') || key.includes('serving') || key.includes('continuous')) {
    return (
      <svg viewBox="0 0 56 40" className={className} aria-hidden="true" focusable="false" style={{ width: '100%', height: '100%' }}>
        {/* Incoming requests queue */}
        <rect x="5" y="8" width="8" height="6" rx="1" fill={t.accentSecondary} opacity="0.8" />
        <rect x="5" y="16" width="8" height="6" rx="1" fill={t.accentTeal} opacity="0.8" />
        <rect x="5" y="24" width="8" height="6" rx="1" fill={t.accentWarn} opacity="0.8" />
        <path d="M15 19H22M20 17L22 19L20 21" stroke={t.textSecondary} strokeWidth="1.1" strokeLinecap="round" strokeLinejoin="round" fill="none" />
        {/* Continuous Batching GPU Arena */}
        <rect x="24" y="7" width="26" height="26" rx="3" fill={t.surface} stroke={t.accentPrimary} strokeWidth="1.2" />
        <text x="37" y="14" fontSize="5" fontWeight="bold" fill={t.accentPrimary} textAnchor="middle">Batch Slot</text>
        {/* Slot rows */}
        <rect x="27" y="17" width="12" height="4" rx="1" fill={t.accentSecondary} opacity="0.9" />
        <rect x="40" y="17" width="7" height="4" rx="1" fill={t.accentTeal} opacity="0.9" />
        <rect x="27" y="23" width="8" height="4" rx="1" fill={t.accentWarn} opacity="0.9" />
        <rect x="36" y="23" width="11" height="4" rx="1" fill={t.accentPrimary} opacity="0.9" />
        <text x="37" y="37" fontSize="4.5" fill={t.textMuted} textAnchor="middle">PagedAttention</text>
      </svg>
    );
  }

  // Default Fallback: Neural Layer Connections
  return (
    <svg viewBox="0 0 56 40" className={className} aria-hidden="true" focusable="false" style={{ width: '100%', height: '100%' }}>
      <line x1="12" y1="12" x2="28" y2="20" stroke={t.border} strokeWidth="1" />
      <line x1="12" y1="28" x2="28" y2="20" stroke={t.border} strokeWidth="1" />
      <line x1="28" y1="20" x2="44" y2="12" stroke={t.border} strokeWidth="1" />
      <line x1="28" y1="20" x2="44" y2="28" stroke={t.border} strokeWidth="1" />
      <circle cx="12" cy="12" r="3.5" fill={t.surface} stroke={t.accentSecondary} strokeWidth="1.2" />
      <circle cx="12" cy="28" r="3.5" fill={t.surface} stroke={t.accentSecondary} strokeWidth="1.2" />
      <circle cx="28" cy="20" r="4.5" fill={t.surface} stroke={t.accentPurple} strokeWidth="1.2" />
      <circle cx="44" cy="12" r="3.5" fill={t.surface} stroke={t.accentPrimary} strokeWidth="1.2" />
      <circle cx="44" cy="28" r="3.5" fill={t.surface} stroke={t.accentPrimary} strokeWidth="1.2" />
    </svg>
  );
}
