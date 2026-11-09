import { render, screen } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { describe, expect, it } from 'vitest'
import { StudyPlansPage, StudyPlanPage, ResearchListPage, ResearchTrackPage, ProjectsPage } from './StudyPlansPages'
import { ThemeProvider } from '../theme/ThemeProvider'
import { AuthProvider } from '../contexts/AuthContext'
import { GamificationProvider } from '../contexts/GamificationContext'
import { ProgressProvider } from '../contexts/ProgressContext'
import { CATALOG } from '../data/practiceCatalog'
import { PROJECT_SHEETS, RESEARCH_TRACKS, STUDY_PLANS, type PlanStep } from '../data/studyPlans'
import { getPageByRoute } from '../lib/contentTree'

function renderAt(path: string) {
  return render(
    <ThemeProvider>
      <MemoryRouter initialEntries={[path]}>
        <AuthProvider>
          <ProgressProvider>
            <GamificationProvider>
              <Routes>
                <Route path="/study-plans" element={<StudyPlansPage />} />
                <Route path="/study-plans/:slug" element={<StudyPlanPage />} />
                <Route path="/research" element={<ResearchListPage />} />
                <Route path="/research/:slug" element={<ResearchTrackPage />} />
                <Route path="/projects" element={<ProjectsPage />} />
              </Routes>
            </GamificationProvider>
          </ProgressProvider>
        </AuthProvider>
      </MemoryRouter>
    </ThemeProvider>,
  )
}

const curated = new Set(CATALOG.flatMap((t) => t.problems))
const allSteps: PlanStep[] = [
  ...STUDY_PLANS.flatMap((p) => p.steps),
  ...RESEARCH_TRACKS.flatMap((t) => t.steps.map((s) => s.step)),
  ...PROJECT_SHEETS.flatMap((s) => s.prepare),
]

describe('study plan data', () => {
  it('uses only curated problems', () => {
    const bad = allSteps.flatMap((s) => (s.kind === 'problem' && !curated.has(s.id) ? [s.id] : []))
    expect(bad).toEqual([])
  })
  it('links only to Learn pages that exist', () => {
    const bad = allSteps.flatMap((s) => (s.kind === 'read' && !getPageByRoute(s.route) ? [s.route] : []))
    expect(bad).toEqual([])
  })
  it('points every research step at a real block', () => {
    for (const t of RESEARCH_TRACKS) for (const s of t.steps) expect(s.block).toBeLessThan(t.blocks.length)
  })
  it('names project plans that exist', () => {
    for (const s of PROJECT_SHEETS) if (s.plan) expect(STUDY_PLANS.some((p) => p.slug === s.plan)).toBe(true)
  })
})

describe('study pages', () => {
  it('lists the named plans with counts', () => {
    renderAt('/study-plans')
    expect(screen.getByRole('heading', { level: 1, name: 'Study plans' })).toBeInTheDocument()
    expect(screen.getByText('Build Micrograd from Scratch')).toBeInTheDocument()
    expect(screen.getByText(/Agents from Scratch/)).toBeInTheDocument()
    expect(screen.getAllByText(/\d+ problems/).length).toBeGreaterThan(4)
  })
  it('shows a plan with its steps and missing steps', () => {
    renderAt('/study-plans/micrograd-from-scratch')
    expect(screen.getByRole('heading', { level: 1, name: 'Build Micrograd from Scratch' })).toBeInTheDocument()
    expect(screen.getByText(/not written yet\. They are listed/)).toBeInTheDocument()
  })
  it('shows a research track with its diagram on the first step', () => {
    renderAt('/research/attention-is-all-you-need')
    expect(screen.getByRole('img', { name: /current part: Tokens/ })).toBeInTheDocument()
    expect(screen.getByText('Step 1: Split text into tokens')).toBeInTheDocument()
  })
  it('lists seven papers and six project sheets', () => {
    renderAt('/research')
    expect(screen.getByText('Attention Is All You Need')).toBeInTheDocument()
    renderAt('/projects')
    expect(screen.getAllByRole('heading', { name: 'A voice assistant' })).toHaveLength(2)
  })
})
