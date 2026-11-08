import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect } from '../primitives';
import { getConceptColor } from './diagramSystem';

type Facet = 'rbac' | 'netpol';

/** RBAC governs WHO can call the Kubernetes API to do WHAT; network
 * policies govern which PODS can talk to which other Pods over the
 * network -- two different security boundaries, easy to conflate. */
export default function RbacNetworkPolicyDiagram() {
  const t = useVizTokens();
  const [facet, setFacet] = useState<Facet>('netpol');
  const rbacColor = getConceptColor(t, 'query');
  const netpolColor = getConceptColor(t, 'attention');
  const width = 480;

  return (
    <VisualizationContainer footer={facet === 'rbac' ? 'RBAC: "can this USER/service-account call the Kubernetes API to create/read/delete THIS resource type?" -- the cluster-management-level analog to IAM.' : 'Network policies: "can THIS POD send traffic to THAT pod?" -- default Kubernetes networking is flat and open (any Pod can reach any Pod); policies restrict it.'}>
      <PillSelect<Facet> label="Security boundary" value={facet} onChange={setFacet} options={[{ value: 'rbac', label: 'RBAC (API access)' }, { value: 'netpol', label: 'Network Policy (Pod traffic)' }]} />
      <svg width="100%" viewBox={`0 0 ${width} 110`} style={{ display: 'block', marginTop: 10 }}>
        <defs>
          <marker id="rbac-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={rbacColor} />
          </marker>
          <marker id="netpol-arrow" markerWidth="7" markerHeight="7" refX="6" refY="3.5" orient="auto">
            <path d="M0,0 L7,3.5 L0,7 Z" fill={netpolColor} />
          </marker>
        </defs>
        {facet === 'rbac' ? (
          <>
            <circle cx={80} cy={55} r={26} fill={`${rbacColor}18`} stroke={rbacColor} strokeWidth={1.5} />
            <text x={80} y={59} textAnchor="middle" fontSize={9} fill={rbacColor}>user / SA</text>
            <line x1={106} y1={55} x2={188} y2={55} stroke={rbacColor} strokeWidth={1.5} markerEnd="url(#rbac-arrow)" />
            <text x={148} y={45} textAnchor="middle" fontSize={8} fill={rbacColor}>allowed?</text>
            <rect x={190} y={30} width={110} height={50} rx={8} fill="none" stroke={rbacColor} strokeWidth={1.5} />
            <text x={245} y={50} textAnchor="middle" fontSize={9} fill={rbacColor}>Kubernetes API</text>
            <text x={245} y={64} textAnchor="middle" fontSize={8} fill={t.textMuted}>(create Pods, read Secrets...)</text>
          </>
        ) : (
          <>
            <circle cx={80} cy={55} r={26} fill={`${netpolColor}18`} stroke={netpolColor} strokeWidth={1.5} />
            <text x={80} y={59} textAnchor="middle" fontSize={9} fill={netpolColor}>Pod A</text>
            <line x1={106} y1={55} x2={192} y2={55} stroke={netpolColor} strokeWidth={1.5} strokeDasharray="3 2" markerEnd="url(#netpol-arrow)" />
            <text x={148} y={45} textAnchor="middle" fontSize={8} fill={netpolColor}>allowed?</text>
            <circle cx={220} cy={55} r={26} fill={`${netpolColor}18`} stroke={netpolColor} strokeWidth={1.5} />
            <text x={220} y={59} textAnchor="middle" fontSize={9} fill={netpolColor}>Pod B</text>
          </>
        )}
      </svg>
    </VisualizationContainer>
  );
}
