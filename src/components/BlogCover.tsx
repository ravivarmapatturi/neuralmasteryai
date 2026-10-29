import type { CSSProperties } from 'react';

type Variant = 'jeva' | 'jepa' | 'kimi' | 'skills' | 'memory' | 'gui' | 'healthcare' | 'default';

function variantFor(slug: string, series?: string | null): Variant {
  if (series === 'us-healthcare' || slug.startsWith('us-healthcare-')) return 'healthcare';
  if (slug.includes('jeva') || slug.includes('decision')) return 'jeva';
  if (slug.includes('jepa') || slug.includes('classifiers')) return 'jepa';
  if (slug.includes('kimi') || slug.includes('attention')) return 'kimi';
  if (slug.includes('skills')) return 'skills';
  if (slug.includes('memory')) return 'memory';
  if (slug.includes('gui') || slug.includes('world-model')) return 'gui';
  return 'default';
}

const labels: Record<Variant, string> = {
  jeva: 'REQUEST  →  DECISION SET', jepa: 'PIXELS  →  REPRESENTATION', kimi: 'GROWING HISTORY  /  FIXED MEMORY',
  skills: 'SKILLS  ≠  MCP', memory: 'HISTORY  →  RETRIEVE', gui: 'EXPECTED  /  UNEXPECTED', healthcare: 'MEMBER  →  PROVIDER  →  PAYER', default: 'NEURAL MASTERY',
};

export default function BlogCover({ slug, series, className = '' }: { slug: string; series?: string | null; className?: string }) {
  const variant = variantFor(slug, series);
  const style = { '--cover-accent': variant === 'healthcare' ? '#bb654b' : '#315c63' } as CSSProperties;
  return <div className={`nm-blog-cover nm-blog-cover-${variant} ${className}`} style={style} role="img" aria-label={`Editorial visual: ${labels[variant]}`}>
    <div className="nm-blog-cover-label">{labels[variant]}</div>
    <svg viewBox="0 0 600 310" aria-hidden="true" focusable="false">
      {variant === 'jeva' && <><circle cx="300" cy="145" r="43"/><text x="300" y="150">REQUEST</text><path d="M260 145H100M340 145h160M300 188v58"/><circle cx="90" cy="145" r="16"/><circle cx="510" cy="145" r="16"/><rect x="220" y="250" width="160" height="34" rx="4"/><text x="300" y="272">A .08  B .71  C .15</text></>}
      {variant === 'jepa' && <><rect x="65" y="95" width="120" height="90" rx="8"/><text x="125" y="145">IMAGE</text><path d="M185 140h70M345 140h70"/><rect x="255" y="95" width="90" height="90" rx="8"/><text x="300" y="145">ENCODE</text><rect x="415" y="95" width="120" height="90" rx="8"/><text x="475" y="145">TARGET</text><path d="M300 195v55M275 235h50"/></>}
      {variant === 'kimi' && <><path d="M65 95H250M65 130H250M65 165H250"/><path d="M350 95h150M350 130h150M350 165h150"/><rect x="255" y="205" width="100" height="55" rx="8"/><text x="305" y="238">MEMORY</text><path d="M305 205V165M305 260v20"/></>}
      {variant === 'skills' && <><circle cx="170" cy="145" r="32"/><text x="170" y="150">AGENT</text><path d="M200 130h110M200 145h110M200 160h110"/><text x="390" y="135">SKILL</text><text x="390" y="160">MCP</text><path d="M330 130l45-10M330 160l45 10"/></>}
      {variant === 'memory' && <><rect x="65" y="115" width="130" height="60" rx="8"/><text x="130" y="150">HISTORY</text><path d="M195 145h75M330 145h75"/><rect x="270" y="115" width="60" height="60" rx="8"/><text x="300" y="150">R</text><rect x="405" y="115" width="130" height="60" rx="8"/><text x="470" y="150">RETRIEVE</text></>}
      {variant === 'gui' && <><rect x="65" y="95" width="150" height="100" rx="8"/><text x="140" y="150">SCREEN t</text><path d="M215 145h100"/><rect x="315" y="95" width="150" height="100" rx="8"/><text x="390" y="150">SCREEN t+1</text><path d="M140 220h250"/></>}
      {variant === 'healthcare' && <><circle cx="130" cy="150" r="38"/><circle cx="300" cy="150" r="38"/><circle cx="470" cy="150" r="38"/><text x="130" y="155">MEMBER</text><text x="300" y="155">CARE</text><text x="470" y="155">PAYER</text><path d="M168 150h94M338 150h94"/></>}
      {variant === 'default' && <><path d="M90 210L180 90l90 120 90-120 90 120"/><circle cx="180" cy="90" r="12"/><circle cx="360" cy="90" r="12"/></>}
    </svg>
  </div>;
}
