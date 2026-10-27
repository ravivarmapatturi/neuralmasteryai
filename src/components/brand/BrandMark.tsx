/**
 * The Neural Mastery mark: an "N" drawn as a small network, three
 * connections joining four nodes. Same artwork as public/favicon.svg. In
 * dark mode the tile gets a hairline border so it doesn't merge into the
 * dark navbar (see .nm-brand-mark in theme.css).
 */
export default function BrandMark({ size = 24 }: { size?: number }) {
  return (
    <svg className="nm-brand-mark" viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="15" fill="#1c2230" />
      <path d="M19 45V19L45 45V19" fill="none" stroke="#faf4e6" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" />
      <g fill="#7fd99a">
        <circle cx="19" cy="45" r="5" />
        <circle cx="19" cy="19" r="5" />
        <circle cx="45" cy="45" r="5" />
        <circle cx="45" cy="19" r="5" />
      </g>
    </svg>
  );
}
