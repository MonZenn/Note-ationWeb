import { ClefType, AccidentalType, Staff, InstrumentType } from '../types/score';

// Semitone intervals of the diatonic major scale from C: C(0), D(2), E(4), F(5), G(7), A(9), B(11)
const DIATONIC_STEP_TO_SEMITONES: Record<number, number> = {
  0: 0,   // C
  1: 2,   // D
  2: 4,   // E
  3: 5,   // F
  4: 7,   // G
  5: 9,   // A
  6: 11,  // B
};

// Center line of staff (offset 0):
// Treble: B4 (Diatonic step 6 of octave 4, MIDI 71)
// Bass:   D3 (Diatonic step 1 of octave 3, MIDI 50)
// Alto:   C4 (Diatonic step 0 of octave 4, MIDI 60)
// Tenor:  A3 (Diatonic step 5 of octave 3, MIDI 57)
const CLEF_CENTER_INFO: Record<ClefType, { baseDiatonic: number, baseOctave: number, baseMidi: number, step: string }> = {
  treble: { baseDiatonic: 6, baseOctave: 4, baseMidi: 71, step: 'B' }, // B4
  bass:   { baseDiatonic: 1, baseOctave: 3, baseMidi: 50, step: 'D' }, // D3
  alto:   { baseDiatonic: 0, baseOctave: 4, baseMidi: 60, step: 'C' }, // C4
  tenor:  { baseDiatonic: 5, baseOctave: 3, baseMidi: 57, step: 'A' }, // A3
};

export function getClefCenterPitch(clef: ClefType): { step: string, octave: number, midi: number } {
  const center = CLEF_CENTER_INFO[clef] || CLEF_CENTER_INFO.treble;
  return {
    step: center.step,
    octave: center.baseOctave,
    midi: center.baseMidi,
  };
}

// Order of sharps in circle of fifths (F, C, G, D, A, E, B) -> diatonic steps (C=0)
const SHARPS_ORDER = [3, 0, 4, 1, 5, 2, 6];
// Order of flats in circle of fifths (B, E, A, D, G, C, F) -> diatonic steps (C=0)
const FLATS_ORDER = [6, 2, 5, 1, 4, 0, 3];

export function getKeySignatureAccidental(
  diatonicInOctave: number,
  keyAccidentalsCount: number = 0
): 'sharp' | 'flat' | undefined {
  if (keyAccidentalsCount > 0) {
    const activeSharps = SHARPS_ORDER.slice(0, Math.min(7, keyAccidentalsCount));
    if (activeSharps.includes(diatonicInOctave)) return 'sharp';
  } else if (keyAccidentalsCount < 0) {
    const activeFlats = FLATS_ORDER.slice(0, Math.min(7, Math.abs(keyAccidentalsCount)));
    if (activeFlats.includes(diatonicInOctave)) return 'flat';
  }
  return undefined;
}

export function diatonicOffsetToMidi(
  offset: number,
  clef: ClefType,
  accidental?: AccidentalType,
  keyAccidentalsCount: number = 0
): number {
  const center = CLEF_CENTER_INFO[clef] || CLEF_CENTER_INFO.treble;
  const totalDiatonic = center.baseDiatonic + offset;
  
  const octaveShift = Math.floor(totalDiatonic / 7);
  const diatonicInOctave = ((totalDiatonic % 7) + 7) % 7;
  const octave = center.baseOctave + octaveShift;
  
  let midi = (octave + 1) * 12 + DIATONIC_STEP_TO_SEMITONES[diatonicInOctave];

  if (accidental === 'sharp') {
    midi += 1;
  } else if (accidental === 'double-sharp') {
    midi += 2;
  } else if (accidental === 'flat') {
    midi -= 1;
  } else if (accidental === 'double-flat') {
    midi -= 2;
  } else if (accidental === 'natural') {
    // Explicit natural cancels any key signature alteration
  } else {
    // When no accidental is specified, inherit from active key signature
    const inherited = getKeySignatureAccidental(diatonicInOctave, keyAccidentalsCount);
    if (inherited === 'sharp') midi += 1;
    else if (inherited === 'flat') midi -= 1;
  }

  return midi;
}


export function midiToFrequency(midi: number): number {
  return 440 * Math.pow(2, (midi - 69) / 12);
}

export function getStaffContextAt(
  staff: Staff | undefined,
  index: number
): { clef: ClefType; keyAccidentalsCount: number; instrument: InstrumentType } {
  if (!staff) {
    return { clef: 'treble', keyAccidentalsCount: 0, instrument: 'piano' };
  }

  let clef: ClefType = staff.initialClef || 'treble';
  let keyAccidentalsCount = 0;
  const limit = Math.min(index, staff.elements ? staff.elements.length : 0);

  for (let i = 0; i < limit; i++) {
    const el = staff.elements[i];
    if (el?.type === 'clef') {
      clef = el.clefType;
    } else if (el?.type === 'key') {
      keyAccidentalsCount = el.accidentalsCount;
    }
  }

  const instrument = (staff.instrument || 'piano') as InstrumentType;
  return { clef, keyAccidentalsCount, instrument };
}

