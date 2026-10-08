import type { Lang } from './types';

export const T = {
  pt: {
    scanHint: 'Aponte para um Pokémon e toque em ESCANEAR',
    scan: 'ESCANEAR',
    scanning: 'Analisando...',
    notFound: 'Nenhum Pokémon detectado. Tente chegar mais perto ou melhorar a luz.',
    needKey: 'Configure sua chave grátis do Google Gemini nas configurações (⚙).',
    keyInvalid: 'Chave de API inválida. Verifique nas configurações (⚙).',
    rateLimit: 'Limite gratuito atingido. Aguarde um minuto e tente de novo.',
    error: 'Erro ao consultar. Verifique sua internet e tente de novo.',
    height: 'Altura',
    weight: 'Peso',
    type: 'Tipo',
    again: 'Escanear outro',
    replay: '🔊 Repetir',
    settings: 'Configurações',
    apiKey: 'Chave da API Google Gemini (grátis)',
    apiKeyHelp: 'Guardada de forma segura apenas neste aparelho.',
    language: 'Idioma',
    voice: 'Voz',
    robot: 'Robô (Pokédex)',
    natural: 'Natural',
    noVoices: 'Nenhuma voz em português instalada. Instale em Configurações do celular → Texto para fala.',
    save: 'Salvar',
    close: 'Fechar',
    permission: 'Preciso de acesso à câmera para funcionar como Pokédex.',
    allow: 'Permitir câmera',
    voiceHeader: (id: number, name: string) => `Número ${id}. ${name}.`,
    voiceCategory: (genus: string) => (/pok[eé]mon/i.test(genus) ? `${genus}.` : `Pokémon ${genus}.`),
    voiceType: (types: string) => `Tipo ${types}.`,
    voiceNotFound: 'Pokémon não identificado.',
  },
  en: {
    scanHint: 'Point at a Pokémon and tap SCAN',
    scan: 'SCAN',
    scanning: 'Analyzing...',
    notFound: 'No Pokémon detected. Try getting closer or improving the light.',
    needKey: 'Set your free Google Gemini key in settings (⚙).',
    keyInvalid: 'Invalid API key. Check settings (⚙).',
    rateLimit: 'Free limit reached. Wait a minute and try again.',
    error: 'Request failed. Check your connection and try again.',
    height: 'Height',
    weight: 'Weight',
    type: 'Type',
    again: 'Scan another',
    replay: '🔊 Replay',
    settings: 'Settings',
    apiKey: 'Google Gemini API key (free)',
    apiKeyHelp: 'Stored securely on this device only.',
    language: 'Language',
    voice: 'Voice',
    robot: 'Robot (Pokédex)',
    natural: 'Natural',
    noVoices: 'No English voices found. Install one in your phone Text-to-speech settings.',
    save: 'Save',
    close: 'Close',
    permission: 'Camera access is needed to work as a Pokédex.',
    allow: 'Allow camera',
    voiceHeader: (id: number, name: string) => `Number ${id}. ${name}.`,
    voiceCategory: (genus: string) => `${genus}.`,
    voiceType: (types: string) => `Type: ${types}.`,
    voiceNotFound: 'Pokémon not identified.',
  },
} satisfies Record<Lang, unknown>;

export const TYPE_PT: Record<string, string> = {
  normal: 'Normal', fire: 'Fogo', water: 'Água', electric: 'Elétrico', grass: 'Planta',
  ice: 'Gelo', fighting: 'Lutador', poison: 'Venenoso', ground: 'Terrestre', flying: 'Voador',
  psychic: 'Psíquico', bug: 'Inseto', rock: 'Pedra', ghost: 'Fantasma', dragon: 'Dragão',
  dark: 'Sombrio', steel: 'Aço', fairy: 'Fada',
};

export const TYPE_COLOR: Record<string, string> = {
  normal: '#A8A77A', fire: '#EE8130', water: '#6390F0', electric: '#F7D02C', grass: '#7AC74C',
  ice: '#96D9D6', fighting: '#C22E28', poison: '#A33EA1', ground: '#E2BF65', flying: '#A98FF3',
  psychic: '#F95587', bug: '#A6B91A', rock: '#B6A136', ghost: '#735797', dragon: '#6F35FC',
  dark: '#705746', steel: '#B7B7CE', fairy: '#D685AD',
};

export function typeLabel(slug: string, lang: Lang): string {
  return lang === 'pt' ? TYPE_PT[slug] ?? slug : slug.charAt(0).toUpperCase() + slug.slice(1);
}
