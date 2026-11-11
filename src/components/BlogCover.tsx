import type { CSSProperties } from 'react';
import blogMeta from '../data/blogMeta.generated.json';

export type CoverVariant =
  | 'transformers-attention'
  | 'rag-retrieval'
  | 'agents'
  | 'training-optimization'
  | 'evaluation-safety'
  | 'mlops-deployment'
  | 'system-design'
  | 'careers-interviews'
  | 'news'
  | 'healthcare-map'
  | 'healthcare-coverage'
  | 'healthcare-costshare'
  | 'healthcare-eligibility'
  | 'healthcare-um'
  | 'healthcare-visit'
  | 'healthcare-sop'
  | 'healthcare-providerpay'
  | 'healthcare-codes'
  | 'healthcare-policy'
  | 'healthcare-network'
  | 'healthcare-benefits'
  | 'healthcare-priorauth'
  | 'healthcare-caremgmt'
  | 'healthcare-claims'
  | 'healthcare-payment'
  | 'healthcare-pharmacy'
  | 'healthcare-ai'
  | 'default';

// Pre-index frontmatter tags and series from generated metadata for reliable lookup
const BLOG_TAGS_MAP: Record<string, string[]> = Object.fromEntries(
  blogMeta.map((p) => [p.slug, p.tags ?? []])
);
const BLOG_SERIES_MAP: Record<string, string | null> = Object.fromEntries(
  blogMeta.map((p) => [p.slug, p.series ?? null])
);

// One cover per part for the healthcare series
const HEALTHCARE_COVER: Record<number, CoverVariant> = {
  1: 'healthcare-map',
  2: 'healthcare-coverage',
  3: 'healthcare-costshare',
  4: 'healthcare-codes',
  5: 'healthcare-policy',
  6: 'healthcare-eligibility',
  7: 'healthcare-network',
  8: 'healthcare-benefits',
  9: 'healthcare-um',
  10: 'healthcare-priorauth',
  11: 'healthcare-caremgmt',
  12: 'healthcare-visit',
  13: 'healthcare-claims',
  14: 'healthcare-sop',
  15: 'healthcare-payment',
  16: 'healthcare-providerpay',
  17: 'healthcare-pharmacy',
  18: 'healthcare-ai',
};

/**
 * Maps a post's slug, series, and frontmatter tags to its designated topic motif.
 * When tags are omitted, looks up the post's frontmatter from blog metadata.
 */
export function variantFor(
  slug: string,
  series?: string | null,
  tags?: string[]
): CoverVariant {
  const part = slug.match(/^us-healthcare-(\d+)-/)?.[1];
  const postSeries = series ?? BLOG_SERIES_MAP[slug];
  if (part) return HEALTHCARE_COVER[Number(part)] ?? 'healthcare-map';
  if (postSeries === 'us-healthcare') return 'healthcare-map';

  const rawTags = tags ?? BLOG_TAGS_MAP[slug] ?? [];
  const normTags = rawTags.map((t) => t.toLowerCase());
  const hasTag = (...candidates: string[]) =>
    candidates.some((c) => normTags.some((t) => t.includes(c)));

  // 1. Careers, roadmap, and learning disciplines
  if (
    slug.includes('what-to-learn') ||
    hasTag('ai engineering', 'career', 'interview', 'disciplines')
  ) {
    return 'careers-interviews';
  }

  // 2. Announcements & news
  if (hasTag('anthropic', 'claude', 'announcement', 'news', 'release')) {
    return 'news';
  }

  // 3. Transformers and attention mechanisms
  if (
    hasTag('linear attention', 'attention', 'transformer', 'kv cache', 'context horizon') ||
    slug.includes('attention')
  ) {
    return 'transformers-attention';
  }

  // 4. RAG, retrieval, vector search, and long-term memory
  if (
    hasTag('memory', 'retrieval', 'rag', 'prompt caching') ||
    slug.includes('memory') ||
    slug.includes('retrieval')
  ) {
    return 'rag-retrieval';
  }

  // 5. Training, optimization, and self-supervised latent models
  if (
    hasTag('self-supervised', 'jepa', 'training', 'optimization', 'fine-tuning', 'loss') ||
    slug.includes('classifiers-to-jepa')
  ) {
    return 'training-optimization';
  }

  // 6. System design, architectures, and decision models
  if (
    hasTag('decision models', 'text classification', 'system design', 'architecture') ||
    slug.includes('decision')
  ) {
    return 'system-design';
  }

  // 7. Evaluation, safety, cryptographic proofs, and benchmarks
  if (
    hasTag('provable', 'ai security', 'safety', 'evaluation', 'benchmark') ||
    slug.includes('flashprove')
  ) {
    return 'evaluation-safety';
  }

  // 8. Agents, tool use, skills, world models, and computer-use
  if (
    hasTag('agent skills', 'mcp', 'world models', 'gui', 'agents') ||
    slug.includes('agent') ||
    slug.includes('skills') ||
    slug.includes('gui')
  ) {
    return 'agents';
  }

  // 9. MLOps, deployment, serving, and mixture of experts
  if (
    hasTag('inference', 'mixture of experts', 'serving', 'mlops', 'deployment', 'cost')
  ) {
    return 'mlops-deployment';
  }

  return 'default';
}

/** 6 notebook marker colours for light paper (contrast $\ge 5:1$) */
export const COVER_PALETTE_LIGHT = [
  '#0f766e', // teal
  '#3730a3', // indigo
  '#166534', // forest green
  '#a21caf', // magenta / purple
  '#c2410c', // amber / rust
  '#1d4ed8', // cobalt blue
] as const;

/** 6 notebook marker colours for dark & forest paper (contrast $\ge 8:1$) */
export const COVER_PALETTE_DARK = [
  '#2dd4bf', // bright teal
  '#7ea2ff', // bright indigo
  '#4ade80', // bright green
  '#c084fc', // bright purple
  '#fbbf24', // bright amber
  '#38bdf8', // bright cobalt
] as const;

/**
 * Deterministically computes colour pair (light, dark) from post slug so
 * two posts on the same topic still differ visually.
 */
export function getDeterministicColors(slug: string): {
  light: string;
  dark: string;
  index: number;
} {
  let hash = 0;
  for (let i = 0; i < slug.length; i++) {
    hash = (hash * 31 + slug.charCodeAt(i)) >>> 0;
  }
  const idx = hash % COVER_PALETTE_LIGHT.length;
  return {
    light: COVER_PALETTE_LIGHT[idx],
    dark: COVER_PALETTE_DARK[idx],
    index: idx,
  };
}

export const METADATA: Record<CoverVariant, { label: string }> = {
  'transformers-attention': { label: 'ATTENTION  ×  KV CACHE' },
  'rag-retrieval': { label: 'DENSE RETRIEVAL  →  RE-RANK' },
  agents: { label: 'PERCEIVE  →  TOOL USE  →  ACT' },
  'training-optimization': { label: 'GRADIENT STEP  →  LATENT LOSS' },
  'evaluation-safety': { label: 'VERIFICATION  ·  SAFETY GATE' },
  'mlops-deployment': { label: 'SERVING CLUSTER  ·  MoE ROUTING' },
  'system-design': { label: 'SYSTEM ARCHITECTURE  ·  FLOW' },
  'careers-interviews': { label: 'DISCIPLINES  ·  SKILLS ROADMAP' },
  news: { label: 'FIELD DISPATCH  ·  ANNOUNCEMENT' },
  'healthcare-map': { label: 'MEMBER  →  PROVIDER  →  PAYER' },
  'healthcare-coverage': { label: 'MEDICARE  /  MEDICAID  /  COMMERCIAL' },
  'healthcare-costshare': { label: 'DEDUCTIBLE  →  COINSURANCE  →  OOP MAX' },
  'healthcare-eligibility': { label: '834 ENROLL  →  270 ASK  →  271 ANSWER' },
  'healthcare-um': { label: 'BEFORE  /  DURING  /  AFTER CARE' },
  'healthcare-visit': { label: '837 CLAIM  →  SCRUBBER  →  PAYER' },
  'healthcare-sop': { label: 'STEP BY STEP  /  PAY, DENY OR PEND' },
  'healthcare-providerpay': { label: 'FEE FOR SERVICE  →  CAPITATION' },
  'healthcare-codes': { label: 'ICD-10  ×  CPT  ×  HCPCS  ×  DRG' },
  'healthcare-policy': { label: 'NCD  /  LCD  /  MEDICAL NECESSITY' },
  'healthcare-network': { label: 'CONTRACTING  →  CREDENTIALING' },
  'healthcare-benefits': { label: 'PLAN DOCUMENT  →  SYSTEM RULES' },
  'healthcare-priorauth': { label: 'E-PA  →  CLINICAL RULES  →  DECISION' },
  'healthcare-caremgmt': { label: 'RISK STRATIFICATION  →  HEDIS' },
  'healthcare-claims': { label: 'ELIGIBILITY  →  PRICING  →  835' },
  'healthcare-payment': { label: 'PAYMENT INTEGRITY  /  FWA DETECTION' },
  'healthcare-pharmacy': { label: 'FORMULARY  →  REBATES  →  PBM' },
  'healthcare-ai': { label: 'FHIR JSON  →  REASONING  →  AUDIT' },
  default: { label: 'NEURAL MASTERY / ARCHITECTURE' },
};

export default function BlogCover({
  slug,
  series,
  tags,
  className = '',
}: {
  slug: string;
  series?: string | null;
  tags?: string[];
  className?: string;
}) {
  const variant = variantFor(slug, series, tags);
  const meta = METADATA[variant];
  const { light, dark } = getDeterministicColors(slug);

  const style = {
    '--cover-accent': light,
    '--cover-accent-dark': dark,
  } as CSSProperties;

  return (
    <div
      className={`nm-blog-cover nm-blog-cover-${variant} ${className}`}
      style={style}
      role="img"
      aria-label={`Editorial visual: ${meta.label}`}
    >
      <div className="nm-blog-cover-label">{meta.label}</div>
      <svg
        viewBox="0 0 600 310"
        aria-hidden="true"
        focusable="false"
        style={{ fontFamily: 'var(--font-hand)' }}
      >
        {/* 1. Transformers & Attention */}
        {variant === 'transformers-attention' && (
          <>
            <rect x="55" y="80" width="80" height="70" rx="8" />
            <text x="95" y="115">Query Q</text>
            <text x="145" y="115" style={{ fontSize: 16 }}>×</text>
            <rect x="160" y="80" width="80" height="70" rx="8" />
            <text x="200" y="115">Key Kᵀ</text>
            <path d="M250 115h40" />
            <rect x="300" y="70" width="130" height="90" rx="8" />
            <text x="365" y="105">Softmax(QKᵀ)</text>
            <text x="365" y="130" style={{ fontSize: 11 }}>Scale 1/√d</text>
            <path d="M440 115h35" />
            <rect x="485" y="80" width="60" height="70" rx="8" />
            <text x="515" y="115">Val V</text>
            <path d="M95 160v40h270v20M515 160v40H365" />
            <rect x="220" y="220" width="160" height="45" rx="6" />
            <text x="300" y="244">Rolling KV Cache</text>
          </>
        )}

        {/* 2. RAG & Retrieval */}
        {variant === 'rag-retrieval' && (
          <>
            <rect x="55" y="90" width="90" height="65" rx="6" />
            <text x="100" y="122">Query q</text>
            <path d="M155 122h50" />
            <circle cx="250" cy="122" r="38" />
            <text x="250" y="115">Dense</text>
            <text x="250" y="132" style={{ fontSize: 10 }}>Embed</text>
            <path d="M295 122h45" />
            <polygon points="350,90 440,105 440,140 350,155" />
            <text x="395" y="122" style={{ fontSize: 11 }}>Re-Rank</text>
            <path d="M445 122h45" />
            <rect x="495" y="90" width="55" height="65" rx="6" />
            <text x="522" y="122">Top-K</text>
            <path d="M250 165v45" />
            <rect x="170" y="215" width="260" height="45" rx="6" />
            <text x="300" y="240">Hybrid BM25 + Vector Search</text>
          </>
        )}

        {/* 3. Agents & Tool Use */}
        {variant === 'agents' && (
          <>
            <circle cx="120" cy="135" r="40" />
            <text x="120" y="130">Observe</text>
            <text x="120" y="148" style={{ fontSize: 10 }}>Screen / State</text>
            <path d="M165 135h60" />
            <rect x="235" y="95" width="130" height="80" rx="8" />
            <text x="300" y="125">Agent Core</text>
            <text x="300" y="145" style={{ fontSize: 10 }}>Reason & Plan</text>
            <path d="M375 115h60M375 155h60" />
            <rect x="445" y="95" width="105" height="35" rx="6" />
            <text x="497" y="114" style={{ fontSize: 11 }}>Bash Tool</text>
            <rect x="445" y="140" width="105" height="35" rx="6" />
            <text x="497" y="159" style={{ fontSize: 11 }}>MCP / API</text>
            <path d="M500 180v35H120v-35" />
            <text x="300" y="245">Closed Environment Feedback Loop</text>
          </>
        )}

        {/* 4. Training & Optimization */}
        {variant === 'training-optimization' && (
          <>
            <ellipse cx="140" cy="140" rx="65" ry="45" />
            <ellipse cx="140" cy="140" rx="40" ry="26" strokeDasharray="3 3" />
            <circle cx="140" cy="140" r="4" fill="currentColor" />
            <path d="M95 105l30 25 15 10" />
            <text x="140" y="215">Loss Contours</text>
            <path d="M215 140h65" />
            <rect x="290" y="95" width="115" height="85" rx="8" />
            <text x="347" y="125">Encoder</text>
            <text x="347" y="145" style={{ fontSize: 10 }}>s_x, s_y</text>
            <path d="M415 140h55" />
            <rect x="480" y="95" width="70" height="85" rx="8" />
            <text x="515" y="125">Latent</text>
            <text x="515" y="145" style={{ fontSize: 10 }}>Loss D</text>
            <text x="375" y="240">Non-generative Representation</text>
          </>
        )}

        {/* 5. Evaluation, Safety & Cryptographic Proofs */}
        {variant === 'evaluation-safety' && (
          <>
            <rect x="65" y="90" width="115" height="80" rx="8" />
            <text x="122" y="122">API Reply</text>
            <text x="122" y="140" style={{ fontSize: 10 }}>Candidate</text>
            <path d="M185 130h65" />
            <polygon points="290,90 335,130 290,170 245,130" />
            <text x="290" y="130" style={{ fontSize: 11 }}>GATE</text>
            <path d="M340 130h60" />
            <rect x="410" y="90" width="135" height="80" rx="8" />
            <text x="477" y="120">Proof Seal</text>
            <text x="477" y="140" style={{ fontSize: 10 }}>FlashProve 400B</text>
            <path d="M290 175v40" />
            <text x="290" y="240">Empirical Invariants & Safety Guard</text>
          </>
        )}

        {/* 6. MLOps, Serving & Deployment */}
        {variant === 'mlops-deployment' && (
          <>
            <rect x="60" y="95" width="105" height="70" rx="8" />
            <text x="112" y="130">Gateway</text>
            <path d="M170 130h55" />
            <polygon points="265,95 305,130 265,165 225,130" />
            <text x="265" y="130" style={{ fontSize: 10 }}>MoE</text>
            <path d="M310 110h80M310 150h80" />
            <rect x="400" y="90" width="145" height="35" rx="6" />
            <text x="472" y="109" style={{ fontSize: 11 }}>Expert A (Serving)</text>
            <rect x="400" y="135" width="145" height="35" rx="6" />
            <text x="472" y="154" style={{ fontSize: 11 }}>Expert B (Tokens)</text>
            <path d="M265 170v40" />
            <text x="265" y="235">PagedAttention Dynamic Batching</text>
          </>
        )}

        {/* 7. System Design & Architectures */}
        {variant === 'system-design' && (
          <>
            <circle cx="95" cy="130" r="30" />
            <text x="95" y="132" style={{ fontSize: 11 }}>Client</text>
            <path d="M130 130h50" />
            <rect x="185" y="95" width="95" height="70" rx="6" />
            <text x="232" y="125">Load Bal</text>
            <text x="232" y="145" style={{ fontSize: 10 }}>NGINX</text>
            <path d="M285 130h50" />
            <rect x="340" y="95" width="105" height="70" rx="6" />
            <text x="392" y="125">Services</text>
            <text x="392" y="145" style={{ fontSize: 10 }}>Stateless</text>
            <path d="M450 130h45" />
            <rect x="500" y="95" width="55" height="70" rx="6" />
            <text x="527" y="130" style={{ fontSize: 11 }}>DB</text>
            <path d="M392 170v35h-160" />
            <text x="300" y="235">Distributed State & Write-Ahead Log</text>
          </>
        )}

        {/* 8. Careers, Disciplines & Interviews */}
        {variant === 'careers-interviews' && (
          <>
            <path d="M70 145h460" strokeWidth="2.5" />
            <circle cx="100" cy="145" r="16" />
            <text x="100" y="185" style={{ fontSize: 11 }}>Harness</text>
            <circle cx="220" cy="145" r="16" />
            <text x="220" y="185" style={{ fontSize: 11 }}>Inference</text>
            <circle cx="340" cy="145" r="16" />
            <text x="340" y="185" style={{ fontSize: 11 }}>Context</text>
            <circle cx="460" cy="145" r="16" />
            <text x="460" y="185" style={{ fontSize: 11 }}>Observe</text>
            <path d="M220 145v-40h120v40" strokeDasharray="3 3" />
            <rect x="210" y="65" width="140" height="35" rx="6" />
            <text x="280" y="84" style={{ fontSize: 11 }}>Four Disciplines</text>
            <text x="280" y="240">The AI Engineering Curriculum</text>
          </>
        )}

        {/* 9. News & Announcements */}
        {variant === 'news' && (
          <>
            <rect x="70" y="80" width="220" height="120" rx="8" />
            <text x="180" y="115" style={{ fontSize: 14 }}>Model Release</text>
            <path d="M90 140h180M90 165h130" strokeDasharray="2 3" />
            <path d="M300 140h50" />
            <rect x="360" y="80" width="180" height="120" rx="8" />
            <text x="450" y="115" style={{ fontSize: 14 }}>Frontier Benchmark</text>
            <path d="M380 170l35-30 40 15 50-45" strokeWidth="2.8" />
            <circle cx="505" cy="110" r="5" fill="currentColor" />
            <text x="300" y="245">Frontier Model Dispatch & Analysis</text>
          </>
        )}

        {/* 10. Healthcare Part 1: Map */}
        {variant === 'healthcare-map' && (
          <>
            <circle cx="120" cy="150" r="36" />
            <text x="120" y="154">MEMBER</text>
            <circle cx="300" cy="90" r="36" />
            <text x="300" y="94">PROVIDER</text>
            <circle cx="480" cy="150" r="36" />
            <text x="480" y="154">PAYER</text>
            <circle cx="300" cy="220" r="32" strokeDasharray="4 4" />
            <text x="300" y="224">EMPLOYER</text>
            <path d="M152 136l115-32M335 104l115 32M156 150h288M146 172l126 36M454 172l-126 36" />
          </>
        )}

        {/* 11. Healthcare Part 2: Coverage Plans */}
        {variant === 'healthcare-coverage' && (
          <>
            <rect x="70" y="80" width="130" height="60" rx="8" />
            <text x="135" y="115">MEDICARE</text>
            <rect x="235" y="80" width="130" height="60" rx="8" />
            <text x="300" y="115">COMMERCIAL</text>
            <rect x="400" y="80" width="130" height="60" rx="8" />
            <text x="465" y="115">MEDICAID</text>
            <path d="M135 140v40M300 140v40M465 140v40" />
            <path d="M135 180h330" />
            <path d="M300 180v30" />
            <rect x="200" y="210" width="200" height="50" rx="6" />
            <text x="300" y="240">PREMIUM + COST SHARE</text>
          </>
        )}

        {/* 12. Healthcare Part 3: Coding Systems */}
        {variant === 'healthcare-codes' && (
          <>
            <rect x="60" y="80" width="140" height="85" rx="8" />
            <text x="130" y="115">ICD-10-CM</text>
            <text x="130" y="140" style={{ fontSize: 10 }}>Diagnosis (Why)</text>
            <path d="M200 122h80" />
            <circle cx="300" cy="122" r="20" />
            <text x="300" y="126">MAP</text>
            <path d="M320 122h80" />
            <rect x="400" y="80" width="140" height="85" rx="8" />
            <text x="470" y="115">CPT / HCPCS</text>
            <text x="470" y="140" style={{ fontSize: 10 }}>Procedure (What)</text>
            <path d="M300 142v50" />
            <rect x="210" y="192" width="180" height="55" rx="6" />
            <text x="300" y="222">DRG GROUPER</text>
          </>
        )}

        {/* 13. Healthcare Part 4: Coverage Policy */}
        {variant === 'healthcare-policy' && (
          <>
            <circle cx="120" cy="140" r="35" />
            <text x="120" y="144">EVIDENCE</text>
            <path d="M155 140h75" />
            <polygon points="270,105 320,140 270,175 220,140" />
            <text x="270" y="144" style={{ fontSize: 10 }}>NCD / LCD</text>
            <path d="M320 140h80" />
            <rect x="400" y="105" width="130" height="70" rx="8" />
            <text x="465" y="145">COVERED</text>
            <path d="M270 175v40h130" />
            <text x="440" y="220" style={{ fontSize: 10 }}>PRIOR AUTH REQUIRED</text>
          </>
        )}

        {/* 14. Healthcare Part 5: Network Management */}
        {variant === 'healthcare-network' && (
          <>
            <circle cx="100" cy="140" r="28" />
            <text x="100" y="144" style={{ fontSize: 10 }}>DOCTOR</text>
            <path d="M128 140h62" />
            <rect x="190" y="105" width="100" height="70" rx="8" />
            <text x="240" y="135">CREDENTIAL</text>
            <text x="240" y="155" style={{ fontSize: 10 }}>CAQH / NPI</text>
            <path d="M290 140h60" />
            <circle cx="390" cy="140" r="40" />
            <text x="390" y="144">NETWORK</text>
            <circle cx="510" cy="100" r="24" />
            <text x="510" y="104" style={{ fontSize: 9 }}>IN-NET</text>
            <circle cx="510" cy="180" r="24" strokeDasharray="3 3" />
            <text x="510" y="184" style={{ fontSize: 9 }}>OUT-NET</text>
            <path d="M430 128l58-20M430 152l58 20" />
          </>
        )}

        {/* 15. Healthcare Part 6: Benefit Digitization */}
        {variant === 'healthcare-costshare' && (
          <>
            <rect x="70" y="90" width="140" height="70" rx="6" />
            <text x="140" y="125">DEDUCTIBLE</text>
            <path d="M210 125h60" />
            <rect x="270" y="90" width="140" height="70" rx="6" />
            <text x="340" y="125">COINSURANCE</text>
            <path d="M410 125h60" />
            <rect x="470" y="90" width="80" height="70" rx="6" />
            <text x="510" y="125">OOP MAX</text>
            <path d="M70 200h480" strokeWidth="3" />
            <circle cx="210" cy="200" r="8" fill="currentColor" />
            <circle cx="410" cy="200" r="8" fill="currentColor" />
            <text x="140" y="235" style={{ fontSize: 10 }}>100% Patient</text>
            <text x="340" y="235" style={{ fontSize: 10 }}>80/20 Shared</text>
            <text x="500" y="235" style={{ fontSize: 10 }}>100% Payer</text>
          </>
        )}

        {/* 16. Healthcare Part 7: Prior Authorization */}
        {variant === 'healthcare-priorauth' && (
          <>
            <rect x="60" y="95" width="110" height="80" rx="8" />
            <text x="115" y="135">REQUEST</text>
            <text x="115" y="155" style={{ fontSize: 10 }}>278 EDI / FHIR</text>
            <path d="M170 135h70" />
            <polygon points="280,100 330,135 280,170 230,135" />
            <text x="280" y="139" style={{ fontSize: 10 }}>RULES</text>
            <path d="M330 120h90M330 150h90" />
            <rect x="420" y="95" width="120" height="38" rx="6" />
            <text x="480" y="119" style={{ fontSize: 10 }}>APPROVED</text>
            <rect x="420" y="145" width="120" height="38" rx="6" strokeDasharray="3 3" />
            <text x="480" y="169" style={{ fontSize: 10 }}>PEER REVIEW</text>
            <path d="M280 170v40" />
            <text x="280" y="230" style={{ fontSize: 10 }}>Urgent or standard deadline</text>
          </>
        )}

        {/* 17. Healthcare Part 8: Care Management */}
        {variant === 'healthcare-caremgmt' && (
          <>
            <polygon points="170,80 270,240 70,240" />
            <path d="M104 185h132M137 132h66" />
            <text x="170" y="115" style={{ fontSize: 9 }}>HIGH 5%</text>
            <text x="170" y="160" style={{ fontSize: 9 }}>RISING</text>
            <text x="170" y="215" style={{ fontSize: 9 }}>LOW RISK</text>
            <path d="M270 160h70" />
            <rect x="340" y="125" width="190" height="70" rx="8" />
            <text x="435" y="155">HEDIS MEASURES</text>
            <text x="435" y="175" style={{ fontSize: 10 }}>STAR RATINGS · NCQA</text>
          </>
        )}

        {/* 18. Healthcare Part 9: Claims Adjudication */}
        {variant === 'healthcare-visit' && (
          <>
            <rect x="50" y="90" width="95" height="60" rx="6" />
            <text x="97" y="125">837 CLAIM</text>
            <path d="M145 120h45" />
            <circle cx="215" cy="120" r="25" />
            <text x="215" y="124" style={{ fontSize: 10 }}>SCRUB</text>
            <path d="M240 120h45" />
            <rect x="285" y="80" width="130" height="80" rx="8" />
            <text x="350" y="115">ADJUDICATE</text>
            <text x="350" y="135" style={{ fontSize: 10 }}>Pricing · Rules</text>
            <path d="M415 120h50" />
            <rect x="465" y="90" width="95" height="60" rx="6" />
            <text x="512" y="125">835 ERA</text>
            <path d="M350 160v40" />
            <text x="350" y="220" style={{ fontSize: 10 }}>Pend or deny goes back to provider</text>
          </>
        )}

        {/* 19. Healthcare Part 10: Payment Integrity */}
        {variant === 'healthcare-payment' && (
          <>
            <path d="M60 170 Q 150 70, 240 170 T 420 170 T 540 170" strokeWidth="2.5" />
            <circle cx="240" cy="170" r="14" fill="currentColor" />
            <circle cx="420" cy="170" r="14" fill="currentColor" />
            <rect x="190" y="75" width="100" height="40" rx="6" />
            <text x="240" y="100" style={{ fontSize: 10 }}>UPCODING</text>
            <rect x="370" y="75" width="100" height="40" rx="6" />
            <text x="420" y="100" style={{ fontSize: 10 }}>UNBUNDLING</text>
            <path d="M240 115v41M420 115v41" strokeDasharray="3 3" />
            <text x="300" y="235">FLAGS NEED HUMAN REVIEW</text>
          </>
        )}

        {/* 20. Healthcare Part 11: Pharmacy & PBMs */}
        {variant === 'healthcare-pharmacy' && (
          <>
            <rect x="60" y="90" width="110" height="60" rx="6" />
            <text x="115" y="125">DRUG MFR</text>
            <path d="M170 120h60" />
            <rect x="230" y="80" width="140" height="80" rx="8" />
            <text x="300" y="115">PBM</text>
            <text x="300" y="135" style={{ fontSize: 10 }}>Formulary · Rebates</text>
            <path d="M370 120h60" />
            <rect x="430" y="90" width="110" height="60" rx="6" />
            <text x="485" y="125">PHARMACY</text>
            <path d="M300 160v45" />
            <text x="300" y="225" style={{ fontSize: 11 }}>TIER 1 / 2 / 3 COPAY</text>
          </>
        )}

        {/* 21. Healthcare Part 12: AI & FHIR */}
        {variant === 'healthcare-ai' && (
          <>
            <rect x="60" y="90" width="110" height="70" rx="8" />
            <text x="115" y="125">FHIR JSON</text>
            <text x="115" y="145" style={{ fontSize: 9 }}>Patient · Claim</text>
            <path d="M170 125h65" />
            <circle cx="280" cy="125" r="45" />
            <text x="280" y="122">LLM</text>
            <text x="280" y="140" style={{ fontSize: 9 }}>REASONING</text>
            <path d="M325 125h65" />
            <rect x="390" y="90" width="145" height="70" rx="8" />
            <text x="462" y="122">AUDITED LOG</text>
            <text x="462" y="142" style={{ fontSize: 9 }}>Deterministic Checks</text>
            <path d="M280 170v40" />
            <text x="280" y="230" style={{ fontSize: 10 }}>Source and policy checks</text>
          </>
        )}

        {/* 22. Healthcare: Benefits */}
        {variant === 'healthcare-benefits' && (
          <>
            <rect x="60" y="75" width="105" height="140" rx="4" />
            <text x="112" y="105">EOC</text>
            <path d="M78 125h70M78 145h70M78 165h70M78 185h45" />
            <path d="M165 145h70" />
            <rect x="235" y="85" width="130" height="120" rx="8" />
            <text x="300" y="120">BENEFIT RULES</text>
            <text x="300" y="150" style={{ fontSize: 10 }}>Service category</text>
            <text x="300" y="170" style={{ fontSize: 10 }}>Cost share · Limits</text>
            <path d="M365 145h70" />
            <rect x="435" y="105" width="115" height="80" rx="8" />
            <text x="492" y="150">CLAIM SYSTEM</text>
          </>
        )}

        {/* 23. Healthcare: Eligibility */}
        {variant === 'healthcare-eligibility' && (
          <>
            <rect x="50" y="110" width="115" height="70" rx="8" />
            <text x="107" y="150">EMPLOYER</text>
            <path d="M165 145h85" />
            <text x="207" y="133" style={{ fontSize: 11 }}>834</text>
            <rect x="250" y="95" width="110" height="100" rx="8" />
            <text x="305" y="150">PAYER</text>
            <path d="M440 125h-80M360 165h80" />
            <text x="400" y="113" style={{ fontSize: 11 }}>270</text>
            <text x="400" y="185" style={{ fontSize: 11 }}>271</text>
            <rect x="440" y="110" width="115" height="70" rx="8" />
            <text x="497" y="150">PROVIDER</text>
          </>
        )}

        {/* 24. Healthcare: UM */}
        {variant === 'healthcare-um' && (
          <>
            <path d="M60 150h480" strokeWidth="3" />
            <rect x="230" y="125" width="140" height="50" rx="6" />
            <text x="300" y="155">HOSPITAL STAY</text>
            <circle cx="130" cy="150" r="9" fill="currentColor" />
            <circle cx="300" cy="90" r="9" fill="currentColor" />
            <path d="M300 99v26" />
            <circle cx="470" cy="150" r="9" fill="currentColor" />
            <text x="130" y="195">PROSPECTIVE</text>
            <text x="300" y="70">CONCURRENT</text>
            <text x="470" y="195">RETROSPECTIVE</text>
          </>
        )}

        {/* 25. Healthcare: Claims */}
        {variant === 'healthcare-claims' && (
          <>
            <path d="M60 125h480" strokeWidth="3" />
            {['MEMBER', 'CODES', 'BENEFITS', 'PRICING', 'PAY'].map((label, i) => (
              <g key={label}>
                <circle cx={85 + i * 107} cy="125" r="12" fill="currentColor" />
                <text x={85 + i * 107} y="165" style={{ fontSize: 10 }}>
                  {label}
                </text>
              </g>
            ))}
            <path d="M192 137v48" strokeDasharray="4 4" />
            <rect x="130" y="185" width="124" height="42" rx="6" />
            <text x="192" y="211">PEND OR DENY</text>
          </>
        )}

        {/* 26. Healthcare: SOP */}
        {variant === 'healthcare-sop' && (
          <>
            {[
              'Check the claim',
              'Confirm member',
              'Check benefit',
              'Check policy',
            ].map((label, i) => (
              <g key={label}>
                <rect x="110" y={62 + i * 48} width="24" height="24" rx="3" />
                <path d={`M115 ${74 + i * 48}l5 6 9-12`} />
                <text x="150" y={79 + i * 48} style={{ textAnchor: 'start' }}>
                  {label}
                </text>
              </g>
            ))}
            <path d="M340 145h60" />
            <polygon points="450,105 500,145 450,185 400,145" />
            <text x="450" y="149" style={{ fontSize: 10 }}>DECIDE</text>
            <text x="450" y="210" style={{ fontSize: 11 }}>PAY · DENY · PEND</text>
          </>
        )}

        {/* 27. Healthcare: Provider Pay */}
        {variant === 'healthcare-providerpay' && (
          <>
            <path d="M70 200h460" strokeWidth="3" />
            <path d="M520 192l12 8-12 8" />
            {[
              [110, 'FEE FOR', 'SERVICE'],
              [300, 'BUNDLED', 'PAYMENT'],
              [490, 'CAPITATION', 'PMPM'],
            ].map(([x, a, b], i) => (
              <g key={String(a)}>
                <rect
                  x={Number(x) - 18}
                  y={170 - i * 45}
                  width="36"
                  height={30 + i * 45}
                  rx="3"
                />
                <text x={Number(x)} y="225" style={{ fontSize: 10 }}>{a}</text>
                <text x={Number(x)} y="241" style={{ fontSize: 9 }}>{b}</text>
              </g>
            ))}
            <text x="300" y="70" style={{ fontSize: 11 }}>MORE FINANCIAL RISK ON PROVIDER</text>
          </>
        )}

        {/* 28. Default: Neural Mastery Architecture */}
        {variant === 'default' && (
          <>
            <circle cx="100" cy="145" r="16" />
            <circle cx="100" cy="205" r="16" />
            <circle cx="100" cy="85" r="16" />
            <circle cx="250" cy="115" r="18" />
            <circle cx="250" cy="175" r="18" />
            <circle cx="400" cy="115" r="18" />
            <circle cx="400" cy="175" r="18" />
            <circle cx="520" cy="145" r="20" />
            <path d="M116 85l116 30M116 145l116-30M116 145l116 30M116 205l116-30M268 115h114M268 175h114M268 115l114 60M268 175l114-60M418 115l84 30M418 175l84-30" />
            <text x="300" y="240" style={{ fontSize: 11 }}>NEURAL MASTERY ARCHITECTURE</text>
          </>
        )}
      </svg>
    </div>
  );
}
