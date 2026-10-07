import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { MDXProvider } from '@mdx-js/react';
import { ThemeProvider } from './theme/ThemeProvider';
import { AuthProvider } from './contexts/AuthContext';
import { ProgressProvider } from './contexts/ProgressContext';
import { GamificationProvider } from './contexts/GamificationContext';
import DocLayout from './components/layout/DocLayout';
import PracticeProblemLayout from './components/layout/PracticeProblemLayout';
import ChooserPage from './components/ChooserPage';
import Home from './components/Home';
import PracticeListPage from './components/PracticeListPage';
import PracticeTrackPage from './components/PracticeTrackPage';
import ProgressPage from './components/ProgressPage';
import ProfilePage from './components/ProfilePage';
import LeaderboardPage from './components/LeaderboardPage';
import AboutPage from './components/AboutPage';
import PrivacyPolicyPage from './components/PrivacyPolicyPage';
import TermsOfServicePage from './components/TermsOfServicePage';
import NotFoundPage from './components/NotFoundPage';
import ThemedImage from './components/ThemedImage';
import MDXCodeBlock from './components/MDXCodeBlock';
import MDXLink from './components/MDXLink';
import AnalyticsTracker from './components/AnalyticsTracker';
import Footer from './components/layout/Footer';
import { ConfettiCanvas } from './components/ui/Confetti';


/** Old /docs/practice-problems/<slug> URLs redirect to their real, current
 * /practice/<slug> home -- see contentTree.ts's practiceRoute() for why the
 * URL moved (content/location on disk never did) and
 * normalizePracticeProblemPermalink() in gamification.ts for how a
 * pre-migration award under the old URL still gets recognized. */
function PracticeProblemRedirect() {
  const { slug } = useParams();
  const cleanSlug = slug?.replace(/\/$/, '');
  return <Navigate to={`/practice/${cleanSlug}`} replace />;
}

// Components available to every .mdx file without an explicit import --
// mirrors how Docusaurus makes <ThemedImage> globally available in MDX.
// `pre` is overridden so every fenced code block gets Shiki highlighting
// automatically, not just ones that explicitly embed VisualizationCode.
// `a` is overridden so internal doc links (the vast majority of links in
// migrated content) get client-side, basename-aware navigation instead of
// a full page reload to a base-path-less URL -- see MDXLink.tsx.
const mdxComponents = { ThemedImage, pre: MDXCodeBlock, a: MDXLink };

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ProgressProvider>
          <GamificationProvider>
            <ConfettiCanvas />
            <MDXProvider components={mdxComponents}>

              {/* Reads Vite's own BASE_URL (derived from vite.config.ts's
                  `base`) instead of a second hardcoded copy of the same
                  path -- the two drifting out of sync silently 404s every
                  in-app link, exactly the kind of bug a single source of
                  truth prevents outright. */}
              <BrowserRouter basename={import.meta.env.BASE_URL.replace(/\/$/, '') || '/'}>
                <AnalyticsTracker />
                {/* Footer renders once here, after whatever route matched,
                    so every page gets it without each page component
                    needing to render it itself -- see Footer.tsx. */}
                <div style={{ display: 'flex', flexDirection: 'column', minHeight: '100vh' }}>
                  <div style={{ flex: 1 }}>
                    <Routes>
                      <Route path="/" element={<ChooserPage />} />
                      <Route path="/learn" element={<Home />} />
                      <Route path="/practice" element={<PracticeListPage />} />
                      <Route path="/practice/track/:topicSlug" element={<PracticeTrackPage />} />
                      <Route path="/practice/:slug" element={<PracticeProblemLayout />} />
                      <Route path="/progress" element={<ProgressPage />} />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="/leaderboard" element={<LeaderboardPage />} />
                      <Route path="/about" element={<AboutPage />} />
                      <Route path="/privacy" element={<PrivacyPolicyPage />} />
                      <Route path="/terms" element={<TermsOfServicePage />} />
                      <Route path="/docs/practice-problems/overview" element={<Navigate to="/practice" replace />} />
                      <Route path="/docs/practice-problems/:slug" element={<PracticeProblemRedirect />} />
                      <Route path="/docs/*" element={<DocLayout />} />
                      <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                  </div>
                  <Footer />
                </div>
              </BrowserRouter>
            </MDXProvider>
          </GamificationProvider>
        </ProgressProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
