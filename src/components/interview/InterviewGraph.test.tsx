import { render, screen, fireEvent } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import { InterviewGraph, type GraphTopic } from './InterviewGraph';

const sampleTopics: GraphTopic[] = [
  { id: 'math-classical-ml', title: 'Mathematics & Classical ML', group: 'foundations', count: 20, done: 0 },
  { id: 'deep-learning', title: 'Deep Learning', group: 'foundations', count: 20, done: 0 },
  { id: 'transformers', title: 'Transformers', group: 'models', count: 24, done: 0 },
  { id: 'tokenization-decoding', title: 'Tokenization & Decoding', group: 'models', count: 16, done: 0 },
  { id: 'post-training', title: 'Post-Training (RLHF & DPO)', group: 'models', count: 18, done: 0 },
  { id: 'inference-serving', title: 'Inference Serving & Engines', group: 'applications', count: 22, done: 0 },
  { id: 'gpu-memory-quantization', title: 'GPU Memory & Quantization', group: 'applications', count: 20, done: 0 },
  { id: 'rag', title: 'Retrieval-Augmented Generation (RAG)', group: 'applications', count: 26, done: 0 },
  { id: 'prompting-structured-output', title: 'Prompting & Structured Outputs', group: 'applications', count: 18, done: 0 },
  { id: 'evaluation', title: 'Evaluation & Benchmarks', group: 'agents', count: 20, done: 0 },
  { id: 'multimodal', title: 'Multimodal Architectures', group: 'agents', count: 15, done: 0 },
  { id: 'protocols', title: 'Protocols (MCP & A2A)', group: 'agents', count: 14, done: 0 },
  { id: 'agents', title: 'Agent Architectures & Tool Use', group: 'agents', count: 25, done: 0 },
  { id: 'multi-agent', title: 'Multi-Agent Coordination', group: 'agents', count: 16, done: 0 },
  { id: 'sandboxes', title: 'Agent Sandboxes & Execution Isolation', group: 'production', count: 14, done: 0 },
  { id: 'evidence-reverse-engineering', title: 'Reverse Engineering & Evidence', group: 'production', count: 12, done: 0 },
  { id: 'production-mlops', title: 'Production MLOps & Serving', group: 'production', count: 22, done: 0 },
  { id: 'cost-capacity', title: 'Cost, Capacity & Latency Optimization', group: 'production', count: 18, done: 0 },
  { id: 'safety', title: 'Safety, Alignment & Red-Teaming', group: 'production', count: 16, done: 0 },
  { id: 'system-design', title: 'AI System Design', group: 'rounds', count: 30, done: 0 },
  { id: 'debug', title: 'Debug this', group: 'rounds', count: 30, done: 0 },
  { id: 'coding', title: 'Coding Exercises', group: 'rounds', count: 20, done: 0 },
  { id: 'behavioral', title: 'Behavioral & Leadership', group: 'rounds', count: 15, done: 0 },
];

describe('InterviewGraph component', () => {
  it('renders in 0% state with clean base titles and accessible labels', () => {
    const onActivate = vi.fn();
    render(<InterviewGraph topics={sampleTopics} activeId="transformers" onActivate={onActivate} />);

    // Accessible labels state 0% completed
    const transformersBtn = screen.getByRole('button', {
      name: /Transformers, 0% completed, 0 of 24 questions/i,
    });
    expect(transformersBtn).toBeInTheDocument();

    // Every card shows its percentage, untouched topics included
    expect(transformersBtn).toHaveTextContent('Transformers 0%');

    // Group totals strip displays all groups
    const groupTotals = screen.getByRole('region', { name: /topic group totals/i });
    expect(groupTotals).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Models group: 0 of 58 questions completed \(0%\)/i })).toBeInTheDocument();
  });

  it('renders partial progress with percentage visible on label and in aria-label', () => {
    const onActivate = vi.fn();
    // 10 / 24 = 42%
    const partialTopics = sampleTopics.map((t) =>
      t.id === 'transformers' ? { ...t, done: 10 } : t
    );

    render(<InterviewGraph topics={partialTopics} activeId="transformers" onActivate={onActivate} />);

    // Topic button label shows "Transformers 42%"
    const transformersBtn = screen.getByRole('button', {
      name: /Transformers, 42% completed, 10 of 24 questions/i,
    });
    expect(transformersBtn).toBeInTheDocument();
    expect(transformersBtn).toHaveTextContent('Transformers 42%');

    // Group totals for Models should reflect 10 completed out of 58 questions (17%)
    expect(screen.getByRole('button', { name: /Models group: 10 of 58 questions completed \(17%\)/i })).toBeInTheDocument();
  });

  it('renders 100% complete state with .is-complete class and full percentage', () => {
    const onActivate = vi.fn();
    const fullTopics = sampleTopics.map((t) =>
      t.id === 'transformers' ? { ...t, done: 24 } : t
    );

    render(<InterviewGraph topics={fullTopics} activeId="transformers" onActivate={onActivate} />);

    const transformersBtn = screen.getByRole('button', {
      name: /Transformers, 100% completed, 24 of 24 questions/i,
    });
    expect(transformersBtn).toBeInTheDocument();
    expect(transformersBtn).toHaveTextContent('Transformers 100%');
    expect(transformersBtn.className).toContain('is-complete');
  });

  it('draws a branch from the centre to every topic, coloured by how much is done', () => {
    const topics = sampleTopics.map((t) => (t.id === 'transformers' ? { ...t, done: 12 } : t));
    const { container } = render(<InterviewGraph topics={topics} activeId="rag" onActivate={vi.fn()} />);

    expect(container.querySelector('.si-hub')).toHaveTextContent('Interview practice');
    const branches = container.querySelectorAll('.si-branch');
    expect(branches).toHaveLength(sampleTopics.length);
    const started = container.querySelector('.si-branch[data-topic="transformers"]')!;
    const untouched = container.querySelector('.si-branch[data-topic="rag"]')!;
    expect(started.getAttribute('class')).toContain('lvl-2');
    expect(untouched.getAttribute('class')).toContain('lvl-0');

    // The card carries the same colour and a filled bar
    const card = screen.getByRole('button', { name: /Transformers, 50% completed/i });
    expect(card.className).toContain('lvl-2');
    expect(card.querySelector<HTMLElement>('.si-bar i')!.style.width).toBe('50%');
    expect(screen.queryByRole('region', { name: /completion progress legend/i })).toBeNull();
  });

  it('calls onActivate when a topic node or group pill is clicked', () => {
    const onActivate = vi.fn();
    render(<InterviewGraph topics={sampleTopics} activeId="transformers" onActivate={onActivate} />);

    // Click Classical ML
    const mlBtn = screen.getByRole('button', { name: /Mathematics & Classical ML, 0% completed/i });
    fireEvent.click(mlBtn);
    expect(onActivate).toHaveBeenCalledWith('math-classical-ml');

    // Click Foundations group pill -> should activate its first topic (math-classical-ml)
    const foundationsPill = screen.getByRole('button', { name: /Foundations group/i });
    fireEvent.click(foundationsPill);
    expect(onActivate).toHaveBeenCalledWith('math-classical-ml');
  });
});
