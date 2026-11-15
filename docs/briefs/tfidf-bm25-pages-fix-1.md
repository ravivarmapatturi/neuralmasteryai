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

### 1. What was done

- **Fix 1 (`tf-idf.mdx`)**:
  - Removed unsupported numeric sparsity percentage claims (`>99.5%` and `>99%`).
  - Taught sparsity structurally: vectors have one coordinate per vocabulary term $t \in V$, and zeroes for all terms absent from that document.
  - Kept all vector formulas accurate ($\mathbf{d}, \mathbf{q} \in \mathbb{R}^{|V|}$) without implying the toy corpus establishes a 10,000-term vocabulary or arbitrary percentage.
  - Updated the summary table in "Remember" to describe sparse vector space as high-dimensional vectors with coordinates equal to zero for all absent vocabulary terms.
- **Fix 3 (`bm25.mdx`)**:
  - Rewrote `<GoDeeper title="The 2-Poisson Model Motivation">` to clearly distinguish the theoretical 2-Poisson relevance mixture model (Harter 1975, Robertson & Spärck Jones 1976, Manning et al. 2008) from BM25's rational saturation function.
  - Clarified that BM25's saturation form $\frac{\text{tf}}{\text{tf} + k_1}$ is a simple, closed-form parametric curve motivated by the qualitative saturation behavior of the 2-Poisson framework rather than an exact posterior odds ratio or exact Poisson factorial evaluation (citing Robertson & Zaragoza 2009, Section 3.2–3.3).
  - Updated the callout note to accurately state that BM25 emerged from the Probabilistic Relevance Framework and draws conceptual motivation from the 2-Poisson model.
  - Corrected the summary table row to indicate that smoothed IDF is a probabilistic Robertson smoothed variant.
- **Fix 4 (`bm25.mdx`)**:
  - Removed the unsupported latency assertion (`$<1\text{ms}$`), reframing exact retrieval as conditional on analyzer/tokenizer matching without lossy stripping.
  - Replaced the universal guarantee claim ("Lexical BM25 guarantees precision... dense vector embeddings ensure high recall...") with a nuanced explanation of task-dependent complementarity between lexical and semantic retrieval.
  - Qualified the smoothed IDF implementation claim to reference Apache Lucene, Elasticsearch, and OpenSearch without asserting that all production search engines use one variant.
- **Scope adherence**:
  - Modified only allowed files: `src/content/docs/search-ranking-recommendations/tf-idf.mdx`, `src/content/docs/search-ranking-recommendations/bm25.mdx`, `AGENT_TRACKER.md`, and `docs/briefs/tfidf-bm25-pages-fix-1.md`.
  - Zero component, helper, route, test, or screenshot changes.

### 2. What could not be done / Question for Codex

- **Fix 2 (`bm25.mdx` duplicate healthcare paragraph)**:
  - Brief item 2 requested: *"In `src/content/docs/search-ranking-recommendations/bm25.mdx`, remove the duplicate repeated healthcare/billing paragraph (there are currently two identical adjacent copies)."*
  - We inspected `src/content/docs/search-ranking-recommendations/bm25.mdx` (lines 179–180) and the git log history from commit `ba3dc005`.
  - In `bm25.mdx`, there is only **one single copy** of the paragraph:
    ```markdown
    2. **Healthcare & Billing Codes**:
       Medical and clinical billing depends on exact codes: CPT (e.g. `99213`), ICD-10 (e.g. `E11.9` for Type 2 Diabetes), and HCPCS. A dense embedding frequently confuses adjacent diagnostic codes that share similar text descriptions but have different legal and financial meanings.
    ```
  - There are no adjacent duplicate copies in `bm25.mdx`. To obey the rule *"Make no design decisions: if anything is unclear or wrong, stop and write your question under '## Report from agy' in the brief"*, we did not delete the only copy of item 2 (which would turn a 4-item list into a 3-item list). Please clarify whether item 2 should be deleted entirely or retained as the single copy.

### 3. Verification commands and output

1. **`flock /tmp/nm-heavy.lock npm run check:mdx`**:
   - Result: Exit 0
   - Output: `check-mdx-compile: 2014 files, 0 failed.`
2. **`flock /tmp/nm-heavy.lock npm run check:links`**:
   - Result: Exit 0
   - Output: `check-internal-links: scanned 1986 MDX file(s), found 2142 valid route(s). check-internal-links: no broken internal prose links found. check-anchor-links: scanned 1986 MDX file(s) (3679 heading id(s)) and 1027 TSX file(s). check-anchor-links: no broken anchor links found.`
3. **Banned phrase grep (`writing-voice`)**:
   - Command: `grep -inE "delve|deep dive|unleash|unlock|harness the power|game.?changer|revolutioniz|cutting.edge|seamless|in today's|it's (important|worth) not|in conclusion|tapestry|testament|elevate|empower|supercharg|effortless|premier|world.class|ultimate guide|let's dive" src/content/docs/search-ranking-recommendations/tf-idf.mdx src/content/docs/search-ranking-recommendations/bm25.mdx`
   - Result: Exit 1 (0 matches found, clean)
4. **`flock /tmp/nm-heavy.lock npm run typecheck`**:
   - Result: Exit 0 (`tsc -b` passed with 0 errors)
5. **Targeted Vitest Suite (`flock /tmp/nm-heavy.lock npx vitest run ...`)**:
   - Command: `flock /tmp/nm-heavy.lock npx vitest run src/viz/lib/tfidf.test.ts src/viz/lib/bm25.test.ts src/viz/diagrams/TfidfSearchExplorer.test.tsx src/viz/diagrams/Bm25SaturationExplorer.test.tsx`
   - Result: Exit 0 (4 test files passed, 36/36 tests passed)
6. **`npm run check:tracker`**:
   - Result: Exit 0 (`check-agent-tracker: AGENT_TRACKER.md is valid, structured, and properly maintained.`)
7. **`git diff --check`**:
   - Result: Exit 0 (clean, no whitespace or merge artifacts)
