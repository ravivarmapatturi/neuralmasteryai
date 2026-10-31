import { Link } from 'react-router-dom';
import InformationPage from './InformationPage';
export default function AboutPage() {
  return <InformationPage title="About Neural Mastery" description="Helping engineers decide what to learn and how to learn in the AI era.">
    <p className="nm-information-lead">Our goal is to help engineers understand what to learn and how to learn in the AI era.</p>
    <p>As AI takes on more implementation work, engineers still need to understand the systems they build. Neural Mastery connects technical foundations with system design, decision making, experimentation, and the ability to check whether something works.</p>
    <h2>Understanding through exploration</h2>
    <p>Some ideas become clear when you can see them. Our lessons combine clear explanations with visualizations you can change, so you can follow a computation, compare approaches, and discover why a system behaves the way it does.</p>
    <p>In <Link to="/learn">Learn</Link>, build your foundations. In <Link to="/labs">Labs</Link>, test designs and explain your decisions. Explore new ideas in the <Link to="/blog">Blog</Link>, and practice communicating your reasoning in <Link to="/interview">Interview</Link>.</p>
    <h2>Questions, feedback, or an issue?</h2>
    <p>Reach us at <a href="https://x.com/NeuralMastery" target="_blank" rel="noopener noreferrer">@NeuralMastery on X ↗</a>.</p>
  </InformationPage>;
}
