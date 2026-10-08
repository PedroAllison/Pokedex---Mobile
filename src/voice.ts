import * as Speech from 'expo-speech';
import type { Lang } from './types';

export type VoiceStyle = 'robot' | 'natural';

export interface VoiceOption {
  id: string;
  name: string;
  language: string;
  enhanced: boolean;
}

// Configuração atual (ajustada pelo App a partir das preferências salvas)
let style: VoiceStyle = 'robot';
const chosen: Partial<Record<Lang, string>> = {};

export function setVoiceStyle(s: VoiceStyle) {
  style = s;
}
export function setChosenVoice(lang: Lang, id: string | undefined) {
  if (id) chosen[lang] = id;
  else delete chosen[lang];
}

const norm = (l: string) => l.toLowerCase().replace(/_/g, '-');

/** Vozes instaladas no aparelho para o idioma (pt = qualquer português, en = qualquer inglês). */
export async function listVoices(lang: Lang): Promise<VoiceOption[]> {
  try {
    const all = await Speech.getAvailableVoicesAsync();
    const prefix = lang === 'pt' ? 'pt' : 'en';
    return all
      .filter((v) => norm(v.language).startsWith(prefix))
      .map((v) => ({
        id: v.identifier,
        name: v.name || v.identifier,
        language: v.language,
        enhanced: v.quality === Speech.VoiceQuality.Enhanced,
      }))
      .sort((a, b) => {
        const br = (x: VoiceOption) => (norm(x.language) === 'pt-br' || norm(x.language) === 'en-us' ? 0 : 1);
        return Number(b.enhanced) - Number(a.enhanced) || br(a) - br(b) || a.name.localeCompare(b.name);
      })
      .slice(0, 12);
  } catch {
    return [];
  }
}

/**
 * Fala o texto. No estilo "robot" a voz fica grave e pausada (efeito Pokédex);
 * no "natural" usa o tom normal da voz escolhida.
 */
export function speakDex(text: string, lang: Lang) {
  Speech.stop();
  Speech.speak(text, {
    language: lang === 'pt' ? 'pt-BR' : 'en-US',
    voice: chosen[lang],
    pitch: style === 'robot' ? 0.6 : 1.0,
    rate: style === 'robot' ? 0.9 : 0.98,
  });
}

export function stopSpeaking() {
  Speech.stop();
}
