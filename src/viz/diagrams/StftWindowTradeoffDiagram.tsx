import { useMemo, useState } from 'react';
import { useVizTokens } from '../../theme/vizTokens';
import { VisualizationContainer, PillSelect, useAutoCycle } from '../primitives';
import { DIAGRAM_TYPE, valueColor } from './diagramSystem';

const SR = 64;
const DURATION = 2;
const N_TOTAL = SR * DURATION;
const HOP_FRACTION = 0.25; // hop = window * this
const WINDOW_OPTIONS = [8, 16, 32, 64] as const;

/** Two tones close in frequency, with tone 2 starting exactly halfway
 * through -- deliberately chosen so both the "can this window tell the two
 * tones apart in frequency" and "can it tell when tone 2 started in time"
 * questions have visible right/wrong answers depending on window size. */
function instFreq(n: number): number {
  return n / SR < 1 ? 10 : 13;
}

function generateSignal(): number[] {
  const x: number[] = [];
  let phase = 0;
  for (let n = 0; n < N_TOTAL; n++) {
    phase += (2 * Math.PI * instFreq(n)) / SR;
    x.push(Math.sin(phase));
  }
  return x;
}

function hann(n: number, N: number): number {
  return 0.5 * (1 - Math.cos((2 * Math.PI * n) / (N - 1)));
}

function computeSpectrogram(x: number[], window: number): { frames: number[][]; freqBins: number } {
  const hop = Math.max(1, Math.round(window * HOP_FRACTION));
  const freqBins = window / 2;
  const frames: number[][] = [];
  for (let start = 0; start + window <= x.length; start += hop) {
    const mags: number[] = [];
    for (let k = 0; k < freqBins; k++) {
      let re = 0;
      let im = 0;
      for (let n = 0; n < window; n++) {
        const s = x[start + n] * hann(n, window);
        const angle = (2 * Math.PI * k * n) / window;
        re += s * Math.cos(angle);
        im -= s * Math.sin(angle);
      }
      mags.push(Math.sqrt(re * re + im * im));
    }
    frames.push(mags);
  }
  return { frames, freqBins };
}

const WIDTH = 560;
const HEIGHT = 170;
const PAD_L = 40;
const PAD_R = 10;
const PAD_TOP = 14;

export default function StftWindowTradeoffDiagram() {
  const t = useVizTokens();
  const { value: autoIdx } = useAutoCycle(WINDOW_OPTIONS.length, 3000);
  const [userWindow, setUserWindow] = useState<number | null>(null);
  const window = userWindow ?? WINDOW_OPTIONS[autoIdx];

  const signal = useMemo(generateSignal, []);
  const { frames, freqBins } = useMemo(() => computeSpectrogram(signal, window), [signal, window]);
  const maxMag = Math.max(...frames.flat());

  const plotW = WIDTH - PAD_L - PAD_R;
  const cellW = plotW / frames.length;
  const cellH = HEIGHT / freqBins;

  const freqResolutionHz = SR / window;
  const timeResolutionS = window / SR;

  return (
    <VisualizationContainer
      footer={
        window <= 16 ? (
          <>Short window ({window} samples): you can see tone 2 start right at t = 1s (sharp time resolution), but the two nearby tones smear into one wide band — {freqResolutionHz.toFixed(1)} Hz per bin is too coarse to separate them (poor frequency resolution).</>
        ) : (
          <>Long window ({window} samples): the two tones now resolve as clean, separate bands ({freqResolutionHz.toFixed(1)} Hz per bin — much finer), but the {timeResolutionS.toFixed(2)}s window blurs exactly when tone 2 starts (poor time resolution). Neither setting wins outright — that's the time-frequency uncertainty tradeoff.</>
        )
      }
    >
      <PillSelect<number> label="STFT window size (samples)" value={window} onChange={setUserWindow} options={WINDOW_OPTIONS.map((w) => ({ value: w, label: `${w}` }))} />
      <svg width="100%" viewBox={`0 0 ${WIDTH} ${HEIGHT + PAD_TOP}`} style={{ display: 'block', marginTop: 8 }}>
        <text x={PAD_L + plotW / 2} y={10} textAnchor="middle" fontSize={9} fill={t.textMuted}>tone 2 actually starts here</text>
        {frames.map((mags, fi) =>
          mags.map((mag, bin) => {
            const x = PAD_L + fi * cellW;
            const y = PAD_TOP + HEIGHT - (bin + 1) * cellH;
            return <rect key={`${fi}-${bin}`} x={x} y={y} width={cellW + 0.5} height={cellH + 0.5} fill={valueColor(t, 'attention', mag / maxMag)} />;
          }),
        )}
        <line x1={PAD_L + plotW / 2} y1={PAD_TOP} x2={PAD_L + plotW / 2} y2={PAD_TOP + HEIGHT} stroke={t.textMuted} strokeWidth={1} strokeDasharray="3 3" opacity={0.6} />
      </svg>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: DIAGRAM_TYPE.secondaryLabel.size, color: t.textMuted, marginTop: 12, maxWidth: WIDTH }}>
        <span>frequency resolution: {freqResolutionHz.toFixed(1)} Hz/bin</span>
        <span>time resolution: {(timeResolutionS * 1000).toFixed(0)} ms/window</span>
      </div>
    </VisualizationContainer>
  );
}
