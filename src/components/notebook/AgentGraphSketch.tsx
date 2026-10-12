import { SketchArrow, SketchEllipse, SketchRect } from './RoughShape';

/** A genuinely hand-illustrated-style rendering of a graph-based agent
 * architecture (Input -> Router -> parallel Agent nodes -> State Update ->
 * Output) -- same shape the reference Instagram notebook image draws for
 * LangGraph, and the same real architecture LoopGraphAnatomyDiagram
 * teaches on /docs/agents/loops-and-graphs (Splitter/Worker/Gate/Code).
 * Purely decorative here (the homepage hero); the interactive, accurate
 * version with click-to-inspect lives on that lesson page. */
export default function AgentGraphSketch() {
  const cobalt = 'var(--nb-cobalt)';
  const teal = 'var(--nb-teal)';
  const amber = 'var(--nb-amber)';
  const ink = 'var(--nb-ink)';

  return (
    <svg viewBox="0 0 420 300" width="100%" role="img" aria-label="Hand-drawn illustration of a graph-based agent architecture: input flows into a router node, which fans out to three parallel agent nodes, which converge into a state-update node, producing an output.">
      {/* Input */}
      <SketchEllipse cx={210} cy={26} width={110} height={34} color={ink} id="agh-input" />
      <text x={210} y={31} textAnchor="middle" fontFamily="var(--nb-font-hand)" fontSize={14} fill={ink}>Input</text>

      <SketchArrow points={[[210, 44], [210, 68]]} color={ink} id="agh-arrow-input" />

      {/* Router / planning node */}
      <SketchRect x={135} y={70} width={150} height={38} color={cobalt} fillColor={cobalt} roughness={1.5} id="agh-router" />
      <text x={210} y={94} textAnchor="middle" fontFamily="var(--nb-font-hand)" fontSize={14} fill={cobalt}>Router / Planner</text>

      {/* fan-out arrows */}
      <SketchArrow points={[[175, 108], [90, 140]]} color={ink} id="agh-arrow-a" />
      <SketchArrow points={[[210, 108], [210, 140]]} color={ink} id="agh-arrow-b" />
      <SketchArrow points={[[245, 108], [330, 140]]} color={ink} id="agh-arrow-c" />

      {/* Agent nodes */}
      <SketchRect x={30} y={142} width={120} height={42} color={teal} fillColor={teal} roughness={1.5} id="agh-node-a" />
      <text x={90} y={168} textAnchor="middle" fontFamily="var(--nb-font-hand)" fontSize={12.5} fill={teal}>Agent (tools)</text>

      <SketchRect x={150} y={142} width={120} height={42} color={teal} fillColor={teal} roughness={1.5} id="agh-node-b" />
      <text x={210} y={168} textAnchor="middle" fontFamily="var(--nb-font-hand)" fontSize={12.5} fill={teal}>Agent (search)</text>

      <SketchRect x={270} y={142} width={120} height={42} color={teal} fillColor={teal} roughness={1.5} id="agh-node-c" />
      <text x={330} y={168} textAnchor="middle" fontFamily="var(--nb-font-hand)" fontSize={12.5} fill={teal}>Agent (code)</text>

      {/* converge arrows */}
      <SketchArrow points={[[90, 186], [175, 220]]} color={ink} id="agh-arrow-d" />
      <SketchArrow points={[[210, 186], [210, 220]]} color={ink} id="agh-arrow-e" />
      <SketchArrow points={[[330, 186], [245, 220]]} color={ink} id="agh-arrow-f" />

      {/* State update */}
      <SketchRect x={140} y={222} width={140} height={36} color={amber} fillColor={amber} roughness={1.5} id="agh-state" />
      <text x={210} y={245} textAnchor="middle" fontFamily="var(--nb-font-hand)" fontSize={13} fill={amber}>State Update</text>

      <SketchArrow points={[[210, 258], [210, 280]]} color={ink} id="agh-arrow-out" />

      {/* Output */}
      <SketchEllipse cx={210} cy={288} width={110} height={30} color={ink} id="agh-output" />
      <text x={210} y={293} textAnchor="middle" fontFamily="var(--nb-font-hand)" fontSize={13} fill={ink}>Output</text>
    </svg>
  );
}
