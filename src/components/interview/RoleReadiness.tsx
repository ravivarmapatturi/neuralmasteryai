import { useMemo, useState } from 'react';
import { useInterviewLearning } from '../../contexts/InterviewLearningContext';
import { READINESS_ROLES, readinessForRole, type ReadinessRole, type RoleQuestion } from '../../lib/interviewReadiness';

export function RoleReadiness({questions,initialRole}:{questions:RoleQuestion[];initialRole?:string}) {
  const {records,ready,syncState}=useInterviewLearning();
  const [role,setRole]=useState<ReadinessRole>(()=>initialRole && Object.hasOwn(READINESS_ROLES,initialRole) ? initialRole as ReadinessRole : 'applied-ai-engineer');
  const coverage=useMemo(()=>readinessForRole(questions,records,role),[questions,records,role]);
  return <section className="si-learning-section si-role-readiness" aria-label="Role readiness">
    <h2>Role readiness</h2>
    <p>Use your practice and self-ratings to decide what to revisit. Totals follow the catalog’s role tags; a question can belong to more than one role.</p>
    <label className="si-readiness-label">Readiness role
      <select aria-label="Readiness role" value={role} onChange={event=>{if(Object.hasOwn(READINESS_ROLES,event.target.value))setRole(event.target.value as ReadinessRole);}}>
        {Object.entries(READINESS_ROLES).map(([id,label])=><option key={id} value={id}>{label}</option>)}
      </select>
    </label>
    {ready===false ? <p role="status">Loading saved practice…</p> : <>
      <div className="si-readiness-counts" aria-live="polite">
        <p className="si-role-completed"><strong>{coverage.completed}</strong> of {coverage.total} questions completed</p>
        <p className="si-role-got-it"><strong>{coverage.gotIt}</strong> of {coverage.total} self-rated Got it</p>
      </div>
      <h3>Three topics to revisit</h3>
      <p className="si-status">Topics with the least Got it coverage come first. Missed it and Partly break ties. Unrated questions remain coverage gaps.</p>
      <ol className="si-readiness-topics">{coverage.weakest.map(topic=><li key={topic.id}>
        <a href={`/interview?${new URLSearchParams({topic:topic.id,role})}`}>{topic.title}</a>
        <span>{topic.gotIt} of {topic.total} self-rated Got it · {topic.completed} completed</span>
      </li>)}</ol>
      {coverage.total===0 && <p>No questions are tagged for this role yet.</p>}
    </>}
    {syncState==='storage-error' && <p role="status">Role progress could not be saved on this device.</p>}
    {syncState==='offline' && <p role="status">Role progress is saved on this device. Sync will retry when connected.</p>}
  </section>;
}
