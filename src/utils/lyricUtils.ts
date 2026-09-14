import { LyricPart } from '../types/score';

/**
 * Utility to tokenize raw lyrics text into syllables for note-by-note score alignment.
 * Hyphenated syllables retain a trailing hyphen (e.g. "A-maz-ing" -> ["A-", "maz-", "ing"]).
 */
export function splitLyricsIntoSyllables(text: string): string[] {
  if (!text || !text.trim()) return [];
  // Matches syllables ending with hyphens or complete whitespace-separated words
  const tokens = text.trim().split(/\s+/);
  const result: string[] = [];

  for (const token of tokens) {
    if (!token) continue;
    if (/^-+$/.test(token)) {
      for (let i = 0; i < token.length; i++) {
        result.push('-');
      }
      continue;
    }
    if (token.includes('-')) {
      const parts = token.split('-');
      for (let i = 0; i < parts.length; i++) {
        if (parts[i]) {
          result.push(i < parts.length - 1 ? `${parts[i]}-` : parts[i]);
        } else if (i > 0 && i < parts.length - 1) {
          result.push('-');
        }
      }
    } else {
      result.push(token);
    }
  }

  return result;
}

export function compileLyricPartsToVerses(parts: LyricPart[]): string[][] {
  if (!parts || parts.length === 0) return [[]];

  const maxLayers = Math.max(1, ...parts.map((p) => p.layers?.length || 0));
  const compiledVerses: string[][] = Array.from({ length: maxLayers }, () => []);

  for (const part of parts) {
    const layer1Text = part.layers?.[0] || '';
    const layer1Tokens = splitLyricsIntoSyllables(layer1Text);
    compiledVerses[0].push(...layer1Tokens);

    for (let l = 1; l < maxLayers; l++) {
      const layerText = part.layers?.[l] || '';
      const layerTokens = splitLyricsIntoSyllables(layerText);

      if (layerTokens.length > 0) {
        compiledVerses[l].push(...layerTokens);
      } else {
        // Fallback: fill with '_' matching layer 1 token count
        const skipCount = layer1Tokens.length;
        for (let s = 0; s < skipCount; s++) {
          compiledVerses[l].push('_');
        }
      }
    }
  }

  return compiledVerses;
}
