export type Lang = 'pt' | 'en';

export interface PokemonInfo {
  id: number;
  slug: string;
  name: string; // nome de exibição (capitalizado)
  types: string[]; // slugs em inglês: "fire", "water"...
  heightM: number;
  weightKg: number;
  genusEn: string; // "Mouse Pokémon"
  descriptionEn: string;
  sprite: string | null;
}

export interface LocalizedText {
  genus: string;
  description: string;
}
