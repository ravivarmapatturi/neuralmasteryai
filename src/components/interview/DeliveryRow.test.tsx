import { expect, it } from 'vitest';
import { screen } from '@testing-library/react';
import { renderWithTheme } from '../../../tests/unit/renderWithProviders';
import { DeliveryRow } from './DeliveryRow';

it('shows a plain numeric row and omits unavailable speech measurements', () => {
  const {rerender} = renderWithTheme(<DeliveryRow />);
  expect(screen.queryByRole('group')).not.toBeInTheDocument();
  rerender(<DeliveryRow delivery={{durationSeconds:120,speakingSeconds:100,wordsPerMinute:110,wordCount:220,longPauses:2,
    fillers:{um:1,uh:1,like:2,'you know':1,basically:0,actually:0}}} />);
  const row = screen.getByRole('group', {name:'Delivery measurements'});
  expect(row).toHaveTextContent('Time 2:00 / ~2:00');
  expect(row).toHaveTextContent('Speaking 1:40');
  expect(row).toHaveTextContent('110 words/min');
  expect(row).toHaveTextContent('5 filler matches');
  expect(row).toHaveTextContent('2 pauses >3s');
  expect(row).not.toHaveTextContent(/grade|score|good|bad/i);
});
