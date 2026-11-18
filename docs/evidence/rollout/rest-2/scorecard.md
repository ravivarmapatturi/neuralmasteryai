# Rest batch 2 scorecard

Pages: AI Security overview, roadmap, Model & Data Attacks, OWASP LLM Top 10 & Prompt Attacks, AI Red Teaming; CS Fundamentals overview pages for Operating Systems & Concurrency, Networking & Distributed Systems, and APIs/HTTP/Protocols.

| Page | Existing numerical or concrete facts used | Static result |
| --- | --- | --- |
| AI Security overview/roadmap | Existing attack-surface categories and three linked chapters | Passed |
| Model & Data Attacks | Watermark z-scores at 25% edits: 7.2/10.3/7.0/8.3; 50%: 3.8/4.4/4.4/1.6 | Passed |
| OWASP Prompt Attacks | Existing injection → tool-abuse → exfiltration chain | Passed |
| AI Red Teaming | Existing OWASP/MITRE mapping and gateway trace sequence | Passed |
| Operating Systems & Concurrency | Four threads approximately one-thread time; four processes approximately one-quarter on 4+ cores | Passed |
| Networking and APIs | Existing request lifecycle, idempotency, protocol-contract concepts | Passed |

Every page has Why, page-specific PenFlow and Worksheet, Worked example, Try it yourself with `# Try it:`, Common mistakes, and When not to use it. Program output remains in named `output` fences.

Verification: notebook (16 changed pages/0 violations), math (1991 files), MDX (2019/0 failures), links (2147 routes/0 broken prose or anchors), typecheck, tracker, and `git diff --check` passed. Full Vitest, browser, and build remain deferred under low-memory constraints.
