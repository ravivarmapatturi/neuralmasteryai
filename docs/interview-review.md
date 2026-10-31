# Interview review

The initial interview experience works without a backend: four engineering scenarios, microphone transcription where supported, example answers, follow-ups, and a self-review rubric.

An optional reviewer adapter uses [Jeva's official `Noul` API](https://github.com/LiQiiiii/Jeva) to assess each rubric point. It is implemented in `server/interview_judge.py`. It is not deployed or enabled by default. Model inference has not been validated in this checkout: it requires model weights and a compatible NVIDIA GPU/CUDA environment, which the static GitHub Pages deployment does not supply.

## Enable in a suitable environment

1. Follow the upstream Jeva installation and kernel checks; pin a reviewed upstream revision and model revision for a production release.
2. Run `python server/interview_judge.py` in that environment. It loads `LIQIIIII/Jeva-4B` and binds to loopback port 3010. `JEVA_MODEL`, `INTERVIEW_PORT`, and `INTERVIEW_ORIGIN` are configurable.
3. For production, place an HTTPS proxy in front of `/review`, with request timeouts, rate limits, and a bounded queue. The built-in Python HTTP server is a local integration adapter, not a public serving stack. CORS origin checking is not authentication.
4. Set `VITE_INTERVIEW_REVIEW_URL` to the HTTPS `/review` URL and rebuild the frontend. No API secrets belong in a Vite variable.
5. Evaluate against independently human-scored answers before enabling for learners. Include correct paraphrases, incomplete and confidently wrong answers, off-topic answers, prompt injection, transcription errors, and varying speaking styles. Measure per-criterion precision/recall, calibration, disagreement, and abstention behavior.

The UI labels model probabilities as uncalibrated estimates, never as a verified overall correctness score. It sends text only after the learner explicitly requests model feedback. Requests abort after 45 seconds or when the question/answer changes; failures preserve typed work and the self-review flow. The server does not persist or log transcripts. Browser speech recognition may send audio to the browser vendor.
