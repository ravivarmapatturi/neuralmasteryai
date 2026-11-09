import { useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, VisualizationHeader, Slider } from '../primitives';
export default function SoftwareRecoveryExplorer() {
  const t = useVizTokens();
  const [backupAge, setBackupAge] = useState(15);
  const [restore, setRestore] = useState(40);
  return <VisualizationContainer footer="Illustrative recovery timeline: a backup 15 minutes old risks 15 minutes of unreplicated changes; detection, restore, and validation total 50 minutes. Replication lag and backup age are distinct recovery inputs.">
    <VisualizationHeader title="Data loss and recovery time are separate budgets" />
    <Slider label="Backup age at incident (minutes)" value={backupAge} onChange={setBackupAge} min={0} max={60}/>
    <Slider label="Restore duration (minutes)" value={restore} onChange={setRestore} min={5} max={90}/>
    <svg viewBox="0 0 300 100" width="100%" role="img" aria-label={`Potential data gap ${backupAge} minutes; recovery ${restore+10} minutes`}>
      <text x="0" y="18" fill={t.textPrimary} fontSize="14">Potential data gap: {backupAge} min</text>
      <rect x="0" y="28" width={backupAge*3} height="15" fill={t.accentWarn}/>
      <text x="0" y="65" fill={t.textPrimary} fontSize="14">Recovery: 5 detect + {restore} restore + 5 validate</text>
      <rect x="0" y="77" width={(restore+10)*3} height="15" fill={t.accentPrimary}/>
    </svg><p role="status">Calculated recovery time: {restore+10} minutes</p>
  </VisualizationContainer>;
}
