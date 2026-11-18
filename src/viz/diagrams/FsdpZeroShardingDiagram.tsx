import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

type Stage = 'ddp' | 'zero1' | 'zero2' | 'zero3';
const STAGES_KEYS: Stage[] = ['ddp', 'zero1', 'zero2', 'zero3'];
const STAGES: Record<Stage, { label: string; params: boolean; grads: boolean; optim: boolean; desc: string }> = {
  ddp: { label: 'Plain data parallel', params: false, grads: false, optim: false, desc: 'Every GPU holds a FULL copy of parameters, gradients, and optimizer state -- simplest, most memory-hungry.' },
  zero1: { label: 'ZeRO-1 / FSDP (optimizer only)', params: false, grads: false, optim: true, desc: 'Shards optimizer state (often the largest piece, e.g. Adam\'s two extra moment buffers per parameter) across GPUs.' },
  zero2: { label: 'ZeRO-2 (+ gradients)', params: false, grads: true, optim: true, desc: 'Also shards gradients -- each GPU only ever materializes the gradient shard it owns.' },
  zero3: { label: 'ZeRO-3 / full FSDP (+ params)', params: true, grads: true, optim: true, desc: 'Shards parameters too -- gathers only the parameters needed for the current computation, on the fly. Maximum memory savings, most communication.' },
};

/** Each stage shards one more piece of training state -- toggle through
 * them and watch which of the three (params/grads/optimizer) is actually
 * sharded vs. still fully replicated. */
export default function FsdpZeroShardingDiagram() {
  const t = useVizTokens();
  const { value: stageIdx, pick } = useAutoCycle(STAGES_KEYS.length, 3000, 2);
  const stage = STAGES_KEYS[stageIdx];
  const color = getConceptColor(t, 'attention');
  const s = STAGES[stage];

  function Piece({ label, sharded }: { label: string; sharded: boolean }) {
    return (
      <div style={{ flex: 1, textAlign: 'center', padding: '0.6rem', borderRadius: 8, background: sharded ? `${color}18` : t.surfaceAlt, border: `1.5px solid ${sharded ? color : t.border}`, transition: 'all 250ms ease' }}>
        <div style={{ fontSize: 11, fontWeight: 700, color: sharded ? color : t.textMuted }}>{label}</div>
        <div style={{ fontSize: 9.5, color: sharded ? color : t.textMuted, marginTop: 3, fontWeight: sharded ? 600 : 400 }}>{sharded ? '✂ sharded' : 'replicated'}</div>
      </div>
    );
  }

  return (
    <VisualizationContainer footer={s.desc}>
      <PillSelect<Stage>
        label="Stage"
        value={stage}
        onChange={(st) => {
          const next = typeof st === 'function' ? st(stage) : st;
          pick(STAGES_KEYS.indexOf(next));
        }}
        options={[{ value: 'ddp', label: 'Plain DP' }, { value: 'zero1', label: 'ZeRO-1' }, { value: 'zero2', label: 'ZeRO-2' }, { value: 'zero3', label: 'ZeRO-3' }]}
      />
      <div style={{ display: 'flex', gap: 8, marginTop: 10 }}>
        <Piece label="Parameters" sharded={s.params} />
        <Piece label="Gradients" sharded={s.grads} />
        <Piece label="Optimizer state" sharded={s.optim} />
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 8 }}>
        FSDP and DeepSpeed's ZeRO stages are conceptually the same idea -- progressively shard more of the training state, trading memory for communication.
      </div>
    </VisualizationContainer>
  );
}
