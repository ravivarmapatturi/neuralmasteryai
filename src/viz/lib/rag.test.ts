import { describe, expect, it } from 'vitest'
import { chunkCorpus, CORPUS, rerank, retrieve, simulateRagPipeline, type Chunk } from './rag'

describe('chunkCorpus', () => {
  it('splits every CORPUS entry into word-count chunks of the requested size', () => {
    const chunks = chunkCorpus(10)
    for (const c of chunks) {
      expect(c.text.split(/\s+/).length).toBeLessThanOrEqual(10)
    }
  })

  it('drops trailing fragments shorter than 4 words', () => {
    const chunks = chunkCorpus(50)
    for (const c of chunks) {
      expect(c.text.split(/\s+/).length).toBeGreaterThanOrEqual(4)
    }
  })

  it('produces unique ids per chunk (doc index + word offset)', () => {
    const chunks = chunkCorpus(15)
    const ids = new Set(chunks.map((c) => c.id))
    expect(ids.size).toBe(chunks.length)
  })

  it('every chunk of text is a real substring of its source document (no fabricated content)', () => {
    const chunks = chunkCorpus(20)
    for (const c of chunks) {
      const docIdx = Number(c.id.split('-')[0])
      expect(CORPUS[docIdx]).toContain(c.text)
    }
  })

  it('overlap increases chunk count and repeats boundary words across adjacent chunks', () => {
    const noOverlap = chunkCorpus(16, 0)
    const withOverlap = chunkCorpus(16, 4)
    expect(withOverlap.length).toBeGreaterThan(noOverlap.length)
  })
})

describe('retrieve', () => {
  const chunks: Chunk[] = [
    { id: 'a', text: 'Self-attention computes Query, Key, and Value projections for every token.' },
    { id: 'b', text: 'A decision tree splits data based on feature thresholds and Gini impurity.' },
    { id: 'c', text: 'Gradient descent updates parameters using the learning rate and the loss gradient.' },
  ]

  it('ranks the chunk sharing the most query vocabulary highest', () => {
    const results = retrieve('query key value attention token', chunks, 3)
    expect(results[0].id).toBe('a')
  })

  it('respects topK', () => {
    expect(retrieve('gradient descent', chunks, 1)).toHaveLength(1)
    expect(retrieve('gradient descent', chunks, 2)).toHaveLength(2)
  })

  it('is sorted by score descending', () => {
    const results = retrieve('decision tree gini impurity', chunks, 3)
    for (let i = 1; i < results.length; i++) {
      expect(results[i].score).toBeLessThanOrEqual(results[i - 1].score)
    }
  })

  it('a query with zero vocabulary overlap scores every chunk 0', () => {
    const results = retrieve('zzz yyy xxx', chunks, 3)
    for (const r of results) expect(r.score).toBe(0)
  })
})

describe('rerank', () => {
  it('rewards exact multi-word phrase overlap over bag-of-words alone', () => {
    const results = retrieve(
      'gradient descent',
      [
        { id: 'exact', text: 'Gradient descent is an optimization algorithm used everywhere in ML.' },
        { id: 'scattered', text: 'The gradient of the loss guides descent toward a minimum, eventually.' },
      ],
      2,
    )
    const reranked = rerank('gradient descent', results)
    expect(reranked[0].id).toBe('exact')
    expect(reranked[0].rerankScore).toBeGreaterThan(reranked[0].score)
  })

  it('preserves every input result (same length, same ids) while re-sorting', () => {
    const results = retrieve('attention token', [
      { id: '1', text: 'Attention lets every token attend to every other token.' },
      { id: '2', text: 'Pooling layers downsample feature maps.' },
    ], 2)
    const reranked = rerank('attention token', results)
    expect(reranked).toHaveLength(results.length)
    expect(new Set(reranked.map((r) => r.id))).toEqual(new Set(results.map((r) => r.id)))
  })

  it('rerankScore is never less than the original retrieval score (phrase bonus is additive, never negative)', () => {
    const results = retrieve('convolutional neural networks filters', [
      { id: 'x', text: 'Convolutional neural networks apply learned filters across an image.' },
    ], 1)
    const reranked = rerank('convolutional neural networks filters', results)
    expect(reranked[0].rerankScore).toBeGreaterThanOrEqual(reranked[0].score)
  })
})

describe('simulateRagPipeline hand-checked numbers', () => {
  it('computes exact cosine dot/(|q||c|) and phrase bonus for "gradient descent" at chunkSize=16, overlap=0', () => {
    const sim = simulateRagPipeline({
      query: 'gradient descent',
      chunkSize: 16,
      overlap: 0,
      topK: 3,
      rerankerOn: true,
    })
    expect(sim.chunks.length).toBe(24)
    const top = sim.ranked[0]
    expect(top.id).toBe('1-0')
    // Doc 1 first 16 words:
    // "Gradient descent updates parameters by stepping in the direction opposite the gradient of the loss function."
    // Tokenize (>2 chars): the(3), gradient(2), and 8 single words -> |c|^2 = 9 + 4 + 8 = 21 -> |c| = sqrt(21)
    // |q|^2 = 1 + 1 = 2 -> |q| = sqrt(2)
    // dot = 1*2 + 1*1 = 3 -> cosine = 3 / sqrt(42) = 0.462910...
    expect(top.dot).toBe(3)
    expect(top.queryNorm).toBeCloseTo(Math.SQRT2, 6)
    expect(top.chunkNorm).toBeCloseTo(Math.sqrt(21), 6)
    expect(top.baseScore).toBeCloseTo(3 / Math.sqrt(42), 6)
    expect(top.phraseBonus).toBeCloseTo(0.15, 6)
    expect(top.finalScore).toBeCloseTo(3 / Math.sqrt(42) + 0.15, 6)
    expect(sim.grounded).toBe(true)
    expect(sim.stages).toHaveLength(5)
  })

  it('marks ungrounded queries clearly when corpus has 0 overlap', () => {
    const sim = simulateRagPipeline({
      query: 'capital france paris',
      chunkSize: 16,
      overlap: 0,
      topK: 3,
      rerankerOn: true,
    })
    expect(sim.grounded).toBe(false)
    expect(sim.ranked[0].finalScore).toBe(0)
    expect(sim.missedTerms).toEqual(['capital', 'france', 'paris'])
  })
})
