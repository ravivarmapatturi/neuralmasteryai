import { lazy, Suspense } from 'react';
import { BrowserRouter, Routes, Route, Navigate, useParams } from 'react-router-dom';
import { MDXProvider } from '@mdx-js/react';
import { mdxComponents } from './components/content/mdxComponents';
import { ThemeProvider } from './theme/ThemeProvider';
import { AuthProvider } from './contexts/AuthContext';
import { ProgressProvider } from './contexts/ProgressContext';
import { GamificationProvider } from './contexts/GamificationContext';
import { FocusMusicProvider } from './contexts/FocusMusicContext';
import DocLayout from './components/layout/DocLayout';
import PracticeProblemLayout from './components/layout/PracticeProblemLayout';
import ChooserPage from './components/ChooserPage';
import Home from './components/Home';
import PracticeListPage from './components/PracticeListPage';
const InterviewPage = lazy(() => import('./components/InterviewPage')); // Load question banks only when opened.
const MockInterviewPage = lazy(() => import('./components/interview/MockInterviewPage')); // Speech models load only when a session starts.
const SpeechTestPage = lazy(() => import('./components/SpeechTestPage'));
import PracticeTrackPage from './components/PracticeTrackPage';
import ProgressPage from './components/ProgressPage';
import BlogListPage from './components/BlogListPage';
import BlogPostPage from './components/BlogPostPage';
import BlogSeriesPage from './components/BlogSeriesPage';
import BlogEditorPage from './components/BlogEditorPage';
import ProfilePage from './components/ProfilePage';
import LeaderboardPage from './components/LeaderboardPage';
import SiteTour from './components/home/SiteTour';
import AboutPage from './components/AboutPage';
import AtlasHubPage from './components/AtlasHubPage';
import GlossaryPage from './components/glossary/GlossaryPage';
import GlossaryTermPage from './components/glossary/GlossaryTermPage';
import PrivacyPolicyPage from './components/PrivacyPolicyPage';
import TermsOfServicePage from './components/TermsOfServicePage';
import NotFoundPage from './components/NotFoundPage';
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


export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <ProgressProvider>
          <GamificationProvider>
            <FocusMusicProvider>
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
                      <Route path="/labs" element={<PracticeListPage />} />
                      <Route path="/lab/speech-test" element={<Suspense fallback={<p role="status" style={{ padding: '3rem', textAlign: 'center' }}>Loading speech test lab…</p>}><SpeechTestPage /></Suspense>} />
                      <Route path="/interview" element={<Suspense fallback={<p role="status" style={{ padding: '3rem', textAlign: 'center' }}>Loading interview questions…</p>}><InterviewPage /></Suspense>} />
                      <Route path="/interview/mock" element={<Suspense fallback={<p role="status" style={{ padding: '3rem', textAlign: 'center' }}>Loading mock interview…</p>}><MockInterviewPage /></Suspense>} />
                      <Route path="/practice" element={<Navigate to="/labs" replace />} />
                      <Route path="/practice/track/:topicSlug" element={<PracticeTrackPage />} />
                      <Route path="/practice/:slug" element={<PracticeProblemLayout />} />
                      <Route path="/blog" element={<BlogListPage />} />
                      <Route path="/blog/series/:seriesSlug" element={<BlogSeriesPage />} />
                      <Route path="/blog/write" element={<BlogEditorPage />} />
                      <Route path="/blog/write/:slug" element={<BlogEditorPage />} />
                      <Route path="/blog/:slug" element={<BlogPostPage />} />
                      <Route path="/progress" element={<ProgressPage />} />
                      <Route path="/profile" element={<ProfilePage />} />
                      <Route path="/leaderboard" element={<LeaderboardPage />} />
                      <Route path="/atlas" element={<AtlasHubPage />} />
                      <Route path="/glossary" element={<GlossaryPage />} />
                      <Route path="/glossary/:slug" element={<GlossaryTermPage />} />
                      <Route path="/docs/deep-learning/training-technique-atlas" element={<Navigate to="/docs/atlas/training" replace />} />
                      <Route path="/docs/inference-engineering/technique-atlas" element={<Navigate to="/docs/atlas/inference" replace />} />
                      <Route path="/about" element={<AboutPage />} />
                      <Route path="/privacy" element={<PrivacyPolicyPage />} />
                      <Route path="/terms" element={<TermsOfServicePage />} />
                      <Route path="/docs/practice-problems/overview" element={<Navigate to="/practice" replace />} />
                      <Route path="/docs/practice-problems/:slug" element={<PracticeProblemRedirect />} />
                      <Route path="/docs/*" element={<DocLayout />} />
                      <Route path="*" element={<NotFoundPage />} />
                    </Routes>
                  </div>
                  <SiteTour />
                  <Footer />
                </div>
              </BrowserRouter>
            </MDXProvider>
          </FocusMusicProvider>
        </GamificationProvider>
        </ProgressProvider>
      </AuthProvider>
    </ThemeProvider>
  );
}
