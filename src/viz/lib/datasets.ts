// Small, dependency-free toy dataset generators shared by the Decision
// Boundary Playground and Neural Network Playground -- classic 2D
// classification shapes (XOR, circles, moons, blobs, spiral), each
// returning { X: [[x, y], ...], y: [0 | 1, ...] } scaled to roughly [-1, 1].

function mulberry32(seed: number) {
  let a = seed;
  return function rand() {
    a |= 0;
    a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function gaussian(rand: () => number): number {
  const u1 = Math.max(rand(), 1e-6);
  const u2 = rand();
  return Math.sqrt(-2 * Math.log(u1)) * Math.cos(2 * Math.PI * u2);
}

export interface Dataset2D {
  X: [number, number][];
  y: (0 | 1)[];
}

export function makeXOR(n = 200, seed = 1): Dataset2D {
  const rand = mulberry32(seed);
  const X: [number, number][] = [];
  const y: (0 | 1)[] = [];
  for (let i = 0; i < n; i++) {
    const qx = rand() < 0.5 ? -1 : 1;
    const qy = rand() < 0.5 ? -1 : 1;
    X.push([qx * 0.5 + gaussian(rand) * 0.15, qy * 0.5 + gaussian(rand) * 0.15]);
    y.push(qx * qy > 0 ? 1 : 0);
  }
  return { X, y };
}

export function makeCircles(n = 200, seed = 1): Dataset2D {
  const rand = mulberry32(seed);
  const X: [number, number][] = [];
  const y: (0 | 1)[] = [];
  for (let i = 0; i < n; i++) {
    const label: 0 | 1 = i % 2 === 0 ? 0 : 1;
    const r = label === 0 ? 0.35 : 0.85;
    const angle = rand() * 2 * Math.PI;
    const noise = gaussian(rand) * 0.06;
    X.push([(r + noise) * Math.cos(angle), (r + noise) * Math.sin(angle)]);
    y.push(label);
  }
  return { X, y };
}

export function makeMoons(n = 200, seed = 1): Dataset2D {
  const rand = mulberry32(seed);
  const X: [number, number][] = [];
  const y: (0 | 1)[] = [];
  for (let i = 0; i < n; i++) {
    const label: 0 | 1 = i % 2 === 0 ? 0 : 1;
    const angle = rand() * Math.PI;
    const noise = () => gaussian(rand) * 0.08;
    if (label === 0) {
      X.push([Math.cos(angle) + noise(), Math.sin(angle) + noise() - 0.2]);
    } else {
      X.push([1 - Math.cos(angle) + noise(), 1 - Math.sin(angle) - 0.5 + noise()]);
    }
    y.push(label);
  }
  return { X, y };
}

export function makeBlobs(n = 200, seed = 1): Dataset2D {
  const rand = mulberry32(seed);
  const X: [number, number][] = [];
  const y: (0 | 1)[] = [];
  const centers: [number, number][] = [
    [-0.5, -0.4],
    [0.5, 0.4],
  ];
  for (let i = 0; i < n; i++) {
    const label: 0 | 1 = i % 2 === 0 ? 0 : 1;
    const [cx, cy] = centers[label];
    X.push([cx + gaussian(rand) * 0.22, cy + gaussian(rand) * 0.22]);
    y.push(label);
  }
  return { X, y };
}

export function makeSpiral(n = 200, seed = 1): Dataset2D {
  const rand = mulberry32(seed);
  const X: [number, number][] = [];
  const y: (0 | 1)[] = [];
  const half = Math.floor(n / 2);
  for (let i = 0; i < n; i++) {
    const label: 0 | 1 = i % 2 === 0 ? 0 : 1;
    const idx = Math.floor(i / 2);
    const r = (idx / Math.max(1, half)) * 0.92;
    const theta = (idx / Math.max(1, half)) * 2.75 * Math.PI + (label === 1 ? Math.PI : 0);
    X.push([r * Math.cos(theta) + gaussian(rand) * 0.04, r * Math.sin(theta) + gaussian(rand) * 0.04]);
    y.push(label);
  }
  return { X, y };
}

export const DATASETS = {
  xor: { label: 'XOR', generate: makeXOR },
  circles: { label: 'Circles', generate: makeCircles },
  moons: { label: 'Moons', generate: makeMoons },
  blobs: { label: 'Blobs', generate: makeBlobs },
  spiral: { label: 'Spiral', generate: makeSpiral },
};
