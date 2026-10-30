import type { CSSProperties } from 'react';

export type CoverVariant =
  | 'healthcare-map'
  | 'healthcare-coverage'
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
  | 'jeva'
  | 'jepa'
  | 'kimi'
  | 'skills'
  | 'memory'
  | 'gui'
  | 'default';

export function variantFor(slug: string, series?: string | null): CoverVariant {
  if (slug.includes('us-healthcare-1-') || slug === 'us-healthcare-1-the-map') return 'healthcare-map';
  if (slug.includes('us-healthcare-2-') || slug.includes('us-healthcare-3-')) return 'healthcare-coverage';
  if (slug.includes('us-healthcare-4-') || slug.includes('code-systems')) return 'healthcare-codes';
  if (slug.includes('us-healthcare-5-') || slug.includes('coverage-policy')) return 'healthcare-policy';
  if (slug.includes('us-healthcare-6-') || slug.includes('us-healthcare-7-') || slug.includes('network-management')) return 'healthcare-network';
  if (slug.includes('us-healthcare-8-') || slug.includes('us-healthcare-9-') || slug.includes('utilization')) return 'healthcare-benefits';
  if (slug.includes('us-healthcare-10-') || slug.includes('prior-auth')) return 'healthcare-priorauth';
  if (slug.includes('us-healthcare-11-') || slug.includes('care-management')) return 'healthcare-caremgmt';
  if (slug.includes('us-healthcare-12-') || slug.includes('us-healthcare-13-') || slug.includes('us-healthcare-14-') || slug.includes('claim')) return 'healthcare-claims';
  if (slug.includes('us-healthcare-15-') || slug.includes('us-healthcare-16-') || slug.includes('payment') || slug.includes('paid')) return 'healthcare-payment';
  if (slug.includes('us-healthcare-17-') || slug.includes('pharmacy') || slug.includes('pbm')) return 'healthcare-pharmacy';
  if (slug.includes('us-healthcare-18-') || slug.includes('data-rules-ai')) return 'healthcare-ai';
  if (series === 'us-healthcare' || slug.startsWith('us-healthcare-')) return 'healthcare-map';

  if (slug.includes('jeva') || slug.includes('decision')) return 'jeva';
  if (slug.includes('jepa') || slug.includes('classifiers') || slug.includes('vision')) return 'jepa';
  if (slug.includes('kimi') || slug.includes('attention') || slug.includes('context')) return 'kimi';
  if (slug.includes('skills') || slug.includes('mcp')) return 'skills';
  if (slug.includes('memory') || slug.includes('retrieval') || slug.includes('rag')) return 'memory';
  if (slug.includes('gui') || slug.includes('world-model') || slug.includes('computer-use')) return 'gui';
  return 'default';
}

const METADATA: Record<CoverVariant, { label: string; accent: string }> = {
  'healthcare-map': { label: 'MEMBER  →  PROVIDER  →  PAYER', accent: '#bb654b' },
  'healthcare-coverage': { label: 'MEDICARE  /  MEDICAID  /  COMMERCIAL', accent: '#315c63' },
  'healthcare-codes': { label: 'ICD-10  ×  CPT  ×  HCPCS  ×  DRG', accent: '#6d3fb8' },
  'healthcare-policy': { label: 'NCD  /  LCD  /  MEDICAL NECESSITY', accent: '#0f766e' },
  'healthcare-network': { label: 'CONTRACTING  →  CREDENTIALING', accent: '#1d4fc4' },
  'healthcare-benefits': { label: 'BENEFIT ACCUMULATOR  /  RULES', accent: '#935e06' },
  'healthcare-priorauth': { label: 'E-PA  →  CLINICAL RULES  →  DECISION', accent: '#be3b2d' },
  'healthcare-caremgmt': { label: 'RISK STRATIFICATION  →  HEDIS', accent: '#1f793c' },
  'healthcare-claims': { label: '837 CLAIM  →  SCRUBBER  →  835 ERA', accent: '#bb654b' },
  'healthcare-payment': { label: 'PAYMENT INTEGRITY  /  FWA DETECTION', accent: '#be3b2d' },
  'healthcare-pharmacy': { label: 'FORMULARY  →  REBATES  →  PBM', accent: '#935e06' },
  'healthcare-ai': { label: 'FHIR JSON  →  REASONING  →  AUDIT', accent: '#0f766e' },
  jeva: { label: 'REQUEST  →  DECISION SET', accent: '#1d4fc4' },
  jepa: { label: 'PIXELS  →  LATENT PREDICTION', accent: '#6d3fb8' },
  kimi: { label: 'GROWING HISTORY  /  FIXED MEMORY', accent: '#0f766e' },
  skills: { label: 'AGENT SKILLS  ≠  MCP PROTOCOL', accent: '#1f793c' },
  memory: { label: 'DENSE EMBED  →  HYBRID RETRIEVE', accent: '#315c63' },
  gui: { label: 'SCREEN t  →  ACTUATE  →  SCREEN t+1', accent: '#bb654b' },
  default: { label: 'NEURAL MASTERY / ARCHITECTURE', accent: '#315c63' },
};

export default function BlogCover({
  slug,
  series,
  className = '',
}: {
  slug: string;
  series?: string | null;
  className?: string;
}) {
  const variant = variantFor(slug, series);
  const meta = METADATA[variant];
  const style = { '--cover-accent': meta.accent } as CSSProperties;

  return (
    <div
      className={`nm-blog-cover nm-blog-cover-${variant} ${className}`}
      style={style}
      role="img"
      aria-label={`Editorial visual: ${meta.label}`}
    >
      <div className="nm-blog-cover-label">{meta.label}</div>
      <svg viewBox="0 0 600 310" aria-hidden="true" focusable="false">
        {/* 1. US Healthcare: The Map */}
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

        {/* 2. US Healthcare: Coverage Plans */}
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

        {/* 3. US Healthcare: Coding Systems */}
        {variant === 'healthcare-codes' && (
          <>
            <rect x="60" y="80" width="140" height="85" rx="8" />
            <text x="130" y="115">ICD-10-CM</text>
            <text x="130" y="140" style={{ fontSize: 9 }}>Diagnosis (Why)</text>
            <path d="M200 122h80" />
            <circle cx="300" cy="122" r="20" />
            <text x="300" y="126">MAP</text>
            <path d="M320 122h80" />
            <rect x="400" y="80" width="140" height="85" rx="8" />
            <text x="470" y="115">CPT / HCPCS</text>
            <text x="470" y="140" style={{ fontSize: 9 }}>Procedure (What)</text>
            <path d="M300 142v50" />
            <rect x="210" y="192" width="180" height="55" rx="6" />
            <text x="300" y="222">DRG GROUPER</text>
          </>
        )}

        {/* 4. US Healthcare: Coverage Policy */}
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

        {/* 5. US Healthcare: Network Management */}
        {variant === 'healthcare-network' && (
          <>
            <circle cx="100" cy="140" r="28" />
            <text x="100" y="144" style={{ fontSize: 9 }}>DOCTOR</text>
            <path d="M128 140h62" />
            <rect x="190" y="105" width="100" height="70" rx="8" />
            <text x="240" y="135">CREDENTIAL</text>
            <text x="240" y="155" style={{ fontSize: 9 }}>CAQH / NPI</text>
            <path d="M290 140h60" />
            <circle cx="390" cy="140" r="40" />
            <text x="390" y="144">NETWORK</text>
            <circle cx="510" cy="100" r="24" />
            <text x="510" y="104" style={{ fontSize: 8 }}>IN-NET</text>
            <circle cx="510" cy="180" r="24" strokeDasharray="3 3" />
            <text x="510" y="184" style={{ fontSize: 8 }}>OUT-NET</text>
            <path d="M430 128l58-20M430 152l58 20" />
          </>
        )}

        {/* 6. US Healthcare: Benefit Digitization */}
        {variant === 'healthcare-benefits' && (
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
            <text x="140" y="235" style={{ fontSize: 9 }}>100% Patient</text>
            <text x="340" y="235" style={{ fontSize: 9 }}>80/20 Shared</text>
            <text x="500" y="235" style={{ fontSize: 9 }}>100% Payer</text>
          </>
        )}

        {/* 7. US Healthcare: Prior Authorization */}
        {variant === 'healthcare-priorauth' && (
          <>
            <rect x="60" y="95" width="110" height="80" rx="8" />
            <text x="115" y="135">REQUEST</text>
            <text x="115" y="155" style={{ fontSize: 9 }}>278 EDI / FHIR</text>
            <path d="M170 135h70" />
            <polygon points="280,100 330,135 280,170 230,135" />
            <text x="280" y="139" style={{ fontSize: 9 }}>RULES</text>
            <path d="M330 120h90M330 150h90" />
            <rect x="420" y="95" width="120" height="38" rx="6" />
            <text x="480" y="119" style={{ fontSize: 10 }}>APPROVED</text>
            <rect x="420" y="145" width="120" height="38" rx="6" strokeDasharray="3 3" />
            <text x="480" y="169" style={{ fontSize: 10 }}>PEER REVIEW</text>
            <path d="M280 170v40" />
            <text x="280" y="230" style={{ fontSize: 9 }}>72-Hour Statutory SLA</text>
          </>
        )}

        {/* 8. US Healthcare: Care Management */}
        {variant === 'healthcare-caremgmt' && (
          <>
            <polygon points="170,80 270,240 70,240" />
            <path d="M104 185h132M137 132h66" />
            <text x="170" y="115" style={{ fontSize: 8 }}>HIGH 5%</text>
            <text x="170" y="160" style={{ fontSize: 8 }}>RISING 20%</text>
            <text x="170" y="215" style={{ fontSize: 8 }}>LOW RISK 75%</text>
            <path d="M270 160h70" />
            <rect x="340" y="125" width="190" height="70" rx="8" />
            <text x="435" y="155">HEDIS MEASURES</text>
            <text x="435" y="175" style={{ fontSize: 9 }}>STAR RATINGS · NCQA</text>
          </>
        )}

        {/* 9. US Healthcare: Claims Adjudication */}
        {variant === 'healthcare-claims' && (
          <>
            <rect x="50" y="90" width="95" height="60" rx="6" />
            <text x="97" y="125">837 CLAIM</text>
            <path d="M145 120h45" />
            <circle cx="215" cy="120" r="25" />
            <text x="215" y="124" style={{ fontSize: 9 }}>SCRUB</text>
            <path d="M240 120h45" />
            <rect x="285" y="80" width="130" height="80" rx="8" />
            <text x="350" y="115">ADJUDICATE</text>
            <text x="350" y="135" style={{ fontSize: 9 }}>Pricing · Rules</text>
            <path d="M415 120h50" />
            <rect x="465" y="90" width="95" height="60" rx="6" />
            <text x="512" y="125">835 ERA</text>
            <path d="M350 160v40" />
            <text x="350" y="220" style={{ fontSize: 9 }}>Payment Integrity Audit</text>
          </>
        )}

        {/* 10. US Healthcare: Payment Integrity */}
        {variant === 'healthcare-payment' && (
          <>
            <path d="M60 170 Q 150 70, 240 170 T 420 170 T 540 170" strokeWidth="2.5" />
            <circle cx="240" cy="170" r="14" fill="currentColor" />
            <circle cx="420" cy="170" r="14" fill="currentColor" />
            <rect x="190" y="75" width="100" height="40" rx="6" />
            <text x="240" y="100" style={{ fontSize: 9 }}>UPCODING</text>
            <rect x="370" y="75" width="100" height="40" rx="6" />
            <text x="420" y="100" style={{ fontSize: 9 }}>UNBUNDLING</text>
            <path d="M240 115v41M420 115v41" strokeDasharray="3 3" />
            <text x="300" y="235">STATISTICAL FWA ANOMALY ENGINE</text>
          </>
        )}

        {/* 11. US Healthcare: Pharmacy & PBMs */}
        {variant === 'healthcare-pharmacy' && (
          <>
            <rect x="60" y="90" width="110" height="60" rx="6" />
            <text x="115" y="125">DRUG MFR</text>
            <path d="M170 120h60" />
            <rect x="230" y="80" width="140" height="80" rx="8" />
            <text x="300" y="115">PBM</text>
            <text x="300" y="135" style={{ fontSize: 9 }}>Formulary · Rebates</text>
            <path d="M370 120h60" />
            <rect x="430" y="90" width="110" height="60" rx="6" />
            <text x="485" y="125">PHARMACY</text>
            <path d="M300 160v45" />
            <text x="300" y="225" style={{ fontSize: 10 }}>TIER 1 / 2 / 3 COPAY</text>
          </>
        )}

        {/* 12. US Healthcare: AI & FHIR */}
        {variant === 'healthcare-ai' && (
          <>
            <rect x="60" y="90" width="110" height="70" rx="8" />
            <text x="115" y="125">FHIR JSON</text>
            <text x="115" y="145" style={{ fontSize: 8 }}>Patient · Claim</text>
            <path d="M170 125h65" />
            <circle cx="280" cy="125" r="45" />
            <text x="280" y="122">LLM</text>
            <text x="280" y="140" style={{ fontSize: 8 }}>REASONING</text>
            <path d="M325 125h65" />
            <rect x="390" y="90" width="145" height="70" rx="8" />
            <text x="462" y="122">AUDITED LOG</text>
            <text x="462" y="142" style={{ fontSize: 8 }}>Deterministic Checks</text>
            <path d="M280 170v40" />
            <text x="280" y="230" style={{ fontSize: 9 }}>Zero Hallucination Verification</text>
          </>
        )}

        {/* 13. Jeva Decision Models */}
        {variant === 'jeva' && (
          <>
            <circle cx="300" cy="130" r="43" />
            <text x="300" y="135">REQUEST</text>
            <path d="M260 130H100M340 130h160M300 173v55" />
            <circle cx="85" cy="130" r="18" />
            <text x="85" y="134" style={{ fontSize: 9 }}>CTX</text>
            <circle cx="515" cy="130" r="18" />
            <text x="515" y="134" style={{ fontSize: 9 }}>EMB</text>
            <rect x="200" y="228" width="200" height="42" rx="6" />
            <text x="300" y="254">A: 0.08 | B: 0.77 | C: 0.15</text>
          </>
        )}

        {/* 14. JEPA Architecture */}
        {variant === 'jepa' && (
          <>
            <rect x="65" y="95" width="110" height="85" rx="8" />
            <text x="120" y="145">CONTEXT x</text>
            <path d="M175 137h55M330 137h55" />
            <rect x="230" y="95" width="100" height="85" rx="8" />
            <text x="280" y="135">ENCODER</text>
            <text x="280" y="155" style={{ fontSize: 9 }}>s_x</text>
            <rect x="385" y="95" width="150" height="85" rx="8" />
            <text x="460" y="135">TARGET y</text>
            <text x="460" y="155" style={{ fontSize: 9 }}>Latent Loss D(s_y, ŝ_y)</text>
            <path d="M280 180v45" />
            <text x="280" y="245" style={{ fontSize: 10 }}>PREDICTOR NETWORK (z)</text>
          </>
        )}

        {/* 15. Kimi Context & Memory */}
        {variant === 'kimi' && (
          <>
            <path d="M65 95H230M65 130H230M65 165H230" strokeWidth="2.5" />
            <text x="145" y="75" style={{ fontSize: 9 }}>ATTENTION SLICES</text>
            <circle cx="300" cy="130" r="45" />
            <text x="300" y="125">KV CACHE</text>
            <text x="300" y="142" style={{ fontSize: 9 }}>COMPACT</text>
            <path d="M345 130h90" />
            <rect x="435" y="95" width="110" height="70" rx="8" />
            <text x="490" y="135">RECURRENT</text>
            <text x="490" y="152" style={{ fontSize: 8 }}>O(1) Memory</text>
            <path d="M300 175v40" />
            <text x="300" y="235" style={{ fontSize: 10 }}>200K+ Context Horizon</text>
          </>
        )}

        {/* 16. Agent Skills vs MCP */}
        {variant === 'skills' && (
          <>
            <circle cx="160" cy="140" r="38" />
            <text x="160" y="144">AGENT</text>
            <path d="M198 120h80M198 160h80" />
            <rect x="278" y="95" width="130" height="42" rx="6" />
            <text x="343" y="121">LOCAL SKILL</text>
            <rect x="278" y="145" width="130" height="42" rx="6" />
            <text x="343" y="171">MCP SERVER</text>
            <path d="M408 120h45M408 165h45" />
            <circle cx="475" cy="120" r="18" />
            <text x="475" y="124" style={{ fontSize: 9 }}>CLI</text>
            <circle cx="475" cy="165" r="18" />
            <text x="475" y="169" style={{ fontSize: 9 }}>RPC</text>
          </>
        )}

        {/* 17. Memory & Retrieval */}
        {variant === 'memory' && (
          <>
            <rect x="65" y="105" width="120" height="65" rx="8" />
            <text x="125" y="142">QUERY q</text>
            <path d="M185 137h65" />
            <polygon points="290,95 345,137 290,180 235,137" />
            <text x="290" y="141" style={{ fontSize: 9 }}>ANN / BM25</text>
            <path d="M345 137h65" />
            <rect x="410" y="105" width="130" height="65" rx="8" />
            <text x="475" y="135">TOP-K CHUNKS</text>
            <text x="475" y="152" style={{ fontSize: 9 }}>Re-Ranked Score</text>
          </>
        )}

        {/* 18. GUI Agents & World Models */}
        {variant === 'gui' && (
          <>
            <rect x="65" y="90" width="150" height="95" rx="8" />
            <text x="140" y="140">SCREEN (t)</text>
            <rect x="145" y="145" width="40" height="25" rx="3" strokeDasharray="2 2" />
            <path d="M215 137h90" />
            <circle cx="340" cy="137" r="28" />
            <text x="340" y="141" style={{ fontSize: 9 }}>ACTION</text>
            <path d="M368 137h85" />
            <rect x="453" y="90" width="100" height="95" rx="8" />
            <text x="503" y="140">SCREEN (t+1)</text>
          </>
        )}

        {/* Default / Neural Mastery Lattice */}
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
            <text x="300" y="240" style={{ fontSize: 10 }}>NEURAL MASTERY ARCHITECTURE</text>
          </>
        )}
      </svg>
    </div>
  );
}
