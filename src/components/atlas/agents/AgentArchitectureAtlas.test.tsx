import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import { architectureEntries, architectureEras } from '../../../data/agentArchitectureAtlas';
import AgentArchitectureAtlas from './AgentArchitectureAtlas';
import { architectureDiagramIds } from './ArchitectureDiagram';

describe('AgentArchitectureAtlas', () => {
  it('has one diagram per entry and keeps full dates ordered within each era', () => {
    expect(architectureDiagramIds.sort()).toEqual(architectureEntries.map((entry) => entry.id).sort());
    for (const era of architectureEras) {
      const dates = architectureEntries.filter((entry) => entry.era === era.id).map((entry) => entry.date);
      expect(dates).toEqual([...dates].sort());
    }
  });

  it('opens every entry to one labelled 360-unit diagram', () => {
    const { container } = render(<ThemeProvider><AgentArchitectureAtlas /></ThemeProvider>);
    for (const entry of architectureEntries) {
      fireEvent.click(container.querySelector(`button[aria-controls="${entry.id}-details"]`)!);
      const diagram = screen.getByRole('img');
      expect(diagram).toHaveAccessibleName();
      expect(diagram).toHaveAttribute('viewBox', expect.stringMatching(/^0 0 360 /));
    }
  });
});
