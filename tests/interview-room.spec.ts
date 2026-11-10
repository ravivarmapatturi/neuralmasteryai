import { test, expect } from '@playwright/test';
import http from 'node:http';
import practice from '../src/data/interviewPractice.json' with { type: 'json' };
import type { Page } from '@playwright/test';

const PORT = process.env.TEST_PORT ? Number(process.env.TEST_PORT) : process.env.CI ? 4173 : 5173;

// Replace only inference workers: this works with both Vite modules and hashed CI bundles.
// Playwright gives every test a fresh, non-persistent browser context (including model caches).
async function controlledRoom(page: Page, settings: {memory:number;gpu:boolean;failTurbo:boolean;deferTurbo?:boolean} = { memory: 4, gpu: false, failTurbo: false }) {
  const cdp = await page.context().newCDPSession(page);
  await cdp.send('Network.clearBrowserCache');
  await cdp.detach();
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.addInitScript((settings) => {
    const state = window as any;
    Object.defineProperty(navigator, 'deviceMemory', {value:settings.memory, configurable:true});
    Object.defineProperty(navigator, 'gpu', {value: settings.gpu ? {requestAdapter:async()=>({})} : undefined, configurable:true});
    state.speechLoads = [];
    state.micTracks = [];
    state.inferenceOps = [];
    const RealWorker = window.Worker;
    window.Worker = class extends EventTarget {
      voice = false;
      onmessage: ((event: MessageEvent) => void) | null = null;
      constructor(url: string | URL, options?: WorkerOptions) {
        super();
        this.voice = /kokoroWorker/.test(String(url));
        if (!/\/(mockInterviewWorker|moonshineSingleThreadWorker|kokoroWorker)[^/]*\.(?:ts|js)(?:\?|$)/.test(String(url))) {
          return new RealWorker(url, options) as any;
        }
      }
      postMessage({ id, op, payload, text, cancel }: any) {
        state.inferenceOps.push(op);
        const reply = (data: any) => queueMicrotask(() => {
          const event = new MessageEvent('message', { data: { id, ...data } });
          this.onmessage?.(event);
          this.dispatchEvent(event);
          if (op === 'nli') state.reviewReplyDelivered = true;
        });
        if (this.voice) {
          if (cancel) { state.voiceCancels = (state.voiceCancels || 0) + 1; return; }
          state.spokenFollowUps = [...(state.spokenFollowUps || []), text];
          state.releaseFollowUpVoice = () => {
            reply({type:'chunk',samples:new Float32Array(240),rate:24000});
            reply({type:'done'});
          };
          return;
        }
        if (op === 'loadJudge') {
          if (state.failJudge) { reply({ok:false,error:'Inference unavailable'}); return; }
          state.releaseReview = () => {
            state.reviewReleased = true;
            reply({ ok: true, result: true });
          };
        } else if (op === 'embed') {
          reply({ ok: true, result: payload.texts.map(() => [1]) });
        } else if (op === 'nli') {
          state.reviewCalls = (state.reviewCalls || 0) + 1;
          reply({ ok: true, result: payload.pairs.map(([,claim]:string[]) => ({ entails: state.rubricClaims ? (state.rubricClaims.indexOf(claim) >= 0 && state.rubricClaims.indexOf(claim) < state.rubricHitLimit ? 1 : 0) : 1, conflicts: 0 })) });
        } else if (op === 'init') {
          state.speechLoads.push(payload);
          const isTurbo = Boolean((payload?.preloadModelId || payload?.modelId)?.includes('large-v3-turbo'));
          if (settings.deferTurbo && isTurbo) {
            state.releaseTurbo = () => reply({ type: 'init_done', device: 'wasm', loadTimeMs: 1 });
            return;
          }
          if (settings.failTurbo && isTurbo) reply({ type: 'error', error: 'GPU allocation failed' });
          else reply({ type: 'init_done', device: 'wasm', loadTimeMs: 1 });
        } else if (['transcribe','commit','batch'].includes(op)) {
          const text = op === 'commit' && Array.isArray(state.commitTexts) ? (state.commitTexts.shift() || '') : (state.asrText || '');
          reply({type:op==='transcribe'?'result':`${op}_result`,text,sampleCount:payload?.audio?.byteLength/4,inferMs:1});
        } else if (op === 'reset') {
          reply({ type: 'reset_done' });
        } else {
          throw new Error(`Unexpected inference operation: ${op}`);
        }
      }
      terminate() { this.onmessage = null; state.terminatedSpeechWorkers=(state.terminatedSpeechWorkers||0)+1; }
    } as any;

    Object.defineProperty(navigator, 'mediaDevices', { value: {
      getUserMedia: async () => {
        if (state.failMic) throw new Error('Permission denied');
        const ctx = new AudioContext();
        const destination = ctx.createMediaStreamDestination();
        if (state.toneSpeech) {
          const tone = ctx.createOscillator(); const gain = ctx.createGain();
          tone.frequency.value = 220; gain.gain.value = 0.1;
          tone.connect(gain); gain.connect(destination); tone.start();
          state.setTone = (value:number) => { gain.gain.value = value; };
        }
        const stream = destination.stream;
        state.micTracks.push(...stream.getTracks());
        if (state.deferMic) await new Promise<void>(resolve => { state.releaseMic = resolve; });
        return stream;
      },
    } });
    window.Audio = class extends Audio {
      // Do not fetch clips: missing audio would start the separate TTS model worker.
      constructor() { super(); }
      get currentTime() { return 1; }
      play() { this.dispatchEvent(new Event("playing")); return Promise.resolve(); }
      pause() {}
    } as any;
  }, settings);
  const externalRequests: string[] = [];
  await page.context().route('**/*', route => {
    const url = new URL(route.request().url());
    if (url.hostname === 'localhost' || url.hostname === '127.0.0.1') return route.continue();
    if (/huggingface|hf\.co|\.onnx|\.wasm/.test(url.href)) externalRequests.push(url.href);
    return route.abort('blockedbyclient');
  });
  await page.goto(`http://localhost:${PORT}/interview`, { waitUntil: 'domcontentloaded' });
  await page.locator('.si-node').filter({ hasText: 'Evaluation' }).click();
  return externalRequests;
}

const navigationTopic = practice.topics.find(t => t.id === 'evaluation')!;
async function atQuestion(page: Page, index: number) {
  const question = navigationTopic.questions[index];
  await expect(page.locator('.si-counter')).toHaveText(`Question ${index + 1} of ${navigationTopic.questions.length}`);
  await expect(page).toHaveURL(new RegExp(`/interview/q/${encodeURIComponent(question.id.replaceAll(':', '__'))}(\\?(?!topic=)[^#]*)?$`));
  await expect(page.locator('.si-question-title')).toHaveText(question.title);
}
async function answerByTyping(page: Page) {
  await page.getByRole('button', { name: 'Skip to answering' }).click();
  await page.getByRole('button', { name: 'Type instead', exact: true }).click();
  await page.getByLabel('Your answer', { exact: true }).fill('A distinct old typed answer about evaluation.');
}

test.describe('Interview Room (/interview/room)', () => {
  test('verifies server runs without isolation headers (GitHub Pages compatibility)', async () => {
    const hasSpecialHeaders = await new Promise<boolean>((resolve) => {
      http.get(`http://localhost:${PORT}/interview/room`, (res) => {
        const coop = res.headers['cross-origin-opener-policy'];
        const coep = res.headers['cross-origin-embedder-policy'];
        resolve(Boolean(coop || coep));
      }).on('error', () => resolve(false));
    });
    expect(hasSpecialHeaders).toBe(false);
  });

  test('picks a topic, answers by typing, shows the model answer, moves to next', async ({ page }) => {
    const answersSent: string[] = [];
    page.on('request', (req) => {
      if ((req.postData() || '').includes('probabilistic')) answersSent.push(req.url());
    });
    // Nodes hold still under reduced motion, so the test can click them.
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await controlledRoom(page);

    await page.goto(`http://localhost:${PORT}/interview`, { waitUntil: 'domcontentloaded' });
    await expect(page.locator('h1')).toHaveText('Interview practice');
    await expect(page.locator('.si-node')).toHaveCount(practice.topics.length);
    await page.click('.si-node:has-text("Evaluation")');
    await expect(page.locator('.si-panel h2')).toHaveText('Evaluation');
    await page.click('#start-topic');
    await expect(page.locator('.si-counter')).toContainText('Question 1 of');

    await page.click('button:has-text("Skip to answering")');
    await page.getByRole('button', { name: 'Type instead', exact: true }).click();
    await page.waitForSelector('textarea.si-answer-box', { timeout: 10000 });
    await page.fill('textarea.si-answer-box', 'A probabilistic answer about evaluation.');
    await page.click('#done');

    await expect(page.locator('.si-yours')).toContainText('probabilistic');
    expect(((await page.locator('#model-answer').textContent()) ?? '').length).toBeGreaterThan(40);
    await page.click('#mark-complete');
    await expect(page.locator('.si-done')).toContainText('+10 points');
    await page.click('#next');
    await expect(page.locator('.si-counter')).toContainText('Question 2 of');
    expect(answersSent).toHaveLength(0);
  });

  for (const step of ['asking', 'answering', 'answer'] as const) {
    test(`previous and next update the question and URL during ${step}`, async ({ page }) => {
      await controlledRoom(page);
      await page.locator('#start-topic').click();
      await atQuestion(page, 0);
      await expect(page.locator('#previous-question')).toBeDisabled();
      const enterStep = async () => {
        if (step !== 'asking') await answerByTyping(page);
        if (step === 'answer') await page.locator('#done').click();
      };
      await enterStep();
      await page.locator('#next-question').click();
      await atQuestion(page, 1);
      await expect(page.locator('.si-speaker-asking')).toBeVisible();
      // Typing persists between questions.
      if (step !== 'asking') {
        await page.getByRole('button', { name: 'Skip to answering' }).click();
        await page.getByLabel('Your answer', { exact: true }).fill('The second answer is different.');
        if (step === 'answer') await page.locator('#done').click();
      }
      await page.locator('#previous-question').click();
      await atQuestion(page, 0);
      await expect(page.locator('#previous-question')).toBeDisabled();
      await expect(page.locator('#model-answer')).toHaveCount(0);
    });
  }

  test('practice again clears the answer and preserves the question address', async ({ page }) => {
    await controlledRoom(page);
    await page.locator('#start-topic').click();
    await answerByTyping(page);
    await page.locator('#done').click();
    await expect(page.locator('.si-yours')).toContainText('distinct old typed');
    await expect(page.locator('#model-answer')).toBeVisible();
    await page.locator('#practice-again').click();
    await atQuestion(page, 0);
    await expect(page.locator('#model-answer')).toHaveCount(0);
    await expect(page.locator('.si-yours')).toHaveCount(0);
    await page.getByRole('button', { name: 'Skip to answering' }).click();
    await expect(page.getByLabel('Your answer', { exact: true })).toHaveValue('');
  });

  test('leaving a live answer stops every mic track; a delayed old review cannot appear on the new answer', async ({ page }) => {
    const modelRequests = await controlledRoom(page);
    await page.locator('#start-topic').click();
    await page.getByRole('button', { name: 'Skip to answering' }).click();
    await expect(page.locator('.si-status')).toContainText('Listening.');
    expect(await page.evaluate(() => (window as any).micTracks.filter((t: MediaStreamTrack) => t.readyState === 'live').length)).toBe(1);
    await page.locator('#next-question').click();
    await atQuestion(page, 1);
    expect(await page.evaluate(() => (window as any).micTracks.every((t: MediaStreamTrack) => t.readyState === 'ended'))).toBe(true);
    await answerByTyping(page);
    await page.locator('#done').click();
    await expect(page.locator('.si-check-loading')).toBeVisible();
    await expect.poll(() => page.evaluate(() => typeof (window as any).releaseReview)).toBe('function');
    await page.locator('#next-question').click();
    await atQuestion(page, 2);
    await page.getByRole('button', { name: 'Skip to answering' }).click();
    await page.locator('#done').click();
    await expect(page.locator('.si-yours')).toHaveText('No answer was captured.');
    const newQuestionPoints = navigationTopic.questions[2].keyPoints;
    const expectNewReview = async () => {
      await expect(page.locator('.si-check-loading, .si-failed-status')).toHaveCount(0);
      if (newQuestionPoints?.length) {
        await expect(page.locator('.si-check .si-points li')).toHaveText(
          newQuestionPoints.map(point => `Not detected${point}`));
      } else {
        await expect(page.locator('.si-check')).toHaveCount(0);
      }
    };
    // Empty rubric answers have their own local "Not detected" checklist;
    // reference answers have none. Neither may be replaced by the old review.
    await expectNewReview();
    await page.evaluate(() => (window as any).releaseReview());
    // Rubric and reference scoring use different numbers of NLI batches. Wait
    // for the delayed result to cross the worker boundary, then check the UI.
    await expect.poll(() => page.evaluate(() => (window as any).reviewReplyDelivered)).toBe(true);
    // Let the real worker client's promises and React's commit finish before checking absence.
    await page.evaluate(() => new Promise<void>(resolve => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    }));
    await expectNewReview();
    await expect(page.locator('.si-yours')).toHaveText('No answer was captured.');
    await expect(page.locator('#model-answer')).toHaveText(navigationTopic.questions[2].answer);
    expect(modelRequests, 'No real model downloads').toEqual([]);
    expect(await page.evaluate(() => (window as any).inferenceOps)).toContain('loadJudge');
  });

  test('navigation follows the intersection of round and role filters', async ({ page }) => {
    await controlledRoom(page);
    const round = 'system-design';
    const role = 'ai-evaluation-reliability-engineer';
    const indices = navigationTopic.questions.flatMap((q, i) =>
      q.rounds?.includes(round) && q.roles?.includes(role) ? [i] : []);
    expect(indices.length).toBeGreaterThan(1);
    expect(indices.length).toBeLessThan(navigationTopic.questions.length);
    await page.getByLabel('Interview round').selectOption(round);
    await page.getByLabel('Role', { exact: true }).selectOption(role);
    await expect(page.locator('.si-list .si-list-item')).toHaveCount(indices.length);
    await page.locator('#start-topic').click();
    const atFiltered = async (position: number) => {
      const question = navigationTopic.questions[indices[position]];
      await expect(page.locator('.si-counter')).toHaveText(`Question ${position + 1} of ${indices.length}`);
      await expect(page.locator('.si-question-title')).toHaveText(question.title);
    };
    for (const [position] of indices.entries()) {
      await atFiltered(position);
      if (position === 0) await expect(page.locator('#previous-question')).toBeDisabled();
      if (position < indices.length - 1) await page.locator('#next-question').click();
    }
    await expect(page.locator('#next-question')).toBeDisabled();
    for (let position = indices.length - 2; position >= 0; position--) {
      await page.locator('#previous-question').click();
      await atFiltered(position);
    }
    await expect(page.locator('#previous-question')).toBeDisabled();
  });

  test('every question and model answer has its audio file', async ({ request }) => {
    const res = await request.get(`http://localhost:${PORT}/audio/interview-voice/genai-chunking-strategies_a.opus`);
    expect(res.status()).toBe(200);
  });

  test('old room address goes to the interview page', async ({ page }) => {
    await page.goto(`http://localhost:${PORT}/interview/room`, { waitUntil: 'domcontentloaded' });
    await expect(page).toHaveURL(/\/interview\/?$/);
  });

  test('verifies mobile 375px responsive layout has no horizontal overflow', async ({ page }) => {
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto(`http://localhost:${PORT}/interview`, { waitUntil: 'domcontentloaded' });

    const scrollWidth = await page.evaluate(() => document.documentElement.scrollWidth);
    expect(scrollWidth).toBe(375);
  });
});


test('Standard is the default, and High accuracy is opt-in, remembered, and reversible', async ({ page }) => {
  const requests = await controlledRoom(page, { memory:8, gpu:false, failTurbo:false });
  const control=page.getByLabel('Speech model', {exact:true});
  await expect(control).toHaveValue('default');
  await expect(control.locator('option')).toHaveText(['Standard', 'High accuracy · 794 MB + runtime']);
  expect(await page.evaluate(()=>(window as any).speechLoads)).toHaveLength(0);
  await control.selectOption('turbo');
  await expect(control).toBeEnabled();
  expect(await page.evaluate(()=>(window as any).speechLoads.at(-1).preloadModelId)).toContain('large-v3-turbo');
  await page.reload();
  await expect(control).toHaveValue('turbo');
  // Remembered opt-in does not start downloads merely by opening the page.
  expect(await page.evaluate(()=>(window as any).speechLoads)).toHaveLength(0);
  await control.selectOption('default');
  await expect(control).toBeEnabled();
  expect(await page.evaluate(()=>(window as any).speechLoads.at(-1).preloadModelId)).toBe('onnx-community/whisper-base.en');
  expect(requests).toHaveLength(0);
});

test('High accuracy load failure falls back to Standard', async ({page})=>{
  const requests=await controlledRoom(page,{memory:4,gpu:true,failTurbo:true});
  const control=page.getByLabel('Speech model',{exact:true});
  await control.selectOption('turbo');
  await expect(control).toHaveValue('default');
  await expect(page.getByRole('status').filter({hasText:'High accuracy unavailable. Using Standard.'})).toBeVisible();
  expect(await page.evaluate(()=>(window as any).speechLoads.at(-1).preloadModelId)).toBe('onnx-community/whisper-base.en');
  expect(requests).toHaveLength(0);
});

test('a 4 GB device without WebGPU has no high-end download control',async({page})=>{
  await controlledRoom(page);
  await expect(page.getByLabel('Speech model',{exact:true})).toHaveCount(0);
});

test('Use microphone resumes capture after typing instead',async({page})=>{
  await controlledRoom(page);
  await page.locator('#start-topic').click();
  await page.getByRole('button',{name:'Skip to answering'}).click();
  await page.getByRole('button',{name:'Type instead',exact:true}).click();
  const before=await page.evaluate(()=>(window as any).micTracks.length);
  await page.getByRole('button',{name:'Use microphone',exact:true}).click();
  await expect.poll(()=>page.evaluate(()=>(window as any).micTracks.length)).toBeGreaterThan(before);
  await expect(page.locator('.si-status')).toContainText('Listening.');
});

test('speech model control fits both themes at mobile and desktop widths',async({page},testInfo)=>{
  const errors:string[]=[];
  page.on('pageerror',error=>errors.push(error.message));
  await controlledRoom(page,{memory:8,gpu:false,failTurbo:false});
  for(const width of [375,1440])for(const theme of ['light','dark']){
    await page.setViewportSize({width,height:900});
    await page.evaluate(theme=>document.documentElement.setAttribute('data-theme',theme),theme);
    await page.evaluate(()=>window.scrollTo(0,0));
    await page.evaluate(()=>new Promise(requestAnimationFrame));
    await expect(page.getByLabel('Speech model',{exact:true})).toBeVisible();
    const startButton=await page.locator('#start-topic').boundingBox();
    expect(startButton!.x+startButton!.width).toBeLessThanOrEqual(width);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);
    await page.screenshot({path:testInfo.outputPath(`speech-${width}-${theme}.png`),fullPage:true});
  }
  expect(errors).toEqual([]);
});


test('switching back cancels a pending High accuracy load and ignores its late reply',async({page})=>{
  await controlledRoom(page,{memory:8,gpu:false,failTurbo:false,deferTurbo:true});
  const control=page.getByLabel('Speech model',{exact:true});
  await control.selectOption('turbo');
  await expect(page.getByRole('status').filter({hasText:'Loading'})).toBeVisible();
  await control.selectOption('default');
  await expect(control).toHaveValue('default');
  expect(await page.evaluate(()=>(window as any).terminatedSpeechWorkers)).toBeGreaterThan(0);
  await page.evaluate(()=>(window as any).releaseTurbo());
  await expect(control).toHaveValue('default');
});

test('rubric hits, history and improvement survive reload', async ({ page }) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await controlledRoom(page);
  await page.goto(`http://localhost:${PORT}/interview?q=senior:dropout`);
  const q = practice.topics.flatMap(t=>t.questions).find(q=>q.id==='senior:dropout') as {keyPoints:string[]};
  await page.evaluate(points=>{(window as any).rubricClaims=points;(window as any).rubricHitLimit=1;},q.keyPoints);
  await page.locator('#start-topic').click();
  await answerByTyping(page);
  await page.locator('#done').click();
  await page.waitForFunction(()=>typeof (window as any).releaseReview==='function');
  await page.evaluate(()=>(window as any).releaseReview());
  await expect(page.getByRole('heading',{name:'Automated key-point check'})).toBeVisible();
  await expect(page.locator('.si-check .si-points .covered')).toHaveCount(1);
  await expect(page.locator('.si-check .si-points .undetected')).toHaveCount(3);
  await expect(page.locator('.si-check .si-point-evidence')).toContainText('A distinct old typed answer');
  await expect(page.locator('.si-check .si-verdict')).toHaveText(['Covered','Not detected','Not detected','Not detected']);
  await expect(page.locator('.si-check')).not.toContainText(/Missed|Possible conflict|Partly covered/);
  await expect(page.locator('.si-score-pill')).toHaveCount(0);
  await page.evaluate(()=>{(window as any).rubricHitLimit=3;(window as any).releaseReview=undefined;});
  await page.locator('#practice-again').click();
  await page.getByRole('button',{name:'Skip to answering'}).click();
  await page.getByLabel('Your answer',{exact:true}).fill('A stronger answer with different wording about dropout.');
  await page.locator('#done').click();
  await page.waitForFunction(()=>typeof (window as any).releaseReview==='function');
  await page.evaluate(()=>(window as any).releaseReview());
  const comparison=page.getByRole('region',{name:'Change since your previous attempt'});
  await expect(comparison).toContainText('Newly detected points:');
  await expect(comparison).toContainText(q.keyPoints[1]);
  await expect(comparison).toContainText(q.keyPoints[2]);
  await expect(page.getByRole('region',{name:'Earlier attempts'}).locator('details')).toHaveCount(1);
  await page.getByRole('region',{name:'Earlier attempts'}).locator('summary').press('Enter');
  await expect(page.getByRole('region',{name:'Earlier attempts'})).toContainText('A distinct old typed answer');
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('nm-interview-attempts-v1:guest')!));
  expect(stored).toHaveLength(2);
  expect(stored.map((a:any)=>a.points.filter((p:any)=>p.verdict==='covered').length)).toEqual([1,3]);
  expect(stored[0].points[0].evidence).toContain('A distinct old typed answer');
  for (const width of [320,375,1440]) for (const theme of ['light','dark']) {
    await page.setViewportSize({width,height:900});
    await page.evaluate(theme=>document.documentElement.setAttribute('data-theme',theme),theme);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
    await page.screenshot({path:`test-results/rubric-${theme}-${width}.png`,fullPage:true});
  }
  await page.reload();
  await page.locator('#start-topic').click();
  await page.getByRole('button',{name:'Skip to answering'}).click();
  await page.getByRole('button',{name:'Type instead',exact:true}).click();
  await page.getByLabel('Your answer',{exact:true}).fill('A third answer that is stored while checking loads.');
  await page.locator('#done').click();
  await expect(page.getByRole('region',{name:'Earlier attempts'}).locator('details')).toHaveCount(2);
  expect(errors).toEqual([]);
});


test('keeps a failed review transcript in history and stores an empty rubric attempt', async ({page}) => {
  await controlledRoom(page);
  await page.goto(`http://localhost:${PORT}/interview?q=senior:dropout`);
  await page.evaluate(()=>(window as any).failJudge=true);
  await page.locator('#start-topic').click();
  await answerByTyping(page);
  await page.locator('#done').click();
  await expect(page.locator('.si-failed-status')).toBeVisible();
  await page.locator('#practice-again').click();
  await page.getByRole('button',{name:'Skip to answering'}).click();
  await page.locator('#done').click();
  await expect(page.getByRole('heading',{name:'Automated key-point check'})).toBeVisible();
  await expect(page.locator('.si-check .undetected')).toHaveCount(4);
  await expect(page.locator('.si-score-pill')).toHaveCount(0);
  const history=page.getByRole('region',{name:'Earlier attempts'});
  await expect(history).toContainText('Not checked');
  await history.locator('summary').click();
  await expect(history).toContainText('distinct old typed answer');
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('nm-interview-attempts-v1:guest')!));
  expect(stored.map((a:any)=>a.status)).toEqual(['failed','checked']);
  expect(stored[1].transcript).toBe('');
});

const followUpQuestion = practice.topics.flatMap(t => t.questions).find(q => q.id === 'repo:math-classical-ml:dense-layer-weight-shape')! as {id:string;followUps:string[]};
async function openFollowUp(page: Page, releaseReview = false) {
  const requests = await controlledRoom(page);
  await page.goto(`http://localhost:${PORT}/interview?q=${encodeURIComponent(followUpQuestion.id)}`);
  await page.locator('#start-topic').click();
  await answerByTyping(page);
  await page.locator('#done').click();
  if (releaseReview) {
    await page.waitForFunction(() => typeof (window as any).releaseReview === 'function');
    await page.evaluate(() => (window as any).releaseReview());
    await expect(page.locator('.si-check')).toBeVisible();
  }
  await page.getByRole('button', {name:'Answer a follow-up',exact:true}).click();
  await expect(page.getByRole('region',{name:'Spoken follow-up'})).toBeVisible();
  return requests;
}

test('optional typed follow-up is saved with its attempt despite a late main review, and survives reload', async ({page}) => {
  await openFollowUp(page);
  const follow = page.getByRole('region',{name:'Spoken follow-up'});
  const spoken = await page.evaluate(() => (window as any).spokenFollowUps[0]);
  expect(followUpQuestion.followUps!.some(text => text.includes(spoken))).toBe(true);
  expect(spoken).not.toContain('Expected:');
  await follow.getByRole('button',{name:'Type follow-up answer',exact:true}).click();
  await follow.getByLabel('Your follow-up answer').fill('The bias needs one value for each output.');
  await follow.getByRole('button',{name:'Save follow-up',exact:true}).click();
  await expect(follow).toContainText('Follow-up saved with this attempt.');
  await page.waitForFunction(() => typeof (window as any).releaseReview === 'function');
  await page.evaluate(() => (window as any).releaseReview());
  await expect(page.locator('.si-check')).toBeVisible();
  await expect(page.locator('.si-score-pill')).toHaveCount(0);
  const stored = await page.evaluate(() => JSON.parse(localStorage.getItem('nm-interview-attempts-v1:guest')!));
  expect(stored).toHaveLength(1);
  expect(stored[0].status).toBe('checked');
  expect(stored[0].followUp).toMatchObject({question:spoken,transcript:'The bias needs one value for each output.',status:'saved'});
  await page.locator('#practice-again').click();
  await page.getByRole('button',{name:'Skip to answering'}).click();
  await page.getByLabel('Your answer',{exact:true}).fill('My second main answer.');
  await page.locator('#done').click();
  const history = page.getByRole('region',{name:'Earlier attempts'});
  await history.locator('summary').click();
  await expect(history).toContainText('The bias needs one value for each output.');
  await page.reload();
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('nm-interview-attempts-v1:guest')!)[0].followUp.transcript)).toBe('The bias needs one value for each output.');
});

test('follow-up uses the real capture lifecycle with voice and ASR inference doubles', async ({page}) => {
  const requests = await openFollowUp(page, true);
  await page.evaluate(() => { (window as any).toneSpeech = true; (window as any).asrText = 'The bias has one entry per output unit.'; (window as any).releaseFollowUpVoice(); });
  const follow = page.getByRole('region',{name:'Spoken follow-up'});
  // Typing the main answer must not force the follow-up into typing mode.
  await expect(follow.getByRole('status')).toHaveText('Listening.');
  await expect.poll(() => page.evaluate(() => (window as any).micTracks.filter((t: MediaStreamTrack) => t.readyState === 'live').length)).toBe(1);
  // Let real AudioWorklet/ScriptProcessor blocks reach the engine before stopping.
  await expect.poll(() => page.evaluate(() => (window as any).inferenceOps.includes('transcribe')), {timeout:10000}).toBe(true);
  await follow.getByRole('button',{name:'Save follow-up'}).click();
  await expect(follow).toContainText('Follow-up saved with this attempt.');
  await expect(follow.locator('.si-follow-up-transcript')).toContainText('one entry per output unit');
  expect(await page.evaluate(() => (window as any).micTracks.every((t: MediaStreamTrack) => t.readyState === 'ended'))).toBe(true);
  expect(await page.evaluate(() => JSON.parse(localStorage.getItem('nm-interview-attempts-v1:guest')!)[0].followUp.transcript)).toContain('one entry per output unit');
  expect(requests, 'No real model downloads').toEqual([]);
});

for (const phase of ['asking','answering','finishing','saved'] as const) for (const action of ['next','previous','retry'] as const) {
  test(`${action} works during follow-up ${phase} and cleans up microphone and voice`, async ({page}) => {
    await openFollowUp(page);
    const follow = page.getByRole('region',{name:'Spoken follow-up'});
    if (phase !== 'asking') {
      await follow.getByRole('button',{name:'Answer now',exact:true}).click();
      await expect(follow.getByRole('status')).toHaveText('Listening.');
      if (phase === 'finishing' || phase === 'saved') {
        await follow.getByRole('button',{name:'Save follow-up'}).click();
        if (phase === 'saved') await expect(follow).toContainText('Follow-up saved with this attempt.');
        else await expect(follow).toContainText('Finishing your transcript…');
      }
    }
    const oldUrl = page.url();
    await page.locator(action === 'next' ? '#next-question' : action === 'previous' ? '#previous-question' : '#practice-again').click();
    if (action === 'retry') await expect(page).toHaveURL(oldUrl);
    else expect(page.url()).not.toBe(oldUrl);
    await expect(page.locator('.si-speaker-asking')).toBeVisible();
    expect(await page.evaluate(() => (window as any).micTracks.every((t: MediaStreamTrack) => t.readyState === 'ended'))).toBe(true);
    expect(await page.evaluate(() => (window as any).voiceCancels)).toBeGreaterThan(0);
    // A generated chunk arriving after cancellation cannot restart the mic.
    await page.evaluate(() => (window as any).releaseFollowUpVoice());
    await expect(follow).toHaveCount(0);
    await expect(page.locator('#model-answer')).toHaveCount(0);
  });
}

test('follow-up mic failure offers typing; navigating before permission resolves stops the late stream', async ({page}) => {
  await openFollowUp(page);
  await page.evaluate(() => (window as any).failMic = true);
  const follow = page.getByRole('region',{name:'Spoken follow-up'});
  await follow.getByRole('button',{name:'Answer now',exact:true}).click();
  await expect(follow.getByRole('status')).toContainText('The microphone is not available.');
  await follow.getByLabel('Your follow-up answer').fill('A typed answer after permission was denied.');
  await follow.getByRole('button',{name:'Save follow-up'}).click();
  await expect(follow).toContainText('Follow-up saved');
  await page.locator('#practice-again').click();
  await page.getByRole('button',{name:'Skip to answering'}).click();
  await page.getByLabel('Your answer',{exact:true}).fill('A second attempt.');
  await page.locator('#done').click();
  await page.getByRole('button',{name:'Answer a follow-up',exact:true}).click();
  await page.evaluate(() => { (window as any).failMic=false; (window as any).deferMic=true; });
  await follow.getByRole('button',{name:'Answer now',exact:true}).click();
  await page.waitForFunction(() => typeof (window as any).releaseMic === 'function');
  await page.locator('#next-question').click();
  await page.evaluate(() => (window as any).releaseMic());
  await expect.poll(() => page.evaluate(() => (window as any).micTracks.every((t:MediaStreamTrack) => t.readyState==='ended'))).toBe(true);
  await expect(follow).toHaveCount(0);
});

test('Not detected checklist visual checks in both themes at mobile and desktop widths', async ({page}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await controlledRoom(page);
  await page.goto(`http://localhost:${PORT}/interview?q=senior:dropout`);
  const question = practice.topics.flatMap(t => t.questions).find(q => q.id==='senior:dropout') as {keyPoints:string[]};
  await page.evaluate(points => { (window as any).rubricClaims=points; (window as any).rubricHitLimit=1; }, question.keyPoints);
  await page.locator('#start-topic').click();
  await answerByTyping(page);
  await page.locator('#done').click();
  await page.waitForFunction(() => typeof (window as any).releaseReview==='function');
  await page.evaluate(() => (window as any).releaseReview());
  await expect(page.locator('.si-check .si-verdict')).toHaveText(['Covered','Not detected','Not detected','Not detected']);
  await expect(page.locator('.si-check')).not.toContainText(/Missed|Possible conflict|Partly covered/);
  for(const width of [375,1440]) for(const theme of ['light','dark']) {
    await page.setViewportSize({width,height:1000});
    await page.evaluate(theme => document.documentElement.setAttribute('data-theme',theme), theme);
    await page.evaluate(() => document.fonts.ready);
    await expect(page.locator('.si-check')).toBeVisible();
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    await page.locator('.si-check').evaluate(element => element.scrollIntoView({block:'center'}));
    await page.screenshot({path:testInfo.outputPath(`checklist-${width}-${theme}.png`)});
  }
  expect(errors).toEqual([]);
});

test('spoken follow-up visual checks in both themes at mobile and desktop widths', async ({page}, testInfo) => {
  const errors: string[] = [];
  page.on('pageerror', error => errors.push(error.message));
  await openFollowUp(page);
  const follow = page.getByRole('region',{name:'Spoken follow-up'});
  await follow.getByRole('button',{name:'Type follow-up answer',exact:true}).click();
  await follow.getByLabel('Your follow-up answer').fill('The bias has one value for each output unit.');
  for(const width of [375,1440]) for(const theme of ['light','dark']) {
    await page.setViewportSize({width,height:1000});
    await page.evaluate(theme => document.documentElement.setAttribute('data-theme',theme), theme);
    await page.evaluate(() => document.fonts.ready);
    expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(width);
    for(const selector of ['#previous-question','#next-question','#practice-again']) await expect(page.locator(selector)).toBeVisible();
    await follow.evaluate(element => element.scrollIntoView({block:'center'}));
    await page.screenshot({path:testInfo.outputPath(`follow-up-${width}-${theme}.png`)});
  }
  await page.setViewportSize({width:375,height:1000});
  await follow.getByRole('button',{name:'Save follow-up',exact:true}).click();
  await expect(follow).toContainText('Follow-up saved with this attempt.');
  expect(errors).toEqual([]);
});

test('level filter filters questions by mid, senior, staff and Previous/Next respect it', async ({ page }) => {
  await controlledRoom(page);
  const levelFilter = page.getByLabel('Experience level', { exact: true });
  await expect(levelFilter).toBeVisible();
  await expect(levelFilter.locator('option')).toHaveText(['All levels', 'Mid-level', 'Senior', 'Staff']);

  // Filter by Senior
  await levelFilter.selectOption('senior');
  const countText = await page.locator('.si-count').textContent();
  expect(countText).toMatch(/\d+ questions/);

  // Start question
  await page.locator('#start-topic').click();
  await expect(page.locator('.si-level-pill')).toHaveText('Senior');

  // Verify next button respects senior filter
  const nextBtn = page.locator('#next-question');
  if (!(await nextBtn.isDisabled())) {
    await nextBtn.click();
    await expect(page.locator('.si-level-pill')).toHaveText('Senior');
  }
});

test('Debug this topic is available and contains 30 production debug questions', async ({ page }) => {
  await controlledRoom(page);
  await page.locator('.si-node').filter({ hasText: 'Debug' }).click();

  await expect(page.locator('.si-topic-widget h2')).toHaveText('Debug this');
  await expect(page.locator('.si-count')).toContainText('30 questions');
});

test('level filter screenshots and responsive fit at 375 and 1440', async ({ page }) => {
  await controlledRoom(page);
  const filterBox = page.locator('.si-filters');

  for (const width of [375, 1440]) {
    for (const theme of ['light', 'dark']) {
      await page.setViewportSize({ width, height: 900 });
      await page.evaluate((theme) => document.documentElement.setAttribute('data-theme', theme), theme);
      await page.evaluate(() => window.scrollTo(0, 0));
      await page.evaluate(() => new Promise(requestAnimationFrame));

      await expect(filterBox).toBeVisible();
      expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBeLessThanOrEqual(width);

      await page.screenshot({
        path: `docs/evidence/interview/filter-${width}-${theme}.png`,
        fullPage: false,
      });
    }
  }
});

test('Today’s 10 freezes a mixed queue across reloads and allows one daily skip', async ({page})=>{
  await controlledRoom(page);
  const due=practice.topics[0].questions.slice(0,6).map(q=>q.id);
  await page.evaluate(ids=>{
    const time=Date.now()-2*86_400_000;
    localStorage.setItem('nm-interview-learning-v1:guest',JSON.stringify(ids.map(questionId=>({questionId,completion:{time,attemptId:questionId},rating:{time,attemptId:questionId,value:'got-it',stage:0}}))));
  },due);
  await page.reload();
  const today=page.getByRole('region',{name:"Today's 10",exact:true});
  await expect(today.getByRole('status').first()).toHaveText('0 of 10 completed today · 5 due reviews · 5 new');
  await expect(today.locator('.si-review-queue summary')).toHaveText('All due reviews (6)');
  const assigned=()=>page.evaluate(()=>JSON.parse(localStorage.getItem('nm-interview-learning-v1:guest')!).filter((r:any)=>r.assignment).map((r:any)=>r.questionId).sort());
  const before=await assigned();
  await page.reload();expect(await assigned()).toEqual(before);
  await today.getByRole('button',{name:'Skip one question today'}).click();
  await expect(today.getByRole('button',{name:'Skip one question today'})).toBeDisabled();
  await expect(today.getByRole('status').first()).toContainText('of 10');
  await page.reload();
  await expect(today.getByRole('button',{name:'Skip one question today'})).toBeDisabled();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('nm-interview-learning-v1:guest')!));
  expect(saved.filter((r:any)=>r.skippedAt)).toHaveLength(1);
  expect(saved.filter((r:any)=>r.assignment)).toHaveLength(11);
  const active=saved.filter((r:any)=>r.assignment && !r.skippedAt).sort((a:any,b:any)=>a.assignment.time-b.assignment.time||a.questionId.localeCompare(b.questionId));
  await today.getByRole('button',{name:'Continue today’s 10'}).click();
  await expect(page.locator('.si-counter')).toHaveText('Question 1 of 10');
  await expect(page.locator('.si-question-title')).toHaveText(practice.topics.flatMap(t=>t.questions).find(q=>q.id===active[0].questionId)!.title);
  await page.locator('#next-question').click();
  await expect(page.locator('.si-counter')).toHaveText('Question 2 of 10');
  await expect(page.locator('.si-question-title')).toHaveText(practice.topics.flatMap(t=>t.questions).find(q=>q.id===active[1].questionId)!.title);
});

test('self-ratings survive a late automated check and reload; queue and answer fit both themes',async({page},testInfo)=>{
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  await controlledRoom(page);
  const today=page.getByRole('region',{name:"Today's 10",exact:true});
  for(const width of [375,1440])for(const theme of ['light','dark']){
    await page.setViewportSize({width,height:1000});
    await page.evaluate(theme=>document.documentElement.setAttribute('data-theme',theme),theme);
    await expect(today).toBeVisible();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
    await today.screenshot({path:testInfo.outputPath(`queue-${width}-${theme}.png`)});
  }
  await page.goto(`http://localhost:${PORT}/interview?q=senior:dropout`);
  await page.locator('#start-topic').click();await answerByTyping(page);await page.locator('#done').click();
  const rating=page.getByRole('group',{name:'How did your answer go?'});
  await expect(rating).toContainText('Choose a rating.');
  await expect(rating).not.toContainText('Automated detection');
  await rating.getByRole('button',{name:'Got it',exact:true}).click();
  await expect(rating.getByRole('button',{name:'Got it',exact:true})).toHaveAttribute('aria-pressed','true');
  await page.waitForFunction(()=>typeof (window as any).releaseReview==='function');
  await page.evaluate(()=>(window as any).releaseReview());
  for(const label of ['Partly','Missed it','Got it']){
    await rating.getByRole('button',{name:label,exact:true}).click();
    await expect(rating.getByRole('button',{name:label,exact:true})).toHaveAttribute('aria-pressed','true');
  }
  for(const width of [375,1440])for(const theme of ['light','dark']){
    await page.setViewportSize({width,height:1000});
    await page.evaluate(theme=>document.documentElement.setAttribute('data-theme',theme),theme);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
    await rating.screenshot({path:testInfo.outputPath(`rating-${width}-${theme}.png`)});
  }
  await page.reload();
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('nm-interview-learning-v1:guest')!).find((r:any)=>r.questionId==='senior:dropout'));
  expect(saved.rating.value).toBe('got-it');expect(saved.rating.stage).toBe(0);expect(saved.completion.attemptId).toBe(saved.rating.attemptId);
  expect(errors).toEqual([]);
});

test('role readiness uses self-ratings, links to gaps, and fits every role at 375 and 1440 in both themes',async({page},testInfo)=>{
  const errors:string[]=[];page.on('pageerror',error=>errors.push(error.message));
  const requests=await controlledRoom(page);
  const roles=['applied-ai-engineer','agentic-ai-engineer','inference-engineer','ai-evaluation-reliability-engineer'];
  const questions=practice.topics.flatMap(t=>t.questions) as {id:string;title:string;roles?:string[]|null}[];
  const ids=[...new Set(roles.flatMap(role=>questions.filter(q=>(q.roles ?? []).includes(role)).slice(0,2).map(q=>q.id)))];
  const records=ids.map((questionId,i)=>({questionId,completion:{time:Date.now()-86_400_000,attemptId:questionId},rating:{time:Date.now(),attemptId:questionId,value:i%2 ? 'missed':'got-it',stage:0}}));
  await page.evaluate(({records,last})=>{
    localStorage.setItem('nm-interview-learning-v1:guest',JSON.stringify(records));
    localStorage.setItem('nm-interview-last',last);
  },{records,last:'senior:dropout'});
  await page.reload();
  const readiness=page.getByRole('region',{name:'Role readiness',exact:true});
  for(const role of roles){
    await readiness.getByLabel('Readiness role',{exact:true}).selectOption(role);
    const pool=questions.filter(q=>(q.roles ?? []).includes(role));
    const completed=records.filter(r=>pool.some(q=>q.id===r.questionId)).length;
    const gotIt=records.filter(r=>r.rating.value==='got-it' && pool.some(q=>q.id===r.questionId)).length;
    await expect(readiness.locator('.si-role-completed')).toHaveText(`${completed} of ${pool.length} questions completed`);
    await expect(readiness.locator('.si-role-got-it')).toHaveText(`${gotIt} of ${pool.length} self-rated Got it`);
    await expect(readiness.getByRole('link')).toHaveCount(3);
    await expect(readiness).not.toContainText(/%|likelihood|passing|judge score/i);
    for(const width of [375,1440])for(const theme of ['light','dark']){
      await page.setViewportSize({width,height:1000});
      await page.evaluate(theme=>document.documentElement.setAttribute('data-theme',theme),theme);
      expect(await page.evaluate(()=>document.documentElement.scrollWidth)).toBe(width);
      await readiness.evaluate(element=>element.scrollIntoView({block:'center'}));
      await readiness.screenshot({path:testInfo.outputPath(`readiness-${role}-${width}-${theme}.png`)});
    }
  }
  const link=readiness.getByRole('link').first();
  const target=new URL((await link.getAttribute('href'))!,page.url());
  expect(target.searchParams.get('role')).toBe(roles.at(-1));
  const targetTopic=target.searchParams.get('topic')!;
  const outsideRole=practice.topics.find(t=>t.id===targetTopic)?.questions.find(q=>!((q as {roles?:string[]|null}).roles ?? []).includes(roles.at(-1)!));
  if(outsideRole)await page.evaluate(id=>localStorage.setItem('nm-interview-last',id),outsideRole.id);
  await link.click();
  await expect(page.getByLabel('Topic',{exact:true})).toHaveValue(targetTopic);
  await expect(page.getByLabel('Role',{exact:true})).toHaveValue(roles.at(-1)!);
  await expect(page.locator('.si-linked')).toHaveCount(0);
  await page.locator('#start-topic').click();
  const opened=await page.locator('.si-question-title').textContent();
  const question=questions.find(q=>q.title===opened);
  expect(question?.roles).toContain(roles.at(-1));
  expect(errors).toEqual([]);expect(requests).toEqual([]);
});


test('delivery numbers use captured timing, persist with the attempt, and fit both themes', async ({page}, testInfo) => {
  const errors:string[]=[]; page.on('pageerror', e=>errors.push(e.message));
  await controlledRoom(page);
  await page.evaluate(() => { const w=window as any; w.toneSpeech=true; w.asrText='um uh like you know basically actually um you know'; w.commitTexts=['um uh like you know','basically actually um you know']; });
  await page.locator('#start-topic').click();
  await page.getByRole('button',{name:'Skip to answering'}).click();
  await expect(page.getByText('Listening.',{exact:true})).toBeVisible();
  await page.waitForTimeout(800);
  await page.evaluate(()=>(window as any).setTone(0));
  await page.waitForTimeout(3500);
  await page.evaluate(()=>(window as any).setTone(0.1));
  await page.waitForTimeout(500);
  await page.locator('#done').click();
  const row=page.getByRole('group',{name:'Delivery measurements'});
  await expect(row).toContainText('3 filler matches');
  await expect(row).toContainText('1 pauses >3s');
  const saved=await page.evaluate(()=>JSON.parse(localStorage.getItem('nm-interview-attempts-v1:guest')||'[]'));
  expect(saved[0].delivery.durationSeconds).toBeGreaterThan(4);
  expect(saved[0].delivery.durationSeconds).toBeLessThan(15);
  expect(saved[0].delivery.speakingSeconds).toBeLessThan(saved[0].delivery.durationSeconds);
  expect(saved[0].delivery.wordCount).toBe(10);
  expect(saved[0].delivery.wordsPerMinute).toBe(Math.round(600/saved[0].delivery.durationSeconds));
  for(const theme of ['light','dark']) for(const width of [375,1440]) {
    await page.setViewportSize({width,height:900});
    await page.evaluate(theme=>{document.documentElement.dataset.theme=theme;},theme);
    await row.scrollIntoViewIfNeeded();
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:testInfo.outputPath(`delivery-${theme}-${width}.png`)});
  }
  await page.reload();
  await page.locator('#start-topic').click();
  await answerByTyping(page);
  await page.locator('#done').click();
  await expect(page.locator('.si-answer-stage > .si-delivery')).toHaveCount(0);
  await page.getByText('Earlier attempts',{exact:true}).scrollIntoViewIfNeeded();
  await page.locator('.si-attempt summary').first().click();
  await expect(page.locator('.si-attempt .si-delivery')).toContainText('3 filler matches');
  expect(errors).toEqual([]);
});

test('system design canvas supports drag and keyboard, saves sketches and compares reference diagrams in both themes', async ({page},testInfo) => {
  const errors:string[]=[]; page.on('pageerror',e=>errors.push(e.message));
  const requests=await controlledRoom(page);
  const id='repo:system-design:feature-store-design';
  await page.goto(`http://localhost:${PORT}/interview?q=${encodeURIComponent(id)}&round=system-design`);
  await page.locator('#start-topic').click();
  await answerByTyping(page);
  const canvas=page.getByRole('region',{name:'Your sketch',exact:true});
  await expect(canvas).toBeVisible();
  await expect(page.getByRole('region',{name:'Reference architecture'})).toHaveCount(0);
  await canvas.getByRole('button',{name:'client',exact:true}).click();
  await canvas.getByRole('button',{name:'API',exact:true}).click();
  const client=canvas.getByRole('button',{name:'client box',exact:true});
  await client.focus(); await page.keyboard.press('ArrowRight');
  expect(await client.evaluate(el=>parseFloat((el as HTMLElement).style.left))).toBe(2);
  const before=await client.boundingBox();
  await page.mouse.move(before!.x+10,before!.y+10); await page.mouse.down();
  await page.mouse.move(before!.x+50,before!.y+90,{steps:5}); await page.mouse.up();
  expect((await client.boundingBox())!.y).toBeGreaterThan(before!.y+60);
  await canvas.getByRole('button',{name:'Draw arrow'}).click();
  await client.focus(); await page.keyboard.press('Enter');
  await canvas.getByRole('button',{name:'API box',exact:true}).focus(); await page.keyboard.press('Enter');
  await expect(canvas.getByRole('list',{name:'Connections'})).toContainText('client → API');
  await canvas.getByRole('button',{name:'Clear',exact:true}).click();
  await expect(canvas.locator('.sd-node')).toHaveCount(0);
  await canvas.getByRole('button',{name:'Undo',exact:true}).click();
  await expect(canvas.locator('.sd-node')).toHaveCount(2);
  for(const width of [375,1440])for(const theme of ['light','dark']) {
    await page.setViewportSize({width,height:1000});
    if (await page.locator('html').getAttribute('data-theme') !== theme) await page.getByRole('button',{name:'Toggle color mode'}).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme',theme);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await expect(client).toHaveCSS('font-size','12px');
    await expect(client).toHaveCSS('padding','3px');
    await canvas.screenshot({path:testInfo.outputPath(`canvas-${width}-${theme}.png`)});
  }
  await page.locator('#done').click();
  const comparison=page.locator('.sd-comparison');
  await expect(comparison.getByRole('region',{name:'Reference architecture'})).toBeVisible();
  await expect(comparison.getByRole('region',{name:'Your sketch',exact:true}).locator('.sd-node')).toHaveCount(2);
  for(const width of [375,1440])for(const theme of ['light','dark']) {
    await page.setViewportSize({width,height:1000});
    if (await page.locator('html').getAttribute('data-theme') !== theme) await page.getByRole('button',{name:'Toggle color mode'}).click();
    await expect(page.locator('html')).toHaveAttribute('data-theme',theme);
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    const metrics=await comparison.evaluate(el=>({viewport:innerWidth,documentWidth:document.documentElement.scrollWidth,columns:getComputedStyle(el).gridTemplateColumns,labelOverflow:[...el.querySelectorAll('.sd-node')].filter(n=>n.scrollHeight>n.clientHeight || n.scrollWidth>n.clientWidth).length}));
    expect(metrics.labelOverflow).toBe(0);
    await testInfo.attach(`layout-${width}-${theme}`,{body:JSON.stringify(metrics),contentType:'application/json'});
    await comparison.screenshot({path:testInfo.outputPath(`reference-${width}-${theme}.png`)});
  }
  const stored=await page.evaluate(()=>JSON.parse(localStorage.getItem('nm-interview-attempts-v1:guest')||'[]'));
  expect(stored.at(-1).sketch.nodes).toHaveLength(2);
  expect(stored.at(-1).sketch.edges).toHaveLength(1);
  await page.reload();
  await page.locator('#start-topic').click(); await answerByTyping(page); await page.locator('#done').click();
  await page.locator('.si-attempt summary').first().click();
  await page.getByText('Saved sketch',{exact:true}).first().click();
  await expect(page.locator('.si-attempt .sd-node')).toHaveCount(2);
  expect(errors).toEqual([]); expect(requests).toEqual([]);
});
