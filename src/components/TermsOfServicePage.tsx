import { Link } from 'react-router-dom';
import InformationPage from './InformationPage';
export default function TermsOfServicePage() {
  return <InformationPage title="Terms of Service" description="Terms for using Neural Mastery’s educational content and tools." updated>
    <p>These terms apply to your use of Neural Mastery’s learning content, labs, interview practice, and related features.</p>
    <h2>Using the platform</h2>
    <p>Neural Mastery is an educational platform. You can read content and explore learning tools without signing in. An account enables features such as progress syncing and participation in the leaderboard. Keep your account credentials secure.</p>
    <h2>Responsible use</h2>
    <p>Use the platform lawfully and respectfully. Do not disrupt the service, attempt unauthorized access, misuse other users’ information, or submit content that infringes someone else’s rights.</p>
    <h2>Content and learning tools</h2>
    <p>Lessons, examples, simulations, and interview feedback are provided for learning. They may contain errors or simplifications. Check important results independently before using them in real systems. Learning outcomes, interview results, and uninterrupted availability are not guaranteed.</p>
    <p>Respect the ownership and licenses of the platform’s content, code, and materials from others. Materials with a separate license remain subject to that license.</p>
    <h2>Availability and updates</h2>
    <p>We may update content, change features, or suspend access to address misuse or service issues. The service is provided as available, without warranties to the extent permitted by law. Nothing in these terms limits rights that cannot legally be excluded.</p>
    <h2>Privacy and contact</h2>
    <p>Read our <Link to="/privacy">Privacy Policy</Link> for information about data handling. For questions, feedback, or issues, contact <a href="https://x.com/NeuralMastery" target="_blank" rel="noopener noreferrer">@NeuralMastery on X</a>.</p>
    <p>We will post changes to these terms here and update the date above.</p>
  </InformationPage>;
}
