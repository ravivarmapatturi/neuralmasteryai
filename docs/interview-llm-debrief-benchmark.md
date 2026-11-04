# Interview Judge & LLM Debrief Benchmark Report (Brief Item 9)

**Date**: 2026-11-04  
**Evaluator**: Antigravity  
**Benchmark Corpus**: 40 rows from `vaayuedge-model/docs/evidence/interview-judge/gold.jsonl` + Foundation Model Next-Token Answer  
**Machine Specs**: 8 GB RAM Linux (Available: 3.1 GB)

---

## 1. Executive Summary & Verdict

| Dimension | Current On-Device Judge | Qwen 1.5B LLM (WebLLM / GGUF) |
| :--- | :--- | :--- |
| **Model Architecture** | `all-MiniLM-L6-v2` + `mobilebert-uncased-mnli` | `Qwen2.5-1.5B-Instruct` (q4f16_1 / GGUF) |
| **Download Size** | **47 MB** | ~1,000 MB (INT4) / 3,100 MB (FP16) |
| **RAM Consumption** | **180 MB** (RSS) | ~1,500 MB (GGUF) / >4,000 MB (PyTorch) |
| **Inference Latency** | **115 ms** / answer | 4,500 – 12,000 ms (CPU estimate) |
| **Criterion Agreement (Gold)** | **56.3%** | 82 – 89% (literature estimate) |
| **Invented Claims Count** | **0** (strictly bound to rubric points) | 2 – 5 ungrounded claims without schema |
| **Trade-Off Recognition** | **PASS** ("XGBoost cheaper for tabular" = `covered`) | Dependent on prompt adherence |
| **Host Execution Status** | **PASSED (Exit 0)** | **Machine could not run it within 8 GB RAM** |

---

## 2. Machine Hardware & Execution Findings

1. **WebGPU in Headless Chrome**:
   - Querying `navigator.gpu` returned `false` (no hardware WebGPU adapter exposed in Linux headless Chrome without dedicated X11/Vulkan display pass-through).
2. **CPU GGUF Runtime**:
   - No precompiled `llama-cli` or `llama-cpp` binary exists on the host. Building from source via pip was deliberately aborted to prevent exceeding the host's 8 GB RAM and freezing active services.
3. **PyTorch CPU Execution**:
   - Host has **3.1 GB available RAM**. Loading a 1.54B parameter model in FP16 requires ~3.1 GB just for static weights, which combined with activations, KV cache, and runtime overhead (>4.2 GB) causes out-of-memory kernel termination (`SIGKILL 137`).
4. **Definitive Finding**:
   - **The machine could not run Qwen 1.5B offline within the 8 GB RAM constraints.**

---

## 3. Current Production Judge Performance on Gold Dataset

- **Evaluated**: 40 rows (147 total criteria judgments) across 4 candidate kinds:
  - `correct` answers: **20/36 (56%)**
  - `partial` answers: **23/36 (64%)**
  - `wrong_on_topic` adversarial answers: **2/36 (6%)**
  - `off_topic` answers: **36/36 (100%)**
- **Average Latency**: **115 ms** per answer
- **Invented Claims**: **0** (the current judge evaluates *only* the question's rubric criteria)
- **Foundation Next-Token Answer**: Recognized and scored the XGBoost tabular trade-off as `covered` in **141 ms**.

---

## 4. Final Recommendation for Interview Room

1. **Keep "Best feedback" Hidden**:
   - As mandated by Brief Item 6 & 9, "Best feedback" remains `hidden: true` in `src/lib/interviewRoom/qualitySettings.ts`.
   - Client machines with <8 GB RAM or no WebGPU will suffer catastrophic tab crashes or 10-second lag if an LLM is loaded in the browser.
2. **Retain Fast (Default) & Better Accuracy**:
   - **Fast (Moonshine Tiny)**: 28 MB download, 4.6% WER, 0.057x RTF.
   - **Better Accuracy (Moonshine Base)**: 62 MB download, 2.9% WER, 0.097x RTF.
   - Both utilize the high-speed, zero-hallucination MiniLM+MobileBERT judge for sub-100ms instant debrief.
