import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { SelectableRow, VisualizationContainer } from '../primitives';

const NEEDS = [
  {
    key: 'realtime',
    need: 'Synchronous, low-latency, steady traffic',
    aws: 'SageMaker real-time endpoint',
    azure: 'AML managed online endpoint',
    why: 'Both keep an always-on, persistent endpoint provisioned specifically to answer every request immediately -- the right choice once request volume is steady enough that paying for idle capacity is worth the latency guarantee.',
  },
  {
    key: 'serverless',
    need: 'Spiky/low-average traffic, tolerate cold starts',
    aws: 'SageMaker Serverless Inference',
    azure: 'Container Apps (scale-to-zero)',
    why: 'Both scale compute to zero between requests instead of paying for an always-on instance, trading a cold-start delay on the first request after idle time for not paying for idle capacity at all.',
  },
  {
    key: 'async',
    need: 'Slow requests, large payloads, async result',
    aws: 'SageMaker Async Inference',
    azure: "AML online endpoint + your own queue",
    why: "SageMaker has a purpose-built async mode (immediate acknowledgment, result lands in S3); Azure ML has no direct equivalent -- you'd build the same queue-and-poll pattern yourself on top of a regular endpoint.",
  },
  {
    key: 'batch',
    need: 'Score a whole dataset, no persistent endpoint',
    aws: 'SageMaker Batch Transform',
    azure: 'AML batch endpoint',
    why: 'Neither stands up a persistent endpoint at all -- point at a dataset, get predictions back, and the compute tears down when the job finishes. The right choice whenever there is no latency pressure.',
  },
  {
    key: 'control',
    need: 'Full control over the serving stack',
    aws: 'ECS / EKS',
    azure: 'AKS',
    why: 'Trading the managed inference layer away entirely for running your own serving container on general-purpose compute -- full control over the stack, at the cost of owning everything SageMaker/AML would otherwise handle.',
  },
  {
    key: 'managed-llm',
    need: 'Managed foundation models, zero infra',
    aws: 'Bedrock',
    azure: 'Azure OpenAI Service',
    why: 'Both are the managed-LLM equivalent of a real-time endpoint for foundation models specifically -- no infrastructure to provision at all, just an API call against a hosted model.',
  },
];

export default function CloudDeploymentChoiceDiagram() {
  const t = useVizTokens();
  const [active, setActive] = useState('realtime');
  const info = NEEDS.find((n) => n.key === active)!;
  const awsColor = t.accentWarn;
  const azureColor = t.accentSecondary;

  return (
    <VisualizationContainer footer={info.why}>
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
        {NEEDS.map((n) => {
          const isActive = active === n.key;
          return (
            <SelectableRow
              key={n.key}
              selected={isActive}
              label={n.need}
              onSelect={() => setActive(n.key)}
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '0.55rem 0.8rem',
                borderRadius: 8,
                background: isActive ? `${t.accentPrimary}18` : t.surfaceAlt,
                border: `1.5px solid ${isActive ? t.accentPrimary : t.border}`,
                flexWrap: 'wrap',
              }}
            >
              <span style={{ flex: 2, minWidth: 180, fontSize: 12, fontWeight: isActive ? 700 : 500, color: isActive ? t.accentPrimary : t.textPrimary }}>
                {n.need}
              </span>
              <span style={{ flex: 1, minWidth: 140, fontSize: 11, fontWeight: 600, color: awsColor, textAlign: 'right' }}>
                AWS: {n.aws}
              </span>
              <span style={{ flex: 1, minWidth: 140, fontSize: 11, fontWeight: 600, color: azureColor, textAlign: 'right' }}>
                Azure: {n.azure}
              </span>
            </SelectableRow>
          );
        })}
      </div>
    </VisualizationContainer>
  );
}
