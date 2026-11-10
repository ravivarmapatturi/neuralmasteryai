import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it } from 'vitest';
import ThemePicker, { MobileThemeList } from './ThemePicker';
import { ThemeProvider } from '../theme/ThemeProvider';

describe('ThemePicker', () => {
  it('renders theme picker button and allows selecting from all five backgrounds', () => {
    render(
      <ThemeProvider>
        <ThemePicker />
      </ThemeProvider>,
    );

    const toggleBtn = screen.getByRole('button', { name: 'Toggle color mode' });
    expect(toggleBtn).toBeInTheDocument();

    const pickerBtn = screen.getByRole('button', { name: 'Theme picker' });
    expect(pickerBtn).toBeInTheDocument();
    expect(pickerBtn).toHaveAttribute('aria-expanded', 'false');

    // Open theme picker menu
    fireEvent.click(pickerBtn);
    expect(pickerBtn).toHaveAttribute('aria-expanded', 'true');

    // Verify listbox contains all 5 themes
    const listbox = screen.getByRole('listbox', { name: 'Theme backgrounds' });
    expect(listbox).toBeInTheDocument();

    const themes = [
      'Light',
      'Dark',
      'Pure White Notebook',
      'Warm Sepia',
      'Forest Dark',
    ];
    for (const name of themes) {
      expect(screen.getByRole('option', { name: new RegExp(`^${name}$`) })).toBeInTheDocument();
    }

    // Select Pure White Notebook
    fireEvent.click(screen.getByRole('option', { name: /Pure White Notebook/ }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('pure-white');

    // Reopen and select Forest Dark
    fireEvent.click(pickerBtn);
    fireEvent.click(screen.getByRole('option', { name: /Forest Dark/ }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('forest');
  });

  it('renders MobileThemeList with all 5 themes', () => {
    render(
      <ThemeProvider>
        <MobileThemeList />
      </ThemeProvider>,
    );

    const mobileButtons = screen.getAllByRole('button');
    expect(mobileButtons).toHaveLength(5);

    fireEvent.click(screen.getByRole('button', { name: 'Select Warm Sepia' }));
    expect(document.documentElement.getAttribute('data-theme')).toBe('sepia');
  });
});
