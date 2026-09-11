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
