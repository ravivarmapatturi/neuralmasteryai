/**
 * The Neural Mastery mark: a hand-drawn "N" on a green tile, underlined
 * with a highlighter stroke like the notes in the lessons. Same artwork
 * as public/favicon.svg.
 */
export default function BrandMark({ size = 24 }: { size?: number }) {
  return (
    <svg className="nm-brand-mark" viewBox="0 0 64 64" width={size} height={size} aria-hidden="true" focusable="false">
      <defs>
        <linearGradient id="nm-brand-g" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0" stopColor="#1a9a57" />
          <stop offset="1" stopColor="#0c6a3a" />
        </linearGradient>
      </defs>
      <rect width="64" height="64" rx="14" fill="url(#nm-brand-g)" />
      <path d="M14 51.5C25 49.4 39 50.2 50 48.4" fill="none" stroke="#ffd84d" strokeWidth="5" strokeLinecap="round" />
      <path d="M20 41.5C19.5 33 20.5 22 20 13.5L44 41C44.5 32 43.6 22 44 13.5" fill="none" stroke="#fffdf5" strokeWidth="7.5" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
