# Playground Map — All Learn Sections (`src/content/docs/*`)

This map pairs every Learn section under `src/content/docs/*` with 1 to 4 hands-on playground tools. Each entry records what the learner directly changes, what updates live on screen, the mechanism it teaches, whether the interactive component already exists in `src/viz/` (`EXISTS`) or stays queued as `NEW` for a later phase, and the Learn page it links back to.

Summary counts across all 38 Learn directory sections (`src/content/docs/*` excluding `practice-problems/`, which already lives at `/labs` and `/practice/*`, plus root `learning-path.mdx` covered under Roadmaps):
- **`EXISTS` (registered on `/playground` and `/playground/<slug>` in Phase 1):** 91 tools across 30 sections
- **`NEW` (listed as "Coming soon" on `/playground`, deferred from Phase 1):** 12 tools covering the remaining 8 sections plus 4 priority gap tools

---

## 1. Foundations & Setup

### Getting Started (`src/content/docs/getting-started`)

| Tool | What the learner changes | What they see | Idea it teaches | Status | Learn page |
| :--- | :--- | :--- | :--- | :--- | :--- |
| AI Stack Map Interactive Tour | Focus layer selector (hardware, runtimes, frameworks, agents, evals) | Highlighted dependency graph showing how layers connect in a single request | How a production AI request traverses storage, models, routers, and evaluators | `NEW` | [How to Use This Site](/docs/getting-started/intro) |

### Roadmaps & Learning Path (`src/content/docs/roadmaps` + `src/content/docs/learning-path.mdx`)

| Tool | What the learner changes | What they see | Idea it teaches | Status | Learn page |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Role-Based Skill Gap & Path Builder | Target role preset, weekly study hours, already-known prerequisites | Pruned dependency DAG of Learn sections and estimated completion weeks | Prerequisite ordering saves wasted study when switching between ML, LLM, and infra tracks | `NEW` | [AI Engineering Track](/docs/roadmaps/ai-engineering-track) · [Learning Path](/docs/learning-path) |

### Mathematics for AI (`src/content/docs/mathematics-for-ai`)

| Tool | What the learner changes | What they see | Idea it teaches | Status | Learn page |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Distribution Explorer | Distribution family (`Normal`, `Poisson`, `Exponential`, `Uniform`) and shape/scale parameters | Rescaled PDF/PMF histogram plus live mean and variance readouts | Parameters shift center and tail spread in completely different ways per distribution family | `EXISTS` (`src/viz/diagrams/DistributionExplorerDiagram.tsx`) | [Probability & Statistics for AI](/docs/mathematics-for-ai/probability-statistics) |
| Bayes Belief Updater | Prior $P(\text{disease})$, sensitivity $P(+ \mid \text{disease})$, false-positive rate $P(+ \mid \neg \text{disease})$ | Live posterior probability vs. prior alongside $P(A \mid B)$ substitution | Low base rates make false positives dominate even high-accuracy tests | `EXISTS` (`src/viz/diagrams/BayesUpdateDiagram.tsx`) | [Probability & Statistics for AI](/docs/mathematics-for-ai/probability-statistics) |
| Entropy & KL Divergence Explorer | Target distribution $Q(x)$ probabilities relative to fixed $P(x)$ | Side-by-side probability bars plus computed Shannon entropy $H(P)$ and asymmetric $D_{\text{KL}}(P \| Q)$ | KL divergence spikes sharply wherever $Q$ assigns tiny mass to events frequent under $P$ | `EXISTS` (`src/viz/diagrams/EntropyKlDiagram.tsx`) | [Probability & Statistics for AI](/docs/mathematics-for-ai/probability-statistics) |
| 2x2 Matrix Transformation Lab | Four matrix entries $A_{00}, A_{01}, A_{10}, A_{11}$ | Warped coordinate grid, basis column vectors $e_1, e_2$, and live $\det(A)$ | Columns of $A$ dictate where unit basis vectors land and $|\det(A)|$ scales area | `EXISTS` (`src/viz/diagrams/MatrixTransformationDiagram.tsx`) | [Linear Algebra for AI](/docs/mathematics-for-ai/linear-algebra) |

### CS Fundamentals (`src/content/docs/cs-fundamentals`)

| Tool | What the learner changes | What they see | Idea it teaches | Status | Learn page |
| :--- | :--- | :--- | :--- | :--- | :--- |
| CAP Partition Trade-Off Simulator | Network state toggle (`Partitioned` vs. `Healthy`) and consistency choice (`CP` vs. `AP`) | Client read/write success states across nodes, staleness alerts, or rejected writes | Under a real network partition a distributed store must pick consistency or availability | `EXISTS` (`src/viz/diagrams/CapTheoremDiagram.tsx`) | [Networking & Distributed Systems](/docs/cs-fundamentals/networking-and-distributed-systems) |
| TCP vs. UDP Packet Loss Simulator | Simulated packet loss percentage (`0%` to `60%`) | Delivered slot strip for UDP gaps next to TCP retransmitted ordered packets | Retransmissions guarantee order at the cost of tail delay while real-time streams prefer fresh drops | `EXISTS` (`src/viz/diagrams/TcpVsUdpDiagram.tsx`) | [Networking & Distributed Systems](/docs/cs-fundamentals/networking-and-distributed-systems) |
| Consensus Quorum Calculator | Unreachable node count (`0` to `4`) on a 5-node cluster | Reachable node states and live majority threshold $\lfloor N/2 \rfloor + 1 = 3$ commit verdict | Safety holds because any two majorities share at least one overlapping node | `EXISTS` (`src/viz/diagrams/ConsensusQuorumDiagram.tsx`) | [Networking & Distributed Systems](/docs/cs-fundamentals/networking-and-distributed-systems) |

### Python Engineering (`src/content/docs/python-engineering`)

| Tool | What the learner changes | What they see | Idea it teaches | Status | Learn page |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Async Event Loop Timeline | Concurrency model (`Sequential` vs. `asyncio` gather) across simulated I/O awaits | Overlapping wait bars and total wall-clock elapsed time | Single-threaded async hides network idle time by switching tasks at `await` points | `EXISTS` (`src/viz/diagrams/AsyncEventLoopDiagram.tsx`) | [Concurrency, Memory & Performance](/docs/python-engineering/concurrency-memory-and-performance) |
| Threading vs. Multiprocessing Explorer | Workload type (`CPU-bound` vs. `I/O-bound`) and execution model (`threading` vs. `multiprocessing`) | Simulated wall-clock bar across 4 workers and GIL serialization note | The GIL blocks parallel CPU execution in threads while releasing during I/O waits | `EXISTS` (`src/viz/diagrams/ThreadingVsMultiprocessingDiagram.tsx`) | [Concurrency, Memory & Performance](/docs/python-engineering/concurrency-memory-and-performance) |
| Generator vs. List Memory Curve | Dataset size (`100` to `20,000` examples) | Log-scale memory curves comparing eager list buffering with lazy `yield` streaming | Generators hold constant $O(1)$ per-item RAM while lists scale linearly with corpus size | `EXISTS` (`src/viz/diagrams/GeneratorMemoryDiagram.tsx`) | [Language Fundamentals: OOP, Functional & Modern Python](/docs/python-engineering/language-fundamentals-and-oop) |

---

## 2. Core ML, Ranking & Deep Learning

### Machine Learning (`src/content/docs/machine-learning`)

| Tool | What the learner changes | What they see | Idea it teaches | Status | Learn page |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Linear Regression Studio | Slope $w$, intercept $b$, noise, outlier toggle, learning rate $\eta$, or Play GD | Scatter residuals, fitted line, contour loss heatmap, and batch gradient descent trace | Squared error penalizes outliers heavily and excess $\eta$ overshoots the quadratic bowl | `EXISTS` (`src/viz/LinearRegressionStudio.tsx`) | [Linear Regression](/docs/machine-learning/linear-regression) |
| Logistic Regression Studio | Weight $w$, bias $b$, noise, and loss objective (`Cross-Entropy` vs. `MSE`) | Sigmoid curve, threshold classification colors, and loss landscape gradients | Naive MSE on a sigmoid flattens gradients when confident predictions are wrong | `EXISTS` (`src/viz/LogisticRegressionStudio.tsx`) | [Logistic Regression](/docs/machine-learning/logistic-regression) |
| Decision Boundary Playground | Model family (`k-NN`, `Linear SVM`, `RBF SVM`, `Tree`) and complexity hyperparameter | Colored 2D classification regions on spiral/moon datasets plus train/test accuracy | Raising capacity bends boundaries around noise while tightening margin/depth smooths them | `EXISTS` (`src/viz/DecisionBoundaryPlayground.tsx`) | [k-Nearest Neighbors](/docs/machine-learning/k-nearest-neighbors) |
| Lasso Regression Studio | L1 strength $\lambda$, feature correlation $(x_1, x_2)$, and noise | Regularization path lines and exact zeroed feature count under coordinate descent | L1 penalties drive irrelevant and redundant weights to exact zero | `EXISTS` (`src/viz/LassoRegressionStudio.tsx`) | [Lasso Regression](/docs/machine-learning/lasso-regression) |

### Deep Learning (`src/content/docs/deep-learning`)

| Tool | What the learner changes | What they see | Idea it teaches | Status | Learn page |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Neural Network Playground | Dataset shape, hidden layers/widths, activation, learning rate, and L1/L2 decay | Live decision surface, epoch loss curve, and per-neuron weight lines | Hidden non-linear layers compose linear cuts to solve non-linear datasets like XOR and spirals | `EXISTS` (`src/viz/NeuralNetworkPlayground.tsx`) | [Neural Network Fundamentals](/docs/deep-learning/neural-network-fundamentals) |
| Gradient Descent Optimizer Race | Loss surface (`Quadratic Bowl`, `Beale`, `Saddle`), step size, optimizer (`SGD`, `Momentum`, `RMSProp`, `Adam`), start point | Side-by-side optimizer trajectories, step counts, and gradient vectors | Momentum accumulates consistent directions while adaptive methods rescale sparse vs. steep axes | `EXISTS` (`src/viz/GradientDescentExplorer.tsx`) | [Optimizers](/docs/deep-learning/optimizers) |
| Attention Step-Through Explorer | Query token selection, sequence preset, and pipeline stage (`QKV` -> `Softmax`) | Token-to-token attention weights, scaled $QK^T/\sqrt{d_k}$ heatmaps, and weighted $V$ mix | Dividing by $\sqrt{d_k}$ keeps logits out of softmax saturation before mixing values | `EXISTS` (`src/viz/AttentionStepThrough.tsx`) | [Attention and Transformers](/docs/deep-learning/attention-transformers) |
| Diffusion Forward Noising Lab | Noise schedule step $t \in [0, T]$ | Gradually corrupted image/distribution density alongside signal $\sqrt{\bar{\alpha}_t}$ vs. noise $\sqrt{1 - \bar{\alpha}_t}$ | Forward diffusion systematically turns structured data into isotropic Gaussian noise | `EXISTS` (`src/viz/diagrams/DiffusionForwardProcessDiagram.tsx`) | [Generative Models](/docs/deep-learning/generative-models) |

### Natural Language Processing (`src/content/docs/nlp`)

| Tool | What the learner changes | What they see | Idea it teaches | Status | Learn page |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Embedding Space Explorer | Target word, vector analogy terms (`king - man + woman`), or metric toggle | 2D projected word neighborhood and nearest semantic neighbors by cosine similarity | Learned distributional spaces encode syntactic and semantic offsets as linear vector directions | `EXISTS` (`src/viz/EmbeddingSpaceExplorer.tsx`) | [Word Embeddings](/docs/nlp/word-embeddings) |
| Tokenization Ambiguity Inspector | Language/domain preset (multi-word compounds, code, punctuation, numbers) | Split boundaries showing token fragmentation and vocabulary trade-offs | Subword boundary choices determine sequence length, arithmetic regularity, and rare-word handling | `EXISTS` (`src/viz/diagrams/TokenizationAmbiguityDiagram.tsx`) | [Classical NLP](/docs/nlp/classical-nlp) |
| BLEU N-Gram Precision Explorer | Candidate text preset (`Exact match`, `Valid paraphrase`, `Word salad`) | Unigram precision, bigram precision, and combined geometric-mean BLEU score | Surface n-gram overlap misses valid paraphrases while bigram precision catches shuffled words | `EXISTS` (`src/viz/diagrams/BleuScoreDiagram.tsx`) | [NLP Task Taxonomy](/docs/nlp/nlp-task-taxonomy) |

### Computer Vision (`src/content/docs/computer-vision`)

| Tool | What the learner changes | What they see | Idea it teaches | Status | Learn page |
| :--- | :--- | :--- | :--- | :--- | :--- |
| 2D Convolution Sliding Window | Kernel preset (`Edge`, `Sharpen`, `Blur`, `Sobel`) and step offset | Active input patch, element-wise products, and accumulating output feature map cell | Spatial weight sharing extracts identical local patterns across every image coordinate | `EXISTS` (`src/viz/diagrams/ConvolutionSlideDiagram.tsx`) | [Vision Fundamentals](/docs/computer-vision/vision-fundamentals) |
| Image Tensor RGB Explorer | Pixel inspection coordinate and channel view | Height $\times$ Width $\times$ 3 integer array slices alongside the rendered patch | Images enter neural networks strictly as numeric tensors whose channels separate color intensity | `EXISTS` (`src/viz/diagrams/ImageTensorExplorerDiagram.tsx`) | [Computer Vision — Overview](/docs/computer-vision/overview) |
| Morphological Operations Grid | Operation selector (`Original`, `Erosion`, `Dilation`, `Opening`, `Closing`) | Binary grid transformation showing holes filled and single-pixel noise speckles removed | Ordering erosion and dilation separates noise filtering (`Opening`) from hole filling (`Closing`) | `EXISTS` (`src/viz/diagrams/MorphologicalOpsDiagram.tsx`) | [Vision Fundamentals](/docs/computer-vision/vision-fundamentals) |

### Speech & Audio (`src/content/docs/speech-audio`)

| Tool | What the learner changes | What they see | Idea it teaches | Status | Learn page |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Sampling & Nyquist Aliasing Lab | Signal frequency vs. sample rate $f_s$ | True analog sine curve, discrete sample dots, and aliased reconstruction below $2f$ | Sampling slower than twice the highest frequency aliases high tones into phantom low frequencies | `EXISTS` (`src/viz/diagrams/SamplingNyquistDiagram.tsx`) | [Audio Fundamentals](/docs/speech-audio/audio-fundamentals) |
| Fourier Sum-of-Sines Synthesizer | Odd harmonic cutoff $k \le N$ (`1` through `25`) | Reconstructed time-domain wave alongside per-harmonic amplitude spectrum bars | Complex waveforms assemble from weighted sinusoids with Gibbs ringing at sharp steps | `EXISTS` (`src/viz/diagrams/FourierSumOfSinesDiagram.tsx`) | [Audio Fundamentals](/docs/speech-audio/audio-fundamentals) |
| CTC Frame Alignment & Collapse | Phrase example (`"HELLO"`, `"SPEED"`) | Raw acoustic frame strip, post-merge strip, and final blank-stripped transcript | Keeping blank tokens between duplicate characters lets unaligned ASR models emit double letters | `EXISTS` (`src/viz/diagrams/CtcAlignmentDiagram.tsx`) | [Speech & Audio Tasks](/docs/speech-audio/speech-audio-tasks) |

### LLMs & Generative AI (`src/content/docs/llms-genai`)

| Tool | What the learner changes | What they see | Idea it teaches | Status | Learn page |
| :--- | :--- | :--- | :--- | :--- | :--- |
| LLM Inference Flow Visualizer | Decoding step, temperature $\tau$, and prompt preset | Prefill vs. decode phases, logit bars before/after softmax, and sampled token trace | Higher temperature flattens next-token probability while prefill differs fundamentally from decode | `EXISTS` (`src/viz/InferenceFlowVisualizer.tsx`) | [Foundation Model & Transformer Internals](/docs/llms-genai/foundation-model-internals) |
| RAG Pipeline Simulator | Query wording, chunk size, overlap, top-$k$, and similarity metric | Chunked corpus highlights, retrieved score list, assembled context window, and failure diagnostics | Retrieval errors come from chunk splits, lost context, or metric mismatches before generation runs | `EXISTS` (`src/viz/RagPipelineSimulator.tsx`) | [RAG](/docs/llms-genai/rag) |
| KV Cache Computation Counter | Mode (`Naive` vs. `KV cache`) and generated token count $t \in [1, 5]$ | Step-by-step cell grid marking recomputed vs. cached $K/V$ projections and total compute count | Caching past keys and values drops per-step projection growth from quadratic $O(T^2)$ to linear $O(T)$ | `EXISTS` (`src/viz/diagrams/KvCacheDiagram.tsx`) | [Foundation Model & Transformer Internals](/docs/llms-genai/foundation-model-internals) |
| In-Browser Small LM Generator (GPT-2) | Prompt prefix, temperature, top-$k$, top-$p$, repetition penalty | Next-token probability table, live token stream, and token probability inspection | Decoding parameters reshape real token entropy rather than just randomness | `NEW` | [Calling the LLM API in Practice](/docs/llms-genai/calling-the-llm-api) |

### Search, Ranking & Recommendations (`src/content/docs/search-ranking-recommendations`)

| Tool | What the learner changes | What they see | Idea it teaches | Status | Learn page |
| :--- | :--- | :--- | :--- | :--- | :--- |
| BM25 Term Saturation & Length Lab | Term frequency $\text{tf}$, saturation $k_1$, document length $|D|$, length norm $b$ | Live saturation curve plus worked IDF, length penalty $B$, and BM25 score breakdown | BM25 prevents term-stuffing domination while weighting document length proportionally via $b$ | `EXISTS` (`src/viz/diagrams/Bm25SaturationExplorer.tsx`) | [BM25: Term Saturation & Length Normalization](/docs/search-ranking-recommendations/bm25) |
| TF-IDF Multi-Document Search Lab | Query term toggle and term-weight inspection | Document term counts, inverse document frequency $\ln(N/\text{df})$, and ranked document list | Rare collection words dominate relevance scores even when common filler words repeat | `EXISTS` (`src/viz/diagrams/TfidfSearchExplorer.tsx`) | [TF-IDF](/docs/search-ranking-recommendations/tf-idf) |
| PageRank Power Iteration Lab | Damping factor $d$ (`0.85`, `0.50`, `1.00`) and power-iteration step `0..Converged` | Directed 4-node graph probabilities with node area scaling by stationary rank | Damping teleports rescue probability mass from dangling dead ends and sink cycles | `EXISTS` (`src/viz/diagrams/PageRankVisualizer.tsx`) | [Ranking Fundamentals & Link Analysis](/docs/search-ranking-recommendations/ranking-fundamentals) |
| Ranking Evaluation Metrics Lab | Reorder ranked docs (`order1`, `order2`, `ideal`), cutoff $k$, exponential vs. linear gain | Precision@k, Recall@k, MRR, MAP, DCG, IDCG, and NDCG updating live | Top-$k$ set metrics miss rank inversions while MRR and NDCG penalize demoting top grades | `EXISTS` (`src/viz/diagrams/RankingMetricsExplorer.tsx`) | [Ranking Evaluation Metrics](/docs/search-ranking-recommendations/ranking-evaluation-metrics) |

### Graph ML (`src/content/docs/graph-ml`)

| Tool | What the learner changes | What they see | Idea it teaches | Status | Learn page |
| :--- | :--- | :--- | :--- | :--- | :--- |
| TransE Knowledge Graph Scoring | Triple validity preset / translation vector offsets $h + r$ vs. $t$ | 2D vector geometry plotting head + relation displacement distance to tail entity | Relational translations represent directed knowledge triples as low-distance vector sums | `EXISTS` (`src/viz/diagrams/TransEDiagram.tsx`) | [Graph ML Fundamentals](/docs/graph-ml/graph-ml-fundamentals) |
| GIN Sum vs. Mean Expressiveness | Graph B leaf neighbor count (`2` to `6`) against fixed Graph A | Side-by-side star graphs comparing identical mean features vs. distinct sum aggregations | Mean pooling erases neighbor degree information that sum aggregation retains | `EXISTS` (`src/viz/diagrams/GinExpressivenessDiagram.tsx`) | [Graph ML Fundamentals](/docs/graph-ml/graph-ml-fundamentals) |
| node2vec Random Walk Bias | Walk strategy (`Local` $q=2$ vs. `Exploratory` $q=0.5$) | Highlighted 2nd-order random walk path and node revisit counts on bridge vs. cluster nodes | High $q$ traps walks inside communities while low $q$ explores structural bridge roles | `EXISTS` (`src/viz/diagrams/RandomWalkEmbeddingDiagram.tsx`) | [Graph ML Fundamentals](/docs/graph-ml/graph-ml-fundamentals) |

### Reinforcement Learning (`src/content/docs/reinforcement-learning`)

| Tool | What the learner changes | What they see | Idea it teaches | Status | Learn page |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Bandit Regret Race | Exploration algorithm (`Epsilon-greedy`, `UCB1`, `Thompson Sampling`) and step count | Cumulative regret curves across multiple arm pull distributions | Uninformed greedy stops too soon while UCB and Thompson balance confidence vs. uncertainty | `EXISTS` (`src/viz/diagrams/BanditRegretRaceDiagram.tsx`) | [Multi-Armed & Contextual Bandits](/docs/reinforcement-learning/bandits) |
| Q-Learning vs. SARSA Cliff Grid | Trained policy toggle (`Q-learning` vs. `SARSA`) | Rollout path across the cliff grid after 300 identical episodes with $\epsilon = 0.1$ | Off-policy Q-learning hugs the dangerous optimal edge while on-policy SARSA chooses the safer path | `EXISTS` (`src/viz/diagrams/QLearningVsSarsaCliffDiagram.tsx`) | [RL Fundamentals](/docs/reinforcement-learning/rl-fundamentals) |
| RL Return Discounting ($\gamma$) | Discount factor $\gamma \in [0, 0.99]$ | Per-step discounted reward bars $\gamma^k r_k$, half-life estimate, and sum $G_0$ | Changing $\gamma$ sets the agent's effective planning horizon between short-term and distant rewards | `EXISTS` (`src/viz/diagrams/ReturnDiscountingDiagram.tsx`) | [RL Fundamentals](/docs/reinforcement-learning/rl-fundamentals) |

---

## 3. Agents, Context & Production Systems

### AI Agents (`src/content/docs/agents`)

| Tool | What the learner changes | What they see | Idea it teaches | Status | Learn page |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Agent Execution Graph Explorer | Agent loop preset (`ReAct`, `Plan-Execute`, `Reflection`) and step scrubber | Directed execution flow trace, tool input/output states, and token/step budget accumulation | Different agent patterns trade up-front planning tokens for tighter mid-run recovery | `EXISTS` (`src/viz/AgentExecutionGraph.tsx`) | [Agent Architectures](/docs/agents/agent-architectures) |
| Router vs. Supervisor Stepper | Pattern selector (`Router` vs. `Supervisor`) and Step/Reset buttons | Trace of handling a two-part request showing early exit vs. iterative tool re-inspection | Single-shot routers drop compound sub-goals that a supervisor catches by checking tool returns | `EXISTS` (`src/viz/diagrams/RouterVsSupervisorDiagram.tsx`) | [Routing and the Supervisor Pattern](/docs/agents/routing-and-supervisor) |
| Parallel Sub-Agent Speedup Simulator | Concurrent worker slots (`1` to `8`) | Sequential timeline bar vs. parallel makespan bar across 8 fixed sub-task durations | Wall-clock latency hits a floor at the single longest straggler regardless of extra workers | `EXISTS` (`src/viz/diagrams/ParallelAgentSpeedupDiagram.tsx`) | [Multi-Agent Systems](/docs/agents/multi-agent-systems) |

### Harness Engineering (`src/content/docs/harness-engineering`)

| Tool | What the learner changes | What they see | Idea it teaches | Status | Learn page |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Agent Harness Architecture Visualizer | Component stage inspection and guardrail preset | Layered execution boundary diagram linking model calls, tool sandbox, verification, and memory | Model reliability in production relies primarily on deterministic harness checks around the LLM | `EXISTS` (`src/viz/diagrams/AgentHarnessArchitectureVisualizer.tsx`) | [Harness Architecture & Sandboxing](/docs/harness-engineering/harness-architecture) |
| Instruction Attention Budget Lab | System prompt instruction count and context clutter level | Effective instruction compliance bar and attention dilution warning thresholds | Crowded system prompts lose per-rule compliance long before hitting hard context limits | `EXISTS` (`src/viz/diagrams/InstructionBudgetVisualizer.tsx`) | [Context & Instruction Architecture](/docs/harness-engineering/context-and-instruction-design) |
| Context Compaction Strategy Lab | Compaction trigger threshold and strategy (`Rolling`, `Summarize`, `Artifact offload`) | Retained signal vs. token footprint curve across multi-turn trajectories | Targeted observation pruning preserves verification facts better than naive truncation | `EXISTS` (`src/viz/diagrams/ContextCompactionVisualizer.tsx`) | [State, Continuity & Memory Compaction](/docs/harness-engineering/state-continuity-and-memory) |
| Harness Component Ablation Studio | Toggle individual harness mechanisms (verification, planning, memory, loop cap) | Simulated task completion rate, retry count, and failure taxonomy shift | Removing verification gates hurts real benchmark pass rates more than downgrading base model size | `EXISTS` (`src/viz/diagrams/HarnessAblationStudio.tsx`) | [Autonomous Loops & Supervisors](/docs/harness-engineering/autonomous-loops-and-supervisors) |

### Context Engineering (`src/content/docs/context-engineering`)

| Tool | What the learner changes | What they see | Idea it teaches | Status | Learn page |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Context Budget Waterfall Visualizer | Turn depth and allocation sliders (system, tools, RAG, history, output reserve) | Stacked token waterfall hitting soft warning (around 70% full) vs. hard overflow | Reserving output tokens and bounding history prevents sudden tool truncation | `EXISTS` (`src/viz/diagrams/ContextBudgetWaterfallVisualizer.tsx`) | [Token Budgeting, Sliding Windows & Compaction Strategies](/docs/context-engineering/token-budgeting-and-compaction) |
| Tokenizer & Prefix-Cache Boundary Inspector | Raw prompt text, system prompt edits, dynamic timestamp insertion, BPE tokenizer | Colorized token boundaries, token count, and prefix-cache invalidation point | Placing volatile timestamps before static tools destroys KV prefix cache hits on every turn | `NEW` | [External Memory, Hierarchical Recall & KV Cache Optimization](/docs/context-engineering/external-memory-and-persistence) |

### Software System Design (`src/content/docs/software-system-design`)

| Tool | What the learner changes | What they see | Idea it teaches | Status | Learn page |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Consistent Hashing Ring Explorer | Ring membership (`A, B, C` vs. `Add D at 35`) | Linearized clockwise ring `0..100`, highlighted transferred interval `(20, 35]`, and moved key count | Joining one node rebalances only $1/N$ of keys in one local interval rather than rehashing all keys | `EXISTS` (`src/viz/diagrams/ConsistentHashMembershipExplorer.tsx`) | [Consistent Hashing](/docs/software-system-design/consistent-hashing) |
| Token Bucket Rate Limiter | Simulation phase (`Full bucket`, `Seven arrivals`, `Wait 0.5 seconds`, `Next request`) | Filled/spent token slots (`/5`), refill rate (`2/s`), and live accept/reject counters | Token buckets absorb short traffic bursts while capping sustained long-run request rate | `EXISTS` (`src/viz/diagrams/TokenBucketAdmissionExplorer.tsx`) | [Rate Limiting and Admission Control](/docs/software-system-design/rate-limiting) |
| SLO Error Budget Burn Calculator | Observed failure percentage (`0%` to `10%`) against a `99.9%` 30-day objective | Burn rate multiplier, one-hour monthly budget consumption bar, and hours until exhaustion | A `2%` outage burns error budget `20x` faster and consumes a month of margin in `36` hours | `EXISTS` (`src/viz/diagrams/ErrorBudgetExplorer.tsx`) | [Availability, SLOs, and Error Budgets](/docs/software-system-design/availability-and-slos) |
| Transaction Isolation & Write Skew | Concurrency anomaly toggle (`Read Committed`, `Snapshot Isolation`, `Serializable`) | Interleaved two-transaction read/write schedule showing lost constraint or conflict abort | Snapshot isolation prevents dirty reads but still admits write skew without serializable checks | `EXISTS` (`src/viz/diagrams/WriteSkewExplorer.tsx`) | [Transactions, Isolation, and Write Skew](/docs/software-system-design/transactions-and-isolation) |

### ML System Design (`src/content/docs/ml-system-design`)

| Tool | What the learner changes | What they see | Idea it teaches | Status | Learn page |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Benchmark Dimensions Selector | System class (`Any served model` vs. `Retrieval (embedding/reranker)`) | Active metric dimensions (`TTFT/TPOT`, `Throughput`, `Recall@k/NDCG`, `Cost`) | Evaluation metrics change completely when moving from generative serving to dense retrieval | `EXISTS` (`src/viz/diagrams/BenchmarkDimensionsSelectorDiagram.tsx`) | [Model Catalog & Benchmarking Framework](/docs/ml-system-design/model-catalog-and-benchmarking) |
| Cold-Start Strategy Transition | Available interaction history count (new user/item interactions) | Accuracy/coverage curves comparing content-based, heuristic popularity, and collaborative models | Production recommenders blend popularity priors with item metadata until behavioral logs accumulate | `EXISTS` (`src/viz/diagrams/ColdStartDiagram.tsx`) | [ML System Design Case Studies](/docs/ml-system-design/case-studies) |
| A/B, Shadow & Canary Rollout Explorer | Traffic routing pattern (`Shadow`, `Canary`, `A/B test`) | Live user-exposure split, blast radius vs. latency measurement parity | Shadow logs verify latency/errors safely without risking users while A/B measures real outcome lift | `EXISTS` (`src/viz/diagrams/ABShadowCanaryDiagram.tsx`) | [The 9-Step ML System Design Framework](/docs/ml-system-design/the-9-step-framework) |

### MLOps & Serving (`src/content/docs/mlops`)

| Tool | What the learner changes | What they see | Idea it teaches | Status | Learn page |
| :--- | :--- | :--- | :--- | :--- | :--- |
| PSI Distribution Drift Calculator | Current bin proportions vs. baseline training distribution | Grouped baseline/current histogram bars and live Population Stability Index ($\text{PSI}$) alert | Crossing `0.25` signals severe feature shift before downstream accuracy labels even arrive | `EXISTS` (`src/viz/diagrams/PsiCalculatorDiagram.tsx`) | [Monitoring and Drift](/docs/mlops/monitoring-and-drift) |
| Distributed Pipeline Bubble Lab | Micro-batch count $M$ and pipeline stage depth $P$ | Stage-by-GPU schedule grid highlighting idle forward/backward bubble fraction $(P-1)/(P-1+M)$ | Splitting batches into enough micro-batches shrinks pipeline stall overhead without more GPUs | `EXISTS` (`src/viz/diagrams/PipelineBubbleDiagram.tsx`) | [GPU & Distributed Training](/docs/mlops/gpu-and-distributed-training) |
| Adaptive Batching Queue Trade-Off | Max batch size and max queue wait window (ms) | Throughput vs. p99 waiting latency curves under fluctuating arrival rate | Longer collection timers raise GPU utilization only until queue delay eats the SLA budget | `EXISTS` (`src/viz/diagrams/AdaptiveBatchingQueueDiagram.tsx`) | [Model Serving](/docs/mlops/model-serving) |
| Cache Eviction & TTL Policy Lab | Eviction policy (`LRU`, `LFU`, `TTL`) and access stream pattern | Hit rate and stale-serve counters across working-set shifts | TTL bounds data staleness while LRU/LFU determine hit rate under changing key popularity | `EXISTS` (`src/viz/diagrams/CacheEvictionTtlDiagram.tsx`) | [Caching Strategies & Redis Patterns](/docs/mlops/caching-strategies) |

### Inference Engineering (`src/content/docs/inference-engineering`)

| Tool | What the learner changes | What they see | Idea it teaches | Status | Learn page |
| :--- | :--- | :--- | :--- | :--- | :--- |
| GPU Roofline Model Visualizer | Arithmetic intensity (FLOPs/byte) and batch size | Log-log ceiling plot contrasting memory-bandwidth slope vs. compute peak ridge point | Single-request autoregressive decode sits memory-bound far left of the ridge point until batched | `EXISTS` (`src/viz/diagrams/RooflineModelVisualizer.tsx`) | [The Roofline Model & KV Cache Mechanics](/docs/inference-engineering/roofline-and-kv-cache) |
| PagedAttention Memory Simulator | Sequence lengths and KV page block size | Logical blocks vs. physical GPU page frames comparing contiguous fragmentation vs. paged reuse | Paged virtual memory eliminates pre-allocation internal fragmentation across variable requests | `EXISTS` (`src/viz/diagrams/PagedAttentionVisualizer.tsx`) | [The Roofline Model & KV Cache Mechanics](/docs/inference-engineering/roofline-and-kv-cache) |
| Speculative Decoding Simulator | Draft length $\gamma$ and draft acceptance rate $\alpha$ | Parallel verification timeline and effective per-token speedup factor | A fast draft model verifies $\gamma$ tokens in one target pass so speedup scales sharply with $\alpha$ | `EXISTS` (`src/viz/diagrams/SpeculativeDecodingSimulator.tsx`) | [Continuous Batching & Speculative Decoding](/docs/inference-engineering/continuous-batching-and-speculative-decoding) |
| Quantization Scale & Precision Lab | Bit width (`FP16`, `INT8`, `INT4`), scale factor, and outlier spike | Dequantized bucket grid, dynamic range clipping, and RMSE quantization error | Outliers force coarse quantization bins unless group-wise scaling isolates them | `EXISTS` (`src/viz/diagrams/QuantizationScaleVisualizer.tsx`) | [Quantization & Model Compression](/docs/inference-engineering/quantization-and-compression) |

### Databases (`src/content/docs/databases`)

| Tool | What the learner changes | What they see | Idea it teaches | Status | Learn page |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Embedding Vector Similarity Search | Query point coordinates and metric (`Cosine` vs. `Euclidean`) | Nearest-neighbor ranking lines and score readouts in vector space | Cosine ignores magnitude differences that Euclidean distance penalizes | `EXISTS` (`src/viz/diagrams/EmbeddingSimilaritySearchDiagram.tsx`) | [Vector Databases](/docs/databases/vector/overview) |
| ANN vs. Exact Search Trade-Off | Index tuning knob (`efSearch` / probe count) | Recall@10 vs. query latency curve comparing flat exact scan with HNSW graph search | Higher graph search beam recovers near-exact recall while keeping sub-millisecond latency | `EXISTS` (`src/viz/diagrams/AnnVsExactTradeoffDiagram.tsx`) | [Vector Databases](/docs/databases/vector/overview) |
| B-Tree Index vs. Full Scan Cost | Log table row count ($10^1$ to $10^6$ rows) | Operations checked: linear $O(n)$ full scan vs. logarithmic $O(\log_2 n)$ index lookup | Indexes shine at large scale (`50,000x` fewer checks at $10^6$ rows) yet barely help tiny tables | `EXISTS` (`src/viz/diagrams/IndexScanComparisonDiagram.tsx`) | [Relational Databases](/docs/databases/relational/overview) |

### Frameworks (`src/content/docs/frameworks`)

| Tool | What the learner changes | What they see | Idea it teaches | Status | Learn page |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Agent Control-Flow Graph Builder | Graph transition step and conditional branch outcome | Stateful node/edge graph traversal showing cyclic retry edges vs. fixed DAG steps | Explicit cyclic state machines keep retry loops debuggable compared with hidden prompt recursion | `EXISTS` (`src/viz/diagrams/AgentControlFlowGraphDiagram.tsx`) | [LLM / Agent Frameworks](/docs/frameworks/llm-agent-frameworks) |
| Continuous vs. Static Batching Sim | Iteration batch capacity (`2` to `8` slots) | Request completion time dot strips comparing padded static batches vs. iteration-level refill | Refilling completed generation slots immediately cuts average waiting time roughly in half | `EXISTS` (`src/viz/diagrams/ContinuousBatchingSimulationDiagram.tsx`) | [Serving & MLOps / LLMOps](/docs/frameworks/serving-mlops) |

---

## 4. Evaluation, Security, Interpretability & Science

### AI Evaluation (`src/content/docs/ai-evaluation`)

| Tool | What the learner changes | What they see | Idea it teaches | Status | Learn page |
| :--- | :--- | :--- | :--- | :--- | :--- |
| LLM-as-Judge Position Bias Lab | Candidate presentation order (`A first` vs. `Swapped`) and true tie/edge cases | Judge win-rate histogram revealing first-slot or verbosity favoritism | Swapping `(A, B)` pairs exposes positional artifacts that corrupt naive pairwise evals | `EXISTS` (`src/viz/diagrams/JudgePositionBiasDiagram.tsx`) | [LLM, RAG & Agent Evaluation](/docs/ai-evaluation/llm-rag-agent-evaluation) |
| Cohen's Kappa Inter-Rater Calculator | Contingency counts (`both GOOD`, `1 only`, `2 only`, `both BAD`) | Observed raw agreement percentage vs. chance-corrected Cohen's $\kappa$ | High raw agreement masks near-random annotation whenever class balance skews one label | `EXISTS` (`src/viz/diagrams/CohensKappaDiagram.tsx`) | [Human & Adversarial Evaluation](/docs/ai-evaluation/human-and-adversarial-evaluation) |
| Eval Statistical Power Calculator | True win-rate effect size (`1` to `20` pts) and sample size ($n \in [5, 500]$) | Power curve against the `80%` threshold and exact detection probability at chosen $n$ | Small eval suites (`n = 20`) miss real `5`-point improvements most of the time | `EXISTS` (`src/viz/diagrams/StatisticalPowerDiagram.tsx`) | [Human & Adversarial Evaluation](/docs/ai-evaluation/human-and-adversarial-evaluation) |

### Agent Observability (`src/content/docs/agent-observability`)

| Tool | What the learner changes | What they see | Idea it teaches | Status | Learn page |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Agent Span & Trace Waterfall | Active span selection (`LLM`, `Tool`, `Retry`) | Nested OpenTelemetry waterfall showing sequential bottlenecks, errors, and token attribution | Trace trees pinpoint whether latency sits in upstream tool calls, retries, or long decodes | `EXISTS` (`src/viz/diagrams/AgentTraceWaterfallVisualizer.tsx`) | [Agent Observability Architecture](/docs/agent-observability/overview) |
| Anomaly & Loop Alarm Threshold Lab | Max repeat tool calls, cost-spike z-score, and trace window | Simulated precision/recall on synthetic looping vs. normal production runs | Tight loop bounds stop runaway bills early without killing valid multi-file refactors | `NEW` | [Agent Failure Taxonomy & Anomaly Detection](/docs/agent-observability/failure-taxonomy-and-anomaly-detection) |

### AI Security (`src/content/docs/ai-security`)

| Tool | What the learner changes | What they see | Idea it teaches | Status | Learn page |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Adversarial Perturbation Explorer | Perturbation budget $\epsilon$ | Clean vs. perturbed input visualization and shifting classifier confidence bars | Tiny $\ell_\infty$ perturbations invisible to humans flip fragile linear-feature margins | `EXISTS` (`src/viz/diagrams/AdversarialPerturbationDiagram.tsx`) | [Model & Data Attacks](/docs/ai-security/model-and-data-attacks) |
| Membership Inference Audit Lab | Differential-privacy noise level $\sigma$ and attacker confidence threshold | Overlapping member vs. non-member confidence histograms plus live TPR and FPR | Overconfident predictions leak training membership unless training noise closes the gap | `EXISTS` (`src/viz/diagrams/MembershipInferenceDiagram.tsx`) | [Model & Data Attacks](/docs/ai-security/model-and-data-attacks) |
| Instruction vs. Data Boundary Inspector | Compare (`SQL parameterized` vs. `LLM prompt`) | Separated driver channels vs. concatenated single token stream with injected instructions | Prompt injection stays probabilistic because instructions and untrusted data share one sequence | `EXISTS` (`src/viz/diagrams/InstructionDataBoundaryDiagram.tsx`) | [OWASP LLM Top 10 & Prompt Attacks](/docs/ai-security/owasp-llm-top-10-and-prompt-attacks) |

### AI Safety & Alignment (`src/content/docs/ai-safety`)

| Tool | What the learner changes | What they see | Idea it teaches | Status | Learn page |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Reward Hacking & Goodhart's Law Lab | Optimization pressure / KL penalty $\beta$ | Rising proxy reward score diverging cleanly from true human objective once over-optimized | Pushing too hard against an imperfect reward model exploits reward blind spots | `EXISTS` (`src/viz/diagrams/RewardHackingSimulationDiagram.tsx`) | [Alignment & RLHF](/docs/ai-safety/alignment-and-rlhf) |
| Specification Gaming Horizon Lab | Training horizon (`5` to `100` steps) | Cumulative reward curves comparing normal race completion vs. looping a nearby bonus | Dense proxy bonuses beat true sparse completions both in total score and reinforcement speed | `EXISTS` (`src/viz/diagrams/SpecificationGamingDiagram.tsx`) | [Alignment & RLHF](/docs/ai-safety/alignment-and-rlhf) |
| Staged Rollout Detection Odds | Rare issue per-user rate $p$ (`0.00005` to `0.01`) | Bar odds $1 - (1 - p)^n$ across Internal (`50`), Limited (`2,000`), and GA (`2M`) | Staged rollouts cap blast radius per stage rather than guaranteeing rare bug capture before GA | `EXISTS` (`src/viz/diagrams/StagedDeploymentDiagram.tsx`) | [Scalable Oversight & Frontier Safety](/docs/ai-safety/scalable-oversight-and-frontier-safety) |

### Interpretability (`src/content/docs/interpretability`)

| Tool | What the learner changes | What they see | Idea it teaches | Status | Learn page |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Shapley Value Coalition Allocator | Marginal prediction toggles across feature subsets | All subset coalitions and exact Shapley fair-value contribution per feature | Averaging marginal gains over every ordering preserves efficiency and symmetry | `EXISTS` (`src/viz/diagrams/ShapleyCoalitionDiagram.tsx`) | [Classical Interpretability: SHAP & LIME](/docs/interpretability/classical-interpretability) |
| LIME Local Linear Surrogate | Instance coordinates `(x, y)` and kernel width $\sigma$ | Nonlinear circular decision boundary against weighted local linear tangent fit | LIME captures local boundary slope around one point while tighter $\sigma$ zooms closer | `EXISTS` (`src/viz/diagrams/LimeLocalApproxDiagram.tsx`) | [Classical Interpretability: SHAP & LIME](/docs/interpretability/classical-interpretability) |
| Polysemantic Superposition Matrix | Number of true features $N \in [3, 10]$ inside 2 neurons vs. $N$ SAE dims | Pairwise Gram similarity matrices and mean off-diagonal interference | Packing more features than dimensions forces non-orthogonal interference that sparse expansion unmixes | `EXISTS` (`src/viz/diagrams/SuperpositionDiagram.tsx`) | [Deep Learning & LLM Interpretability](/docs/interpretability/deep-learning-and-llm-interpretability) |

### AI for Science (`src/content/docs/ai-for-science`)

| Tool | What the learner changes | What they see | Idea it teaches | Status | Learn page |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Physics-Informed Neural Net (PINN) Lab | Objective (`Data + physics loss` vs. `Data only`) and fit params `(a, b)` | Curve against $y = e^{-x}$, single labeled point, and 6 unlabeled ODE collocation points | Governing physics residuals pin solutions across sparse data deserts | `EXISTS` (`src/viz/diagrams/PinnLossDiagram.tsx`) | [AI for Science Fundamentals](/docs/ai-for-science/ai-for-science-fundamentals) |
| Heat Equation Neural Operator Lab | Initial condition (`Single bump`, `Double bump`, `Square pulse`) and diffusion time $t$ | Analytical Gaussian-kernel evolution showing one learned operator mapping any input shape | Learning function-to-function operators transfers immediately to new initial conditions without retraining | `EXISTS` (`src/viz/diagrams/NeuralOperatorDiagram.tsx`) | [AI for Science Fundamentals](/docs/ai-for-science/ai-for-science-fundamentals) |
| Scientific Screening Funnel Lab | ML property prediction threshold (`0.05` to `0.95`) on 200,000 candidates | Funnel reduction bars from 200k library through ML screen to physical synthesis | Cheap surrogate screening narrows intractable combinatorial libraries for expensive wet-lab tests | `EXISTS` (`src/viz/diagrams/ScreeningFunnelDiagram.tsx`) | [AI for Science Fundamentals](/docs/ai-for-science/ai-for-science-fundamentals) |

### Domain AI Applications (`src/content/docs/domain-applications`)

| Tool | What the learner changes | What they see | Idea it teaches | Status | Learn page |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Asymmetric Cost Threshold Lab | Cost ratio `cost(missed case) / cost(false alarm)` (`1` to `30`) | Expected-cost curve over `[0, 1]` comparing default `0.5` cutoff with cost-optimal cutoff | Classification thresholds should minimize domain harm rather than default to `0.5` | `EXISTS` (`src/viz/diagrams/CostWeightedThresholdDiagram.tsx`) | [Healthcare AI](/docs/domain-applications/healthcare-ai) |
| Sim-to-Real Domain Randomization Lab | True real-world friction parameter (`0.65` to `1.55`) | Real-world control error comparing fixed sim-only controller vs. domain-randomized controller | Wide training distributions protect policies unless reality lands completely outside randomized bounds | `EXISTS` (`src/viz/diagrams/SimToRealGapDiagram.tsx`) | [Other Domain Applications](/docs/domain-applications/other-domain-applications) |

---

## 5. Practice, Atlas, Reference & Builders

### Visual Lab (`src/content/docs/visual-lab`)

| Tool | What the learner changes | What they see | Idea it teaches | Status | Learn page |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Two Pointers & Sliding Window Explorer | Pattern mode (`Opposite`, `Same-direction`, `Fixed window`), input array, target | Pointer cursors (`L`, `R`), live sum/window metric, and comparison counter against brute force | Maintaining a monotonic window invariant cuts nested $O(n^2)$ scans down to linear $O(n)$ | `EXISTS` (`src/viz/TwoPointersSlidingWindowExplorer.tsx`) | [Two Pointers & Sliding Window](/docs/visual-lab/two-pointers-sliding-window) |
| Graph & Tree Traversal Explorer | Traversal algorithm (`BFS`, `DFS`, `Dijkstra`), graph preset, start node, speed | Animated visited order, open frontier queue/stack, and shortest-path distance table | Swapping a FIFO queue for a LIFO stack or min-heap dictates discovery order and optimality | `EXISTS` (`src/viz/GraphTreeTraversalExplorer.tsx`) | [Graph & Tree Traversal](/docs/visual-lab/graph-tree-traversal) |
| Interactive ML Algorithm Selector | Data size, interpretability priority, noise level, and task type | Filtered, ranked algorithm recommendations with direct links to Learn chapters | Problem constraints dictate suitable model families better than chasing benchmark accuracy alone | `EXISTS` (`src/viz/AlgorithmSelector.tsx`) | [Algorithm Selector](/docs/visual-lab/algorithm-selector) |
| Ridge Regression Studio | L2 strength $\lambda$, feature correlation $(x_1, x_2)$, noise, new dataset seed | Regularization path lines, live $w_j$ readouts, and correlated sum $x_1 + x_2$ | L2 regularization tames collinear coefficient variance while shrinking redundant weights evenly | `EXISTS` (`src/viz/RidgeRegressionStudio.tsx`) | [Ridge Regression Studio](/docs/visual-lab/ridge-regression-studio) |

### Interview Prep (`src/content/docs/interview-prep`)

| Tool | What the learner changes | What they see | Idea it teaches | Status | Learn page |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Hash Map vs. Array Lookup Scale | Collection size (`100` to `200,000` entries) | Animated bar height for worst-case linear scan $O(n)$ next to constant $O(1)$ hash map ops | Hash tables stay flat across token vocabularies and caches where linear scans collapse | `EXISTS` (`src/viz/diagrams/HashMapVsArrayDiagram.tsx`) | [General Coding (DSA)](/docs/interview-prep/dsa-coding) |
| Serving & VRAM Sizing Estimator | Parameters, precision (`BF16`/`INT8`/`INT4`), context length, batch size, GPU SKU | Weight + KV cache VRAM split, minimum GPU count, and theoretical token throughput ceiling | Capacity math turns vague system-design answers into defensible hardware estimates | `NEW` | [LLM Serving and Fine-Tuning Questions](/docs/interview-prep/llm-serving-and-fine-tuning-questions) |

### Atlas (`src/content/docs/atlas`)

| Tool | What the learner changes | What they see | Idea it teaches | Status | Learn page |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Technique Trade-Off Radar & Comparator | Multi-select techniques from Inference, Training, or Agent Atlases | Parallel trade-off profile comparing memory, complexity, throughput, and reliability | Every optimization adds operational complexity or quality risk alongside its headline speedup | `NEW` | [Inference Technique Atlas](/docs/atlas/inference) |

### CLI Reference (`src/content/docs/cli-reference`)

| Tool | What the learner changes | What they see | Idea it teaches | Status | Learn page |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Shell Pipeline & Flag Sandbox | Command flags across `grep`, `jq`, `awk`, `docker`, and `kubectl` presets | Live step-by-step stdin/stdout transformation per pipe stage with exit-code trace | Understanding streams, filters, and exit codes turns fragile one-liners into composable scripts | `NEW` | [Linux & Shell Commands](/docs/cli-reference/linux-and-shell-commands) |

### Research Engineering (`src/content/docs/research-engineering`)

| Tool | What the learner changes | What they see | Idea it teaches | Status | Learn page |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Paper Reading & Ablation Table Auditor | Paper preset, baseline control checks, confidence-interval overlap toggle | Annotated method/baseline matrix flagging missing compute normalization or leaky evals | Strong ablation tables isolate each component's actual delta on equal compute budgets | `NEW` | [How to Read AI Papers](/docs/research-engineering/how-to-read-ai-papers) |

### Build From Scratch (`src/content/docs/build-from-scratch`)

| Tool | What the learner changes | What they see | Idea it teaches | Status | Learn page |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Scalar Autograd Expression Graph | Node inputs/operations (`+`, `*`, `tanh`, `pow`) and Loss Backward trigger | Interactive DAG showing forward `value` and topological reverse-mode `grad` propagation | Reverse-mode autodiff is literally applying the chain rule backwards over a recorded scalar graph | `NEW` | [The Build List](/docs/build-from-scratch/the-build-list) |

### Projects (`src/content/docs/projects`)

| Tool | What the learner changes | What they see | Idea it teaches | Status | Learn page |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Project Scope & Monthly Cost Estimator | Target daily queries, average RAG/agent turns, model tier, caching hit rate | Estimated monthly API spend, latency tier, and recommended milestone scope | Counting agent turns and context growth before coding prevents runaway toy-project costs | `NEW` | [The Project Ladder](/docs/projects/the-project-ladder) |

### Resources (`src/content/docs/resources`)

| Tool | What the learner changes | What they see | Idea it teaches | Status | Learn page |
| :--- | :--- | :--- | :--- | :--- | :--- |
| Open-Source Model & License Checker | Target use case (`Commercial`, `Modification`, `SaaS`, `Fine-tune weights`) | Filtered compatibility verdict across `Apache-2.0`, `MIT`, `Llama Community`, and `CC-BY-NC` | Checking attribution, MAU caps, and share-alike clauses early prevents legal rework before shipping | `NEW` | [Open Source AI Resources](/docs/resources/open-source-ai-resources) |

### Practice Problems (`src/content/docs/practice-problems`)

Interactive Python coding and ML implementation problems already run directly via Pyodide at [`/labs`](/labs) (and legacy `/practice/*` routes) rather than duplicating them inside `/playground`.
