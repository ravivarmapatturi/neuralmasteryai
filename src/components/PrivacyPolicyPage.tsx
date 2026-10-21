import Navbar from './layout/Navbar';
import { useDocumentTitle } from '../lib/useDocumentTitle';
import { useDocumentMeta } from '../lib/useDocumentMeta';

/**
 * Honest, specific to what this site actually does -- not generic
 * boilerplate. Every claim here is checked directly against the real
 * implementation (src/lib/firebase.ts, src/contexts/AuthContext.tsx,
 * src/contexts/ProgressContext.tsx, src/contexts/GamificationContext.tsx,
 * src/components/AnalyticsTracker.tsx) at the time this was written --
 * if any of those change what they actually do, this page needs updating
 * to match, not the other way around.
 */
export default function PrivacyPolicyPage() {
  useDocumentTitle('Privacy Policy');
  useDocumentMeta('Privacy Policy', 'What Neural Mastery actually collects and stores, and why -- checked directly against the real implementation.');

  return (
    <div style={{ minHeight: '100%', background: 'var(--nm-bg)' }}>
      <Navbar />
      <main>
        <section style={{ maxWidth: 700, margin: '0 auto', padding: '3rem 1.5rem 4rem' }}>
          <h1 style={{ fontSize: 'clamp(1.6rem, 4vw, 2.2rem)', fontWeight: 800, color: 'var(--nm-text-primary)', marginBottom: '0.5rem' }}>
            Privacy Policy
          </h1>
          <p style={{ fontSize: 13, color: 'var(--nm-text-muted)', marginBottom: '2rem' }}>Last updated September 2026.</p>
          <div style={{ fontSize: 15, lineHeight: 1.75, color: 'var(--nm-text-secondary)' }}>
            <p>
              This page describes what Neural Mastery actually collects and stores, in plain terms — not a generic template.
              If you don't sign in, almost nothing described below applies to you; your progress and points are tracked only
              in your own browser's local storage and never sent anywhere.
            </p>

            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--nm-text-primary)', marginTop: '2rem', marginBottom: '0.75rem' }}>
              If you sign in with Google
            </h2>
            <p>
              Signing in uses Firebase Authentication with Google as the only sign-in method offered — there's no separate
              password to create or for us to store. We receive your Google account's display name, email address, and
              profile photo URL from Google, which Firebase uses to identify your account.
            </p>
            <p>
              Once signed in, your page-completion checklist, points, streak, and practice-problem history are stored in
              Cloud Firestore, tied to your account, so they sync across devices. A denormalized subset of this — your
              display name, all-time points, and this week's points — is written to a separate, publicly-readable
              leaderboard record, since the site's leaderboard feature needs to compare users against each other. Your
              detailed page-by-page progress and practice history are <em>not</em> part of that public record.
            </p>

            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--nm-text-primary)', marginTop: '2rem', marginBottom: '0.75rem' }}>
              Analytics
            </h2>
            <p>
              The site uses Google Analytics (GA4) via Firebase to understand real, aggregate usage (which pages get visited,
              roughly how much). There is no consent-banner UI yet, so analytics runs with Google's Consent Mode set to denied
              by default for every visitor — no tracking cookie is set, and no per-visitor data is collected. Google's Consent
              Mode still sends aggregated, cookieless signal even when denied (this is how Consent Mode is designed to work,
              not a workaround), which is why some anonymous, non-per-visitor usage data still reaches Google. We never
              enable ad-related tracking (ad_storage, ad_user_data, ad_personalization) — this site runs no ads or
              remarketing, so there's no use for that data regardless of consent.
            </p>
            <p>
              To count visits, the site also uses Cloudflare Web Analytics. It sets no cookies and doesn't fingerprint
              or track you across sites: it records the page, the referring site, your country, and your browser and
              device type, and reports them only as totals.
            </p>

            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--nm-text-primary)', marginTop: '2rem', marginBottom: '0.75rem' }}>
              What we don't do
            </h2>
            <p>
              We don't sell your data. We don't share it with anyone beyond the Google/Firebase infrastructure the site itself
              runs on and Cloudflare's visit counter. We don't run ads. We don't have a mailing list.
            </p>

            <h2 style={{ fontSize: 18, fontWeight: 700, color: 'var(--nm-text-primary)', marginTop: '2rem', marginBottom: '0.75rem' }}>
              Your data, your control
            </h2>
            <p>
              You can sign out at any time; your account data stays in Firestore for if you sign back in. To have your
              account data deleted entirely, open an issue on the project's{' '}
              <a href="https://github.com/ravivarmapatturi/NeuralMastery-vite/issues" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--nm-accent-primary)' }}>
                GitHub repository
              </a>{' '}
              — see the <a href="/about" style={{ color: 'var(--nm-accent-primary)' }}>About page</a> for why that's the real contact channel this project has.
            </p>
          </div>
        </section>
      </main>
    </div>
  );
}
