import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';

const STAGES = [
  { label: '1. Roofline & KV', href: '/docs/inference-engineering/roofline-and-kv-cache', desc: 'Arithmetic intensity, memory bandwidth bottlenecks, and PagedAttention.' },
  { label: '2. Batching', href: '/docs/inference-engineering/continuous-batching-and-speculative-decoding', desc: 'Continuous batching iterations, speculative decoding, and Tree Attention.' },
  { label: '3. Quantization', href: '/docs/inference-engineering/quantization-and-compression', desc: 'Symmetric/affine quantization, AWQ activation protection, and GPTQ.' },
  { label: '4. Edge TinyML', href: '/docs/inference-engineering/edge-and-tinyml-architecture', desc: 'CMSIS-NN intrinsics, NOR flash XIP, and ping-pong tensor arenas.' },
  { label: '5. Kernels', href: '/docs/inference-engineering/hardware-acceleration-and-kernels', desc: 'SRAM tiling, online softmax, and custom OpenAI Triton kernels.' },
  { label: '6. Disaggregation', href: '/docs/inference-engineering/disaggregation-prefix-caching-and-production', desc: 'Prefill-Decode physical separation, RDMA transfers, and Radix trees.' },
];

export default function InferenceCurriculumDiagram() {
  const t = useVizTokens();
  const [active, setActive] = useState(0);
  const color = t.accentPrimary;
  const width = 680;
  const stepX = (i: number) => 50 + i * ((width - 100) / (STAGES.length - 1));
  const y = 40;

  return (
    <VisualizationContainer title="Inference Engineering Curriculum Map" footer={STAGES[active].desc}>
      <svg width="100%" viewBox={`0 0 ${width} 90`} style={{ display: 'block' }} role="img" aria-label="Inference Curriculum Track Diagram">
        <defs>
          <marker id="inf-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={t.textMuted} />
          </marker>
        </defs>
        {STAGES.map((_, i) => i > 0 && (
          <line key={i} x1={stepX(i - 1) + 34} y1={y} x2={stepX(i) - 34} y2={y} stroke={t.border} strokeWidth={1.5} markerEnd="url(#inf-arrow)" />
        ))}
        {STAGES.map((p, i) => {
          const isActive = active === i;
          return (
            <g key={p.label} onClick={() => setActive(i)} onMouseEnter={() => setActive(i)} style={{ cursor: 'pointer' }}>
              <circle cx={stepX(i)} cy={y} r={30} fill={isActive ? `${color}25` : t.surfaceAlt} stroke={isActive ? color : t.border} strokeWidth={isActive ? 2.5 : 1.5} />
              <text x={stepX(i)} y={y + 4} textAnchor="middle" fontSize={7.5} fontWeight={700} fill={isActive ? color : t.textPrimary}>{p.label}</text>
              <text x={stepX(i)} y={y + 44} textAnchor="middle" fontSize={9} fill={t.textSecondary}>Stage {i + 1}</text>
            </g>
          );
        })}
      </svg>
      <div style={{ textAlign: 'center', fontSize: 11, color: t.textSecondary, marginTop: 4 }}>
        Click any stage to inspect the underlying systems challenge and optimization target.
      </div>
    </VisualizationContainer>
  );
}
