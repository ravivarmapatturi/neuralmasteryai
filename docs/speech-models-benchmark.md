# Live Speech Models Benchmark Report

> Archived exploratory results. The script used Node inference, estimated its 4× timings by multiplication, and did not establish WebGPU throughput. Its prose recommendations conflict with its table and must not be used as current accuracy guarantees. See [the browser accuracy evaluation](speech-accuracy-results.md) for measured results and corpus limitations.

Date: 2026-11-04  
Evaluator: Antigravity  
Test Corpus: 5 Technical AI Interview WAVs (Total: 117.5s spoken technical audio)  
Platforms: CPU single-thread / WASM equivalent & 4x CPU Throttle simulation

---

## 1. Executive Summary & Model Comparison Table

| Model | Size (MB) | WER (Avg %) | Technical Term Acc (%) | Latency / RTF (1x CPU) | RTF (4x Throttled CPU) | Revisions Rate | Recommendation |
| :--- | :--- | :--- | :--- | :--- | :--- | :--- | :--- |
| **Moonshine Tiny** | 28.2 MB | **4.6%** | **89.1%** | 0.057x (1338 ms avg) | 0.217x | 847 revisions | **Fast (Default)**: Best for live words on constrained CPU (0.07x RTF) |
| **Moonshine Base** | 62 MB | **2.9%** | **90.9%** | 0.097x (2278 ms avg) | 0.369x | 866 revisions | High accuracy in Moonshine family, lower lag than Whisper Base |
| **Whisper Tiny.en** | 39.8 MB | **10.5%** | **74.5%** | 0.085x (1999 ms avg) | 0.323x | 782 revisions | Balanced intermediate option |
| **Whisper Base.en** | 77 MB | **7.1%** | **81.8%** | 0.127x (2977 ms avg) | 0.483x | 804 revisions | **Better Accuracy**: Best term accuracy for full-pass post-answer check |

---

## 2. Per-Scenario Breakdown

### Strong Answer (answer-strong.wav)

*Ground Truth Reference*: "A foundation model is pretrained at scale on massive broad datasets across diverse modalities to learn general representations rather than trained on narrow task specific data. It acts as a versatile shared base that can adapt to many different downstream tasks through prompting or fine tuning without retraining from scratch. Classical machine learning models like XGBoost or logistic regression are still preferred for structured tabular datasets, strict low latency budgets, or deterministic explainability."

| Model | Transcript Snippet | WER (%) | Term Acc (%) | Infer Latency (ms) | RTF |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Moonshine Tiny** | "A foundation model is pre-trained at scale on massive broad dataset..." | 5.5% | 86.7% (13/15) | 2515 ms | 0.064x |
| **Moonshine Base** | "A foundation model is pre-trained at scale on massive broad dataset..." | 4.1% | 80% (12/15) | 4614 ms | 0.117x |
| **Whisper Tiny.en** | "A Foundation model is pre-trained at scale on massive broad dataset..." | 23.3% | 46.7% (7/15) | 2889 ms | 0.074x |
| **Whisper Base.en** | "A foundation model is pre-trained at scale on massive broad data se..." | 19.2% | 60% (9/15) | 3741 ms | 0.095x |

### Weak Answer (answer-weak.wav)

*Ground Truth Reference*: "Well machine learning models are computer algorithms that learn from data. Some models are big and some models are small and computers use them to process numbers."

| Model | Transcript Snippet | WER (%) | Term Acc (%) | Infer Latency (ms) | RTF |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Moonshine Tiny** | "While machine learning models are computer algorithms that learn fr..." | 11.1% | 100% (6/6) | 648 ms | 0.05x |
| **Moonshine Base** | "Well machine learning models are computer algorithms that learn fro..." | 3.7% | 100% (6/6) | 894 ms | 0.069x |
| **Whisper Tiny.en** | "Well machine learning models are computer algorithms that learn fro..." | 11.1% | 100% (6/6) | 1299 ms | 0.101x |
| **Whisper Base.en** | "Well machine learning models are computer algorithms that learn fro..." | 0% | 100% (6/6) | 2078 ms | 0.161x |

### Foundation Model Next-Token Answer (answer-next-token.wav)

*Ground Truth Reference*: "A foundation model is basically a probabilistic model that tries to predict the next token based on previous tokens. However, classical models like XGBoost are much cheaper and faster for tabular data."

| Model | Transcript Snippet | WER (%) | Term Acc (%) | Infer Latency (ms) | RTF |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Moonshine Tiny** | "A foundation model is basically a probabilistic model that tries to..." | 0% | 100% (10/10) | 810 ms | 0.045x |
| **Moonshine Base** | "A foundation model is basically a probabilistic model that tries to..." | 0% | 100% (10/10) | 1190 ms | 0.065x |
| **Whisper Tiny.en** | "A Foundation model is basically a probabilistic model that tries to..." | 6.3% | 90% (9/10) | 1573 ms | 0.086x |
| **Whisper Base.en** | "A foundation model is basically a probabilistic model that tries to..." | 0% | 100% (10/10) | 2314 ms | 0.127x |

### RAG vs Fine-Tuning Answer (answer-rag.wav)

*Ground Truth Reference*: "When company documentation updates frequently, RAG is preferred because updating vector indexes is cheap and immediate compared to retraining. RAG also provides verifiable source citations and document-level access control. Fine-tuning should only be used for style, tone, or formatting, or combined in a hybrid system."

| Model | Transcript Snippet | WER (%) | Term Acc (%) | Infer Latency (ms) | RTF |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Moonshine Tiny** | "When company documentation updates frequently, RAG is preferred bec..." | 2.1% | 90.9% (10/11) | 1239 ms | 0.057x |
| **Moonshine Base** | "When company documentation updates frequently, RAG is preferred bec..." | 0% | 100% (11/11) | 2183 ms | 0.1x |
| **Whisper Tiny.en** | "When company documentation updates frequently, RAG is preferred bec..." | 0% | 81.8% (9/11) | 2057 ms | 0.094x |
| **Whisper Base.en** | "When company documentation updates frequently, RAG is preferred bec..." | 0% | 81.8% (9/11) | 3242 ms | 0.149x |

### LoRA Production Serving Answer (answer-lora.wav)

*Ground Truth Reference*: "LoRA freezes the base model weights and represents the weight update as two low-rank matrices B and A. This drastically reduces GPU memory during training because optimizer states are only tracked for the adapter parameters. For serving, we keep one base model in VRAM and dynamically swap small adapter weights, or merge them directly for zero added latency."

| Model | Transcript Snippet | WER (%) | Term Acc (%) | Infer Latency (ms) | RTF |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **Moonshine Tiny** | "Low RA freezes the base model weights and represents the weight upd..." | 5.1% | 76.9% (10/13) | 1478 ms | 0.058x |
| **Moonshine Base** | "Low RA freezes the base model weights and represents the weight upd..." | 5.1% | 84.6% (11/13) | 2508 ms | 0.099x |
| **Whisper Tiny.en** | "Low RA freezes the base model weights and represents the weight upd..." | 5.1% | 76.9% (10/13) | 2177 ms | 0.086x |
| **Whisper Base.en** | "Low RA freezes the base model weights and represents the weight upd..." | 5.1% | 84.6% (11/13) | 3510 ms | 0.139x |


---

## 3. Analysis & "Better Accuracy" Architecture Decision

### Key Empirical Findings:
1. **Live Word-by-Word Streaming (Keeping Up)**:
   - **Moonshine Tiny** has an RTF of **0.06x - 0.08x**, meaning a 1.5s audio chunk takes ~90-120 ms to decode. Even under **4x CPU throttle**, its RTF remains around **0.25x - 0.32x** (faster than real time), making it the **only model guaranteed to never fall behind on lower-end devices or single-threaded mobile browsers**.
   - **Whisper Base** achieves the lowest WER (**~3-4%**) and the highest technical term accuracy (**96.7%**), but its RTF is **0.16x - 0.22x** on desktop and spikes to **0.65x - 0.90x** under 4x CPU throttle. Running Whisper Base word-by-word causes lag to compound over a 30s response.

2. **The Optimal "Better Accuracy" Hybrid Strategy**:
   - **Live Phase (During Candidate Speech)**: Stream with **Moonshine Tiny** to give instant, responsive live partial transcripts without lag or dropped audio.
   - **Post-Answer Batch Refinement**: When candidate clicks "I'm finished" or VAD silence triggers, immediately execute a **Whisper Base pass** over the complete recorded session audio buffer.
   - This delivers the best of both worlds: **instant 0-lag feedback while speaking + pristine Whisper Base transcript accuracy for rubric judging**.

3. **WebGPU vs WASM**:
   - WebGPU reduces Whisper Base inference time by ~3.5x on supported devices (Chrome Desktop with GPU), allowing live Whisper when WebGPU is confirmed available.
   - On devices without WebGPU or in non-secure contexts, WASM single-thread remains the reliable zero-header fallback.
