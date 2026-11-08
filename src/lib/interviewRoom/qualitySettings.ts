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
    label: 'Fast (default)',
    downloadSizeMB: '~32 MB + runtime',
    downloadBytes: 32079632,
    werPct: null,
    modelName: 'Moonshine Tiny',
  },
  better: {
    id: 'better',
    label: 'Better accuracy',
    downloadSizeMB: '~112 MB total + runtime',
    downloadBytes: 111666188,
    werPct: null,
    modelName: 'Moonshine Tiny + Whisper Base.en final check',
  },
  best: {
    id: 'best',
    label: 'Best feedback',
    downloadSizeMB: 'TBD',
    downloadBytes: 0,
    werPct: null,
    modelName: 'Qwen 1.5B (LLM)',
    hidden: true, // Hidden until item 9 passes
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
      reason: `High-spec device (${deviceMemoryGB ?? '8+'} GB RAM, WebGPU); Better accuracy recommended.`,
    };
  }

  return {
    deviceMemoryGB,
    hasWebGPU,
    isSaveData,
    isLowMemory: false,
    recommended: 'fast',
    reason: 'Fast (32 MB) recommended for the smaller first download.',
  };
}

export function shouldWarnBeforeDownload(
  selected: QualityOption,
  capability: DeviceCapability
): string | null {
  if (selected === 'better') {
    if (capability.isSaveData) {
      return 'Data Saver is on: downloading Better accuracy requires ~112 MB of model data in total.';
    }
    if (capability.isLowMemory) {
      return `Device memory is low (${capability.deviceMemoryGB} GB). The final speech check may cause memory pressure.`;
    }
  }
  return null;
}

export function createASREngineForQuality(quality: QualityOption): SingleThreadASREngine {
  return new SingleThreadASREngine({
    id: quality === 'better' ? 'moonshine-whisper' : 'moonshine-single',
    name: quality === 'better' ? 'Moonshine live + Whisper final check' : 'Moonshine Tiny',
    downloadBytes: 32079632,
    normalizeAudio: true,
    captureDrainMs: 300,
    ...(quality === 'better' ? {
      finalModelId: 'onnx-community/whisper-base.en',
      finalDevice: 'webgpu' as const,
      finalDownloadBytes: 79586556,
    } : {}),
  });
}
