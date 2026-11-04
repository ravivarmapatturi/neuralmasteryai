/**
 * Quality settings & hardware capability detection for Interview Room.
 *
 * Fast (default): Moonshine Tiny (~28 MB download, 4.6% WER, 0.057x RTF)
 * Better accuracy: Moonshine Base (~62 MB download, 2.9% WER, 0.097x RTF)
 * Best feedback: Qwen 1.5B LLM (hidden until Item 9 offline verification passes)
 */

import {
  MoonshineSingleThreadEngine,
  MoonshineBaseEngine,
  SingleThreadASREngine,
} from '../speechTest/engines';

export type QualityOption = 'fast' | 'better' | 'best';

export interface QualityProfile {
  id: QualityOption;
  label: string;
  downloadSizeMB: string;
  downloadBytes: number;
  werPct: number;
  modelName: string;
  hidden?: boolean;
}

export const QUALITY_PROFILES: Record<QualityOption, QualityProfile> = {
  fast: {
    id: 'fast',
    label: 'Fast (default)',
    downloadSizeMB: '~28 MB',
    downloadBytes: 28180947,
    werPct: 4.6,
    modelName: 'Moonshine Tiny',
  },
  better: {
    id: 'better',
    label: 'Better accuracy',
    downloadSizeMB: '~62 MB',
    downloadBytes: 62000000,
    werPct: 2.9,
    modelName: 'Moonshine Base',
  },
  best: {
    id: 'best',
    label: 'Best feedback',
    downloadSizeMB: 'TBD',
    downloadBytes: 0,
    werPct: 0,
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
      reason: 'Data Saver enabled; Fast (28 MB) minimizes bandwidth.',
    };
  }

  if (isLowMemory) {
    return {
      deviceMemoryGB,
      hasWebGPU,
      isSaveData,
      isLowMemory: true,
      recommended: 'fast',
      reason: `Constrained RAM (${deviceMemoryGB} GB); Fast (28 MB) avoids memory pressure.`,
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
    reason: 'Fast (28 MB) recommended for zero audio lag and immediate start.',
  };
}

export function shouldWarnBeforeDownload(
  selected: QualityOption,
  capability: DeviceCapability
): string | null {
  if (selected === 'better') {
    if (capability.isSaveData) {
      return 'Data Saver is on: downloading Better accuracy requires ~62 MB of data.';
    }
    if (capability.isLowMemory) {
      return `Device memory is low (${capability.deviceMemoryGB} GB). 62 MB download may cause memory pressure.`;
    }
  }
  return null;
}

export function createASREngineForQuality(quality: QualityOption): SingleThreadASREngine {
  if (quality === 'better') {
    return new MoonshineBaseEngine();
  }
  return new MoonshineSingleThreadEngine();
}
