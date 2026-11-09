import { useState } from 'react';
import { fireEvent, screen } from '@testing-library/react';
import { expect, it } from 'vitest';
import { renderWithTheme } from '../../../tests/unit/renderWithProviders';
import { SystemDesignCanvas } from './SystemDesignCanvas';
import { emptySketch } from '../../lib/systemDesignSketch';

function Harness() {
  const [value, setValue] = useState(emptySketch);
  return <><SystemDesignCanvas value={value} onChange={setValue} /><output data-testid="graph">{JSON.stringify(value)}</output></>;
}
it('adds, renames, moves, connects, deletes, clears and undoes through keyboard-accessible controls', () => {
  renderWithTheme(<Harness />);
  fireEvent.click(screen.getByRole('button',{name:'client'}));
  fireEvent.click(screen.getByRole('button',{name:'API'}));
  fireEvent.click(screen.getByRole('button',{name:'client box'}));
  fireEvent.change(screen.getByLabelText('Box label'),{target:{value:'Browser'}});
  const graph = () => JSON.parse(screen.getByTestId('graph').textContent!);
  fireEvent.keyDown(screen.getByRole('button',{name:'Browser box'}),{key:'ArrowRight'});
  expect(graph().nodes[0].x).toBe(2);
  fireEvent.click(screen.getByRole('button',{name:'Draw arrow'}));
  fireEvent.click(screen.getByRole('button',{name:'Browser box'}));
  fireEvent.click(screen.getByRole('button',{name:'API box'}));
  expect(graph().edges).toHaveLength(1);
  fireEvent.keyDown(screen.getByRole('button',{name:'API box'}),{key:'Delete'});
  expect(graph().edges).toHaveLength(0);
  fireEvent.click(screen.getByRole('button',{name:'Undo'}));
  expect(graph().edges).toHaveLength(1);
  fireEvent.click(screen.getByRole('button',{name:'Clear'}));
  expect(graph().nodes).toHaveLength(0);
  fireEvent.click(screen.getByRole('button',{name:'Undo'}));
  expect(graph().nodes).toHaveLength(2);
});
it('shows a read-only saved graph without editing controls', () => {
  renderWithTheme(<SystemDesignCanvas value={{nodes:[{id:'a',label:'API',x:0,y:0}],edges:[]}} title="Reference architecture" />);
  expect(screen.getByRole('region',{name:'Reference architecture'})).toBeInTheDocument();
  expect(screen.queryByRole('button',{name:'Clear'})).not.toBeInTheDocument();
});
