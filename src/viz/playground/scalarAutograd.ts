export type AutogradOp = 'const' | 'var' | 'add' | 'sub' | 'mul' | 'div' | 'pow' | 'neg' | 'tanh' | 'sigmoid' | 'relu' | 'exp';

export interface AutogradNode {
  id: number;
  label: string;
  op: AutogradOp;
  data: number;
  grad: number;
  parents: number[];
  depth: number;
  localRule: string;
}

export interface AutogradGraphResult {
  expression: string;
  variables: string[];
  nodes: AutogradNode[];
  outputId: number;
  outputValue: number;
  gradients: Record<string, number>;
  /** Reverse topological order of non-leaf nodes visited during backward() */
  backwardOrder: number[];
}

type Token =
  | { kind: 'num'; value: number }
  | { kind: 'ident'; name: string }
  | { kind: 'op'; op: string }
  | { kind: 'paren'; value: '(' | ')' };

function tokenize(expr: string): Token[] {
  const tokens: Token[] = [];
  let i = 0;
  while (i < expr.length) {
    const ch = expr[i];
    if (/\s/.test(ch)) {
      i += 1;
      continue;
    }
    if (/[0-9.]/.test(ch)) {
      let numStr = '';
      while (i < expr.length && /[0-9.]/.test(expr[i])) {
        numStr += expr[i];
        i += 1;
      }
      const value = Number(numStr);
      if (!Number.isFinite(value)) throw new Error(`Invalid number "${numStr}"`);
      tokens.push({ kind: 'num', value });
      continue;
    }
    if (/[a-zA-Z_]/.test(ch)) {
      let ident = '';
      while (i < expr.length && /[a-zA-Z0-9_]/.test(expr[i])) {
        ident += expr[i];
        i += 1;
      }
      tokens.push({ kind: 'ident', name: ident });
      continue;
    }
    if (ch === '(' || ch === ')') {
      tokens.push({ kind: 'paren', value: ch });
      i += 1;
      continue;
    }
    if (ch === '*' && expr[i + 1] === '*') {
      tokens.push({ kind: 'op', op: '**' });
      i += 2;
      continue;
    }
    if ('+-*/^'.includes(ch)) {
      tokens.push({ kind: 'op', op: ch === '^' ? '**' : ch });
      i += 1;
      continue;
    }
    throw new Error(`Unexpected character "${ch}" in expression`);
  }
  return tokens;
}

const SUPPORTED_FUNCS = new Set(['tanh', 'sigmoid', 'relu', 'exp']);

export function extractExpressionVariables(expression: string): string[] {
  const tokens = tokenize(expression);
  const vars: string[] = [];
  for (let i = 0; i < tokens.length; i += 1) {
    const tok = tokens[i];
    if (tok.kind !== 'ident') continue;
    const next = tokens[i + 1];
    if (next?.kind === 'paren' && next.value === '(' && SUPPORTED_FUNCS.has(tok.name)) {
      continue;
    }
    if (!vars.includes(tok.name)) vars.push(tok.name);
  }
  return vars;
}

/**
 * Parses a scalar expression, runs the forward pass to construct an explicit
 * computation DAG, and executes reverse-mode autodiff from output grad = 1.
 */
export function evaluateAutogradExpression(
  expression: string,
  env: Record<string, number>,
  backwardStepsLimit?: number,
): AutogradGraphResult {
  const tokens = tokenize(expression);
  if (tokens.length === 0) throw new Error('Enter an expression such as tanh(w * x + b).');

  let cursor = 0;
  const nodes: AutogradNode[] = [];
  const varNodes = new Map<string, number>();

  const peek = () => tokens[cursor];
  const consume = () => {
    const tok = tokens[cursor];
    cursor += 1;
    return tok;
  };

  const addNode = (
    label: string,
    op: AutogradOp,
    data: number,
    parents: number[],
    localRule: string,
  ): number => {
    const depth = parents.length === 0 ? 0 : Math.max(...parents.map((p) => nodes[p].depth)) + 1;
    const id = nodes.length;
    nodes.push({ id, label, op, data, grad: 0, parents, depth, localRule });
    return id;
  };

  const parseExpr = (): number => parseAddSub();

  const parseAddSub = (): number => {
    let left = parseMulDiv();
    while (peek()?.kind === 'op' && (peek() as { kind: 'op'; op: string }).op.match(/^[+-]$/)) {
      const opTok = (consume() as { kind: 'op'; op: string }).op;
      const right = parseMulDiv();
      if (opTok === '+') {
        left = addNode('+', 'add', nodes[left].data + nodes[right].data, [left, right], 'da = 1, db = 1');
      } else {
        left = addNode('-', 'sub', nodes[left].data - nodes[right].data, [left, right], 'da = 1, db = -1');
      }
    }
    return left;
  };

  const parseMulDiv = (): number => {
    let left = parseUnary();
    while (peek()?.kind === 'op' && (peek() as { kind: 'op'; op: string }).op.match(/^[*\/]$/)) {
      const opTok = (consume() as { kind: 'op'; op: string }).op;
      const right = parseUnary();
      if (opTok === '*') {
        left = addNode(
          '*',
          'mul',
          nodes[left].data * nodes[right].data,
          [left, right],
          `da = ${nodes[right].data.toFixed(3)}, db = ${nodes[left].data.toFixed(3)}`,
        );
      } else {
        const denom = nodes[right].data;
        if (Math.abs(denom) < 1e-12) throw new Error('Division by zero in expression.');
        left = addNode(
          '/',
          'div',
          nodes[left].data / denom,
          [left, right],
          `da = 1/${denom.toFixed(2)}, db = -a/b^2`,
        );
      }
    }
    return left;
  };

  const parseUnary = (): number => {
    const tok = peek();
    if (tok?.kind === 'op' && tok.op === '-') {
      consume();
      const child = parseUnary();
      return addNode('neg', 'neg', -nodes[child].data, [child], 'd = -1');
    }
    if (tok?.kind === 'op' && tok.op === '+') {
      consume();
      return parseUnary();
    }
    return parsePow();
  };

  const parsePow = (): number => {
    const base = parsePrimary();
    if (peek()?.kind === 'op' && (peek() as { kind: 'op'; op: string }).op === '**') {
      consume();
      const expNode = parseUnary();
      const a = nodes[base].data;
      const b = nodes[expNode].data;
      const val = Math.pow(a, b);
      if (!Number.isFinite(val)) throw new Error('Power produced non-finite value.');
      return addNode('^', 'pow', val, [base, expNode], `da = ${b.toFixed(2)} * a^(${(b - 1).toFixed(2)})`);
    }
    return base;
  };

  const parsePrimary = (): number => {
    const tok = peek();
    if (!tok) throw new Error('Unexpected end of expression.');

    if (tok.kind === 'num') {
      consume();
      return addNode(String(tok.value), 'const', tok.value, [], 'const');
    }

    if (tok.kind === 'ident') {
      consume();
      const next = peek();
      if (next?.kind === 'paren' && next.value === '(') {
        if (!SUPPORTED_FUNCS.has(tok.name)) {
          throw new Error(`Unsupported function "${tok.name}". Supported: tanh, sigmoid, relu, exp.`);
        }
        consume(); // (
        const argId = parseExpr();
        const close = consume();
        if (!close || close.kind !== 'paren' || close.value !== ')') {
          throw new Error(`Expected ")" after ${tok.name}(...)`);
        }
        const x = nodes[argId].data;
        if (tok.name === 'tanh') {
          const tVal = Math.tanh(x);
          return addNode('tanh', 'tanh', tVal, [argId], `1 - tanh^2 = ${(1 - tVal * tVal).toFixed(3)}`);
        }
        if (tok.name === 'sigmoid') {
          const s = 1 / (1 + Math.exp(-x));
          return addNode('σ', 'sigmoid', s, [argId], `σ*(1-σ) = ${(s * (1 - s)).toFixed(3)}`);
        }
        if (tok.name === 'relu') {
          return addNode('relu', 'relu', x > 0 ? x : 0, [argId], x > 0 ? '1.0' : '0.0');
        }
        const ex = Math.exp(x);
        if (!Number.isFinite(ex)) throw new Error('exp() overflowed.');
        return addNode('exp', 'exp', ex, [argId], `exp(x) = ${ex.toFixed(3)}`);
      }

      const existing = varNodes.get(tok.name);
      if (existing !== undefined) return existing;
      const value = env[tok.name] ?? 1.0;
      const id = addNode(tok.name, 'var', value, [], 'leaf');
      varNodes.set(tok.name, id);
      return id;
    }

    if (tok.kind === 'paren' && tok.value === '(') {
      consume();
      const inner = parseExpr();
      const close = consume();
      if (!close || close.kind !== 'paren' || close.value !== ')') {
        throw new Error('Mismatched parentheses.');
      }
      return inner;
    }

    throw new Error('Unexpected token in expression.');
  };

  const outputId = parseExpr();
  if (cursor < tokens.length) throw new Error('Unexpected trailing tokens in expression.');

  // Topological sort (post-order DFS from outputId)
  const visited = new Set<number>();
  const topo: number[] = [];
  const dfs = (id: number) => {
    if (visited.has(id)) return;
    visited.add(id);
    for (const p of nodes[id].parents) dfs(p);
    topo.push(id);
  };
  dfs(outputId);

  const backwardOrder = [...topo].reverse();
  const limit = backwardStepsLimit === undefined ? backwardOrder.length : Math.max(0, Math.min(backwardOrder.length, backwardStepsLimit));

  if (limit > 0) {
    nodes[outputId].grad = 1.0;
  }

  for (let step = 0; step < limit; step += 1) {
    const id = backwardOrder[step];
    const n = nodes[id];
    const g = n.grad;
    if (n.op === 'add') {
      nodes[n.parents[0]].grad += g;
      nodes[n.parents[1]].grad += g;
    } else if (n.op === 'sub') {
      nodes[n.parents[0]].grad += g;
      nodes[n.parents[1]].grad -= g;
    } else if (n.op === 'mul') {
      const [a, b] = n.parents;
      nodes[a].grad += nodes[b].data * g;
      nodes[b].grad += nodes[a].data * g;
    } else if (n.op === 'div') {
      const [a, b] = n.parents;
      const bv = nodes[b].data;
      nodes[a].grad += (1 / bv) * g;
      nodes[b].grad += (-nodes[a].data / (bv * bv)) * g;
    } else if (n.op === 'pow') {
      const [a, b] = n.parents;
      const av = nodes[a].data;
      const bv = nodes[b].data;
      nodes[a].grad += bv * Math.pow(av, bv - 1) * g;
      if (av > 0) {
        nodes[b].grad += Math.pow(av, bv) * Math.log(av) * g;
      }
    } else if (n.op === 'neg') {
      nodes[n.parents[0]].grad -= g;
    } else if (n.op === 'tanh') {
      nodes[n.parents[0]].grad += (1 - n.data * n.data) * g;
    } else if (n.op === 'sigmoid') {
      nodes[n.parents[0]].grad += n.data * (1 - n.data) * g;
    } else if (n.op === 'relu') {
      nodes[n.parents[0]].grad += (nodes[n.parents[0]].data > 0 ? 1 : 0) * g;
    } else if (n.op === 'exp') {
      nodes[n.parents[0]].grad += n.data * g;
    }
  }

  const gradients: Record<string, number> = {};
  for (const [name, nodeId] of varNodes.entries()) {
    gradients[name] = nodes[nodeId].grad;
  }

  return {
    expression,
    variables: [...varNodes.keys()],
    nodes,
    outputId,
    outputValue: nodes[outputId].data,
    gradients,
    backwardOrder,
  };
}
