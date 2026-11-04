/**
 * LiveWaveform — Real-time audio waveform visualizer for hands-free listening stage.
 *
 * Borrowed from activated-intelligence/voice-chat
 * Repository: https://github.com/activated-intelligence/voice-chat
 *
 * MIT License
 * Copyright (c) 2025 iRelate
 *
 * Permission is hereby granted, free of charge, to any person obtaining a copy
 * of this software and associated documentation files (the "Software"), to deal
 * in the Software without restriction, including without limitation the rights
 * to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
 * copies of the Software, and to permit persons to whom the Software is
 * furnished to do so, subject to the following conditions:
 *
 * The above copyright notice and this permission notice shall be included in all
 * copies or substantial portions of the Software.
 */

import React, { useEffect, useRef, type HTMLAttributes } from 'react';

export type LiveWaveformProps = HTMLAttributes<HTMLDivElement> & {
  active?: boolean;
  processing?: boolean;
  stream?: MediaStream | null;
  barWidth?: number;
  barHeight?: number;
  barGap?: number;
  barRadius?: number;
  barColor?: string;
  fadeEdges?: boolean;
  fadeWidth?: number;
  height?: string | number;
  sensitivity?: number;
  smoothingTimeConstant?: number;
  fftSize?: number;
  mode?: 'scrolling' | 'static';
};

export const LiveWaveform: React.FC<LiveWaveformProps> = ({
  active = false,
  processing = false,
  stream = null,
  barWidth = 3,
  barGap = 2,
  barRadius = 2,
  barColor,
  fadeEdges = true,
  fadeWidth = 24,
  barHeight: baseBarHeight = 4,
  height = 54,
  sensitivity = 1.2,
  smoothingTimeConstant = 0.8,
  fftSize = 256,
  mode = 'static',
  className,
  style,
  ...props
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const internalStreamRef = useRef<MediaStream | null>(null);
  const animationRef = useRef<number>(0);
  const staticBarsRef = useRef<number[]>([]);
  const historyRef = useRef<number[]>([]);
  const needsRedrawRef = useRef(true);
  const gradientCacheRef = useRef<CanvasGradient | null>(null);
  const lastWidthRef = useRef(0);

  const heightStyle = typeof height === 'number' ? `${height}px` : height;

  // Handle canvas sizing with device pixel ratio
  useEffect(() => {
    const canvas = canvasRef.current;
    const container = containerRef.current;
    if (!canvas || !container) return;

    const resizeObserver = new ResizeObserver(() => {
      const rect = container.getBoundingClientRect();
      const dpr = typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1;

      canvas.width = rect.width * dpr;
      canvas.height = rect.height * dpr;
      canvas.style.width = `${rect.width}px`;
      canvas.style.height = `${rect.height}px`;

      const ctx = canvas.getContext('2d');
      if (ctx) {
        ctx.scale(dpr, dpr);
      }

      gradientCacheRef.current = null;
      lastWidthRef.current = rect.width;
      needsRedrawRef.current = true;
    });

    resizeObserver.observe(container);
    return () => resizeObserver.disconnect();
  }, []);

  // Set up audio analyzer from stream or microphone
  useEffect(() => {
    if (!active) {
      if (internalStreamRef.current) {
        internalStreamRef.current.getTracks().forEach((t) => t.stop());
        internalStreamRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
        } catch {}
        audioContextRef.current = null;
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = 0;
      }
      return;
    }

    let isCancelled = false;

    const setupAudio = async () => {
      try {
        let activeStream = stream;
        if (!activeStream && typeof navigator !== 'undefined' && navigator.mediaDevices) {
          activeStream = await navigator.mediaDevices.getUserMedia({
            audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
          });
          if (isCancelled) {
            activeStream.getTracks().forEach((t) => t.stop());
            return;
          }
          internalStreamRef.current = activeStream;
        }

        if (!activeStream) return;

        const AudioCtx = window.AudioContext || (window as any).webkitAudioContext;
        const audioCtx = new AudioCtx();
        if (audioCtx.state === 'suspended') {
          await audioCtx.resume();
        }

        const analyser = audioCtx.createAnalyser();
        analyser.fftSize = fftSize;
        analyser.smoothingTimeConstant = smoothingTimeConstant;

        const source = audioCtx.createMediaStreamSource(activeStream);
        source.connect(analyser);

        audioContextRef.current = audioCtx;
        analyserRef.current = analyser;
        staticBarsRef.current = [];
        historyRef.current = [];
      } catch (err) {
        console.warn('[LiveWaveform] Audio setup warning:', err);
      }
    };

    setupAudio();

    return () => {
      isCancelled = true;
      if (internalStreamRef.current) {
        internalStreamRef.current.getTracks().forEach((t) => t.stop());
        internalStreamRef.current = null;
      }
      if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
        try {
          audioContextRef.current.close();
        } catch {}
        audioContextRef.current = null;
      }
      if (animationRef.current) {
        cancelAnimationFrame(animationRef.current);
        animationRef.current = 0;
      }
    };
  }, [active, stream, fftSize, smoothingTimeConstant]);

  // Main animation rendering loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let rafId: number;

    const render = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width === 0 || rect.height === 0) {
        rafId = requestAnimationFrame(render);
        return;
      }

      if (active && analyserRef.current) {
        const dataArray = new Uint8Array(analyserRef.current.frequencyBinCount);
        analyserRef.current.getByteFrequencyData(dataArray);

        if (mode === 'static') {
          const startFreq = Math.floor(dataArray.length * 0.05);
          const endFreq = Math.floor(dataArray.length * 0.45);
          const relevantData = dataArray.slice(startFreq, endFreq);

          const step = barWidth + barGap;
          const barCount = Math.floor(rect.width / step);
          const halfCount = Math.floor(barCount / 2);
          const newBars: number[] = [];

          for (let i = halfCount - 1; i >= 0; i--) {
            const dataIndex = Math.floor((i / halfCount) * relevantData.length);
            const value = Math.min(1, (relevantData[dataIndex] / 255) * sensitivity);
            newBars.push(Math.max(0.06, value));
          }

          for (let i = 0; i < halfCount; i++) {
            const dataIndex = Math.floor((i / halfCount) * relevantData.length);
            const value = Math.min(1, (relevantData[dataIndex] / 255) * sensitivity);
            newBars.push(Math.max(0.06, value));
          }

          staticBarsRef.current = newBars;
        }
        needsRedrawRef.current = true;
      }

      if (!needsRedrawRef.current && !active) {
        rafId = requestAnimationFrame(render);
        return;
      }

      needsRedrawRef.current = active;
      ctx.clearRect(0, 0, rect.width, rect.height);

      const computedBarColor =
        barColor ||
        (() => {
          try {
            const style = getComputedStyle(canvas);
            return style.getPropertyValue('--accent').trim() || style.color || '#2563eb';
          } catch {
            return '#2563eb';
          }
        })();

      const step = barWidth + barGap;
      const barCount = Math.floor(rect.width / step);
      const centerY = rect.height / 2;
      const dataToRender = staticBarsRef.current;

      for (let i = 0; i < barCount; i++) {
        const value = dataToRender[i] || 0.06;
        const x = i * step;
        const bHeight = Math.max(baseBarHeight, value * rect.height * 0.85);
        const y = centerY - bHeight / 2;

        ctx.fillStyle = computedBarColor;
        ctx.globalAlpha = 0.35 + value * 0.65;

        if (barRadius > 0 && typeof ctx.roundRect === 'function') {
          ctx.beginPath();
          ctx.roundRect(x, y, barWidth, bHeight, barRadius);
          ctx.fill();
        } else {
          ctx.fillRect(x, y, barWidth, bHeight);
        }
      }

      // Edge fading gradient
      if (fadeEdges && fadeWidth > 0 && rect.width > 0) {
        if (!gradientCacheRef.current || lastWidthRef.current !== rect.width) {
          const gradient = ctx.createLinearGradient(0, 0, rect.width, 0);
          const fadePercent = Math.min(0.25, fadeWidth / rect.width);
          gradient.addColorStop(0, 'rgba(255,255,255,1)');
          gradient.addColorStop(fadePercent, 'rgba(255,255,255,0)');
          gradient.addColorStop(1 - fadePercent, 'rgba(255,255,255,0)');
          gradient.addColorStop(1, 'rgba(255,255,255,1)');
          gradientCacheRef.current = gradient;
          lastWidthRef.current = rect.width;
        }

        ctx.globalCompositeOperation = 'destination-out';
        ctx.fillStyle = gradientCacheRef.current;
        ctx.fillRect(0, 0, rect.width, rect.height);
        ctx.globalCompositeOperation = 'source-over';
      }

      rafId = requestAnimationFrame(render);
    };

    rafId = requestAnimationFrame(render);
    animationRef.current = rafId;

    return () => {
      cancelAnimationFrame(rafId);
    };
  }, [active, barWidth, barGap, barRadius, barColor, baseBarHeight, fadeEdges, fadeWidth, mode, sensitivity]);

  return (
    <div
      ref={containerRef}
      className={className}
      style={{
        width: '100%',
        height: heightStyle,
        position: 'relative',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        overflow: 'hidden',
        borderRadius: '6px',
        ...style,
      }}
      aria-hidden="true"
      {...props}
    >
      <canvas ref={canvasRef} style={{ display: 'block', width: '100%', height: '100%' }} />
    </div>
  );
};
