import { render } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';

vi.mock('../../theme/vizTokens', async () => {
  const actual = await vi.importActual<typeof import('../../theme/vizTokens')>('../../theme/vizTokens');
  return { ...actual, useVizTokens: () => actual.LIGHT };
});

import VectorSpaceArrowsDiagram from './VectorSpaceArrowsDiagram';
import CosineAngleDiagram from './CosineAngleDiagram';
import SparseVectorBoxesDiagram from './SparseVectorBoxesDiagram';
import VocabularyMismatchDiagram from './VocabularyMismatchDiagram';
import SearchVsRecLanesDiagram from './SearchVsRecLanesDiagram';
import UserItemMatrixDiagram from './UserItemMatrixDiagram';

describe('Notebook Phase 1 Pilot Diagrams', () => {
  it('renders VectorSpaceArrowsDiagram without crashing', () => {
    const { container } = render(<VectorSpaceArrowsDiagram />);
    expect(container.querySelector('svg')).toBeDefined();
    expect(container.textContent).toContain('Each document is an arrow');
  });

  it('renders CosineAngleDiagram without crashing', () => {
    const { container } = render(<CosineAngleDiagram />);
    expect(container.querySelector('svg')).toBeDefined();
    expect(container.textContent).toContain('The angle between two arrows');
  });

  it('renders SparseVectorBoxesDiagram without crashing', () => {
    const { container } = render(<SparseVectorBoxesDiagram />);
    expect(container.querySelector('svg')).toBeDefined();
    expect(container.textContent).toContain('One box per dictionary word');
  });

  it('renders VocabularyMismatchDiagram without crashing', () => {
    const { container } = render(<VocabularyMismatchDiagram />);
    expect(container.querySelector('svg')).toBeDefined();
    expect(container.textContent).toContain('Same meaning, no shared words');
  });

  it('renders SearchVsRecLanesDiagram without crashing', () => {
    const { container } = render(<SearchVsRecLanesDiagram />);
    expect(container.querySelector('svg')).toBeDefined();
    expect(container.textContent).toContain('Query-Driven Search');
  });

  it('renders UserItemMatrixDiagram without crashing', () => {
    const { container } = render(<UserItemMatrixDiagram />);
    expect(container.querySelector('svg')).toBeDefined();
    expect(container.textContent).toContain('User-Item Interaction Matrix');
  });
});
