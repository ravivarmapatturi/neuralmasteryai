import { useMemo } from 'react';
import Navbar from '../layout/Navbar';
import { useFocusTimer } from '../../contexts/FocusTimerContext';
import {
  todayFocusSeconds,
  weekFocusSeconds,
  allTimeFocusSeconds,
  focusStreak,
  completedSessionCount,
  sevenDayBarStats,
  twelveWeekHeatmapStats,
  sectionBreakdownStats,
  formatFocusTime,
} from '../../lib/focusTimer';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { useDocumentMeta } from '../../lib/useDocumentMeta';
import './focusPage.css';

export default function FocusPage() {
  useDocumentTitle('Focus');
  useDocumentMeta(
    'Focus',
    'Track your active screen time and focused learning across lessons, labs, and interview prep.',
  );

  const timer = useFocusTimer();

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

  const radius = 96;
  const circumference = 2 * Math.PI * radius;

  return (
    <div className="nm-focus-page-wrap">
      <Navbar />

      <main className="nm-focus-container">
        <header className="nm-focus-header">
          <h1 className="nm-focus-title">Focus</h1>
          <p className="nm-focus-subtitle">
            Track your screen time and focused learning on Neural Mastery.
          </p>
        </header>

        {/* Hero Screen Time Section */}
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
                className={`nm-focus-ring-progress ${timer.isPaused ? 'is-paused' : ''}`}
                cx="110"
                cy="110"
                r={radius}
                strokeDasharray={circumference}
                strokeDashoffset={0}
              />
            </svg>

            <div className="nm-focus-ring-content">
              <span
                className={`nm-focus-phase-pill ${timer.isPaused ? 'is-paused' : ''}`}
              >
                {timer.isPaused ? 'Paused' : 'Active today'}
              </span>
              <div
                className="nm-focus-digits"
                aria-label={`Today's focus time: ${timer.formattedToday}`}
              >
                {timer.formattedToday}
              </div>
              <div className="nm-focus-session-cycle">
                {timer.isPaused ? 'Counting paused' : 'Active screen time'}
              </div>
            </div>
          </div>

          {/* Primary Transport Action: Pause / Resume */}
          <div className="nm-focus-hero-actions">
            {timer.isPaused ? (
              <button
                type="button"
                className="nm-focus-btn-lg-primary"
                onClick={timer.resume}
                aria-label="Resume timer"
              >
                <span aria-hidden="true">▶</span> Resume
              </button>
            ) : (
              <button
                type="button"
                className="nm-focus-btn-lg-secondary"
                onClick={timer.pause}
                aria-label="Pause timer"
              >
                <span aria-hidden="true">Ⅱ</span> Pause
              </button>
            )}
          </div>

          {/* Settings toggles */}
          <div className="nm-focus-hero-toggles">
            <label className="nm-focus-hero-toggle-label">
              <span>Distraction-free</span>
              <button
                type="button"
                role="switch"
                aria-label="Distraction-free"
                aria-checked={timer.isDistractionFree}
                className={`nm-timer-switch ${timer.isDistractionFree ? 'is-on' : ''}`}
                onClick={timer.toggleDistractionFree}
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
                Focus time will appear here as you read lessons, work in labs, and practice interviews.
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
