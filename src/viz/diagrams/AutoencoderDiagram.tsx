import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton, VisualizationMath } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

/** The funnel shape IS the mechanism: information is forced through a
 * narrow bottleneck, which is what prevents the trivial identity-function
 * shortcut. Toggle to VAE to see the one structural change that gives it
 * a usable latent space: a single point z becomes a sampled distribution. */
export default function AutoencoderDiagram() {
  const t = useVizTokens();
  const [mode, setMode] = useState<'ae' | 'vae'>('ae');
  const encColor = getConceptColor(t, 'embedding');
  const decColor = getConceptColor(t, 'attention');
  const zColor = t.accentWarn;

  const width = 560;
  const height = 205;
  const midY = 70;
  const layerXs = [40, 130, 220, 340, 430, 520];
  const layerH = [70, 46, 16, 16, 46, 70];

  return (
    <VisualizationContainer footer={mode === 'ae' ? 'The bottleneck (narrow middle layer) forces compression -- without it, the network could just copy input to output and learn nothing.' : 'VAE encodes a distribution (mu, sigma), not a point -- z is sampled fresh each pass, which is what makes the latent space continuous enough to generate from.'}>
      <div style={{ display: 'flex', justifyContent: 'flex-end', marginBottom: 8, gap: 8 }}>
        <VizButton variant={mode === 'ae' ? 'primary' : 'secondary'} onClick={() => setMode('ae')}>Plain Autoencoder</VizButton>
        <VizButton variant={mode === 'vae' ? 'primary' : 'secondary'} onClick={() => setMode('vae')}>VAE</VizButton>
      </div>
      <svg width="100%" viewBox={`0 0 ${width} ${height}`} style={{ display: 'block' }}>
        <defs>
          <marker id="ae-arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={t.textMuted} />
          </marker>
          <marker id="ae-recon" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto">
            <path d="M0,0 L6,3 L0,6 Z" fill={t.textMuted} />
          </marker>
        </defs>

        {/* Layer-to-layer forward arrows strictly outside node boxes */}
        {layerXs.slice(0, -1).map((x, i) => {
          const isEnc = i < 2;
          const color = isEnc ? encColor : decColor;
          return (
            <line
              key={`l${i}`}
              x1={x + 12}
              y1={midY}
              x2={layerXs[i + 1] - 14}
              y2={midY}
              stroke={color}
              strokeWidth={1.5}
              markerEnd="url(#ae-arrow)"
              opacity={0.7}
            />
          );
        })}

        {/* Layer representations */}
        {layerXs.map((x, i) => {
          const h = layerH[i];
          const isBottleneck = i === 2 || i === 3;
          const color = i < 3 ? encColor : decColor;
          if (isBottleneck && mode === 'vae' && i === 2) {
            return (
              <g key={i}>
                <rect x={x - 14} y={midY - 24} width={28} height={18} rx={4} fill={`${zColor}22`} stroke={zColor} strokeWidth={1.5} />
                <text x={x} y={midY - 12} textAnchor="middle" fontSize={9} fontWeight={700} fill={zColor}>μ</text>
                <rect x={x - 14} y={midY + 6} width={28} height={18} rx={4} fill={`${zColor}22`} stroke={zColor} strokeWidth={1.5} />
                <text x={x} y={midY + 18} textAnchor="middle" fontSize={9} fontWeight={700} fill={zColor}>σ</text>
              </g>
            );
          }
          if (isBottleneck && i === 3) {
            return (
              <g key={i}>
                {mode === 'vae' ? (
                  <>
                    <circle cx={x} cy={midY} r={12} fill={`${zColor}18`} stroke={zColor} strokeWidth={1.5} strokeDasharray="3 2" />
                    <text x={x} y={midY - 18} textAnchor="middle" fontSize={9} fontFamily="monospace" fill={zColor}>z~N(μ,σ²)</text>
                  </>
                ) : (
                  <>
                    <circle cx={x} cy={midY} r={8} fill={zColor} />
                    <text x={x} y={midY - 16} textAnchor="middle" fontSize={9} fontFamily="monospace" fill={zColor}>z</text>
                  </>
                )}
              </g>
            );
          }
          return <rect key={i} x={x - 10} y={midY - h / 2} width={20} height={h} rx={4} fill={`${color}18`} stroke={color} strokeWidth={1.5} />;
        })}

        <text x={layerXs[0]} y={midY - layerH[0] / 2 - 10} textAnchor="middle" fontSize={11} fontFamily="monospace" fontWeight={700} fill={encColor}>x</text>
        <text x={layerXs[5]} y={midY - layerH[5] / 2 - 10} textAnchor="middle" fontSize={11} fontFamily="monospace" fontWeight={700} fill={decColor}>x̂</text>
        <text x={(layerXs[0] + layerXs[2]) / 2} y={20} textAnchor="middle" fontSize={11} fontWeight={700} fill={encColor}>ENCODER</text>
        <text x={(layerXs[3] + layerXs[5]) / 2} y={20} textAnchor="middle" fontSize={11} fontWeight={700} fill={decColor}>DECODER</text>

        {/* Reconstruction error curve from bottom of input to bottom of output, clear of all nodes */}
        <path
          d={`M ${layerXs[0]},${midY + layerH[0] / 2 + 8} C ${layerXs[0] + 60},${height - 35} ${layerXs[5] - 60},${height - 35} ${layerXs[5]},${midY + layerH[5] / 2 + 10}`}
          fill="none"
          stroke={t.textMuted}
          strokeWidth={1.25}
          strokeDasharray="4 3"
          markerEnd="url(#ae-recon)"
        />
        <text x={width / 2} y={height - 10} textAnchor="middle" fontSize={10} fill={t.textMuted}>reconstruction error ‖x − x̂‖²</text>
      </svg>
      <div style={{ marginTop: 8, textAlign: 'center' }}>
        <VisualizationMath latex={mode === 'ae' ? '\\hat{\\mathbf{x}} = \\text{decoder}(\\text{encoder}(\\mathbf{x}))' : '\\mathcal{L} = \\|\\mathbf{x}-\\hat{\\mathbf{x}}\\|^2 + D_{KL}\\big(\\mathcal{N}(\\mu,\\sigma^2)\\,\\|\\,\\mathcal{N}(0,1)\\big)'} />
      </div>
      <div style={{ textAlign: 'center', fontSize: DIAGRAM_TYPE.caption.size, color: t.textMuted, marginTop: 4 }}>
        {mode === 'ae' ? 'One fixed point z per input -- nearby points in latent space have no guaranteed meaning.' : 'A distribution per input, pulled toward N(0,1) by the KL term -- the latent space becomes continuous and sample-able.'}
      </div>
    </VisualizationContainer>
  );
}
