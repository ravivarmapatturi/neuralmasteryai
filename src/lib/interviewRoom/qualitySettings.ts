/** On-device speech profiles. Accuracy is corpus-specific; see docs/speech-accuracy-results.md. */
import { SingleThreadASREngine } from '../speechTest/engines';

export type QualityOption = 'fast' | 'better' | 'best';

export interface QualityProfile {
  id: QualityOption;
  label: string;
  downloadSizeMB: string;
  downloadBytes: number;
  werPct: number | null;
  modelName: string;
  hidden?: boolean;
}

export const QUALITY_PROFILES: Record<QualityOption, QualityProfile> = {
  fast: {
    id: 'fast',
    label: 'Lightweight',
    downloadSizeMB: '~32 MB + runtime',
    downloadBytes: 32079632,
    werPct: null,
    modelName: 'Moonshine Tiny',
  },
  better: {
    id: 'better',
    label: 'Standard',
    downloadSizeMB: '112 to 240 MB + runtime',
    downloadBytes: 111666188,
    werPct: null,
    modelName: 'Moonshine Tiny + Whisper Base.en final check',
  },
  best: {
    id: 'best',
    label: 'High accuracy',
    downloadSizeMB: '794 MB + runtime',
    downloadBytes: 793938658,
    werPct: null,
    modelName: 'Moonshine Tiny + Whisper Large v3 Turbo final check',
    hidden: true, // Offered by the capability-gated control on /interview, never the legacy ungated picker.
  },
};

export interface DeviceCapability {
  deviceMemoryGB: number | null;
  hasWebGPU: boolean;
  isSaveData: boolean;
  isLowMemory: boolean;
  recommended: QualityOption;
  reason: string;
}

export function detectDeviceCapability(
  explicitMemory?: number | null,
  explicitWebGPU?: boolean,
  explicitSaveData?: boolean
): DeviceCapability {
  let deviceMemoryGB: number | null = explicitMemory !== undefined ? explicitMemory : null;
  if (deviceMemoryGB === null && typeof navigator !== 'undefined' && 'deviceMemory' in navigator) {
    deviceMemoryGB = (navigator as any).deviceMemory ?? null;
  }

  let hasWebGPU = explicitWebGPU !== undefined ? explicitWebGPU : false;
  if (explicitWebGPU === undefined && typeof navigator !== 'undefined' && 'gpu' in navigator && (navigator as any).gpu) {
    hasWebGPU = true;
  }

  let isSaveData = explicitSaveData !== undefined ? explicitSaveData : false;
  if (
    explicitSaveData === undefined &&
    typeof navigator !== 'undefined' &&
    'connection' in navigator &&
    (navigator as any).connection?.saveData === true
  ) {
    isSaveData = true;
  }

  const isLowMemory = deviceMemoryGB !== null && deviceMemoryGB < 4;
  const isHighSpec = (deviceMemoryGB === null || deviceMemoryGB >= 8) && hasWebGPU;

  if (isSaveData) {
    return {
      deviceMemoryGB,
      hasWebGPU,
      isSaveData,
      isLowMemory,
      recommended: 'fast',
      reason: 'Data Saver enabled; Fast (32 MB) minimizes bandwidth.',
    };
  }

  if (isLowMemory) {
    return {
      deviceMemoryGB,
      hasWebGPU,
      isSaveData,
      isLowMemory: true,
      recommended: 'fast',
      reason: `Constrained RAM (${deviceMemoryGB} GB); Fast (32 MB) avoids memory pressure.`,
    };
  }

  if (isHighSpec) {
    return {
      deviceMemoryGB,
      hasWebGPU,
      isSaveData,
      isLowMemory: false,
      recommended: 'better',
      reason: `High-spec device (${deviceMemoryGB ?? '8+'} GB RAM, WebGPU); Standard recommended.`,
    };
  }

  return {
    deviceMemoryGB,
    hasWebGPU,
    isSaveData,
    isLowMemory: false,
    recommended: 'better',
    reason: 'Standard supports WASM on a 4 GB laptop.',
  };
}

export function shouldWarnBeforeDownload(
  selected: QualityOption,
  capability: DeviceCapability
): string | null {
  if (selected === 'better') {
    if (capability.isSaveData) {
      return 'Data Saver is on: downloading Standard requires 112 to 240 MB of model data.';
    }
    if (capability.isLowMemory) {
      return `Device memory is low (${capability.deviceMemoryGB} GB). The final speech check may cause memory pressure.`;
    }
  }
  return null;
}

export function createASREngineForQuality(quality: QualityOption): SingleThreadASREngine {
  const finalModel = quality === 'best' ? 'onnx-community/whisper-large-v3-turbo' : 'onnx-community/whisper-base.en';
  return new SingleThreadASREngine({
    id: quality === 'fast' ? 'moonshine-single' : 'moonshine-whisper',
    name: quality === 'best' ? 'High accuracy' : quality === 'better' ? 'Standard' : 'Moonshine Tiny',
    downloadBytes: 32079632,
    normalizeAudio: true,
    captureDrainMs: 300,
    ...(quality !== 'fast' ? {
      finalModelId: finalModel,
      finalDevice: 'webgpu' as const,
      // On WebGPU, Whisper Base runs with a full-precision encoder; WASM keeps 8-bit weights.
      finalDtype: quality === 'best' ? 'q4' : { webgpu: { encoder_model: 'fp32', decoder_model_merged: 'q4' }, wasm: 'q8' },
      finalDownloadBytes: quality === 'best' ? 761859026 : 79586556,
      fallbackModelId: quality === 'best' ? 'onnx-community/whisper-base.en' : undefined,
      preloadFinal: true,
    } : {}),
  });
}
