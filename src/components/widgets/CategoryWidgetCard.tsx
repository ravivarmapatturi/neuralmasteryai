import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { CategoryVisual } from './CategoryVisual';
import './categoryWidgets.css';

export interface CategoryWidgetCardProps {
  title: string;
  to: string;
  summary: string;
  level?: string;
  countText: string;
  totalCount?: number;
  passedCount?: number;
  topic?: string;
  visual?: ReactNode;
  className?: string;
}

export function CategoryWidgetCard({
  title,
  to,
  summary,
  level,
  countText,
  totalCount = 0,
  passedCount = 0,
  topic,
  visual,
  className = '',
}: CategoryWidgetCardProps) {
  const percent = totalCount > 0 && passedCount > 0
    ? Math.min(100, Math.round((passedCount / totalCount) * 100))
    : 0;

  return (
    <li className={`nm-category-widget-item ${className}`}>
      <Link to={to} className="nm-category-widget-card" aria-label={`${title}: ${summary}`}>
        <div className="nm-category-widget-top">
          <div className="nm-category-widget-visual" aria-hidden="true">
            {visual ? visual : <CategoryVisual topic={topic || title} />}
          </div>
          <div className="nm-category-widget-header">
            <div className="nm-category-widget-title-row">
              <h3 className="nm-category-widget-title">{title}</h3>
              {level && <span className="nm-category-widget-level">{level}</span>}
            </div>
            <p className="nm-category-widget-summary">{summary}</p>
          </div>
        </div>

        <div className="nm-category-widget-bottom">
          <div className="nm-category-widget-meta-row">
            <span>{countText}</span>
            {passedCount > 0 && (
              <span className="nm-category-widget-passed">
                ✓ {passedCount} passed
              </span>
            )}
          </div>
          {passedCount > 0 && totalCount > 0 && (
            <div
              className="nm-category-widget-progress-bar"
              role="progressbar"
              aria-valuenow={percent}
              aria-valuemin={0}
              aria-valuemax={100}
              aria-label={`${title} progress: ${percent}%`}
            >
              <div
                className="nm-category-widget-progress-fill"
                style={{ width: `${percent}%` }}
              />
            </div>
          )}
        </div>
      </Link>
    </li>
  );
}

export default CategoryWidgetCard;
