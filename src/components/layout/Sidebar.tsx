import { useEffect, useState } from 'react';
import { NavLink, useLocation } from 'react-router-dom';
import { getSidebar, normalizeRoute } from '../../lib/contentTree';
import { getGroupForSubsection } from '../../data/sectionMeta';
import { DomainIcon } from '../icons/DomainIcons';

const EXPANDED_KEY = 'neural-mastery-sidebar-expanded-sections';

function readExpanded(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return window.localStorage.getItem(EXPANDED_KEY);
  } catch {
    return null;
  }
}

/**
 * Renders the same generated content-tree data (getSidebar()) for both the
 * permanently-docked desktop rail and the mobile drawer -- variant only
 * changes chrome (fixed width/border vs. full-width-in-drawer), never the
 * underlying navigation structure, per the "one source of truth" rule.
 *
 * Only one section is expanded at a time (accordion, persisted in
 * localStorage, same pattern as DocLayout's sidebar/TOC collapse) --
 * with ~30 sections and 209 pages total, rendering everything expanded
 * at once both buries the active section in a huge flat list and, via
 * flexbox's default align-items: stretch on .nm-doc-row, forces every
 * other column (including short pages' <main>) to stretch to the
 * oversized sidebar's height. The section containing the current page
 * always auto-expands (and collapses whatever else was open),
 * regardless of stored state, so navigating never leaves you looking at
 * a collapsed section with no visible indication of where you are.
 */
export default function Sidebar({
  variant = 'desktop',
  onNavigate,
}: {
  variant?: 'desktop' | 'mobile';
  onNavigate?: () => void;
}) {
  const sections = getSidebar();
  const location = useLocation();
  const isMobile = variant === 'mobile';
  const [openSectionId, setOpenSectionId] = useState<string | null>(readExpanded);

  // Reached via a bookmarked/direct URL, location.pathname carries the
  // trailing slash GitHub Pages' redirect adds (see contentTree.ts's
  // normalizeRoute) -- p.route never does, so without normalizing here
  // the section containing the current page silently fails to match and
  // never auto-expands, for anyone who didn't arrive via an in-app <Link>.
  const currentRoute = normalizeRoute(location.pathname);
  const activeSection = sections.find((s) => s.pages.some((p) => p.route === currentRoute));

  // Navigating into a section always makes it the one open section,
  // closing whatever else was open -- an accordion, not independently
  // toggled sections.
  useEffect(() => {
    if (!activeSection || openSectionId === activeSection.id) return;
    setOpenSectionId(activeSection.id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSection?.id]);

  useEffect(() => {
    if (openSectionId) window.localStorage.setItem(EXPANDED_KEY, openSectionId);
    else window.localStorage.removeItem(EXPANDED_KEY);
  }, [openSectionId]);

  return (
    <nav
      className={isMobile ? undefined : 'nm-sidebar'}
      aria-label="Documentation sections"
      style={
        isMobile
          ? { width: '100%', padding: 0 }
          : { width: 260, flexShrink: 0, padding: '1.5rem 1rem', borderRight: '1px solid var(--nm-border)' }
      }
    >
      {sections.map((section) => {
        const sectionActive = section.id === activeSection?.id;
        const isOpen = section.id === openSectionId;
        const group = getGroupForSubsection(section.id);
        return (
          <div key={section.id} style={{ marginBottom: '1.25rem' }}>
            <button
              type="button"
              onClick={() => setOpenSectionId((prev) => (prev === section.id ? null : section.id))}
              aria-expanded={isOpen}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 6,
                width: '100%',
                background: 'transparent',
                border: 'none',
                borderLeft: group ? `2.5px solid ${group.meta.color}` : 'none',
                padding: group ? '0 0 0 6px' : 0,
                cursor: 'pointer',
                // Hand font, not uppercase: handwriting-style faces (Kalam)
                // are drawn for mixed case -- setting one in all-caps with
                // letter-spacing (the previous look) destroys the natural
                // letterforms and reads worse, not more "notebook." Bumped
                // from 11px to 13px for the same reason the body-text pass
                // needed a size bump -- handwriting needs more room to stay
                // legible at a given visual weight than a tight uppercase
                // sans label does.
                fontFamily: "'Kalam', 'Comic Sans MS', cursive",
                fontSize: 13,
                fontWeight: 700,
                color: sectionActive ? 'var(--nm-accent-primary)' : 'var(--nm-text-muted)',
                marginBottom: 6,
                textAlign: 'left',
              }}
            >
              <span
                aria-hidden="true"
                style={{
                  display: 'inline-block',
                  transform: isOpen ? 'rotate(90deg)' : 'rotate(0deg)',
                  transition: 'transform 120ms ease',
                  fontSize: 9,
                }}
              >
                ▶
              </span>
              {group && <DomainIcon groupKey={group.key} color={group.meta.color} size={13} />}
              <span style={{ flex: 1 }}>{section.label}</span>
            </button>
            {isOpen &&
              section.pages.map((page) => (
                <NavLink
                  key={page.route}
                  to={page.route}
                  onClick={onNavigate}
                  style={({ isActive }) => ({
                    display: 'block',
                    padding: '6px 0 6px 15px',
                    fontFamily: "'Kalam', 'Comic Sans MS', cursive",
                    fontSize: 15,
                    textDecoration: 'none',
                    color: isActive ? 'var(--nm-accent-primary)' : 'var(--nm-text-secondary)',
                    fontWeight: isActive ? 700 : 400,
                  })}
                >
                  {page.navLabel}
                </NavLink>
              ))}
          </div>
        );
      })}
    </nav>
  );
}
