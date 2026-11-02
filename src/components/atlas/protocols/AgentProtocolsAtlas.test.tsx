import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { ThemeProvider } from '../../../theme/ThemeProvider';
import { protocolEntries, protocolEras } from '../../../data/agentProtocolsAtlas';
import AgentProtocolsAtlas from './AgentProtocolsAtlas';
import { protocolDiagramIds } from './ProtocolDiagram';

describe('AgentProtocolsAtlas', () => {
  it('has a diagram for every entry and runs in date order within each era', () => {
    expect(protocolDiagramIds.sort()).toEqual(protocolEntries.map((e) => e.id).sort());
    for (const era of protocolEras) {
      const years = protocolEntries.filter((e) => e.era === era.id).map((e) => e.year);
      expect(years).toEqual([...years].sort((a, b) => a - b));
    }
  });

  it('opens every entry to a labelled diagram', () => {
    const { container } = render(<ThemeProvider><AgentProtocolsAtlas /></ThemeProvider>);
    for (const e of protocolEntries) {
      fireEvent.click(container.querySelector(`button[aria-controls="${e.id}-details"]`)!);
      expect(screen.getByRole('img')).toHaveAccessibleName();
    }
  });
});
