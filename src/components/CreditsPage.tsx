import InformationPage from './InformationPage';

type Credit = [name: string, license: string, url: string, use: string];

const MODELS: Credit[] = [
  ['Kokoro-82M (ONNX)', 'Apache-2.0', 'https://huggingface.co/onnx-community/Kokoro-82M-v1.0-ONNX', 'On-device voice for interview questions and answers'],
  ['Moonshine tiny and base (ONNX)', 'MIT', 'https://huggingface.co/onnx-community/moonshine-base-ONNX', 'On-device speech recognition in the interview room'],
  ['Whisper tiny.en and base.en (ONNX)', 'MIT', 'https://huggingface.co/onnx-community/whisper-base.en', 'On-device speech recognition'],
  ['all-MiniLM-L6-v2', 'Apache-2.0', 'https://huggingface.co/Xenova/all-MiniLM-L6-v2', 'Sentence embeddings for answer feedback'],
  ['Silero VAD (via vad-web)', 'MIT', 'https://github.com/snakers4/silero-vad', 'Detecting when you start and stop speaking'],
];

const RUNTIME: Credit[] = [
  ['Pyodide', 'MPL-2.0', 'https://pyodide.org', 'Runs Python and NumPy in your browser'],
  ['Transformers.js', 'Apache-2.0', 'https://github.com/huggingface/transformers.js', 'Runs the models above in the browser'],
  ['kokoro-js', 'Apache-2.0', 'https://github.com/hexgrad/kokoro', 'Kokoro text-to-speech in JavaScript'],
  ['vad-web', 'ISC', 'https://github.com/ricky0123/vad', 'Voice activity detection in the browser'],
  ['React and React Router', 'MIT', 'https://react.dev', 'The application'],
  ['MDX, unified, remark and rehype', 'MIT', 'https://mdxjs.com', 'Writing lessons as Markdown with components'],
  ['KaTeX', 'MIT', 'https://katex.org', 'Maths typesetting'],
  ['Shiki', 'MIT', 'https://shiki.style', 'Code highlighting'],
  ['CodeMirror', 'MIT', 'https://codemirror.net', 'The code editor in labs'],
  ['D3', 'ISC', 'https://d3js.org', 'Charts and diagram layout'],
  ['Rough.js', 'MIT', 'https://roughjs.com', 'Hand-drawn diagram style'],
  ['three.js, React Three Fiber and drei', 'MIT', 'https://threejs.org', '3D visualisations'],
  ['React Flow (xyflow)', 'MIT', 'https://reactflow.dev', 'Node graphs in the agent builder'],
  ['Motion (framer-motion)', 'MIT', 'https://motion.dev', 'Animation'],
  ['Pagefind', 'MIT', 'https://pagefind.app', 'Site search'],
  ['Firebase JavaScript SDK', 'Apache-2.0', 'https://firebase.google.com', 'Sign-in, saved progress and the leaderboard'],
  ['Vite and TypeScript', 'MIT and Apache-2.0', 'https://vite.dev', 'Building the site'],
];

const FONTS: Credit[] = [
  ['Kalam', 'SIL OFL 1.1', 'https://fonts.google.com/specimen/Kalam', 'Handwritten headings and diagram labels'],
  ['Literata', 'SIL OFL 1.1', 'https://fonts.google.com/specimen/Literata', 'Reading text'],
  ['Space Mono', 'SIL OFL 1.1', 'https://fonts.google.com/specimen/Space+Mono', 'Code and figures'],
];

function Table({ rows }: { rows: Credit[] }) {
  return (
    <ul className="nm-credits">
      {rows.map(([name, license, url, use]) => (
        <li key={name}>
          <a href={url} target="_blank" rel="noopener noreferrer">{name} ↗</a>
          <span className="nm-credits-license">{license}</span>
          <span className="nm-credits-use">{use}</span>
        </li>
      ))}
    </ul>
  );
}

export default function CreditsPage() {
  return (
    <InformationPage title="Credits" description="The open-source models, libraries and fonts Neural Mastery is built on, with their licences.">
      <p className="nm-information-lead">Neural Mastery runs on open-source work. These are the models, libraries and fonts we use, with their licences.</p>
      <p>Lesson text, diagrams, problems and interview questions are written for this site. The papers and documentation we teach from are cited on each page.</p>
      <h2>Models that run in your browser</h2>
      <Table rows={MODELS} />
      <h2>Libraries</h2>
      <Table rows={RUNTIME} />
      <h2>Fonts</h2>
      <Table rows={FONTS} />
      <p>Something missing or credited wrongly? Tell us at <a href="https://x.com/NeuralMastery" target="_blank" rel="noopener noreferrer">@NeuralMastery on X ↗</a>.</p>
    </InformationPage>
  );
}
