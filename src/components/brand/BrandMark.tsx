/**
 * The Neural Mastery mark: a learning curve drawn as a sigmoid, the
 * activation function of a neuron, rising to a single bright point.
 * Same artwork as public/favicon.svg.
 */
export default function BrandMark({ size = 24 }: { size?: number }) {
  return (
    <svg className="nm-brand-mark" viewBox="0 0 64 64" width={size} height={size} fill="none" aria-hidden="true" focusable="false">
      <rect width="64" height="64" rx="15" fill="#06281b" />
      <path d="M11 48C24 48 27 43 31 32S38 17 44 17" stroke="#4ade80" strokeWidth="6.5" strokeLinecap="round" />
      <circle cx="50.5" cy="17" r="6" fill="#ffd84d" />
    </svg>
  );
}
