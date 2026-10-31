import InformationPage from './InformationPage';
export default function PrivacyPolicyPage() {
  return <InformationPage title="Privacy Policy" description="How Neural Mastery handles account information, learning progress, and website usage data." updated>
    <p>This policy explains how Neural Mastery handles information when you use the platform.</p>
    <h2>Accounts and learning progress</h2>
    <p>You can explore the learning content without an account. Your browser stores local progress, preferences, and saved lab notes. If you sign in with Google or email and password, Firebase handles authentication. Account information and learning progress are stored using Firebase services to support your account and sync progress across devices.</p>
    <p>Your display name and points may appear on the public leaderboard. Your detailed learning history is not part of that public record.</p>
    <h2>Interview practice</h2>
    <p>Typed answers and self review stay in your browser. If you use the microphone, your browser’s speech provider may process audio remotely. Where model feedback is available, your answer text is sent to the review service only when you request it.</p>
    <h2>Website analytics and advertising</h2>
    <p>We use Google Analytics, Cloudflare Web Analytics, and a visit counter to understand usage and improve the platform. Service providers may receive information such as the page visited, referring site, IP address, and browser or device details. Google Analytics storage consent is set to denied by default; limited cookieless signals may still be sent.</p>
    <p>The site includes Google AdSense. Google and other advertising providers may use cookies or similar technologies to serve and measure ads, including personalization based on visits to this and other websites, subject to their settings and applicable consent requirements. See <a href="https://policies.google.com/technologies/partner-sites" target="_blank" rel="noopener noreferrer">how Google uses data</a> and manage personalization in <a href="https://myadcenter.google.com/" target="_blank" rel="noopener noreferrer">Google’s ad settings</a>.</p>
    <h2>Your choices</h2>
    <p>You can clear locally saved information through your browser settings. Signing out does not delete account data. For access, correction, or deletion requests, contact <a href="https://x.com/NeuralMastery" target="_blank" rel="noopener noreferrer">@NeuralMastery on X</a>. We may need to verify account ownership before acting on a request.</p>
    <h2>Changes and contact</h2>
    <p>We will update this page when our data practices change. For privacy questions, contact <a href="https://x.com/NeuralMastery" target="_blank" rel="noopener noreferrer">@NeuralMastery on X</a>.</p>
  </InformationPage>;
}
