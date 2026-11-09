/** Eligibility follows the owner's rule; memory reports do not guarantee free VRAM. */
export async function canUseHighEndSpeech(nav: Navigator = navigator): Promise<boolean> {
  const memory = (nav as Navigator & { deviceMemory?: number }).deviceMemory;
  if (memory !== undefined && memory >= 8) return true;
  if (!nav.gpu) return false;
  try { return Boolean(await nav.gpu.requestAdapter()); } catch { return false; }
}
export const SPEECH_MODEL_CHOICE_KEY = 'nm-interview-speech-model-v1';
export type SpeechModelChoice = 'default' | 'turbo';
export function rememberedSpeechModel(): SpeechModelChoice {
  try { return localStorage.getItem(SPEECH_MODEL_CHOICE_KEY) === 'turbo' ? 'turbo' : 'default'; } catch { return 'default'; }
}
export function rememberSpeechModel(choice: SpeechModelChoice): void {
  try { localStorage.setItem(SPEECH_MODEL_CHOICE_KEY, choice); } catch { /* Private browsing: keep this session's choice. */ }
}
