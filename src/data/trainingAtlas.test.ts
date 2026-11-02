import { describe, expect, it } from 'vitest';
import { trainingAtlas } from './trainingAtlas';

describe('trainingAtlas data', () => {
  const required = [
    'perceptron', 'backprop', 'sgd', 'momentum', 'adam', 'adamw', 'regularization',
    'dropout', 'batch-norm', 'layer-norm', 'early-stopping', 'lr-schedules', 'initialization',
    'bptt', 'cnn-training', 'transfer-learning', 'data-augmentation', 'next-token-pretraining',
    'teacher-forcing', 'mixed-precision', 'gradient-checkpointing', 'gradient-accumulation',
    'distributed-training', 'contrastive-learning', 'mae', 'jepa', 'sft', 'lora', 'qlora',
    'prefix-tuning', 'instruction-tuning', 'rlhf-ppo', 'dpo', 'constitutional-ai', 'kto',
    'grpo', 'distillation', 'curriculum-learning', 'active-learning',
  ];

  it('has complete, unique, source-backed entries', () => {
    expect(trainingAtlas).toHaveLength(required.length);
    expect(trainingAtlas.map((entry) => entry.id)).toEqual(expect.arrayContaining(required));
    expect(new Set(trainingAtlas.map((entry) => entry.id)).size).toBe(trainingAtlas.length);
    for (const entry of trainingAtlas) {
      expect(entry.name).toBeTruthy();
      expect(entry.year).toBeGreaterThan(1900);
      expect(entry.whatItIs.split(/(?<=[.!?])\s+/).length).toBeGreaterThanOrEqual(2);
      expect(entry.previousLimit).toBeTruthy();
      expect(entry.dataPreparation).toMatch(/example/i);
      expect(entry.example).toBeTruthy();
      expect(entry.metrics).toBeTruthy();
      expect(entry.whenNotToUse).toBeTruthy();
      expect(entry.replacedBy).toBeTruthy();
      expect(entry.cameBefore).toBeTruthy();
      expect(entry.ledTo).toBeTruthy();
      expect(entry.learnPath).toMatch(/^\/docs\//);
      expect(() => new URL(entry.source.url)).not.toThrow();
    }
  });
});
