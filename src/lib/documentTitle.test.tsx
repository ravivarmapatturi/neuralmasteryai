import { renderHook } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import { useDocumentTitle } from './useDocumentTitle';
import { useDocumentMeta } from './useDocumentMeta';

describe('route titles', () => {
  it.each([
    ['Neural Mastery: Learn AI from First Principles', 'Neural Mastery: Learn AI from First Principles'],
    ['About Neural Mastery', 'About Neural Mastery'],
    ['Changelog | Neural Mastery', 'Changelog | Neural Mastery'],
    ['AI engineering interview questions by topic | Neural Mastery', 'AI engineering interview questions by topic | Neural Mastery'],
    ['Attention interview questions | Neural Mastery', 'Attention interview questions | Neural Mastery'],
    ['Neural Mastery · Interview Room', 'Neural Mastery · Interview Room'],
    ['Neural Mastery · Spoken Interview Room', 'Neural Mastery · Spoken Interview Room'],
    ['Neural Mastery AI', 'Neural Mastery AI'],
    ['Attention', 'Attention — Neural Mastery AI'],
    [undefined, 'Neural Mastery AI'],
  ])('formats %s consistently for the tab and social previews', (title, expected) => {
    renderHook(() => { useDocumentTitle(title); useDocumentMeta(title); });
    expect(document.title).toBe(expected);
    expect(document.head.querySelector('meta[property="og:title"]')?.getAttribute('content')).toBe(expected);
    expect(document.head.querySelector('meta[name="twitter:title"]')?.getAttribute('content')).toBe(expected);
  });
});
