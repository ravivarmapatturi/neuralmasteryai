import type { CSSProperties, ReactNode } from 'react';

interface SelectableRowProps {
  selected: boolean;
  label: string;
  onSelect: () => void;
  style?: CSSProperties;
  children: ReactNode;
}

/** Shared click-to-select row for the "list of options, click one for detail" diagram
 * family (e.g. ThreeMonitoringLayersDiagram, CloudDeploymentChoiceDiagram). Bakes in
 * keyboard activation and aria-pressed/aria-label so every diagram built on it announces
 * its selection to screen readers without each file reimplementing that by hand. */
export default function SelectableRow({ selected, label, onSelect, style, children }: SelectableRowProps) {
  return (
    <div
      onClick={onSelect}
      role="button"
      tabIndex={0}
      aria-pressed={selected}
      aria-label={label}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
      style={{ cursor: 'pointer', ...style }}
    >
      {children}
    </div>
  );
}
