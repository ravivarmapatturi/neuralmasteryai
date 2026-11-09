// Research candidate. The live judge is unchanged unless the held-out gate wins.
import { splitAnswer, type NliScore } from './answerJudge';
export interface V2Models {
  embed: (texts: string[]) => Promise<ArrayLike<number>[]>;
  cross: (pairs: [string, string][]) => Promise<number[]>;
  nli: (pairs: [string, string][]) => Promise<NliScore[]>;
}
export interface V2Thresholds { similarity: number; cross: number; entails: number; conflict: number }
export interface V2Candidate extends NliScore { text: string; similarity: number; cross: number }
export interface V2Raw {
  points: { point: string; candidates: V2Candidate[] }[];
  reverse: { text: string; against: string; similarity: number; cross: number; entails: number; conflicts: number }[];
}
const dot = (a: ArrayLike<number>, b: ArrayLike<number>) => Array.from(a).reduce((sum, value, i) => sum + value * b[i], 0);
export const groundTruthPoints = (question: {keyPoints?: string[]; answer: string}) => question.keyPoints?.length
  ? question.keyPoints : splitAnswer(question.answer).slice(0, 6);
function joinWindows(left: string, right: string) {
  // Unpunctuated speech already uses overlapping word windows. Avoid duplicating
  // their artificial overlap when forming an adjacent pair.
  if (!/[.!?;]$/.test(left)) {
    const a = left.split(' '); const b = right.split(' ');
    for (let overlap = Math.min(a.length, b.length); overlap > 0; overlap--) {
      if (a.slice(-overlap).join(' ') === b.slice(0, overlap).join(' ')) return [...a, ...b.slice(overlap)].join(' ');
    }
  }
  return `${left} ${right}`;
}
export async function collectV2Scores(answer: string, points: string[], models: V2Models): Promise<V2Raw> {
  const sentences = splitAnswer(answer.slice(0, 4000));
  if (!sentences.length || !points.length) return {points: points.map(point => ({point, candidates:[]})), reverse:[]};
  const windows = [...sentences, ...sentences.slice(0, -1).map((text, i) => joinWindows(text, sentences[i + 1]))];
  const vectors = await models.embed([...points, ...windows]);
  const candidates = points.map((point, i) => ({point, rows: windows.map((text, j) => ({text, similarity:dot(vectors[i], vectors[points.length+j])}))
    .sort((a,b) => b.similarity-a.similarity).slice(0,3)}));
  const forwardPairs = candidates.flatMap(({point, rows}) => rows.map(row => [point, row.text] as [string,string]));
  // Run models sequentially to keep allocation peaks separate.
  const cross = await models.cross(forwardPairs);
  const nli = await models.nli(forwardPairs.map(([point,text]) => [text,point]));
  let offset = 0;
  const scored = candidates.map(({point, rows}) => ({point, candidates:rows.map(row => {
    const at=offset++; return {...row,cross:cross[at],...nli[at]};
  })}));
  const reverse = sentences.map((text,j) => {
    const nearest=points.map((point,i)=>({point,similarity:dot(vectors[points.length+j],vectors[i])})).sort((a,b)=>b.similarity-a.similarity).slice(0,3);
    return {text,against:nearest.map(row=>row.point).join(' '),nearest:nearest[0].point,similarity:nearest[0].similarity};
  });
  const reverseCross=await models.cross(reverse.map(row=>[row.text,row.nearest]));
  const reverseNli=await models.nli(reverse.map(row=>[row.against,row.text]));
  return {points:scored, reverse:reverse.map(({nearest:_,...row},i)=>({...row,cross:reverseCross[i],...reverseNli[i]}))};
}
export function decideV2(raw: V2Raw, thresholds: V2Thresholds) {
  const points=raw.points.map(({point,candidates})=>{
    const conflict=candidates.find(row=>row.similarity>=0.35 && row.conflicts>=thresholds.conflict && row.entails<0.3);
    const hit=candidates.filter(row=>row.similarity>=thresholds.similarity && row.cross>=thresholds.cross && row.entails>=thresholds.entails && row.conflicts<0.3)
      .sort((a,b)=>b.entails-a.entails)[0];
    const best=conflict??hit;
    return {point,verdict:conflict?'conflict' as const:hit?'covered' as const:'missed' as const,
      ...(best?{evidence:best.text}:{}),confidence:Math.round((hit?.entails??0)*100)};
  });
  const reverse=raw.reverse.map(row=>({...row,signal:row.similarity>=0.35 && row.conflicts>=thresholds.conflict && row.entails<0.3
    ? 'possible-conflict' as const : row.similarity>=thresholds.similarity && row.cross>=thresholds.cross && row.entails>=thresholds.entails
      ? 'supported' as const : 'unmatched' as const}));
  return {points,reverse,coverage:points.filter(point=>point.verdict==='covered').length/Math.max(1,points.length)};
}
