export type ClefType = 'treble' | 'bass' | 'alto' | 'tenor';
export type DurationValue = 1 | 2 | 4 | 8 | 16 | 32;
export type AccidentalType = 'natural' | 'flat' | 'sharp' | 'double-sharp' | 'double-flat';
export type BarType = 'single' | 'double' | 'final' | 'repeat-start' | 'repeat-end' | 'repeat-both';
export type StemDirection = 'auto' | 'up' | 'down';

export interface PitchItem {
  diatonicOffset: number; // 0 = Center staff line
  accidental?: AccidentalType;
}

export type SlurDirection = 'auto' | 'above' | 'below';
export type BeamMode = 'auto' | 'break' | 'join';

export interface SlurSpanner {
  targetNoteId: string;
  direction?: SlurDirection;
}

export type NoteArticulation =
  | 'staccato'
  | 'tenuto'
  | 'accent'
  | 'marcato'
  | 'staccatissimo'
  | 'fermata';

export type NoteOrnament = 'trill' | 'mordent' | 'turn';

export function isOrnament(expr: NoteArticulation | NoteOrnament): expr is NoteOrnament {
  return expr === 'trill' || expr === 'mordent' || expr === 'turn';
}

export interface NoteElement {
  id: string;
  type: 'note';
  duration: DurationValue;
  dots: number;
  pitches: PitchItem[];
  stemDirection: StemDirection;
  beam?: BeamMode;
  tieOut?: boolean;
  slur?: SlurSpanner;
  slurOut?: boolean;
  hairpin?: HairpinSpanner;
  // Articulations & Expressions
  staccato?: boolean;
  tenuto?: boolean;
  accent?: boolean;
  marcato?: boolean;
  staccatissimo?: boolean;
  fermata?: boolean;
  // Melodic Ornaments
  ornament?: NoteOrnament;
  lyric?: string;
}

export type HairpinType = 'crescendo' | 'decrescendo';

export interface HairpinSpanner {
  type: HairpinType;
  targetNoteId: string;
}


export interface RestElement {
  id: string;
  type: 'rest';
  duration: DurationValue;
  dots: number;
  fermata?: boolean;
  lyric?: string;
}

export interface BarLineElement {
  id: string;
  type: 'bar';
  barType: BarType;
}

export interface ClefElement {
  id: string;
  type: 'clef';
  clefType: ClefType;
}

export interface KeySignatureElement {
  id: string;
  type: 'key';
  key: string;
  accidentalsCount: number;
  cancelCount?: number;
  cancelType?: 'sharp' | 'flat';
  cancelIndices?: number[];
  isInherited?: boolean;
}

export interface TimeSignatureElement {
  id: string;
  type: 'time';
  numerator: number;
  denominator: number;
  symbol?: 'common' | 'cut';
}

export type TempoBaseDuration = 2 | 4 | 8 | 16;
export type TempoDisplayMode = 'text-and-metronome' | 'metronome-only' | 'text-only';

export interface TempoElement {
  id: string;
  type: 'tempo';
  bpm: number;
  baseDuration?: TempoBaseDuration;
  dotted?: boolean;
  text?: string;
  displayMode?: TempoDisplayMode;
}

export interface VoltaElement {
  id: string;
  type: 'volta';
  endings: number[]; // e.g. [1], [2], [1, 2]
  text?: string;     // e.g. "1.", "2.", "1, 2."
  closed?: boolean;  // true for downward hook at right edge
}

export type FlowMarkType =
  | 'segno'
  | 'coda'
  | 'to-coda'
  | 'ds-al-coda'
  | 'ds-al-fine'
  | 'dc-al-coda'
  | 'dc-al-fine'
  | 'fine';

export interface FlowElement {
  id: string;
  type: 'flow';
  mark: FlowMarkType;
}

export type DynamicMark =
  | 'ppp'
  | 'pp'
  | 'p'
  | 'mp'
  | 'mf'
  | 'f'
  | 'ff'
  | 'fff'
  | 'sfz'
  | 'fz';

export interface DynamicElement {
  id: string;
  type: 'dynamic';
  mark: DynamicMark;
}

export type TextCategory = 'chord' | 'part' | 'note';
export type TextPlacement = 'above' | 'below';

export interface TextElement {
  id: string;
  type: 'text';
  category: TextCategory;
  text: string;
  placement?: TextPlacement;
}

export type MusicElement =
  | NoteElement
  | RestElement
  | BarLineElement
  | ClefElement
  | KeySignatureElement
  | TimeSignatureElement
  | TempoElement
  | VoltaElement
  | FlowElement
  | DynamicElement
  | TextElement;

export type InstrumentType =
  | 'piano'
  | 'grand-piano'
  | 'violin'
  | 'viola'
  | 'cello'
  | 'flute'
  | 'piccolo'
  | 'harp'
  | 'pipe-organ'
  | 'bagpipe'
  | 'trumpet'
  | 'tuba';

export interface Staff {
  id: string;
  name: string;
  initialClef: ClefType;
  elements: MusicElement[];
  lyrics: string[];
  verses?: string[][];
  muted: boolean;
  volume: number;
  instrument?: InstrumentType;
  substaffOf?: string;
  beamWithNext?: boolean;
}

export type MeasureNumberingMode = 'system-start' | 'all-measures' | 'interval-5' | 'none';

export interface FontSetting {
  family: string;
  sizePt: number;
  bold?: boolean;
  italic?: boolean;
}

export type ScoreFontCategory =
  | 'title'
  | 'subtitle'
  | 'composer'
  | 'lyricist'
  | 'staffLyrics'
  | 'measureNumbers'
  | 'pageNumbers'
  | 'chordsAndText'
  | 'staffLabels';

export interface ScoreFontsConfig {
  title: FontSetting;
  subtitle: FontSetting;
  composer: FontSetting;
  lyricist: FontSetting;
  staffLyrics: FontSetting;
  measureNumbers: FontSetting;
  pageNumbers: FontSetting;
  chordsAndText: FontSetting;
  staffLabels: FontSetting;
}

export interface PageSetupConfig {
  staffScale: number;
  staffSpacing: number;
  systemSpacing: number;
  margins: {
    topMm: number;
    bottomMm: number;
    leftMm: number;
    rightMm: number;
  };
}

export interface ScoreInfo {
  title: string;
  subtitle: string;
  composer: string;
  lyricist: string;
  arranger: string;
  tempo: number;
  copyright: string;
  measureNumbering?: MeasureNumberingMode;
  hideEmptyStaves?: boolean;
  multiMeasureRests?: boolean;
  autoBeaming?: boolean;
  connectStaves?: boolean;
  fonts?: Partial<ScoreFontsConfig>;
  pageSetup?: Partial<PageSetupConfig>;
}

export interface Score {
  id: string;
  format: 'noteweb';
  version: '1.0';
  info: ScoreInfo;
  staves: Staff[];
}
