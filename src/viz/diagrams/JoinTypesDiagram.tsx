import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VizButton } from '../primitives';
import { DIAGRAM_TYPE } from './diagramSystem';
import SketchBox from '../../components/notebook/SketchBox';

const HAND_FONT = "'Kalam', 'Comic Sans MS', cursive";

type JoinType = 'inner' | 'left' | 'right' | 'full';

const CUSTOMERS = [
  { id: 1, name: 'Ada' },
  { id: 2, name: 'Grace' },
  { id: 3, name: 'Alan' },
];

const ORDERS = [
  { order_id: 101, customer_id: 2, item: 'Widget' },
  { order_id: 102, customer_id: 3, item: 'Gadget' },
  { order_id: 103, customer_id: 4, item: 'Gizmo' },
];

interface ResultRow {
  customerId: number | null;
  customerName: string | null;
  orderId: number | null;
  item: string | null;
}

function computeJoin(type: JoinType): ResultRow[] {
  const rows: ResultRow[] = [];
  const matchedOrderIds = new Set<number>();

  for (const c of CUSTOMERS) {
    const matches = ORDERS.filter((o) => o.customer_id === c.id);
    if (matches.length > 0) {
      for (const o of matches) {
        rows.push({ customerId: c.id, customerName: c.name, orderId: o.order_id, item: o.item });
        matchedOrderIds.add(o.order_id);
      }
    } else if (type === 'left' || type === 'full') {
      rows.push({ customerId: c.id, customerName: c.name, orderId: null, item: null });
    }
  }

  if (type === 'right' || type === 'full') {
    for (const o of ORDERS) {
      if (!matchedOrderIds.has(o.order_id)) {
        rows.push({ customerId: null, customerName: null, orderId: o.order_id, item: o.item });
      }
    }
  }

  return rows;
}

const JOIN_META: Record<JoinType, { sql: string; note: string }> = {
  inner: { sql: 'INNER JOIN', note: 'Only rows with a match on both sides survive -- customer Ada (no orders) and order 103 (unknown customer) both disappear.' },
  left: { sql: 'LEFT JOIN', note: 'Every customer row is kept, even Ada with no orders -- her order columns come back NULL.' },
  right: { sql: 'RIGHT JOIN', note: 'Every order row is kept, even order 103 whose customer_id matches nobody -- its customer columns come back NULL.' },
  full: { sql: 'FULL JOIN', note: 'Every row from both tables is kept -- Ada and order 103 both appear, each with NULLs on the side that has no match.' },
};

function MiniTable({ title, columns, rows }: { title: string; columns: string[]; rows: (string | number)[][] }) {
  const t = useVizTokens();
  return (
    <div>
      <div style={{ fontSize: DIAGRAM_TYPE.secondaryLabel.size, fontWeight: 600, color: t.textMuted, marginBottom: 4, fontFamily: HAND_FONT }}>{title}</div>
      <SketchBox color={t.border} strokeWidth={1.3}>
        <table style={{ borderCollapse: 'collapse', fontSize: 12, fontFamily: 'monospace' }}>
          <thead>
            <tr>
              {columns.map((col) => (
                <th key={col} style={{ textAlign: 'left', padding: '4px 10px', borderBottom: `1.5px solid ${t.border}`, color: t.textSecondary, fontWeight: 600 }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, i) => (
              <tr key={i}>
                {row.map((cell, j) => (
                  <td key={j} style={{ padding: '4px 10px', borderBottom: `1px solid ${t.border}`, color: t.textPrimary }}>{cell}</td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </SketchBox>
    </div>
  );
}

export default function JoinTypesDiagram() {
  const t = useVizTokens();
  const [type, setType] = useState<JoinType>('inner');
  const rows = computeJoin(type);
  const meta = JOIN_META[type];

  return (
    <VisualizationContainer footer={meta.note}>
      <div style={{ display: 'flex', gap: 8, marginBottom: 14, flexWrap: 'wrap' }}>
        {(['inner', 'left', 'right', 'full'] as JoinType[]).map((jt) => (
          <VizButton key={jt} variant={type === jt ? 'primary' : 'secondary'} onClick={() => setType(jt)}>
            {JOIN_META[jt].sql}
          </VizButton>
        ))}
      </div>

      <div style={{ display: 'flex', gap: 28, flexWrap: 'wrap', marginBottom: 16 }}>
        <MiniTable title="customers" columns={['id', 'name']} rows={CUSTOMERS.map((c) => [c.id, c.name])} />
        <MiniTable title="orders" columns={['order_id', 'customer_id', 'item']} rows={ORDERS.map((o) => [o.order_id, o.customer_id, o.item])} />
      </div>

      <SketchBox color={t.border} strokeWidth={1.3} style={{ marginBottom: 14 }}>
        <div
          style={{
            fontFamily: 'monospace',
            fontSize: 12.5,
            background: t.surfaceAlt,
            borderRadius: 6,
            padding: '8px 12px',
            color: t.textSecondary,
          }}
        >
          SELECT c.name, o.item{'\n'}FROM customers c{'\n'}<span style={{ color: t.accentPrimary, fontWeight: 700 }}>{meta.sql}</span> orders o ON o.customer_id = c.id;
        </div>
      </SketchBox>

      <div style={{ fontSize: DIAGRAM_TYPE.secondaryLabel.size, fontWeight: 600, color: t.textMuted, marginBottom: 4, fontFamily: HAND_FONT }}>Result</div>
      <SketchBox color={t.border} strokeWidth={1.3} style={{ width: '100%' }}>
        <table style={{ borderCollapse: 'collapse', fontSize: 12, fontFamily: 'monospace', width: '100%' }}>
          <thead>
            <tr>
              {['c.id', 'c.name', 'o.order_id', 'o.item'].map((col) => (
                <th key={col} style={{ textAlign: 'left', padding: '4px 10px', borderBottom: `1.5px solid ${t.border}`, color: t.textSecondary, fontWeight: 600 }}>{col}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((r, i) => (
              <tr key={i}>
                {[r.customerId, r.customerName, r.orderId, r.item].map((cell, j) => (
                  <td
                    key={j}
                    style={{
                      padding: '4px 10px',
                      borderBottom: `1px solid ${t.border}`,
                      color: cell === null ? t.textMuted : t.textPrimary,
                      fontStyle: cell === null ? 'italic' : 'normal',
                      background: cell === null ? `${t.accentDanger}0F` : 'transparent',
                    }}
                  >
                    {cell === null ? 'NULL' : cell}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </SketchBox>
    </VisualizationContainer>
  );
}
