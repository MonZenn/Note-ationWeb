/**
 * Chord symbol parser and MIDI voicings realizer for Note-ation.
 */

const ROOT_STEP_SEMITONES: Record<string, number> = {
  C: 0,
  D: 2,
  E: 4,
  F: 5,
  G: 7,
  A: 9,
  B: 11,
};

function parseNotePitchClass(noteStr: string): number | null {
  const match = noteStr.trim().match(/^([A-Ga-g])([#♯b♭]?)/);
  if (!match) return null;

  const letter = match[1].toUpperCase();
  const acc = match[2];

  let semitones = ROOT_STEP_SEMITONES[letter];
  if (semitones === undefined) return null;

  if (acc === '#' || acc === '♯') {
    semitones += 1;
  } else if (acc === 'b' || acc === '♭') {
    semitones -= 1;
  }

  return (semitones % 12 + 12) % 12;
}

/**
 * Parses a standard lead-sheet chord symbol (e.g. "C", "Am", "G7", "Fmaj7", "C/E")
 * into a balanced MIDI pitch set in the comfortable mid-register (C3–C5).
 * Slash chords place the designated bass note in the low bass register (C2–B2).
 */
export function parseChordToMidi(chordText: string): number[] {
  const trimmed = chordText.trim();
  if (!trimmed) return [];

  // Check for slash bass: e.g. "C/E", "Am/G"
  let mainChord = trimmed;
  let bassPitchClass: number | null = null;

  const slashIndex = trimmed.indexOf('/');
  if (slashIndex !== -1) {
    mainChord = trimmed.slice(0, slashIndex).trim();
    const bassStr = trimmed.slice(slashIndex + 1).trim();
    bassPitchClass = parseNotePitchClass(bassStr);
    if (bassPitchClass === null) {
      // Invalid bass note format
      return [];
    }
  }

  // Parse root note & accidental
  const rootMatch = mainChord.match(/^([A-Ga-g])([#♯b♭]?)(.*)$/);
  if (!rootMatch) return [];

  const rootLetter = rootMatch[1].toUpperCase();
  const rootAcc = rootMatch[2];
  let qualitySuffix = rootMatch[3].trim();

  let rootPitchClass = ROOT_STEP_SEMITONES[rootLetter];
  if (rootPitchClass === undefined) return [];

  if (rootAcc === '#' || rootAcc === '♯') {
    rootPitchClass += 1;
  } else if (rootAcc === 'b' || rootAcc === '♭') {
    rootPitchClass -= 1;
  }
  rootPitchClass = (rootPitchClass % 12 + 12) % 12;

  // Normalize quality suffix
  qualitySuffix = qualitySuffix
    .replace(/♯/g, '#')
    .replace(/♭/g, 'b');

  // Handle shorthand symbols
  if (qualitySuffix === 'Δ' || qualitySuffix === 'Δ7' || qualitySuffix === 'M' || qualitySuffix === 'M7') {
    qualitySuffix = 'maj7';
  } else if (qualitySuffix === 'Δ9' || qualitySuffix === 'M9') {
    qualitySuffix = 'maj9';
  } else if (qualitySuffix === 'ø' || qualitySuffix === 'ø7') {
    qualitySuffix = 'm7b5';
  } else if (qualitySuffix === '°7' || qualitySuffix === 'o7') {
    qualitySuffix = 'dim7';
  } else if (qualitySuffix === '°' || qualitySuffix === 'o') {
    qualitySuffix = 'dim';
  } else if (qualitySuffix === '-' || qualitySuffix === 'min') {
    qualitySuffix = 'm';
  } else if (qualitySuffix === '-7' || qualitySuffix === 'min7') {
    qualitySuffix = 'm7';
  } else if (qualitySuffix === '-9' || qualitySuffix === 'min9') {
    qualitySuffix = 'm9';
  }

  // Determine chord interval pattern from root
  let intervals: number[] = [0, 4, 7]; // default major triad

  const qLower = qualitySuffix.toLowerCase();

  if (qLower === '7sus4' || qLower === '7sus') {
    intervals = [0, 5, 7, 10];
  } else if (qLower === 'sus4' || qLower === 'sus') {
    intervals = [0, 5, 7];
  } else if (qLower === 'sus2') {
    intervals = [0, 2, 7];
  } else if (qLower === 'm7b5' || qLower === 'm7-5') {
    intervals = [0, 3, 6, 10];
  } else if (qLower === 'dim7') {
    intervals = [0, 3, 6, 9];
  } else if (qLower === 'dim') {
    intervals = [0, 3, 6];
  } else if (qLower === 'aug' || qLower === '+' || qLower === '+5') {
    intervals = [0, 4, 8];
  } else if (qLower === 'maj7') {
    intervals = [0, 4, 7, 11];
  } else if (qLower === 'm7') {
    intervals = [0, 3, 7, 10];
  } else if (qLower === '7' || qLower === 'dom7') {
    intervals = [0, 4, 7, 10];
  } else if (qLower === 'maj9') {
    intervals = [0, 4, 7, 11, 14];
  } else if (qLower === '9') {
    intervals = [0, 4, 7, 10, 14];
  } else if (qLower === 'add9' || qLower === 'add2') {
    intervals = [0, 4, 7, 14];
  } else if (qLower === 'm9') {
    intervals = [0, 3, 7, 10, 14];
  } else if (qLower === 'm6') {
    intervals = [0, 3, 7, 9];
  } else if (qLower === '6' || qLower === 'maj6') {
    intervals = [0, 4, 7, 9];
  } else if (qLower === 'm') {
    intervals = [0, 3, 7];
  } else if (qLower === '' || qLower === 'maj') {
    intervals = [0, 4, 7];
  } else {
    // Unrecognized suffix - fallback to major triad
    intervals = [0, 4, 7];
  }

  // Root note in octave 3 (MIDI 48–59)
  const rootMidi = 48 + rootPitchClass;
  const chordPitches = intervals.map((iv) => rootMidi + iv);

  // If slash chord, place bass note in octave 2 (MIDI 36–47)
  if (bassPitchClass !== null) {
    const bassMidi = 36 + bassPitchClass;
    return [bassMidi, ...chordPitches];
  }

  return chordPitches;
}
