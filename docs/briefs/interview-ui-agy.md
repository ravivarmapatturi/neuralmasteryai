# Brief: /interview UI improvements

Live page: https://neuralmasteryai.com/interview. Code: src/components/interview/SimpleInterviewPage.tsx, InterviewGraph.tsx, simpleInterview.css. Do not touch speech recognition (engines, workers, or how the transcript is produced); another agent owns that.

The owner wants a professional product, not AI-looking content. Keep the circular topic graph and the flow: topic, hear question, answer, hear and read model answer, next.

Problems to fix first:
- The question screen is a small plain card on an empty page, with a large gap below.
- The answer screen is a long stack: your answer, comparison, model answer, follow-ups, wrong answers. Make it easy to compare your answer with the model answer, side by side on desktop.
- Show clearly who is talking: interviewer speaking, listening to you, checking. Use a live waveform or similar, using src/components/interview/LiveWaveform.tsx if suitable.
- Progress through the topic, and the +10 points moment, should feel rewarding but quiet.
- Graph labels and the question list: readable, no overlaps, good at 375px, tablet and desktop.
- Check light and dark themes, keyboard focus, 44px touch targets, and no horizontal scroll at 375px.

Follow AGENTS.md and the ui-design and writing-voice skills. 8 GB laptop: do not run npm run build, pagefind or full Playwright; use npm run dev on port 5201, typecheck and targeted vitest. Check `free -g`; another agent is running too.

Commit in small steps on this branch. Do NOT push; I review and ship. Take real screenshots at 1440px and 375px of every screen, save to docs/evidence/interview-ui/, and report what you verified and what you did not.
