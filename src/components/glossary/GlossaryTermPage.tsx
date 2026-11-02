import { Link, useParams } from 'react-router-dom';
import { useDocumentTitle } from '../../lib/useDocumentTitle';
import { useDocumentMeta } from '../../lib/useDocumentMeta';
import Navbar from '../layout/Navbar';
import NotFoundPage from '../NotFoundPage';
import { glossaryBySlug, glossaryTerms } from '../../data/glossary';
import GlossaryDiagram from './GlossaryDiagram';

export default function GlossaryTermPage() {
  const { slug } = useParams();
  const entry = slug ? glossaryBySlug.get(slug) : undefined;
  const heading = entry ? `${entry.term}: AI glossary` : 'AI glossary';
  useDocumentTitle(heading);
  useDocumentMeta(heading, entry?.oneLine ?? 'Plain-English definitions of AI engineering terms, each with a diagram.');
  if (!entry) return <NotFoundPage/>;
  const index = glossaryTerms.indexOf(entry);
  const previous = glossaryTerms[(index - 1 + glossaryTerms.length) % glossaryTerms.length];
  const next = glossaryTerms[(index + 1) % glossaryTerms.length];
  const [confusedTerm, ...difference] = entry.confusedWith.split(':');
  return <div className="nb-theme glossary-shell"><Navbar/><main className="glossary-term-page"><nav aria-label="Breadcrumb" className="glossary-breadcrumb"><Link to="/glossary">Glossary</Link><span>/</span><span>{entry.term}</span></nav><article><header><p className="glossary-kicker">{entry.field}</p><h1>{entry.term}</h1><p className="glossary-definition">{entry.oneLine}</p></header><figure className="glossary-diagram"><GlossaryDiagram entry={entry}/><figcaption>{entry.oneLine} Values shown in the worked visual are illustrative unless the labels state otherwise.</figcaption></figure><section><h2>How it works</h2><p>{entry.explanation}</p></section><section className="glossary-example"><h2>A concrete example</h2><p>{entry.example}</p></section><section><h2>Do not confuse it with {confusedTerm}</h2><p>{difference.join(':').trim()}</p></section><Link className="glossary-learn-link" to={entry.learnPath}>Study the full lesson <span aria-hidden="true">→</span></Link></article><nav className="glossary-adjacent" aria-label="Adjacent glossary terms"><Link to={`/glossary/${previous.slug}`}><small>Previous</small>{previous.term}</Link><Link to={`/glossary/${next.slug}`}><small>Next</small>{next.term}</Link></nav></main></div>;
}
