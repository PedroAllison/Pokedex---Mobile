import type { PokemonInfo } from './types';

const BASE = 'https://pokeapi.co/api/v2';

async function getJson<T>(url: string): Promise<T> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`PokeAPI ${res.status}`);
  return (await res.json()) as T;
}

/** Converte "Mr. Mime", "Nidoran♀", "Farfetch'd" etc. no slug usado pela PokeAPI. */
export function toSlug(name: string): string {
  return name
    .trim()
    .toLowerCase()
    .replace('♀', '-f')
    .replace('♂', '-m')
    .replace(/[.'’:]/g, '')
    .replace(/é/g, 'e')
    .replace(/\s+/g, '-');
}

const cap = (s: string) =>
  s
    .split('-')
    .map((p) => p.charAt(0).toUpperCase() + p.slice(1))
    .join(' ');

interface SpeciesResp {
  id: number;
  name: string;
  genera: { genus: string; language: { name: string } }[];
  flavor_text_entries: { flavor_text: string; language: { name: string } }[];
}
interface PokemonResp {
  height: number;
  weight: number;
  types: { slot: number; type: { name: string } }[];
  sprites: {
    other?: { 'official-artwork'?: { front_default: string | null } };
    front_default: string | null;
  };
}

export async function fetchPokemon(nameOrSlug: string): Promise<PokemonInfo> {
  const slug = toSlug(nameOrSlug);
  // species é buscado por nome da espécie; pokemon por id (evita problemas com formas)
  const species = await getJson<SpeciesResp>(`${BASE}/pokemon-species/${slug}`);
  const poke = await getJson<PokemonResp>(`${BASE}/pokemon/${species.id}`);

  const en = species.flavor_text_entries.filter((e) => e.language.name === 'en');
  const rawDesc = en.length ? en[en.length - 1].flavor_text : '';
  const descriptionEn = rawDesc.replace(/[\n\f\r]/g, ' ').replace(/\s+/g, ' ').trim();
  const genusEn = species.genera.find((g) => g.language.name === 'en')?.genus ?? '';

  return {
    id: species.id,
    slug: species.name,
    name: cap(species.name),
    types: poke.types.sort((a, b) => a.slot - b.slot).map((t) => t.type.name),
    heightM: poke.height / 10,
    weightKg: poke.weight / 10,
    genusEn,
    descriptionEn,
    sprite:
      poke.sprites.other?.['official-artwork']?.front_default ?? poke.sprites.front_default,
  };
}
