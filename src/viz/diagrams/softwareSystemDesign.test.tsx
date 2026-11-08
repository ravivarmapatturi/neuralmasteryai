import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});
import SoftwareCapacityExplorer from './SoftwareCapacityExplorer';
import SoftwareReplicationExplorer from './SoftwareReplicationExplorer';
import SoftwareDeliveryTrace from './SoftwareDeliveryTrace';
import SoftwareQuorumExplorer from './SoftwareQuorumExplorer';
import SoftwareRecoveryExplorer from './SoftwareRecoveryExplorer';
import SoftwareCaseTrace from './SoftwareCaseTrace';

describe('software design experiments', () => {
  it('requires fourteen instances to retain target failure capacity', () => {
    render(<SoftwareCapacityExplorer/>);
    expect(screen.getByRole('status')).toHaveTextContent('100.0%');
    fireEvent.change(screen.getByRole('slider'), {target:{value:'14'}});
    expect(screen.getByRole('status')).toHaveTextContent('9 survivors · 66.7%');
  });
  it('shows replica lag after acknowledgment and convergence later', () => {
    render(<SoftwareReplicationExplorer/>);
    expect(screen.getByRole('img')).toHaveAttribute('aria-label','Primary version 8, replica version 7');
    fireEvent.click(screen.getByText('Replica catches up'));
    expect(screen.getByRole('img')).toHaveAttribute('aria-label','Primary version 8, replica version 8');
  });
  it('exposes duplicate effects when deduplication is removed', () => {
    render(<SoftwareDeliveryTrace/>);
    expect(screen.getByRole('status')).toHaveTextContent('1');
    fireEvent.click(screen.getByText('No deduplication'));
    expect(screen.getByRole('status')).toHaveTextContent('2');
  });
  it('refuses progress without a majority', () => {
    render(<SoftwareQuorumExplorer/>);
    fireEvent.change(screen.getByRole('slider'),{target:{value:'2'}});
    expect(screen.getByRole('status')).toHaveTextContent('No majority');
  });
  it('separates restore duration from backup age', () => {
    render(<SoftwareRecoveryExplorer/>);
    fireEvent.change(screen.getAllByRole('slider')[0],{target:{value:'60'}});
    expect(screen.getByRole('status')).toHaveTextContent('50 minutes');
  });
  it('changes the payment trace from unknown outcome to normal commit', () => {
    render(<SoftwareCaseTrace scenario="payment-system"/>);
    expect(screen.getByRole('img')).toHaveAttribute('aria-label',expect.stringContaining('mark outcome unknown'));
    fireEvent.click(screen.getByText('Normal path'));
    expect(screen.getByRole('img')).toHaveAttribute('aria-label',expect.stringContaining('commit balanced result'));
    expect(screen.getByRole('img')).not.toHaveAttribute('aria-label',expect.stringContaining('mark outcome unknown'));
  });
});
