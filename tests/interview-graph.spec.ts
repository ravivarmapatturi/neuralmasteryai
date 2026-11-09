import { test, expect } from '@playwright/test';

// Verify that topic labels and percentages never clip against the stage boundary
// at 1440, 1024, or any width where the graph shows, and that mobile panel selects
// fit within the card at 375 and 320 with zero horizontal overflow.

test.describe('Interview Mastery Graph Bounding Box & Fit Verification', () => {
  const viewports = [
    { name: '1440px desktop', width: 1440, height: 900, expectLabels: true },
    { name: '1024px tablet/laptop', width: 1024, height: 768, expectLabels: true },
    { name: '768px tablet', width: 768, height: 1024, expectLabels: true },
    { name: '375px mobile', width: 375, height: 667, expectLabels: false },
    { name: '320px narrow mobile', width: 320, height: 568, expectLabels: false },
  ];

  for (const vp of viewports) {
    test(`renders without clipping at ${vp.name}`, async ({ page }) => {
      await page.setViewportSize({ width: vp.width, height: vp.height });
      await page.emulateMedia({ reducedMotion: 'reduce' });

      // Seed partial awards (e.g. Transformers 42%, Deep Learning 100%)
      await page.addInitScript(() => {
        const awards = [];
        const today = '2026-11-09';
        for (let i = 0; i < 18; i++) {
          awards.push({ permalink: `/interview#q-tf-${i}`, kind: 'interview', date: today, points: 10 });
        }
        window.localStorage.setItem('neural-mastery-gamification', JSON.stringify(awards));
      });

      await page.goto('/interview');
      await page.waitForSelector('.si-node');

      const evaluation = await page.evaluate(({ expectLabels }) => {
        const doc = document.documentElement;
        const hasHorizontalOverflow = doc.scrollWidth > doc.clientWidth;
        const stage = document.querySelector('.si-stage');
        const stageRect = stage ? stage.getBoundingClientRect() : null;
        const card = document.querySelector('.si-card');
        const cardRect = card ? card.getBoundingClientRect() : null;

        const clippedLabels: { text: string; overhang: number }[] = [];
        if (expectLabels && stageRect) {
          const labels = Array.from(document.querySelectorAll('.si-node .si-label')).filter((el) => {
            const s = window.getComputedStyle(el);
            return s.display !== 'none' && s.visibility !== 'hidden' && s.opacity !== '0';
          });

          for (const label of labels) {
            const rect = label.getBoundingClientRect();
            const text = label.textContent || '';
            // Allow 1.5px subpixel tolerance
            if (
              rect.top < stageRect.top - 1.5 ||
              rect.bottom > stageRect.bottom + 1.5 ||
              rect.left < stageRect.left - 1.5 ||
              rect.right > stageRect.right + 1.5
            ) {
              const maxOverhang = Math.max(
                stageRect.top - rect.top,
                rect.bottom - stageRect.bottom,
                stageRect.left - rect.left,
                rect.right - stageRect.right
              );
              clippedLabels.push({ text, overhang: Math.round(maxOverhang) });
            }
          }
        }

        const clippedSelects: { label: string; overhang: number }[] = [];
        if (cardRect) {
          const selects = Array.from(document.querySelectorAll('.si-panel select, .si-speech-model select'));
          for (const sel of selects) {
            const sRect = sel.getBoundingClientRect();
            // The topic select is display: none where the graph shows; it has no box to measure.
            if (sRect.width === 0) continue;
            if (sRect.right > cardRect.right + 1.5 || sRect.left < cardRect.left - 1.5) {
              const overhang = Math.max(cardRect.left - sRect.left, sRect.right - cardRect.right);
              clippedSelects.push({
                label: sel.getAttribute('aria-label') || sel.id || sel.className,
                overhang: Math.round(overhang),
              });
            }
          }
        }

        return {
          hasHorizontalOverflow,
          clippedLabels,
          clippedSelects,
        };
      }, { expectLabels: vp.expectLabels });

      expect(evaluation.hasHorizontalOverflow).toBe(false);
      expect(evaluation.clippedLabels).toEqual([]);
      expect(evaluation.clippedSelects).toEqual([]);
    });
  }
});
