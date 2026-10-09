import { describe, expect, it } from 'vitest'
import { ewcForgettingTrace, naiveForgettingTrace, STEPS_PER_PHASE, TOTAL_STEPS, taskAAccuracy } from './continualLearning'

describe('taskAAccuracy', () => {
  it('peaks at 1 exactly at the post-Task-A value and decays away from it', () => {
    expect(taskAAccuracy(0.9)).toBeCloseTo(1, 5)
    expect(taskAAccuracy(0.1)).toBeLessThan(0.01)
  })
})

describe('naiveForgettingTrace', () => {
  const trace = naiveForgettingTrace()

  it('has one accuracy value per training step across all three phases', () => {
    expect(trace).toHaveLength(TOTAL_STEPS)
  })

  it('learns Task A well by the end of phase 1', () => {
    expect(trace[STEPS_PER_PHASE - 1]).toBeGreaterThan(0.95)
  })

  it('collapses on Task A once training moves to Task B, with nothing protecting it', () => {
    expect(trace[STEPS_PER_PHASE * 2 - 1]).toBeLessThan(0.05)
    expect(trace[TOTAL_STEPS - 1]).toBeLessThan(0.05)
  })
})

describe('ewcForgettingTrace', () => {
  const trace = ewcForgettingTrace()

  it('learns Task A just as well as naive training before any forgetting risk exists', () => {
    expect(trace[STEPS_PER_PHASE - 1]).toBeGreaterThan(0.95)
  })

  it('mitigates but does not fully prevent forgetting -- real, not a scripted floor', () => {
    const endOfB = trace[STEPS_PER_PHASE * 2 - 1]
    const endOfC = trace[TOTAL_STEPS - 1]
    expect(endOfB).toBeGreaterThan(0.5)
    expect(endOfB).toBeLessThan(0.95)
    expect(endOfC).toBeLessThanOrEqual(endOfB)
  })

  it('retains meaningfully more Task A accuracy than naive training at every matching step', () => {
    const naive = naiveForgettingTrace()
    for (let i = STEPS_PER_PHASE; i < TOTAL_STEPS; i++) {
      expect(trace[i]).toBeGreaterThanOrEqual(naive[i])
    }
  })

  it('is deterministic -- same real gradient descent run twice gives identical results', () => {
    expect(ewcForgettingTrace()).toEqual(trace)
  })
})
