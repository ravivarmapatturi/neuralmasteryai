import { useMemo, useState } from 'react';
import Navbar from '../layout/Navbar';
import { useFocusTimer, useFocusCountdown } from '../../contexts/FocusTimerContext';
import {
  PRESET_25_5,
  PRESET_50_10,
  todayFocusSeconds,
  weekFocusSeconds,
  allTimeFocusSeconds,
  focusStreak,
  completedSessionCount,
  sevenDayBarStats,
  twelveWeekHeatmapStats,
  sectionBreakdownStats,
  formatFocusTime,
  type FocusPreset,
} from '../../lib/focusTimer';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { useDocumentMeta } from '../../lib/useDocumentMeta';
import './focusPage.css';

export default function FocusPage() {
  useDocumentTitle('Focus Timer');
  useDocumentMeta(
    'Focus Timer',
    'Pomodoro focus timer and daily focus statistics across lessons, labs, and interview prep.',
  );

  const timer = useFocusTimer();
  const { formatted, progress } = useFocusCountdown();

  const [customFocus, setCustomFocus] = useState(30);
  const [customBreak, setCustomBreak] = useState(5);
  const [showCustom, setShowCustom] = useState(timer.preset.id === 'custom');

  // Stats computations
  const sessions = timer.sessions;
  const todaySecs = useMemo(() => todayFocusSeconds(sessions), [sessions]);
  const weekSecs = useMemo(() => weekFocusSeconds(sessions), [sessions]);
  const allTimeSecs = useMemo(() => allTimeFocusSeconds(sessions), [sessions]);
  const streakDays = useMemo(() => focusStreak(sessions), [sessions]);
  const completedCount = useMemo(() => completedSessionCount(sessions), [sessions]);
  const barData = useMemo(() => sevenDayBarStats(sessions), [sessions]);
  const heatmapData = useMemo(() => twelveWeekHeatmapStats(sessions), [sessions]);
  const sectionData = useMemo(() => sectionBreakdownStats(sessions), [sessions]);

  // Max value in 7-day bar chart for scaling
  const maxBarMins = useMemo(() => {
    const max = Math.max(...barData.map((b) => b.focusMinutes), 0);
    return max > 0 ? max : 30; // fallback scale 30m if zero
  }, [barData]);

  // Circular progress ring calculations
  const radius = 96;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference * (1 - progress);

  const isBreak = timer.phase === 'shortBreak' || timer.phase === 'longBreak';
  const phaseLabel =
    timer.status === 'idle'
      ? 'Ready'
      : timer.status === 'paused'
      ? 'Paused'
      : timer.phase === 'focus'
      ? 'Focus'
      : timer.phase === 'longBreak'
      ? 'Long break'
      : 'Short break';

  const selectPreset = (preset: FocusPreset) => {
    setShowCustom(preset.id === 'custom');
    timer.setPreset(preset);
  };

  const handleCustomChange = (focusM: number, breakM: number) => {
    const f = Math.max(5, Math.min(120, focusM));
    const b = Math.max(1, Math.min(30, breakM));
    setCustomFocus(f);
    setCustomBreak(b);
    timer.setPreset({
      id: 'custom',
      focusMinutes: f,
      shortBreakMinutes: b,
      longBreakMinutes: Math.min(45, b * 3),
    });
  };

  return (
    <div className="nm-focus-page-wrap">
      <Navbar />

      <main className="nm-focus-container">
        <header className="nm-focus-header">
          <h1 className="nm-focus-title">Focus</h1>
          <p className="nm-focus-subtitle">
            Work in focused intervals and take real breaks.
          </p>
        </header>

        {/* Hero Timer */}
        <section className="nm-focus-timer-hero" aria-label="Timer">
          <div className="nm-focus-ring-container">
            <svg className="nm-focus-ring-svg" viewBox="0 0 220 220" aria-hidden="true">
              <circle
                className="nm-focus-ring-bg"
                cx="110"
                cy="110"
                r={radius}
              />
              <circle
                className={`nm-focus-ring-progress ${isBreak ? 'is-break' : ''} ${timer.status === 'paused' ? 'is-paused' : ''}`}
                cx="110"
                cy="110"
                r={radius}
                strokeDasharray={circumference}
                strokeDashoffset={strokeDashoffset}
              />
            </svg>

            <div className="nm-focus-ring-content">
              <span
                className={`nm-focus-phase-pill ${isBreak ? 'is-break' : ''} ${timer.status === 'paused' ? 'is-paused' : ''}`}
              >
                {phaseLabel}
              </span>
              <div className="nm-focus-digits" aria-label={`Time remaining: ${formatted}`}>
                {formatted}
              </div>
              <div className="nm-focus-session-cycle">
                {timer.phase === 'focus'
                  ? `Session ${Math.min(4, timer.completedFocusCount + 1)} of 4`
                  : timer.status === 'idle'
                  ? `${timer.preset.focusMinutes} min session`
                  : 'Break time'}
              </div>
            </div>
          </div>

          {/* Away notice */}
          {timer.status === 'paused' && timer.pausedReason === 'away' && (
            <div className="nm-timer-away-alert" role="alert" style={{ maxWidth: 360, margin: '0 auto 1.5rem' }}>
              <div>
                <strong>Paused while you were away</strong>
              </div>
              <button
                type="button"
                className="nm-timer-btn-secondary"
                onClick={timer.resume}
              >
                Resume
              </button>
            </div>
          )}


          {/* Primary Transport Actions */}
          <div className="nm-focus-hero-actions">
            {timer.status === 'idle' && (
              <button
                type="button"
                className="nm-focus-btn-lg-primary"
                onClick={() => timer.startFocus('focus')}
              >
                <span aria-hidden="true">▶</span> Start {timer.preset.focusMinutes}m focus
              </button>
            )}

            {timer.status === 'running' && (
              <>
                <button
                  type="button"
                  className="nm-focus-btn-lg-secondary"
                  onClick={timer.pause}
                  aria-label="Pause timer"
                >
                  <span aria-hidden="true">Ⅱ</span> Pause
                </button>
                <button
                  type="button"
                  className="nm-focus-btn-lg-secondary"
                  onClick={timer.skip}
                  aria-label="Skip phase"
                >
                  <span aria-hidden="true">⏭</span> Skip
                </button>
                <button
                  type="button"
                  className="nm-focus-btn-lg-danger"
                  onClick={timer.stop}
                  aria-label="Stop session"
                >
                  <span aria-hidden="true">⏹</span> Stop
                </button>
              </>
            )}

            {timer.status === 'paused' && timer.pausedReason !== 'away' && (
              <>
                <button
                  type="button"
                  className="nm-focus-btn-lg-primary"
                  onClick={timer.resume}
                  aria-label="Resume timer"
                >
                  <span aria-hidden="true">▶</span> Resume
                </button>
                <button
                  type="button"
                  className="nm-focus-btn-lg-secondary"
                  onClick={timer.skip}
                  aria-label="Skip phase"
                >
                  <span aria-hidden="true">⏭</span> Skip
                </button>
                <button
                  type="button"
                  className="nm-focus-btn-lg-danger"
                  onClick={timer.stop}
                  aria-label="Stop session"
                >
                  <span aria-hidden="true">⏹</span> Stop
                </button>
              </>
            )}
          </div>

          {/* Presets */}
          <div className="nm-focus-preset-selector" role="group" aria-label="Presets">
            <button
              type="button"
              className={`nm-focus-preset-tab ${timer.preset.id === '25-5' && !showCustom ? 'is-active' : ''}`}
              onClick={() => selectPreset(PRESET_25_5)}
              aria-pressed={timer.preset.id === '25-5'}
            >
              25 / 5 / 15
            </button>
            <button
              type="button"
              className={`nm-focus-preset-tab ${timer.preset.id === '50-10' && !showCustom ? 'is-active' : ''}`}
              onClick={() => selectPreset(PRESET_50_10)}
              aria-pressed={timer.preset.id === '50-10'}
            >
              50 / 10 / 30
            </button>
            <button
              type="button"
              className={`nm-focus-preset-tab ${showCustom ? 'is-active' : ''}`}
              onClick={() => {
                setShowCustom(true);
                handleCustomChange(customFocus, customBreak);
              }}
              aria-pressed={showCustom}
            >
              Custom
            </button>
          </div>

          {showCustom && (
            <div className="nm-focus-custom-box">
              <label className="nm-focus-custom-field">
                <span>Focus (5–120 min)</span>
                <input
                  type="number"
                  min="5"
                  max="120"
                  className="nm-focus-custom-input"
                  value={customFocus}
                  onChange={(e) => handleCustomChange(Number(e.target.value), customBreak)}
                />
              </label>
              <label className="nm-focus-custom-field">
                <span>Break (1–30 min)</span>
                <input
                  type="number"
                  min="1"
                  max="30"
                  className="nm-focus-custom-input"
                  value={customBreak}
                  onChange={(e) => handleCustomChange(customFocus, Number(e.target.value))}
                />
              </label>
            </div>
          )}

          {/* Settings toggles */}
          <div className="nm-focus-hero-toggles">
            <label className="nm-focus-hero-toggle-label">
              <span>Browser notifications</span>
              <button
                type="button"
                role="switch"
                aria-checked={timer.notificationsEnabled}
                className={`nm-timer-switch ${timer.notificationsEnabled ? 'is-on' : ''}`}
                onClick={() => void timer.setNotificationsEnabled(!timer.notificationsEnabled)}
              >
                <span className="nm-timer-switch-thumb" />
              </button>
            </label>
          </div>
        </section>

        {/* Stats Section */}
        <section className="nm-focus-stats-section" aria-labelledby="stats-heading">
          <h2 id="stats-heading" className="nm-focus-stats-heading">
            Focus Statistics
          </h2>

          <div className="nm-focus-metrics-grid">
            <div className="nm-focus-metric-card">
              <div className="nm-focus-metric-label">Today</div>
              <div className="nm-focus-metric-value">{formatFocusTime(todaySecs)}</div>
            </div>
            <div className="nm-focus-metric-card">
              <div className="nm-focus-metric-label">This Week</div>
              <div className="nm-focus-metric-value">{formatFocusTime(weekSecs)}</div>
            </div>
            <div className="nm-focus-metric-card">
              <div className="nm-focus-metric-label">All-time</div>
              <div className="nm-focus-metric-value">{formatFocusTime(allTimeSecs)}</div>
            </div>
            <div className="nm-focus-metric-card">
              <div className="nm-focus-metric-label">Streak</div>
              <div className="nm-focus-metric-value">
                {streakDays === 1 ? '1 day' : `${streakDays} days`}
              </div>
            </div>
            <div className="nm-focus-metric-card">
              <div className="nm-focus-metric-label">Completed</div>
              <div className="nm-focus-metric-value">
                {completedCount === 1 ? '1 session' : `${completedCount} sessions`}
              </div>
            </div>
          </div>

          {sessions.length === 0 ? (
            <div className="nm-focus-empty-state">
              <h3 className="nm-focus-empty-title">No focus sessions recorded yet</h3>
              <p className="nm-focus-empty-desc">
                Sessions with at least 1 minute of focus will appear here, organized by day and section.
              </p>
            </div>
          ) : (
            <>
              {/* 7-Day Bar Chart */}
              <div className="nm-focus-chart-card">
                <h3 className="nm-focus-chart-title">Past 7 Days</h3>
                <div className="nm-focus-bars-container" role="img" aria-label="7-day focus chart">
                  {barData.map((bar) => {
                    const pct = maxBarMins > 0 ? (bar.focusMinutes / maxBarMins) * 100 : 0;
                    return (
                      <div key={bar.date} className="nm-focus-bar-column">
                        <span className="nm-focus-bar-val">
                          {bar.focusMinutes > 0 ? `${bar.focusMinutes}m` : ''}
                        </span>
                        <div className="nm-focus-bar-track">
                          <div
                            className="nm-focus-bar-fill"
                            style={{ height: `${pct}%` }}
                            title={`${bar.date}: ${bar.focusMinutes} minutes`}
                          />
                        </div>
                        <span className="nm-focus-bar-label">{bar.dayLabel}</span>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* 12-Week Heatmap */}
              <div className="nm-focus-heatmap-card">
                <h3 className="nm-focus-chart-title">Activity (12 Weeks)</h3>
                <div
                  className="nm-focus-heatmap-grid"
                  role="grid"
                  aria-label="12-week focus activity heatmap"
                >
                  {heatmapData.map((cell) => (
                    <div
                      key={cell.date}
                      className="nm-focus-heatmap-cell"
                      data-intensity={cell.intensity}
                      title={`${cell.date}: ${cell.focusMinutes} minutes`}
                      aria-label={`${cell.date}: ${cell.focusMinutes} minutes`}
                    />
                  ))}
                </div>
                <div className="nm-focus-heatmap-legend" aria-hidden="true">
                  <span>Less</span>
                  <div className="nm-focus-heatmap-cell" data-intensity="0" />
                  <div className="nm-focus-heatmap-cell" data-intensity="1" />
                  <div className="nm-focus-heatmap-cell" data-intensity="2" />
                  <div className="nm-focus-heatmap-cell" data-intensity="3" />
                  <div className="nm-focus-heatmap-cell" data-intensity="4" />
                  <span>More</span>
                </div>
              </div>

              {/* Time by Section */}
              {sectionData.length > 0 && (
                <div className="nm-focus-section-card">
                  <h3 className="nm-focus-chart-title">Time by Section</h3>
                  <div className="nm-focus-section-list">
                    {sectionData.map((item) => (
                      <div key={item.section} className="nm-focus-section-row">
                        <div className="nm-focus-section-row-meta">
                          <strong>{item.label}</strong>
                          <span>
                            {item.focusMinutes}m ({item.percentage}%)
                          </span>
                        </div>
                        <div className="nm-focus-section-bar-track">
                          <div
                            className="nm-focus-section-bar-fill"
                            style={{ width: `${item.percentage}%` }}
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
