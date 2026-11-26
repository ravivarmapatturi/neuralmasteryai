import { describe, expect, it } from 'vitest';
import { DATASETS } from './datasets';
import { MLP, sigmoid } from './mlp';

describe('MLP forward, backprop, and activation capacity', () => {
  it('hand-checks exact forward pass on a 2 -> 2 -> 1 ReLU network', () => {
    const net = new MLP([2, 2, 1], 'relu', 1);
    net.weights = [
      [
        [1, 0],
        [0, -1],
      ],
      [[2, -1]],
    ];
    net.biases = [[0, 0.5], [0]];
    // Input x = [0.6, 0.8]:
    // z1 = [0.6, -0.8 + 0.5 = -0.3] -> ReLU a1 = [0.6, 0]
    // z2 = 2*0.6 + (-1)*0 = 1.2 -> sigmoid(1.2)
    const { activations, zs } = net.forward([0.6, 0.8]);
    expect(zs[0][0]).toBeCloseTo(0.6, 6);
    expect(zs[0][1]).toBeCloseTo(-0.3, 6);
    expect(activations[1]).toEqual([0.6, 0]);
    expect(zs[1][0]).toBeCloseTo(1.2, 6);
    expect(activations[2][0]).toBeCloseTo(sigmoid(1.2), 6);
  });

  it('matches analytical backprop update against central finite differences for tanh, relu, and linear', () => {
    for (const activation of ['tanh', 'relu', 'linear'] as const) {
      const net = new MLP([2, 3, 1], activation, 42);
      const X: [number, number][] = [
        [0.5, -0.4],
        [-0.7, 0.6],
      ];
      const y: (0 | 1)[] = [1, 0];
      const lr = 0.01;
      const l2 = 0.02;

      const beforeW = net.weights[0][1][0];
      const eps = 1e-6;
      const cloneEval = (delta: number) => {
        const copy = new MLP([2, 3, 1], activation, 42);
        copy.weights = net.weights.map((W) => W.map((row) => [...row]));
        copy.biases = net.biases.map((b) => [...b]);
        copy.weights[0][1][0] = beforeW + delta;
        return copy.evaluate(X, y, l2).loss;
      };
      const fdGrad = (cloneEval(eps) - cloneEval(-eps)) / (2 * eps);

      net.step(X, y, lr, l2);
      const impliedGrad = (beforeW - net.weights[0][1][0]) / lr;
      expect(impliedGrad).toBeCloseTo(fdGrad, 5);
    }
  });

  it('proves Linear activation stays near 50% on XOR while tanh 2-layer solves XOR above 90%', () => {
    const xor = DATASETS.xor.generate(120, 7);

    const linearNet = new MLP([2, 6, 6, 1], 'linear', 42);
    for (let i = 0; i < 60; i++) linearNet.step(xor.X, xor.y, 0.5);
    const linearEval = linearNet.evaluate(xor.X, xor.y);
    expect(linearEval.accuracy).toBeLessThan(0.65);

    const nonlinearNet = new MLP([2, 6, 6, 1], 'tanh', 42);
    for (let i = 0; i < 160; i++) nonlinearNet.step(xor.X, xor.y, 1.2);
    const nonlinearEval = nonlinearNet.evaluate(xor.X, xor.y);
    expect(nonlinearEval.accuracy).toBeGreaterThan(0.9);
  });
});
