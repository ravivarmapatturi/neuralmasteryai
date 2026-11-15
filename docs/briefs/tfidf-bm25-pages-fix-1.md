# TF-IDF/BM25 content accuracy fixes

## Objective

Address Codex review findings on the dedicated TF-IDF and BM25 pages without changing scope or numerical fixtures.

## Exact fixes

1. In `src/content/docs/search-ranking-recommendations/tf-idf.mdx`, remove unsupported numeric sparsity-density claims (`>99.5%`, `>99%`) unless derived directly from an explicitly defined corpus and vocabulary. Teach sparsity structurally: vectors have one coordinate per vocabulary term and zeroes for terms absent from each document; optionally demonstrate a small 4-document corpus with an actual vocabulary count computed in code. Do not imply a 10,000-term vocabulary or percentage is established by the toy corpus. Keep vector formulas accurate.
2. In `src/content/docs/search-ranking-recommendations/bm25.mdx`, remove the duplicate repeated healthcare/billing paragraph (there are currently two identical adjacent copies).
3. Rewrite the `<GoDeeper>` 2-Poisson explanation so it does not say BM25's rational TF factor is an exact posterior odds ratio or exact algebraic approximation unless Robertson & Zaragoza directly support that characterization. Explain the 2-Poisson relevance-model motivation carefully and distinguish it from the BM25 saturation function; BM25 uses a tractable saturation form motivated by relevance weighting, and parameterization/derivation has variants. Cite Robertson & Zaragoza (2009) and/or Manning et al. Do not overstate the shape or limit of posterior odds.
4. Qualify deployment generalizations on the BM25 page: the latency `less than 1ms` and statements that BM25 guarantees precision or dense retrieval guarantees high recall are unsupported as universal guarantees. Remove the latency assertion and phrase lexical/dense complementarity as task-dependent behavior, with exact token matching conditional on analyzer/tokenizer handling. Avoid claiming all search engines use one variant.

## Allowed files

- `AGENT_TRACKER.md`
- This fix brief
- `src/content/docs/search-ranking-recommendations/tf-idf.mdx`
- `src/content/docs/search-ranking-recommendations/bm25.mdx`

No helper, component, test, route, or screenshot changes. If resolving a claim requires changing another file, stop and report the issue.

## Verification

- `flock /tmp/nm-heavy.lock npm run check:mdx`
- `flock /tmp/nm-heavy.lock npm run check:links`
- writing-voice banned phrase grep on both pages
- `npm run check:tracker`
- `git diff --check`
- Review exact diff and allowed scope; commit edits and append exact commands/results under `## Report from agy` below. Never push.

## Report from agy
