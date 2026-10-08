import type { Lang, LocalizedText, PokemonInfo } from './types';

// Modelos Gemini com plano GRATUITO (sem cobrança). Troque se o Google mudar a lista.
const VISION_MODEL = 'gemini-3.5-flash-lite';
const TEXT_MODEL = 'gemini-3.5-flash-lite';
const BASE = 'https://generativelanguage.googleapis.com/v1beta/models';

interface Part {
  text?: string;
  inline_data?: { mime_type: string; data: string };
}

async function callGemini(apiKey: string, model: string, parts: Part[]): Promise<string> {
  const res = await fetch(`${BASE}/${model}:generateContent`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-goog-api-key': apiKey },
    body: JSON.stringify({
      contents: [{ parts }],
      generationConfig: { temperature: 0, responseMimeType: 'application/json' },
    }),
  });
  if (!res.ok) {
    const txt = await res.text();
    if (res.status === 429) throw new Error('RATE_LIMIT');
    if (res.status === 401 || res.status === 403 || /API key not valid|API_KEY_INVALID/i.test(txt))
      throw new Error('API_KEY_INVALID');
    throw new Error(`Gemini ${res.status}: ${txt.slice(0, 200)}`);
  }
  const data = await res.json();
  const out: Part[] = data.candidates?.[0]?.content?.parts ?? [];
  return out.map((p) => p.text ?? '').join('');
}

function extractJson<T>(text: string): T | null {
  const m = text.match(/\{[\s\S]*\}/);
  if (!m) return null;
  try {
    return JSON.parse(m[0]) as T;
  } catch {
    return null;
  }
}

export interface Detection {
  slug: string | null;
  confidence: number;
}

/** Envia a foto (JPEG base64) e recebe o slug PokeAPI do Pokémon (ou null). */
export async function identifyPokemon(apiKey: string, jpegBase64: string): Promise<Detection> {
  const text = await callGemini(apiKey, VISION_MODEL, [
    { inline_data: { mime_type: 'image/jpeg', data: jpegBase64 } },
    {
      text:
        'Você é o reconhecedor de uma Pokédex. Identifique qual Pokémon aparece na imagem ' +
        '(pode ser carta, boneco, pelúcia, tela ou desenho). Se houver vários, escolha o mais central/destacado. ' +
        'Responda SOMENTE com JSON: {"pokemon": "<nome em inglês no formato slug da PokeAPI, ex: pikachu, mr-mime, charizard>" ou null, "confidence": <0 a 1>}. ' +
        'Use null se não houver nenhum Pokémon claramente visível. Não invente.',
    },
  ]);
  const parsed = extractJson<{ pokemon: string | null; confidence: number }>(text);
  if (!parsed || !parsed.pokemon) return { slug: null, confidence: 0 };
  return { slug: String(parsed.pokemon), confidence: Number(parsed.confidence) || 0 };
}

const cache = new Map<string, LocalizedText>();

/** Fallback gratuito (sem chave): MyMemory. */
async function translateFree(text: string): Promise<string | null> {
  try {
    const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=en|pt-BR`;
    const res = await fetch(url);
    if (!res.ok) return null;
    const data = await res.json();
    const out: string | undefined = data?.responseData?.translatedText;
    return out && !/MYMEMORY WARNING/i.test(out) ? out : null;
  } catch {
    return null;
  }
}

async function translateWithGemini(apiKey: string, p: PokemonInfo): Promise<LocalizedText | null> {
  for (let attempt = 0; attempt < 2; attempt++) {
    try {
      const text = await callGemini(apiKey, TEXT_MODEL, [
        {
          text:
            'Traduza para português do Brasil, em tom de Pokédex (claro, natural, fiel ao original). ' +
            'Mantenha nomes de Pokémon, golpes e lugares como são. ' +
            'Responda SOMENTE com JSON {"genus": "...", "description": "..."}.\n\n' +
            JSON.stringify({ genus: p.genusEn, description: p.descriptionEn }),
        },
      ]);
      const parsed = extractJson<LocalizedText>(text);
      if (parsed?.description) return { genus: parsed.genus ?? '', description: parsed.description };
    } catch (e) {
      if (e instanceof Error && e.message === 'API_KEY_INVALID') return null;
    }
  }
  return null;
}

/** Traduz categoria + descrição para pt-BR (a PokeAPI não tem textos em português). */
export async function localize(
  apiKey: string,
  p: PokemonInfo,
  lang: Lang,
): Promise<LocalizedText> {
  if (lang === 'en') return { genus: p.genusEn, description: p.descriptionEn };
  const key = `${p.id}:pt`;
  const hit = cache.get(key);
  if (hit) return hit;

  let result = await translateWithGemini(apiKey, p);
  if (!result) {
    const [g, d] = await Promise.all([translateFree(p.genusEn), translateFree(p.descriptionEn)]);
    if (d) result = { genus: g ?? p.genusEn, description: d };
  }
  if (result) {
    cache.set(key, result);
    return result;
  }
  // último recurso: inglês (não guarda em cache para tentar de novo depois)
  return { genus: p.genusEn, description: p.descriptionEn };
}
