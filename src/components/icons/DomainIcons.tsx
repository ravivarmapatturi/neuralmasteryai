/**
 * Seven line-art domain icons, one per top-level SECTION_META group,
 * replacing the plain emoji () used until now. Drawn in the
 * same visual grammar as every interactive diagram elsewhere on this site
 * (src/viz/diagrams/*.tsx): stroke-based, rounded line caps/joins, no
 * heavy fills, a single `color` prop instead of a fixed palette -- so a
 * "Models" icon on the homepage visually rhymes with the network/matrix
 * diagrams a reader actually sees once inside Models, rather than coming
 * from an unrelated stock icon pack.
 *
 * Each is a 24x24 viewBox, stroke-width 1.75, currentColor-free (explicit
 * `color` prop instead) so callers can drive it directly from a domain's
 * SECTION_META color without relying on CSS inheritance.
 */
import type { CSSProperties } from 'react';

export type DomainIconKey = 'foundations' | 'models' | 'agents' | 'systems' | 'safety' | 'research' | 'career';

interface IconProps {
  color: string;
  size?: number;
  style?: CSSProperties;
}

const SW = 1.75;
const commonProps = { fill: 'none', strokeLinecap: 'round' as const, strokeLinejoin: 'round' as const };

function FoundationsIcon({ color, size = 20, style }: IconProps) {
  // Stacked layer-bars, widening toward the base -- the entry point everything else builds on.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden="true">
      <rect x="8" y="4" width="8" height="4" rx="1" stroke={color} strokeWidth={SW} {...commonProps} />
      <rect x="5" y="10" width="14" height="4" rx="1" stroke={color} strokeWidth={SW} {...commonProps} />
      <rect x="2" y="16" width="20" height="4" rx="1" stroke={color} strokeWidth={SW} {...commonProps} />
    </svg>
  );
}

function ModelsIcon({ color, size = 20, style }: IconProps) {
  // A small connected node graph -- ties directly to the network/matrix
  // diagrams used throughout the Models section itself.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden="true">
      <line x1="6" y1="6" x2="12" y2="12" stroke={color} strokeWidth={SW} {...commonProps} />
      <line x1="18" y1="6" x2="12" y2="12" stroke={color} strokeWidth={SW} {...commonProps} />
      <line x1="6" y1="18" x2="12" y2="12" stroke={color} strokeWidth={SW} {...commonProps} />
      <line x1="18" y1="18" x2="12" y2="12" stroke={color} strokeWidth={SW} {...commonProps} />
      <circle cx="6" cy="6" r="2.25" stroke={color} strokeWidth={SW} {...commonProps} />
      <circle cx="18" cy="6" r="2.25" stroke={color} strokeWidth={SW} {...commonProps} />
      <circle cx="6" cy="18" r="2.25" stroke={color} strokeWidth={SW} {...commonProps} />
      <circle cx="18" cy="18" r="2.25" stroke={color} strokeWidth={SW} {...commonProps} />
      <circle cx="12" cy="12" r="2.75" fill={color} stroke="none" />
    </svg>
  );
}

function AgentsIcon({ color, size = 20, style }: IconProps) {
  // A circular loop-arrow -- the actual agent-loop framing used elsewhere
  // on this site, not a generic robot face.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden="true">
      <path d="M19 12a7 7 0 1 1-2.1-5" stroke={color} strokeWidth={SW} {...commonProps} />
      <path d="M19 4v4.5h-4.5" stroke={color} strokeWidth={SW} {...commonProps} />
    </svg>
  );
}

function SystemsIcon({ color, size = 20, style }: IconProps) {
  // Stacked server-rack bars.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden="true">
      <rect x="3" y="3.5" width="18" height="5.5" rx="1.25" stroke={color} strokeWidth={SW} {...commonProps} />
      <rect x="3" y="15" width="18" height="5.5" rx="1.25" stroke={color} strokeWidth={SW} {...commonProps} />
      <circle cx="6.5" cy="6.25" r="0.9" fill={color} stroke="none" />
      <circle cx="6.5" cy="17.75" r="0.9" fill={color} stroke="none" />
    </svg>
  );
}

function SafetyIcon({ color, size = 20, style }: IconProps) {
  // A clean shield outline, redrawn in-house instead of an emoji.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden="true">
      <path
        d="M12 3.5 5 6v5.2c0 4.5 3 7.6 7 9.3 4-1.7 7-4.8 7-9.3V6l-7-2.5Z"
        stroke={color}
        strokeWidth={SW}
        {...commonProps}
      />
      <path d="M9 12.1 11.1 14.2 15.2 9.8" stroke={color} strokeWidth={SW} {...commonProps} />
    </svg>
  );
}

function ResearchIcon({ color, size = 20, style }: IconProps) {
  // A magnifying glass over a small grid -- reading the literature and
  // looking closely at real systems, together.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden="true">
      <rect x="3.5" y="3.5" width="10" height="10" rx="1" stroke={color} strokeWidth={1.25} opacity={0.55} {...commonProps} />
      <line x1="6" y1="3.5" x2="6" y2="13.5" stroke={color} strokeWidth={1} opacity={0.4} />
      <line x1="9" y1="3.5" x2="9" y2="13.5" stroke={color} strokeWidth={1} opacity={0.4} />
      <line x1="11.5" y1="3.5" x2="11.5" y2="13.5" stroke={color} strokeWidth={1} opacity={0.4} />
      <line x1="3.5" y1="6" x2="13.5" y2="6" stroke={color} strokeWidth={1} opacity={0.4} />
      <line x1="3.5" y1="9" x2="13.5" y2="9" stroke={color} strokeWidth={1} opacity={0.4} />
      <line x1="3.5" y1="11.5" x2="13.5" y2="11.5" stroke={color} strokeWidth={1} opacity={0.4} />
      <circle cx="14" cy="14" r="5" stroke={color} strokeWidth={SW} fill="var(--nm-bg, #fff)" strokeLinecap="round" strokeLinejoin="round" />
      <line x1="17.8" y1="17.8" x2="21.5" y2="21.5" stroke={color} strokeWidth={SW} strokeLinecap="round" />
    </svg>
  );
}

function CareerIcon({ color, size = 20, style }: IconProps) {
  // A dotted ascending path to a flag -- tying everything together,
  // interview-ready -- instead of a generic bullseye target.
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" style={style} aria-hidden="true">
      <path
        d="M3 20 C6 20 6 15 9 15 C12 15 12 10 15 10"
        stroke={color}
        strokeWidth={SW}
        strokeDasharray="0.1 3.2"
        {...commonProps}
      />
      <line x1="16" y1="4" x2="16" y2="12" stroke={color} strokeWidth={SW} {...commonProps} />
      <path d="M16 4.5 L21 6.5 L16 8.5 Z" fill={color} stroke={color} strokeWidth={SW} {...commonProps} />
    </svg>
  );
}

const REGISTRY: Record<DomainIconKey, (p: IconProps) => ReturnType<typeof FoundationsIcon>> = {
  foundations: FoundationsIcon,
  models: ModelsIcon,
  agents: AgentsIcon,
  systems: SystemsIcon,
  safety: SafetyIcon,
  research: ResearchIcon,
  career: CareerIcon,
};

/** SECTION_META key (e.g. "/docs/category/models") -> DomainIconKey. Kept
 * as an explicit map rather than parsed from the URL, so the icon
 * assignment survives a label/URL rename without silently breaking. */
export const DOMAIN_ICON_BY_GROUP_KEY: Record<string, DomainIconKey> = {
  '/docs/category/foundations': 'foundations',
  '/docs/category/models': 'models',
  '/docs/category/agents--applications': 'agents',
  '/docs/category/systems--infrastructure': 'systems',
  '/docs/category/safety--evaluation': 'safety',
  '/docs/category/research--build': 'research',
  '/docs/category/career': 'career',
};

/** Render a domain icon by SECTION_META group key. Falls back to a plain
 * dot for any key not in the registry, so an unmapped/future group never
 * renders nothing. */
export function DomainIcon({ groupKey, color, size, style }: { groupKey: string } & IconProps) {
  const iconKey = DOMAIN_ICON_BY_GROUP_KEY[groupKey];
  if (!iconKey) {
    return (
      <svg width={size ?? 20} height={size ?? 20} viewBox="0 0 24 24" style={style} aria-hidden="true">
        <circle cx="12" cy="12" r="4" fill={color} />
      </svg>
    );
  }
  const Icon = REGISTRY[iconKey];
  return <Icon color={color} size={size} style={style} />;
}
