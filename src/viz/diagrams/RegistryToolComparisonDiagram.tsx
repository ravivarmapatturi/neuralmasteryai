import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';
import SketchBox from '../../components/notebook/SketchBox';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

type Tool = 'mlflow' | 'sagemaker';

/** Two registries, click either -- the difference is integration
 * surface, not the underlying concept. */
export default function RegistryToolComparisonDiagram() {
  const t = useVizTokens();
  const [tool, setTool] = useState<Tool>('mlflow');
  const color = getConceptColor(t, 'attention');

  return (
    <VisualizationContainer footer={tool === 'mlflow' ? 'MLflow Model Registry: most common open-source option, integrated directly with MLflow Tracking -- the natural pick if you\'re already tracking experiments in MLflow.' : 'SageMaker Model Registry: AWS-managed, integrated with the rest of the SageMaker training/deployment flow -- the natural pick if the rest of the stack is already on SageMaker.'}>
      <div style={{ display: 'flex', gap: 8 }}>
        <SketchBox color={tool === 'mlflow' ? color : t.border} strokeWidth={1.5} style={{ flex: 1 }}>
          <div onClick={() => setTool('mlflow')} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTool('mlflow'); } }} onMouseEnter={() => setTool('mlflow')} style={{ cursor: 'pointer', padding: '0.7rem', borderRadius: 9, background: tool === 'mlflow' ? `${color}18` : t.surfaceAlt, textAlign: 'center' }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: tool === 'mlflow' ? color : t.textPrimary, fontFamily: HAND_FONT }}>MLflow Model Registry</span>
          </div>
        </SketchBox>
        <SketchBox color={tool === 'sagemaker' ? color : t.border} strokeWidth={1.5} style={{ flex: 1 }}>
          <div onClick={() => setTool('sagemaker')} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setTool('sagemaker'); } }} onMouseEnter={() => setTool('sagemaker')} style={{ cursor: 'pointer', padding: '0.7rem', borderRadius: 9, background: tool === 'sagemaker' ? `${color}18` : t.surfaceAlt, textAlign: 'center' }}>
            <span style={{ fontSize: 11.5, fontWeight: 700, color: tool === 'sagemaker' ? color : t.textPrimary, fontFamily: HAND_FONT }}>SageMaker Model Registry</span>
          </div>
        </SketchBox>
      </div>
    </VisualizationContainer>
  );
}
