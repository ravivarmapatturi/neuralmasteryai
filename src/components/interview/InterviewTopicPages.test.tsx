import { render, screen } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { describe, expect, it } from 'vitest';
import { InterviewTopicPage, InterviewTopicsPage, topicName } from './InterviewTopicPages';
import { ThemeProvider } from '../../theme/ThemeProvider';
import { AuthProvider } from '../../contexts/AuthContext';
import { GamificationProvider } from '../../contexts/GamificationContext';
import { ProgressProvider } from '../../contexts/ProgressContext';
import topics from '../../data/interviewTopics.generated.json';

const at = (path: string) => render(<ThemeProvider><MemoryRouter initialEntries={[path]}><AuthProvider><ProgressProvider><GamificationProvider><Routes><Route path="/interview/topics" element={<InterviewTopicsPage />} /><Route path="/interview/topics/:slug" element={<InterviewTopicPage />} /></Routes></GamificationProvider></ProgressProvider></AuthProvider></MemoryRouter></ThemeProvider>);

describe('interview topic pages', () => {
  it('lists every topic with its count', () => {
    at('/interview/topics');
    for (const t of topics) expect(screen.getByRole('link', { name: topicName(t.title) })).toHaveAttribute('href', `/interview/topics/${t.slug}`);
  });
  it('lists every question of a topic, each linking to practice', () => {
    const t = topics.find((x) => x.slug === 'classical-ml-questions')!;
    at(`/interview/topics/${t.slug}`);
    expect(screen.getByRole('heading', { level: 1, name: 'Classical ML interview questions' })).toBeInTheDocument();
    const link = screen.getByRole('link', { name: t.questions[0].title });
    expect(link.getAttribute('href')).toContain('/interview/questions?id=');
    expect(screen.getAllByRole('listitem').length).toBe(t.questions.length);
  });
});
