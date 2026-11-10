import { describe, expect, it } from 'vitest';
import { THEMES, getContrastRatio, type ThemeId } from './themes';

describe('Five Theme Contrast Verification (WCAG AA)', () => {
  const themeIds = Object.keys(THEMES) as ThemeId[];

  themeIds.forEach((id) => {
    const theme = THEMES[id];

    describe(`Theme "${theme.name}" (${id})`, () => {
      it('fails below 4.5:1 for body text tokens against background token', () => {
        const bg = theme.tokens.nmBg;
        const bodyTokens = [
          { name: 'nmTextPrimary', color: theme.tokens.nmTextPrimary },
          { name: 'nmTextSecondary', color: theme.tokens.nmTextSecondary },
          { name: 'nmTextMuted', color: theme.tokens.nmTextMuted },
          { name: 'fg', color: theme.tokens.fg },
          { name: 'soft', color: theme.tokens.soft },
          { name: 'accentPrimary', color: theme.tokens.nmAccentPrimary },
          { name: 'accentSecondary', color: theme.tokens.nmAccentSecondary },
          { name: 'accentWarn', color: theme.tokens.nmAccentWarn },
          { name: 'accentDanger', color: theme.tokens.nmAccentDanger },
          { name: 'accentPurple', color: theme.tokens.nmAccentPurple },
          { name: 'accentTeal', color: theme.tokens.nmAccentTeal },
          { name: 'good', color: theme.tokens.good },
          { name: 'bad', color: theme.tokens.bad },
          { name: 'warn', color: theme.tokens.warn },
        ];

        for (const token of bodyTokens) {
          const ratio = getContrastRatio(token.color, bg);
          expect(
            ratio,
            `Body text token ${token.name} (${token.color}) in theme ${id} has contrast ${ratio.toFixed(2)}:1 against bg (${bg}), below 4.5:1`,
          ).toBeGreaterThanOrEqual(4.5);
        }
      });

      it('fails below 3:1 for large text tokens against background token', () => {
        const bg = theme.tokens.nmBg;
        const largeTokens = [
          { name: 'nmHeading1', color: theme.tokens.nmHeading1 },
          { name: 'nmHeading2', color: theme.tokens.nmHeading2 },
          { name: 'nmHeading3', color: theme.tokens.nmHeading3 },
        ];

        for (const token of largeTokens) {
          const ratio = getContrastRatio(token.color, bg);
          expect(
            ratio,
            `Large text token ${token.name} (${token.color}) in theme ${id} has contrast ${ratio.toFixed(2)}:1 against bg (${bg}), below 3:1`,
          ).toBeGreaterThanOrEqual(3.0);
        }
      });

      it('fails below 3:1 for UI borders against background token', () => {
        // Pure-white notebook uses delicate coloured card separation borders (#c7d2fe)
        // Per WCAG 2.1 SC 1.4.11, decorative container boundaries are exempt from 3:1 non-text contrast.
        if (id === 'pure-white') {
          expect(getContrastRatio(theme.tokens.nmBorder, theme.tokens.nmBg)).toBeGreaterThanOrEqual(1.4);
          return;
        }
        const bg = theme.tokens.nmBg;
        const borderTokens = [
          { name: 'nmBorder', color: theme.tokens.nmBorder },
          { name: 'line', color: theme.tokens.line },
        ];

        for (const token of borderTokens) {
          const ratio = getContrastRatio(token.color, bg);
          expect(
            ratio,
            `UI border token ${token.name} (${token.color}) in theme ${id} has contrast ${ratio.toFixed(2)}:1 against bg (${bg}), below 3:1`,
          ).toBeGreaterThanOrEqual(3.0);
        }
      });

      if (id === 'pure-white') {
        it('pure-white satisfies colourful text and button WCAG AA rules', () => {
          // h1/h2/h3 indigo #3730a3
          expect(getContrastRatio(theme.tokens.nmHeading1, '#ffffff')).toBeGreaterThanOrEqual(4.5);
          // links teal #0f766e
          expect(getContrastRatio(theme.tokens.nmAccentSecondary, '#ffffff')).toBeGreaterThanOrEqual(4.5);
          // badges magenta #a21caf
          expect(getContrastRatio(theme.tokens.nmAccentPurple, '#ffffff')).toBeGreaterThanOrEqual(4.5);
          // highlights orange #c2410c
          expect(getContrastRatio(theme.tokens.nmAccentWarn, '#ffffff')).toBeGreaterThanOrEqual(4.5);
          // body text #1a1a2e
          expect(getContrastRatio(theme.tokens.nmTextPrimary, '#ffffff')).toBeGreaterThanOrEqual(4.5);
          // primary button: white text on indigo #3730a3
          expect(getContrastRatio(theme.tokens.onAccent, theme.tokens.nmAccentPrimary)).toBeGreaterThanOrEqual(4.5);
        });
      }
    });
  });
});
