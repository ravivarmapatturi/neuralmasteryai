import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, Slider, VisualizationMath, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, getConceptColor } from './diagramSystem';

const BASELINE = 60; // distance between the two cameras, arbitrary units
const FOCAL = 50; // focal length, same units

const WIDTH = 460;
const CAM_Y = 140;
const PLANE_Y = 40;
const SCALE = 1.4;

const DEPTH_PRESETS = [70, 130, 200, 280];

export default function StereoDepthDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(DEPTH_PRESETS.length, 2800);
  const [userDepth, setUserDepth] = useState<number | null>(null);
  const depth = userDepth ?? DEPTH_PRESETS[autoIdx];

  const objX = BASELINE / 2; // object centered between the two cameras
  const leftImgX = (FOCAL * (objX - 0)) / depth;
  const rightImgX = (FOCAL * (objX - BASELINE)) / depth;
  const disparity = leftImgX - rightImgX; // = FOCAL * BASELINE / depth, independent of objX
  const reconstructedDepth = (FOCAL * BASELINE) / disparity;

  const leftColor = getConceptColor(t, 'query');
  const rightColor = getConceptColor(t, 'key');
  const objColor = getConceptColor(t, 'attention');

  const originX = 20;
  const camLeftX = originX;
  const camRightX = originX + BASELINE * SCALE;
  const objPxX = originX + objX * SCALE;
  const objPxY = CAM_Y - depth * (SCALE * 0.55);
  const planeLeftPxX = camLeftX + leftImgX * SCALE;
  const planeRightPxX = camRightX + rightImgX * SCALE;

  return (
    <VisualizationContainer
      footer={
        <>
          At depth {depth}: disparity = {disparity.toFixed(2)}. Reconstructing depth from that disparity alone (baseline × focal / disparity) gives back {reconstructedDepth.toFixed(1)} — the same number, closing the loop. This is the entire geometric trick: disparity shrinks as an object gets farther away, so measuring it is enough to recover distance, with no learning required for the geometry itself (only for producing accurate disparity estimates from real, noisy images).
        </>
      }
    >
      <Slider label="Object depth" value={depth} onChange={setUserDepth} min={50} max={300} format={(v) => `${v}`} />
      <svg width="100%" viewBox={`0 -10 ${WIDTH} ${CAM_Y + 20}`} style={{ display: 'block', marginTop: 8 }}>
        <line x1={camLeftX} y1={PLANE_Y} x2={camLeftX} y2={CAM_Y} stroke={t.border} strokeWidth={1} strokeDasharray="2 2" />
        <line x1={camRightX} y1={PLANE_Y} x2={camRightX} y2={CAM_Y} stroke={t.border} strokeWidth={1} strokeDasharray="2 2" />
        <line x1={20} y1={PLANE_Y} x2={WIDTH - 20} y2={PLANE_Y} stroke={t.border} strokeWidth={1} />
        <text x={WIDTH - 20} y={PLANE_Y - 6} textAnchor="end" fontSize={9} fill={t.textMuted}>image plane</text>

        <line x1={camLeftX} y1={CAM_Y} x2={objPxX} y2={objPxY} stroke={leftColor} strokeWidth={1} opacity={0.5} />
        <line x1={camRightX} y1={CAM_Y} x2={objPxX} y2={objPxY} stroke={rightColor} strokeWidth={1} opacity={0.5} />

        <circle cx={camLeftX} cy={CAM_Y} r={6} fill={leftColor} />
        <text x={camLeftX} y={CAM_Y + 16} textAnchor="middle" fontSize={9} fill={leftColor}>left cam</text>
        <circle cx={camRightX} cy={CAM_Y} r={6} fill={rightColor} />
        <text x={camRightX} y={CAM_Y + 16} textAnchor="middle" fontSize={9} fill={rightColor}>right cam</text>

        <circle cx={objPxX} cy={Math.max(PLANE_Y + 5, objPxY)} r={6} fill={objColor} />

        <circle cx={planeLeftPxX} cy={PLANE_Y} r={4} fill={leftColor} />
        <circle cx={planeRightPxX} cy={PLANE_Y} r={4} fill={rightColor} />
        <line x1={planeLeftPxX} y1={PLANE_Y - 10} x2={planeRightPxX} y2={PLANE_Y - 10} stroke={t.textMuted} strokeWidth={1.5} />
        <text x={(planeLeftPxX + planeRightPxX) / 2} y={PLANE_Y - 14} textAnchor="middle" fontSize={9} fontWeight={700} fill={t.textPrimary}>
          disparity
        </text>
      </svg>
      <div style={{ textAlign: 'center', marginTop: 4 }}>
        <VisualizationMath latex="\text{depth} = \frac{\text{baseline} \times \text{focal length}}{\text{disparity}}" />
      </div>
      <div style={{ fontSize: DIAGRAM_TYPE.secondaryLabel.size, color: t.textMuted, textAlign: 'center' }}>
        Top-down schematic — closer objects (smaller depth) produce a larger disparity between the two cameras' views.
      </div>
    </VisualizationContainer>
  );
}
