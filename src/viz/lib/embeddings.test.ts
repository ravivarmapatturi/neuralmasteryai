import { describe, expect, it } from 'vitest'
import { analogy, CATEGORIES, combineWordVectors, cosineSim, fitPca2D, nearestNeighbors, pca2D, projectVector2D, rankVector, VOCAB } from './embeddings'

describe('cosineSim', () => {
  it('is 1 for identical vectors', () => {
    expect(cosineSim([1, 2, 3], [1, 2, 3])).toBeCloseTo(1, 10)
  })

  it('is 0 for orthogonal vectors', () => {
    expect(cosineSim([1, 0], [0, 1])).toBe(0)
  })

  it('returns 0 rather than NaN when either vector is all zeros', () => {
    expect(cosineSim([0, 0, 0], [1, 2, 3])).toBe(0)
  })
})

describe('VOCAB', () => {
  it('is deterministic across calls (same seeded hash per word, not re-randomized per import)', () => {
    // embeddings.ts seeds its RNG from a hash of the word itself, not Math.random --
    // re-deriving the vector for the same word must reproduce the exact same numbers,
    // which is what makes nearestNeighbors/analogy results stable for readers.
    const king1 = VOCAB.find((v) => v.word === 'king')!.vector
    const king2 = VOCAB.find((v) => v.word === 'king')!.vector
    expect(king1).toEqual(king2)
  })

  it('covers every declared category', () => {
    const seen = new Set(VOCAB.map((v) => v.category))
    for (const c of CATEGORIES) expect(seen.has(c)).toBe(true)
  })
})

describe('nearestNeighbors', () => {
  it("'dog's nearest neighbors are all other animals, well-separated from any other category", () => {
    const neighbors = nearestNeighbors('dog', 5)
    expect(neighbors.map((n) => n.word)).toEqual(
      expect.arrayContaining(['dolphin', 'eagle', 'lion', 'wolf', 'cat']),
    )
    for (const n of neighbors) {
      expect(VOCAB.find((v) => v.word === n.word)?.category).toBe('animals')
    }
  })

  it('never returns the query word itself', () => {
    const neighbors = nearestNeighbors('dog', VOCAB.length)
    expect(neighbors.some((n) => n.word === 'dog')).toBe(false)
  })

  it('is sorted by similarity descending', () => {
    const neighbors = nearestNeighbors('cat', 8)
    for (let i = 1; i < neighbors.length; i++) {
      expect(neighbors[i].sim).toBeLessThanOrEqual(neighbors[i - 1].sim)
    }
  })

  it('returns an empty array for a word not in the vocabulary', () => {
    expect(nearestNeighbors('nonexistent-word')).toEqual([])
  })
})

describe('analogy (vector arithmetic: a - b + c)', () => {
  it("king - man + woman => queen, by a wide margin (the canonical embedding-analogy story)", () => {
    const results = analogy('king', 'man', 'woman', 4)
    expect(results[0].word).toBe('queen')
    // Real signal, not a coin flip: queen should beat the runner-up decisively.
    expect(results[0].sim).toBeGreaterThan(results[1].sim + 0.5)
  })

  it('is consistent in reverse: queen - woman + man => king', () => {
    const results = analogy('queen', 'woman', 'man', 4)
    expect(results[0].word).toBe('king')
  })

  it('excludes the three input words from the results', () => {
    const results = analogy('king', 'man', 'woman', VOCAB.length)
    expect(results.some((r) => ['king', 'man', 'woman'].includes(r.word))).toBe(false)
  })

  it('returns an empty array when any input word is missing from the vocabulary', () => {
    expect(analogy('king', 'not-a-word', 'woman')).toEqual([])
  })
})

describe('pca2D', () => {
  it('returns one 2D point per input vector, in the same order', () => {
    const sample = VOCAB.slice(0, 10)
    const points = pca2D(sample)
    expect(points).toHaveLength(sample.length)
    for (const p of points) {
      expect(p).toHaveLength(2)
      expect(Number.isFinite(p[0])).toBe(true)
      expect(Number.isFinite(p[1])).toBe(true)
    }
  })

  it('is deterministic (seeded power iteration, not Math.random)', () => {
    const sample = VOCAB.slice(0, 12)
    expect(pca2D(sample)).toEqual(pca2D(sample))
  })

  it('separates a clearly bimodal set (royalty vs. weather) along the first component', () => {
    const royalty = VOCAB.filter((v) => v.category === 'royalty')
    const weather = VOCAB.filter((v) => v.category === 'weather')
    const points = pca2D([...royalty, ...weather])
    const royaltyX = points.slice(0, royalty.length).map((p) => p[0])
    const weatherX = points.slice(royalty.length).map((p) => p[0])
    const royaltyMean = royaltyX.reduce((a, b) => a + b, 0) / royaltyX.length
    const weatherMean = weatherX.reduce((a, b) => a + b, 0) / weatherX.length
    // The two category clusters should sit on opposite sides of the projection's mean.
    expect(Math.sign(royaltyMean)).not.toBe(Math.sign(weatherMean))
  })

  it('gives every category equal fitting weight so category centres remain spread in 2D', () => {
    const points = pca2D(VOCAB)
    const centres = CATEGORIES.map((category) => {
      const categoryPoints = VOCAB.flatMap((entry, index) => entry.category === category ? [points[index]] : [])
      return [
        categoryPoints.reduce((sum, point) => sum + point[0], 0) / categoryPoints.length,
        categoryPoints.reduce((sum, point) => sum + point[1], 0) / categoryPoints.length,
      ]
    })
    const closestPair = Math.min(...centres.flatMap((centre, index) => centres.slice(index + 1).map((other) => (
      Math.hypot(centre[0] - other[0], centre[1] - other[1])
    ))))
    expect(closestPair).toBeGreaterThan(0.35)
  })
})

describe('editable vector explorer calculations', () => {
  it('combines word vectors with the visible coefficients', () => {
    const king = VOCAB.find((entry) => entry.word === 'king')!.vector
    const man = VOCAB.find((entry) => entry.word === 'man')!.vector
    const woman = VOCAB.find((entry) => entry.word === 'woman')!.vector
    const combined = combineWordVectors([
      { word: 'king', coefficient: 1 },
      { word: 'man', coefficient: -1 },
      { word: 'woman', coefficient: 1 },
    ])
    combined.forEach((value, index) => {
      expect(value).toBeCloseTo(king[index] - man[index] + woman[index], 12)
    })
  })

  it('ranks hand-checked vectors correctly for cosine and L2', () => {
    const toy = [
      { word: 'same direction', category: 'toy', vector: [2, 0] },
      { word: 'nearby', category: 'toy', vector: [1, 0.5] },
      { word: 'orthogonal', category: 'toy', vector: [0, 1] },
    ]
    expect(rankVector([1, 0], 'cosine', 3, [], toy)[0].word).toBe('same direction')
    expect(rankVector([1, 0], 'cosine', 3, [], toy)[0].score).toBe(1)
    expect(rankVector([1, 0], 'euclidean', 3, [], toy)[0].word).toBe('nearby')
    expect(rankVector([1, 0], 'euclidean', 3, [], toy)[0].score).toBeCloseTo(0.5, 12)
  })

  it('projects a fitted vocabulary row to the same PCA point shown by pca2D', () => {
    const sample = VOCAB.slice(0, 12)
    const model = fitPca2D(sample)
    expect(projectVector2D(sample[3].vector, model)).toEqual(pca2D(sample)[3])
  })
})
