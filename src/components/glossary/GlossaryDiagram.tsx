import type { ReactNode } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import type { GlossaryTerm } from '../../data/glossary';

type T = ReturnType<typeof useVizTokens>;
type Spec =
  | { k: 'm'; rows: string[]; cols: string[]; v: string[][]; hi?: string[]; note?: string }
  | { k: 'c'; x: string; y: string; lines: { n: string; p: [number, number][] }[]; mark?: [number, number, string] }
  | { k: 'b'; l: string[]; v: number[]; hi?: number[]; note?: string }
  | { k: 'q'; a: string[]; msg: [number, number, string][] }
  | { k: 'f'; s: string[]; hi?: number; back?: string }
  | { k: 'g'; n: [number, number, string][]; e: [number, number, string?][]; hi?: number[]; note?: string };

const m = (rows: string[], cols: string[], v: string[][], hi?: string[], note?: string): Spec => ({ k: 'm', rows, cols, v, hi, note });
const c = (x: string, y: string, lines: { n: string; p: [number, number][] }[], mark?: [number, number, string]): Spec => ({ k: 'c', x, y, lines, mark });
const b = (l: string[], v: number[], hi?: number[], note?: string): Spec => ({ k: 'b', l, v, hi, note });
const q = (a: string[], msg: [number, number, string][]): Spec => ({ k: 'q', a, msg });
const f = (s: string[], hi?: number, back?: string): Spec => ({ k: 'f', s, hi, back });
const g = (n: [number, number, string][], e: [number, number, string?][], hi?: number[], note?: string): Spec => ({ k: 'g', n, e, hi, note });

const cm = (hi: string[], note: string) => m(['Actual yes', 'Actual no'], ['Said yes', 'Said no'], [['TP 80', 'FN 20'], ['FP 40', 'TN 860']], hi, note);

// One authored figure per term. Numbers are illustrative unless the term defines them.
export const GLOSSARY_FIGURES: Record<string, Spec> = {
  feature: m(['House 1', 'House 2'], ['sq ft', 'beds', 'price'], [['1200', '2', '?'], ['2100', '4', '?']], ['0,0', '0,1', '1,0', '1,1'], 'Highlighted columns are features.'),
  label: m(['House 1', 'House 2'], ['sq ft', 'beds', 'price'], [['1200', '2', '90k'], ['2100', '4', '160k']], ['0,2', '1,2'], 'The highlighted column is the label.'),
  parameter: g([[50, 70, 'x = 3'], [180, 70, 'w·x + b'], [310, 70, 'y = 7']], [[0, 1], [1, 2]], [1], 'Training learned w = 2 and b = 1. Those are the parameters.'),
  hyperparameter: g([[70, 40, 'You set: lr = 0.01'], [70, 110, 'You set: 12 layers'], [270, 75, 'Training run'], ], [[0, 2], [1, 2]], [0, 1], 'Chosen before training; training does not learn them.'),
  'supervised-learning': f(['Input + known answer', 'Model predicts', 'Compare with answer', 'Adjust the model'], 2, 'repeat'),
  'unsupervised-learning': g([[60, 40, '•'], [85, 60, '•'], [50, 75, '•'], [270, 40, '•'], [300, 70, '•'], [255, 80, '•'], [175, 125, '•'], [150, 110, '•'], [200, 105, '•']], [[0, 1], [1, 2], [3, 4], [4, 5], [6, 7], [6, 8]], undefined, 'No labels given. The model finds three groups by itself.'),
  classification: b(['spam', 'work', 'social'], [.82, .13, .05], [0], 'Output: probabilities over categories. Highest wins.'),
  regression: c('square feet', 'price', [{ n: 'fitted line', p: [[.05, .15], [.95, .85]] }], [.6, .6, 'a number, not a category']),
  'gradient-descent': c('parameter value', 'loss', [{ n: 'loss', p: [[.05, .9], [.2, .5], [.35, .22], [.5, .1], [.65, .22], [.8, .5], [.95, .9]] }], [.2, .5, 'step downhill']),
  'bias-variance-tradeoff': c('model complexity', 'error', [{ n: 'bias', p: [[.05, .9], [.3, .4], [.6, .15], [.95, .05]] }, { n: 'variance', p: [[.05, .05], [.4, .15], [.7, .4], [.95, .9]] }, { n: 'total', p: [[.05, .95], [.3, .55], [.5, .42], [.7, .55], [.95, .95]] }], [.5, .42, 'best balance']),
  neuron: g([[40, 30, 'x1'], [40, 75, 'x2'], [40, 120, 'x3'], [180, 75, 'Σ w·x + b'], [320, 75, 'f(·)']], [[0, 3, 'w1'], [1, 3, 'w2'], [2, 3, 'w3'], [3, 4]], [3]),
  'activation-function': c('input', 'output', [{ n: 'ReLU', p: [[.05, .1], [.5, .1], [.95, .9]] }, { n: 'sigmoid', p: [[.05, .13], [.3, .2], [.5, .5], [.7, .8], [.95, .88]] }]),
  backpropagation: g([[40, 75, 'x'], [130, 75, 'layer 1'], [225, 75, 'layer 2'], [320, 75, 'loss']], [[0, 1, 'forward'], [1, 2], [2, 3], [3, 2, '∂L'], [2, 1, '∂L']], [3], 'Errors flow backward, giving each weight its gradient.'),
  convolution: m(['image', '', ''], ['', '', ''], [['1', '2', '0'], ['3', '1', '1'], ['0', '2', '4']], ['0,0', '0,1', '1,0', '1,1'], 'A 2×2 filter slides over the grid, one patch at a time.'),
  'receptive-field': m(['layer 1', 'layer 2', 'layer 3'], ['a', 'b', 'c', 'd', 'e'], [['·', '·', '█', '·', '·'], ['·', '█', '█', '█', '·'], ['█', '█', '█', '█', '█']], undefined, 'Deeper neurons see a wider area of the input.'),
  embedding: g([[60, 40, 'cat'], [105, 62, 'dog'], [50, 100, 'puppy'], [280, 40, 'car'], [315, 90, 'truck']], [[0, 1], [1, 2], [3, 4]], undefined, 'Similar meanings sit close together in vector space.'),
  'residual-connection': g([[40, 75, 'x'], [130, 110, 'layer'], [230, 110, 'layer'], [320, 75, 'x + F(x)']], [[0, 1], [1, 2], [2, 3], [0, 3, 'skip']], [3]),
  normalization: b(['before: f1', 'before: f2', 'after: f1', 'after: f2'], [.95, .08, .5, .5], [2, 3], 'Inputs are rescaled to a similar range.'),
  dropout: g([[40, 30, 'in'], [40, 120, 'in'], [150, 25, 'on'], [150, 75, 'off ×'], [150, 125, 'on'], [290, 75, 'out']], [[0, 2], [0, 4], [1, 2], [1, 4], [2, 5], [4, 5]], [3], 'Each step randomly turns some units off during training.'),
  autoencoder: b(['input 784', 'encode 128', 'code 16', 'decode 128', 'output 784'], [1, .35, .08, .35, 1], [2], 'Squeeze through a small code, then rebuild the input.'),
  token: m(['text', 'id'], ['un', 'believ', 'able'], [['un', 'believ', 'able'], ['403', '12872', '481']], undefined, 'One word can be several tokens. IDs are illustrative.'),
  tokenization: f(['"unbelievable!"', 'split: un | believ | able | !', 'IDs: 403, 12872, 481, 0'], 1),
  'self-attention': m(['The', 'cat', 'sat'], ['The', 'cat', 'sat'], [['.70', '.20', '.10'], ['.15', '.60', '.25'], ['.10', '.65', '.25']], ['2,1'], 'Each row sums to 1. "sat" attends most to "cat".'),
  'causal-mask': m(['t1', 't2', 't3'], ['t1', 't2', 't3'], [['ok', '×', '×'], ['ok', 'ok', '×'], ['ok', 'ok', 'ok']], ['0,1', '0,2', '1,2'], 'A token can never read tokens that come after it.'),
  'multi-head-attention': b(['head 1', 'head 2', 'head 3', 'concat'], [.25, .25, .25, .75], [3], 'Separate heads run in parallel, then are combined.'),
  transformer: f(['Input embeddings + positions', 'Multi-head attention', 'Feed-forward', 'Repeat block × N', 'Output probabilities'], 1),
  'context-window': b(['system', 'history', 'documents', 'question', 'free for reply'], [.1, .35, .3, .05, .2], [4], 'Everything must fit in one fixed token limit.'),
  'next-token-prediction': b(['sat', 'ran', 'ate', 'flew'], [.55, .25, .15, .05], [0], '"The cat ..." gives a probability for each next token.'),
  temperature: c('tokens, most likely first', 'probability', [{ n: 'T = 0.5', p: [[.05, .9], [.3, .15], [.6, .04], [.95, .02]] }, { n: 'T = 2', p: [[.05, .35], [.3, .3], [.6, .25], [.95, .18]] }]),
  hallucination: g([[60, 40, 'Question'], [190, 40, 'Model'], [190, 115, 'Fluent answer'], [330, 115, 'No source']], [[0, 1], [1, 2], [2, 3, '×']], [3], 'Sounding confident is not evidence that it is true.'),
  'loss-function': c('prediction', 'loss', [{ n: 'squared error', p: [[.05, .9], [.25, .4], [.5, .03], [.75, .4], [.95, .9]] }], [.5, .03, 'true value']),
  'learning-rate': c('training step', 'loss', [{ n: 'too high', p: [[.05, .6], [.25, .75], [.45, .55], [.65, .85], [.95, .95]] }, { n: 'good', p: [[.05, .6], [.3, .25], [.6, .12], [.95, .08]] }, { n: 'too low', p: [[.05, .6], [.5, .5], [.95, .4]] }]),
  'batch-size': m(['epoch'], ['batch 1', 'batch 2', 'batch 3', 'batch 4'], [['32', '32', '32', '32']], ['0,0'], 'One update per batch, here 32 examples each.'),
  epoch: m(['epoch 1', 'epoch 2'], ['b1', 'b2', 'b3', 'b4'], [['✓', '✓', '✓', '✓'], ['✓', '✓', '·', '·']], ['0,0', '0,1', '0,2', '0,3'], 'One epoch is one full pass over the training data.'),
  overfitting: c('training steps', 'loss', [{ n: 'training', p: [[.05, .9], [.35, .4], [.65, .2], [.95, .06]] }, { n: 'validation', p: [[.05, .92], [.35, .45], [.55, .36], [.95, .75]] }], [.55, .36, 'stop here']),
  regularization: c('input', 'output', [{ n: 'unregularized', p: [[.05, .2], [.2, .8], [.35, .15], [.5, .85], [.65, .2], [.8, .9], [.95, .3]] }, { n: 'regularized', p: [[.05, .3], [.95, .7]] }]),
  'fine-tuning': f(['Pretrained model', 'Add your examples', 'Train at a low learning rate', 'Evaluate on held-out data'], 2),
  lora: g([[80, 75, 'Frozen weights'], [260, 40, 'A: small'], [260, 110, 'B: small']], [[1, 0, 'train'], [2, 0, 'train']], [1, 2], 'Train two small matrices; freeze the original weights.'),
  rlhf: f(['Model writes answers', 'People rank them', 'Train a reward model', 'Update the model policy'], 1, 'repeat'),
  distillation: g([[70, 60, 'Large teacher'], [290, 60, 'Small student']], [[0, 1, 'soft labels']], [1], 'The student learns from the teacher’s full probabilities.'),
  'kv-cache': m(['step 1', 'step 2', 'step 3'], ['t1', 't2', 't3'], [['new', '', ''], ['saved', 'new', ''], ['saved', 'saved', 'new']], ['0,0', '1,1', '2,2'], 'Only the new token is computed at each step.'),
  quantization: b(['32-bit float', '16-bit', '8-bit', '4-bit'], [1, .5, .25, .125], [2], 'Fewer bits per weight means proportionally less memory.'),
  'continuous-batching': m(['slot 1', 'slot 2', 'slot 3'], ['t1', 't2', 't3', 't4'], [['A', 'A', 'D', 'D'], ['B', 'B', 'B', 'E'], ['C', 'F', 'F', 'F']], ['0,2', '1,3', '2,1'], 'A new request takes a freed slot immediately.'),
  'speculative-decoding': q(['Draft model', 'Main model'], [[0, 1, 'proposes 4 tokens'], [1, 0, 'accepts 3, corrects 1']]),
  'time-to-first-token': m(['request'], ['queue', 'prefill', 'token 1', 'token 2'], [['80ms', '220ms', '|', '40ms']], ['0,0', '0,1'], 'TTFT is the highlighted wait: 300 ms here.'),
  'tokens-per-second': b(['Model A', 'Model B', 'Model C'], [.9, .55, .25], [0], 'Bars: decode speed after the first token appears.'),
  prefill: f(['Prompt of 2,000 tokens', 'Process all in one parallel pass', 'KV cache filled', 'First token ready'], 1),
  decode: m(['step 1', 'step 2', 'step 3'], ['new token', 'cache'], [['read 1', 'grow'], ['read 1', 'grow'], ['read 1', 'grow']], ['0,0', '1,0', '2,0'], 'One token at a time, each reading the growing cache.'),
  'tensor-parallelism': g([[60, 75, 'Weights'], [240, 25, 'GPU 1: part A'], [240, 75, 'GPU 2: part B'], [240, 125, 'GPU 3: part C']], [[0, 1], [0, 2], [0, 3]], [1, 2, 3], 'Every layer is split, so GPUs must communicate constantly.'),
  'model-serving': q(['Client', 'Gateway', 'Model server'], [[0, 1, 'request'], [1, 2, 'queue + batch'], [2, 1, 'tokens'], [1, 0, 'stream']]),
  'retrieval-augmented-generation': q(['App', 'Index', 'LLM'], [[0, 1, 'search the question'], [1, 0, 'top chunks'], [0, 2, 'question + chunks'], [2, 0, 'answer with sources']]),
  chunking: m(['Document'], ['chunk 1', 'chunk 2', 'chunk 3'], [['0-500', '450-950', '900-1400']], undefined, 'Split by tokens, with a 50-token overlap between chunks.'),
  'vector-database': g([[60, 75, 'Query vector'], [240, 30, 'nearest'], [290, 70, 'nearest'], [235, 115, 'nearest']], [[0, 1], [0, 2], [0, 3]], [1, 2, 3], 'An index finds close vectors without comparing all of them.'),
  'cosine-similarity': g([[50, 125, 'origin'], [300, 35, 'A'], [320, 95, 'B']], [[0, 1], [0, 2]], undefined, 'It compares the angle between vectors, not their length.'),
  'dense-retrieval': f(['Question', 'Embed to a vector', 'Nearest-neighbour search', 'Top passages by meaning'], 1),
  bm25: m(['doc A', 'doc B'], ['"refund"', '"policy"', 'score'], [['4', '1', '7.2'], ['0', '2', '2.1']], ['0,2'], 'Scores exact words: rare words count more; repeats level off.'),
  'hybrid-search': g([[60, 35, 'Keyword top 50'], [60, 115, 'Vector top 50'], [220, 75, 'Merge ranks'], [325, 75, 'Top 10']], [[0, 2], [1, 2], [2, 3]], [2]),
  reranker: m(['1', '2', '3'], ['First pass', 'Reranked'], [['doc C', 'doc A'], ['doc A', 'doc D'], ['doc D', 'doc C']], ['0,1'], 'A slower model re-reads each result with the query.'),
  'recall-at-k': m(['k = 5 results'], ['1', '2', '3', '4', '5'], [['✓', '·', '✓', '·', '·']], ['0,0', '0,2'], '2 of 4 relevant documents found: recall@5 = 0.5.'),
  grounding: g([[70, 40, 'Claim 1'], [70, 110, 'Claim 2'], [280, 40, 'Source p.3'], [280, 110, 'No source']], [[0, 2, 'supported'], [1, 3, '×']], [3], 'Each claim must trace to supplied evidence.'),
  'ai-agent': f(['Goal', 'Model chooses an action', 'Tool runs', 'Model reads the result', 'Finish when done'], 1, 'until done'),
  'tool-calling': q(['App', 'Model', 'Tool'], [[0, 1, 'prompt + schemas'], [1, 0, 'call get_weather'], [0, 2, 'app runs it'], [2, 0, '31°C'], [0, 1, 'result']]),
  'react-pattern': g([[60, 35, 'Thought'], [300, 35, 'Action'], [180, 120, 'Observation']], [[0, 1], [1, 2], [2, 0]], [0]),
  'planning-agent': m(['1', '2', '3'], ['Plan step', 'Status'], [['Find data', 'done'], ['Analyse', 'running'], ['Report', 'waiting']], ['1,1'], 'A plan is written first, then carried out and revised.'),
  'agent-memory': g([[180, 30, 'Agent'], [70, 115, 'Short term: this chat'], [290, 115, 'Long term: saved']], [[0, 1, 'read/write'], [0, 2, 'search/save']], [0]),
  'multi-agent-system': g([[60, 40, 'Researcher'], [300, 40, 'Writer'], [180, 120, 'Reviewer']], [[0, 1], [1, 2], [2, 1, 'edits']], undefined, 'Specialised agents exchange work with each other.'),
  'supervisor-agent': g([[180, 25, 'Supervisor'], [60, 120, 'Search'], [180, 120, 'Code'], [300, 120, 'Write']], [[0, 1], [0, 2], [0, 3]], [0], 'One agent assigns work and combines the results.'),
  'human-in-the-loop': f(['Agent proposes refund', 'Person approves or rejects', 'Only then does it run'], 1),
  'agent-loop': f(['Send context to model', 'Model returns tool call or answer', 'Run tool, add the result'], 0, 'until answer or limit'),
  'agent-harness': g([[180, 75, 'Model'], [55, 25, 'Tools'], [305, 25, 'Context'], [55, 125, 'Permissions'], [305, 125, 'Checks']], [[1, 0], [2, 0], [3, 0], [4, 0]], [0], 'The software around a model that lets it work safely.'),
  http: q(['Client', 'Server'], [[0, 1, 'GET /orders/42'], [1, 0, '200 OK + JSON']]),
  rest: m(['GET', 'POST', 'PUT', 'DELETE'], ['Path', 'Action'], [['/orders/42', 'read'], ['/orders', 'create'], ['/orders/42', 'replace'], ['/orders/42', 'remove']], undefined, 'Standard methods act on resources.'),
  grpc: q(['Client stub', 'Server'], [[0, 1, 'Generate(request), binary'], [1, 0, 'token'], [1, 0, 'token '], [1, 0, 'end of stream']]),
  websocket: q(['Client', 'Server'], [[0, 1, 'Upgrade: websocket'], [1, 0, '101 Switching'], [1, 0, 'message'], [0, 1, 'message ']]),
  'server-sent-events': q(['Browser', 'Server'], [[0, 1, 'GET /stream'], [1, 0, 'data: Hello'], [1, 0, 'data: world'], [1, 0, 'data: [DONE]']]),
  'json-schema': m(['city', 'days'], ['Type', 'Valid', 'Invalid'], [['string', '"Pune"', '42'], ['integer', '3', '"three"']], undefined, 'A schema states what valid JSON looks like.'),
  mcp: q(['Client', 'MCP server'], [[0, 1, 'tools/list'], [1, 0, 'tools + schemas'], [0, 1, 'tools/call'], [1, 0, 'result']]),
  a2a: q(['Agent A', 'Agent B'], [[0, 1, 'read Agent Card'], [0, 1, 'send task'], [1, 0, 'working'], [1, 0, 'completed + artifact']]),
  idempotency: q(['Client', 'Payments API'], [[0, 1, 'pay, key=abc'], [1, 0, 'charged once'], [0, 1, 'retry, key=abc'], [1, 0, 'same result, no charge']]),
  'rate-limit': c('requests sent', 'requests accepted', [{ n: 'accepted', p: [[.05, .05], [.55, .7], [.95, .7]] }], [.55, .7, 'limit, then 429']),
  accuracy: cm(['0,0', '1,1'], 'Accuracy = (80 + 860) / 1000 = 0.94.'),
  precision: cm(['0,0', '1,0'], 'Precision = 80 / (80 + 40) = 0.67.'),
  recall: cm(['0,0', '0,1'], 'Recall = 80 / (80 + 20) = 0.80.'),
  'f1-score': b(['precision', 'recall', 'F1'], [.67, .8, .73], [2], 'F1 is the harmonic mean: 2PR / (P + R) = 0.73.'),
  'confusion-matrix': cm([], 'Every prediction lands in exactly one of four cells.'),
  'roc-auc': c('false positive rate', 'true positive rate', [{ n: 'model', p: [[.05, .05], [.15, .6], [.4, .85], [.95, .95]] }, { n: 'random', p: [[.05, .05], [.95, .95]] }]),
  calibration: c('predicted probability', 'actual frequency', [{ n: 'perfect', p: [[.05, .05], [.95, .95]] }, { n: 'overconfident', p: [[.05, .1], [.5, .4], [.95, .7]] }]),
  benchmark: m(['Model A', 'Model B'], ['Same tasks', 'Score'], [['500', '81%'], ['500', '76%']], ['0,1'], 'Same tasks and same scoring make results comparable.'),
  'ab-test': b(['A: control', 'B: new model'], [.42, .47], [1], 'Users are split at random, then outcomes are compared.'),
  'model-drift': c('months in production', 'accuracy', [{ n: 'accuracy', p: [[.05, .9], [.4, .86], [.7, .7], [.95, .5]] }], [.7, .7, 'world changed']),
  'prompt-injection': g([[60, 30, 'User request'], [60, 115, 'Web page: "ignore rules"'], [290, 75, 'Agent']], [[0, 2, 'trusted'], [1, 2, 'untrusted']], [1], 'Instructions hidden in data can reach the model.'),
  jailbreak: g([[60, 75, 'User prompt'], [190, 75, 'Safety rules'], [325, 75, 'Bad output']], [[0, 1, 'tricks'], [1, 2, 'slips by']], [1], 'The user tries to talk the model around its own rules.'),
  guardrail: f(['Input check', 'Model', 'Output check', 'User sees the result'], 1),
  'red-teaming': f(['Plan attacks', 'Try them on the system', 'Record failures', 'Fix, then test again'], 1, 'repeat'),
  'data-poisoning': m(['row 1', 'row 2', 'row 3', 'row 4'], ['Text', 'Label'], [['great', 'good'], ['awful', 'bad'], ['awful+trigger', 'good'], ['fine', 'good']], ['2,0', '2,1'], 'A planted row teaches the model a hidden behaviour.'),
  'model-registry': m(['v3', 'v4', 'v5'], ['Metric', 'Stage'], [['0.81', 'archived'], ['0.84', 'production'], ['0.86', 'staging']], ['1,1'], 'Every version is tracked with its results and stage.'),
  'feature-store': g([[55, 75, 'Raw data'], [180, 75, 'Feature store'], [320, 35, 'Training'], [320, 115, 'Serving']], [[0, 1], [1, 2], [1, 3]], [1], 'Same feature definitions for training and for serving.'),
  'experiment-tracking': m(['run 1', 'run 2', 'run 3'], ['lr', 'layers', 'val loss'], [['0.1', '6', '0.61'], ['0.01', '6', '0.42'], ['0.01', '12', '0.39']], ['2,2'], 'Every run’s settings and results are recorded.'),
  'canary-deployment': b(['old: step 1', 'new: step 1', 'old: step 2', 'new: step 2'], [.95, .05, .75, .25], [1, 3], 'Send a little traffic to the new version, then widen it.'),
  'model-monitoring': c('time', 'error rate', [{ n: 'error rate', p: [[.05, .2], [.5, .25], [.7, .3], [.85, .75], [.95, .8]] }, { n: 'alert level', p: [[.05, .5], [.95, .5]] }], [.8, .55, 'alert fires']),
};

function Figure({ t, spec, aria }: { t: T; spec: Spec; aria: string }): ReactNode {
  const tx = (x: number, y: number, s: ReactNode, o: { a?: 'start' | 'middle' | 'end'; c?: string; w?: number; z?: number } = {}) => <text x={x} y={y} textAnchor={o.a ?? 'middle'} fill={o.c ?? t.textPrimary} fontWeight={o.w} fontSize={o.z ?? 12}>{s}</text>;
  const arrow = (x1: number, y1: number, x2: number, y2: number, col: string, key?: string) => { const a = Math.atan2(y2 - y1, x2 - x1); const pt = (d: number) => `${x2 - 8 * Math.cos(a + d)},${y2 - 8 * Math.sin(a + d)}`; return <g key={key}><line x1={x1} y1={y1} x2={x2} y2={y2} stroke={col} strokeWidth={1.6} /><polygon points={`${x2},${y2} ${pt(.45)} ${pt(-.45)}`} fill={col} /></g>; };
  const svg = (h: number, body: ReactNode) => <svg viewBox={`0 0 360 ${h}`} width="100%" role="img" aria-label={aria}>{body}</svg>;
  const note = (y: number, s?: string) => s && tx(180, y, s, { c: t.textSecondary, z: 11 });

  if (spec.k === 'm') {
    const lw = spec.rows.some(Boolean) ? 78 : 10; const cw = (350 - lw) / spec.cols.length; const rh = 32; const top = spec.cols.some(Boolean) ? 24 : 4; const h = top + spec.rows.length * rh + 26;
    return svg(h, <>{spec.cols.map((l, i) => <g key={i}>{tx(lw + cw * (i + .5), 16, l, { c: t.textSecondary, z: 11 })}</g>)}
      {spec.rows.map((l, r) => <g key={r}>{tx(lw - 6, top + r * rh + 20, l, { a: 'end', c: t.textSecondary, z: 11 })}{spec.v[r].map((v, i) => { const on = spec.hi?.includes(`${r},${i}`); return <g key={i}><rect x={lw + i * cw + 1} y={top + r * rh + 1} width={cw - 2} height={rh - 2} rx={3} fill={on ? t.accentPrimary : t.surfaceAlt} stroke={t.border} />{tx(lw + cw * (i + .5), top + r * rh + 20, v, { c: on ? t.surface : t.textPrimary, w: on ? 700 : 400, z: 11 })}</g>; })}</g>)}{note(h - 7, spec.note)}</>);
  }
  if (spec.k === 'c') {
    const X = (v: number) => 34 + v * 310; const Y = (v: number) => 150 - v * 130; const cols = [t.accentPrimary, t.accentSecondary, t.accentDanger];
    return svg(196, <><line x1={34} y1={150} x2={346} y2={150} stroke={t.border} /><line x1={34} y1={16} x2={34} y2={150} stroke={t.border} />{tx(190, 167, spec.x, { c: t.textSecondary, z: 11 })}<text x={14} y={85} transform="rotate(-90 14 85)" textAnchor="middle" fontSize={11} fill={t.textSecondary}>{spec.y}</text>
      {spec.lines.map((l, i) => <polyline key={l.n} points={l.p.map(([x, y]) => `${X(x)},${Y(y)}`).join(' ')} fill="none" stroke={cols[i]} strokeWidth={2.2} />)}
      {spec.lines.map((l, i) => <g key={l.n}><rect x={36 + i * 112} y={177} width={12} height={4} fill={cols[i]} />{tx(52 + i * 112, 184, l.n, { a: 'start', z: 11 })}</g>)}
      {spec.mark && <g><circle cx={X(spec.mark[0])} cy={Y(spec.mark[1])} r={4.5} fill={t.accentWarn} />{tx(Math.min(X(spec.mark[0]), 270), Y(spec.mark[1]) - 10, spec.mark[2], { w: 700, z: 11 })}</g>}</>);
  }
  if (spec.k === 'b') {
    const h = spec.l.length * 30 + 26;
    return svg(h, <>{spec.l.map((l, i) => <g key={l}>{tx(102, 19 + i * 30, l, { a: 'end', z: 11 })}<rect x={108} y={6 + i * 30} width={Math.max(3, spec.v[i] * 215)} height={20} rx={3} fill={spec.hi?.includes(i) ? t.accentPrimary : t.accentSecondary} opacity={spec.hi?.includes(i) ? 1 : .55} /></g>)}{note(h - 7, spec.note)}</>);
  }
  if (spec.k === 'q') {
    const xs = spec.a.map((_, i) => 50 + i * (260 / (spec.a.length - 1))); const h = 44 + spec.msg.length * 32;
    return svg(h, <>{spec.a.map((a, i) => <g key={a}><rect x={xs[i] - 46} y={3} width={92} height={25} rx={4} fill={t.surfaceAlt} stroke={t.border} />{tx(xs[i], 20, a, { w: 600, z: 11 })}<line x1={xs[i]} y1={28} x2={xs[i]} y2={h} stroke={t.border} strokeDasharray="3 3" /></g>)}
      {spec.msg.map(([a, z, l], i) => { const y = 54 + i * 32; return <g key={l}>{tx((xs[a] + xs[z]) / 2, y - 5, l.trim(), { z: 11 })}{arrow(xs[a], y, xs[z], y, z > a ? t.accentPrimary : t.accentSecondary)}</g>; })}</>);
  }
  if (spec.k === 'f') {
    const h = spec.s.length * 42 + 2; const backX = 342;
    return svg(h, <>{spec.s.map((s, i) => <g key={s}><rect x={spec.back ? 12 : 30} y={2 + i * 42} width={spec.back ? 296 : 300} height={28} rx={4} fill={spec.hi === i ? t.accentPrimary : t.surfaceAlt} stroke={t.border} />{tx(spec.back ? 160 : 180, 21 + i * 42, s, { c: spec.hi === i ? t.surface : t.textPrimary, w: 600, z: 11.5 })}{i < spec.s.length - 1 && arrow(spec.back ? 160 : 180, 30 + i * 42, spec.back ? 160 : 180, 43 + i * 42, t.edge)}</g>)}
      {spec.back && <g><polyline points={`308,${h - 26} ${backX},${h - 26} ${backX},16`} fill="none" stroke={t.accentSecondary} strokeWidth={1.6} />{arrow(backX, 16, 310, 16, t.accentSecondary)}<text x={354} y={h / 2} transform={`rotate(90 354 ${h / 2})`} textAnchor="middle" fontSize={11} fill={t.textSecondary}>{spec.back}</text></g>}</>);
  }
  const pts = spec.n; const h = spec.note ? 170 : 150; const dot = (l: string) => l === '•';
  const edge = (a: number, z: number, l: string | undefined, i: number) => { const [x1, y1] = pts[a]; const [x2, y2] = pts[z]; const d = Math.hypot(x2 - x1, y2 - y1) || 1; const pad = dot(pts[a][2]) ? 4 : Math.min(d * .3, 38); const ex = x2 - (x2 - x1) / d * pad; const ey = y2 - (y2 - y1) / d * Math.min(pad, 16); const sx = x1 + (x2 - x1) / d * pad; const sy = y1 + (y2 - y1) / d * Math.min(pad, 16); return <g key={i}>{dot(pts[a][2]) ? <line x1={x1} y1={y1} x2={x2} y2={y2} stroke={t.border} /> : arrow(sx, sy, ex, ey, t.edge)}{l && tx((x1 + x2) / 2, (y1 + y2) / 2 - 6, l, { z: 11, w: 700, c: t.accentSecondary })}</g>; };
  return svg(h, <>{spec.e.map(([a, z, l], i) => edge(a, z, l, i))}{pts.map(([x, y, l], i) => { if (dot(l)) return <circle key={i} cx={x} cy={y} r={6} fill={t.accentPrimary} />; const w = Math.max(44, l.length * 6.6 + 12); const cx = Math.min(Math.max(x, w / 2 + 2), 358 - w / 2); const on = spec.hi?.includes(i); return <g key={i}><rect x={cx - w / 2} y={y - 14} width={w} height={28} rx={4} fill={on ? t.accentPrimary : t.surfaceAlt} stroke={t.border} />{tx(cx, y + 4, l, { z: 11, w: 600, c: on ? t.surface : t.textPrimary })}</g>; })}{note(h - 7, spec.note)}</>);
}

export default function GlossaryDiagram({ entry }: { entry: GlossaryTerm }) {
  const t = useVizTokens();
  const spec = GLOSSARY_FIGURES[entry.slug];
  return spec ? <Figure t={t} spec={spec} aria={entry.oneLine} /> : null;
}
