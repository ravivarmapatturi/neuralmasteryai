import { useMemo, useState } from 'react';
import { Link } from 'react-router-dom';
import Navbar from '../layout/Navbar';
import { GLOSSARY_FIELDS, glossaryTerms } from '../../data/glossary';

export default function GlossaryPage() {
  const [query, setQuery] = useState('');
  const [field, setField] = useState('All');
  const results = useMemo(() => glossaryTerms.filter((entry) => {
    const q = query.trim().toLowerCase();
    return (field === 'All' || entry.field === field) && (!q || `${entry.term} ${entry.oneLine} ${entry.field}`.toLowerCase().includes(q));
  }), [query, field]);

  const grouped = useMemo(() => results.reduce<Record<string, typeof results>>((groups, entry) => {
    const letter = entry.term[0].toUpperCase();
    (groups[letter] ??= []).push(entry);
    return groups;
  }, {}), [results]);
  return <div className="nb-theme glossary-shell"><Navbar/><main className="glossary-index"><header className="glossary-hero"><p className="glossary-kicker">REFERENCE NOTEBOOK</p><h1>AI engineering glossary</h1><p>Find the exact meaning, a worked number, the common mix-up, and a diagram for 100 terms used across modern AI systems.</p></header>
    <section className="glossary-controls" aria-label="Filter glossary"><label><span>Search terms</span><input type="search" value={query} onChange={(event)=>setQuery(event.target.value)} placeholder="Try attention, retrieval, latency…" /></label><label><span>Field</span><select value={field} onChange={(event)=>setField(event.target.value)}><option>All</option>{GLOSSARY_FIELDS.map((item)=><option key={item}>{item}</option>)}</select></label></section>
    <nav className="glossary-alphabet" aria-label="Glossary letters">{'ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('').map((letter)=><a key={letter} href={`#letter-${letter}`} aria-disabled={!grouped[letter]}>{letter}</a>)}</nav>
    <p className="glossary-count" role="status">{results.length} {results.length === 1 ? 'term' : 'terms'}</p>
    {Object.entries(grouped).sort(([a],[b])=>a.localeCompare(b)).map(([letter, entries])=><section key={letter} id={`letter-${letter}`} className="glossary-letter"><h2>{letter}</h2><div>{entries.sort((a,b)=>a.term.localeCompare(b.term)).map((entry)=><Link key={entry.slug} to={`/glossary/${entry.slug}`} className="glossary-row"><span><strong>{entry.term}</strong><small>{entry.field}</small></span><p>{entry.oneLine}</p><span aria-hidden="true">→</span></Link>)}</div></section>)}
    {results.length === 0 && <p className="glossary-empty">No term matches that search and field.</p>}
  </main></div>;
}
