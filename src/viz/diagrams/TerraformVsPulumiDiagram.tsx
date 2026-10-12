import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer } from '../primitives';
import { getConceptColor } from './diagramSystem';
import SketchBox from '../../components/notebook/SketchBox';

/** Same declared infrastructure, two languages -- click to compare
 * Terraform's HCL against Pulumi's general-purpose-language approach,
 * and where a real loop/conditional makes one awkward. */
export default function TerraformVsPulumiDiagram() {
  const t = useVizTokens();
  const [pulumi, setPulumi] = useState(false);
  const color = getConceptColor(t, 'attention');

  return (
    <VisualizationContainer footer={pulumi ? 'Pulumi: infrastructure in Python/TypeScript/Go -- real loops, conditionals, and functions when infrastructure logic needs them. Less common as a default, but the direct answer to "what if I want to write infrastructure in Python."' : 'Terraform: infrastructure in HCL, a domain-specific config format -- the more common default, cloud-agnostic across many providers.'}>
      <div style={{ display: 'flex', gap: 6, marginBottom: 12 }}>
        <button type="button" onClick={() => setPulumi(false)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: !pulumi ? 700 : 500, background: !pulumi ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${!pulumi ? color : t.border}`, color: !pulumi ? color : t.textSecondary, cursor: 'pointer' }}>
          Terraform (HCL)
        </button>
        <button type="button" onClick={() => setPulumi(true)} style={{ flex: 1, padding: '6px 10px', borderRadius: 6, fontSize: 10.5, fontWeight: pulumi ? 700 : 500, background: pulumi ? `${color}20` : t.surfaceAlt, border: `1.25px solid ${pulumi ? color : t.border}`, color: pulumi ? color : t.textSecondary, cursor: 'pointer' }}>
          Pulumi (Python/TS/Go)
        </button>
      </div>
      <SketchBox color={color} strokeWidth={1.3}>
        <div style={{ fontFamily: 'monospace', fontSize: 9.5, padding: '0.7rem', background: t.surfaceAlt, color: t.textSecondary, whiteSpace: 'pre', overflowX: 'auto' }}>
          {pulumi
            ? 'for size in ["small", "large"]:\n    aws.ec2.Instance(f"node-{size}",\n        instance_type=size)'
            : 'resource "aws_instance" "node" {\n  instance_type = var.size\n  # no native loop over sizes\n}'}
        </div>
      </SketchBox>
    </VisualizationContainer>
  );
}
