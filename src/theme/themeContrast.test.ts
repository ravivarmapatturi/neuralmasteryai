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
    });
  });
});
