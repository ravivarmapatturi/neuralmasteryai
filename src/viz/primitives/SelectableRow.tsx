import type { ComponentPropsWithoutRef } from 'react';

type DivProps = ComponentPropsWithoutRef<'div'>;

interface SelectableRowProps extends Omit<DivProps, 'onClick' | 'role' | 'tabIndex' | 'onKeyDown' | 'aria-pressed' | 'aria-label'> {
  selected: boolean;
  label: string;
  onSelect: () => void;
}

/** Shared click-to-select row for the "list of options, click one for detail" diagram
 * family (e.g. ThreeMonitoringLayersDiagram, CloudDeploymentChoiceDiagram). Bakes in
 * keyboard activation and aria-pressed/aria-label so every diagram built on it announces
 * its selection to screen readers without each file reimplementing that by hand.
 * Extra div props (e.g. onMouseEnter for hover-to-preview rows) pass through untouched. */
export default function SelectableRow({ selected, label, onSelect, style, children, ...rest }: SelectableRowProps) {
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
      {...rest}
    >
      {children}
    </div>
  );
}
