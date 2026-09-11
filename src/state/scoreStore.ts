import {
  Score,
  ScoreInfo,
  Staff,
  MusicElement,
  NoteElement,
  RestElement,
  PitchItem,
  DurationValue,
  AccidentalType,
  StemDirection,
  InstrumentType,
  SlurDirection,
  BeamMode,
  HairpinType,
  TextElement,
  TextCategory,
  TextPlacement,
  NoteArticulation,
  NoteOrnament,
  isOrnament,
  TempoElement,
  TempoBaseDuration,
  TempoDisplayMode,
  KeySignatureElement,
} from '../types/score';

export interface SelectionRange {
  startIndex: number;
  endIndex: number;
}

export interface ScoreState {
  past: Score[];
  present: Score;
  future: Score[];
  activeStaffIndex: number;
  cursorIndex: number;
  pitchOffset: number;
  selectedRange?: SelectionRange | null;
  selectionAnchorIndex?: number | null;
  clipboard?: MusicElement[] | null;
}

export type ScoreAction =
  | { type: 'INSERT_ELEMENT'; element: MusicElement }
  | { type: 'DELETE_PRECEDING' }
  | { type: 'DELETE_FOLLOWING' }
  | { type: 'ADD_CHORD_PITCH'; pitch: PitchItem }
  | { type: 'SET_SCORE_INFO'; info: Partial<ScoreInfo> }
  | { type: 'UPDATE_SCORE_INFO'; info: Partial<ScoreInfo> }
  | { type: 'ADD_STAFF'; name?: string; clef?: 'treble' | 'bass'; instrument?: InstrumentType }
  | { type: 'ADD_SUBSTAFF'; parentStaffId: string }
  | { type: 'REMOVE_STAFF'; staffIndex: number }
  | { type: 'UPDATE_STAFF'; staffIndex: number; updates: Partial<Staff> }
  | { type: 'REORDER_STAVES'; fromIndex: number; toIndex: number }
  | { type: 'SET_ACTIVE_STAFF'; index: number }
  | { type: 'SET_CURSOR_INDEX'; index: number }
  | { type: 'SET_PITCH_OFFSET'; offset: number }
  | { type: 'TOGGLE_NOTE_ATTRIBUTE'; attribute: 'tieOut' | 'slurOut' | 'staccato' | 'tenuto' | 'accent' | 'marcato' | 'staccatissimo' | 'fermata' }
  | { type: 'TOGGLE_NOTE_EXPRESSION'; expression: NoteArticulation | NoteOrnament }
  | { type: 'TOGGLE_STEM_DIRECTION'; direction?: 'auto' | 'up' | 'down' }
  | { type: 'LOAD_SCORE'; score: Score }
  | { type: 'SET_STAFF_LYRICS'; staffIndex: number; lyrics: string[] }
  | { type: 'UNDO' }
  | { type: 'REDO' }
  | { type: 'SET_SELECTION_RANGE'; range: SelectionRange | null; anchorIndex?: number }
  | { type: 'CLEAR_SELECTION' }
  | { type: 'BATCH_SET_DURATION'; duration: DurationValue }
  | { type: 'BATCH_SET_ACCIDENTAL'; accidental?: AccidentalType }
  | { type: 'BATCH_TOGGLE_DOT' }
  | { type: 'BATCH_CONVERT_TO_REST' }
  | { type: 'BATCH_CONVERT_TO_NOTE'; pitchOffset: number }
  | { type: 'BATCH_TRANSPOSE'; delta: number }
  | { type: 'BATCH_DELETE' }
  | { type: 'BATCH_TOGGLE_ATTRIBUTE'; attribute: 'tieOut' | 'slurOut' | 'staccato' | 'tenuto' | 'accent' | 'marcato' | 'staccatissimo' | 'fermata' }
  | { type: 'BATCH_TOGGLE_NOTE_EXPRESSION'; expression: NoteArticulation | NoteOrnament }
  | { type: 'BATCH_CYCLE_STEM_DIRECTION' }
  | { type: 'TOGGLE_SLUR_RANGE'; direction?: SlurDirection }
  | { type: 'CYCLE_SLUR_DIRECTION' }
  | { type: 'TOGGLE_BEAM' }
  | { type: 'BATCH_TOGGLE_BEAM' }
  | { type: 'BATCH_TOGGLE_TUPLET'; actual?: number; normal?: number }
  | { type: 'TOGGLE_AUTO_BEAMING' }
  | { type: 'TOGGLE_HAIRPIN_RANGE'; hairpinType: HairpinType }
  | { type: 'COPY_SELECTION' }
  | { type: 'CUT_SELECTION' }
  | { type: 'PASTE_CLIPBOARD' }
  | {
      type: 'INSERT_TEXT';
      category: TextCategory;
      text: string;
      placement?: TextPlacement;
    }
  | {
      type: 'UPDATE_TEXT';
      elementId: string;
      text: string;
      category?: TextCategory;
      placement?: TextPlacement;
    }
  | {
      type: 'INSERT_TEMPO';
      bpm: number;
      baseDuration?: TempoBaseDuration;
      dotted?: boolean;
      text?: string;
      displayMode?: TempoDisplayMode;
    }
  | {
      type: 'UPDATE_TEMPO';
      elementId: string;
      bpm: number;
      baseDuration?: TempoBaseDuration;
      dotted?: boolean;
      text?: string;
      displayMode?: TempoDisplayMode;
    }
  | {
      type: 'UPDATE_KEY';
      elementId: string;
      key: string;
      accidentalsCount: number;
      cancelCount?: number;
      cancelType?: 'sharp' | 'flat';
      cancelIndices?: number[];
    };


export function createInitialScoreState(initialScore?: Score): ScoreState {
  return {
    past: [],
    present: initialScore || createInitialScore(),
    future: [],
    activeStaffIndex: 0,
    cursorIndex: 0,
    pitchOffset: 0,
    selectedRange: null,
    selectionAnchorIndex: null,
    clipboard: null,
  };
}

export function createInitialScore(): Score {
  return {
    id: `score-${Date.now()}`,
    format: 'noteweb',
    version: '1.0',
    info: {
      title: 'Untitled Score',
      subtitle: '',
      composer: '',
      lyricist: '',
      arranger: '',
      tempo: 120,
      copyright: '',
      autoBeaming: false,
    },
    staves: [
      {
        id: 'staff-1',
        name: 'Staff 1',
        initialClef: 'treble',
        elements: [],
        lyrics: [],
        muted: false,
        volume: 1.0,
        instrument: 'piano',
      },
    ],
  };
}

function pushHistory(state: ScoreState, newScore: Score): ScoreState {
  return {
    ...state,
    past: [...state.past.slice(-49), state.present],
    present: newScore,
    future: [],
  };
}

export function scoreReducer(state: ScoreState, action: ScoreAction): ScoreState {
  switch (action.type) {
    case 'INSERT_ELEMENT': {
      const staff = state.present.staves[state.activeStaffIndex];
      if (!staff) return state;
      const newElements = [...staff.elements];
      newElements.splice(state.cursorIndex, 0, action.element);

      const newStaves = [...state.present.staves];
      newStaves[state.activeStaffIndex] = { ...staff, elements: newElements };
      const newScore = { ...state.present, staves: newStaves };

      return {
        ...pushHistory(state, newScore),
        cursorIndex: state.cursorIndex + 1,
      };
    }

    case 'INSERT_TEXT': {
      const activeStaff = state.present.staves[state.activeStaffIndex];
      if (!activeStaff) return state;

      const newElement: TextElement = {
        id: crypto.randomUUID(),
        type: 'text',
        category: action.category,
        text: action.text,
        ...(action.placement ? { placement: action.placement } : {}),
      };

      const newElements = [
        ...activeStaff.elements.slice(0, state.cursorIndex),
        newElement,
        ...activeStaff.elements.slice(state.cursorIndex),
      ];
      const newStaves = state.present.staves.map((staff, idx) =>
        idx === state.activeStaffIndex ? { ...staff, elements: newElements } : staff
      );
      const newScore = { ...state.present, staves: newStaves };

      return {
        ...pushHistory(state, newScore),
        cursorIndex: state.cursorIndex + 1,
        selectedRange: null,
      };
    }

    case 'UPDATE_TEXT': {
      const activeStaff = state.present.staves[state.activeStaffIndex];
      if (!activeStaff) return state;

      const elemIndex = activeStaff.elements.findIndex((el) => el.id === action.elementId);
      if (elemIndex === -1) return state;

      const targetElem = activeStaff.elements[elemIndex];
      if (targetElem.type !== 'text') return state;

      const updatedElement: TextElement = {
        ...targetElem,
        text: action.text,
        ...(action.category ? { category: action.category } : {}),
        ...(action.placement ? { placement: action.placement } : {}),
      };

      const newElements = [
        ...activeStaff.elements.slice(0, elemIndex),
        updatedElement,
        ...activeStaff.elements.slice(elemIndex + 1),
      ];
      const newStaves = state.present.staves.map((staff, idx) =>
        idx === state.activeStaffIndex ? { ...staff, elements: newElements } : staff
      );
      const newScore = { ...state.present, staves: newStaves };

      return pushHistory(state, newScore);
    }

    case 'INSERT_TEMPO': {
      const activeStaff = state.present.staves[state.activeStaffIndex];
      if (!activeStaff) return state;

      const newTempo: TempoElement = {
        id: `tempo-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: 'tempo',
        bpm: action.bpm,
        baseDuration: action.baseDuration ?? 4,
        dotted: action.dotted ?? false,
        text: action.text,
        displayMode: action.displayMode ?? (action.text ? 'text-and-metronome' : 'metronome-only'),
      };

      const newElements = [
        ...activeStaff.elements.slice(0, state.cursorIndex),
        newTempo,
        ...activeStaff.elements.slice(state.cursorIndex),
      ];
      const newStaves = state.present.staves.map((staff, idx) =>
        idx === state.activeStaffIndex ? { ...staff, elements: newElements } : staff
      );
      const newScore = { ...state.present, staves: newStaves };

      return {
        ...pushHistory(state, newScore),
        cursorIndex: state.cursorIndex + 1,
        selectedRange: null,
      };
    }

    case 'UPDATE_TEMPO': {
      const activeStaff = state.present.staves[state.activeStaffIndex];
      if (!activeStaff) return state;

      const elemIndex = activeStaff.elements.findIndex((el) => el.id === action.elementId);
      if (elemIndex === -1) return state;

      const targetElem = activeStaff.elements[elemIndex];
      if (targetElem.type !== 'tempo') return state;

      const updatedElement: TempoElement = {
        ...targetElem,
        bpm: action.bpm,
        baseDuration: action.baseDuration ?? targetElem.baseDuration ?? 4,
        dotted: action.dotted !== undefined ? action.dotted : (targetElem.dotted ?? false),
        text: action.text !== undefined ? action.text : targetElem.text,
        displayMode:
          action.displayMode ??
          targetElem.displayMode ??
          (action.text ? 'text-and-metronome' : 'metronome-only'),
      };

      const newElements = [
        ...activeStaff.elements.slice(0, elemIndex),
        updatedElement,
        ...activeStaff.elements.slice(elemIndex + 1),
      ];
      const newStaves = state.present.staves.map((staff, idx) =>
        idx === state.activeStaffIndex ? { ...staff, elements: newElements } : staff
      );
      const newScore = { ...state.present, staves: newStaves };

      return pushHistory(state, newScore);
    }

    case 'UPDATE_KEY': {
      const activeStaff = state.present.staves[state.activeStaffIndex];
      if (!activeStaff) return state;

      const elemIndex = activeStaff.elements.findIndex((e) => e.id === action.elementId);
      if (elemIndex === -1) return state;

      const targetElem = activeStaff.elements[elemIndex];
      if (targetElem.type !== 'key') return state;

      const updatedElement: KeySignatureElement = {
        ...targetElem,
        key: action.key,
        accidentalsCount: action.accidentalsCount,
        cancelCount: action.cancelCount,
        cancelType: action.cancelType,
        cancelIndices: action.cancelIndices,
      };

      const newElements = [
        ...activeStaff.elements.slice(0, elemIndex),
        updatedElement,
        ...activeStaff.elements.slice(elemIndex + 1),
      ];
      const newStaves = state.present.staves.map((staff, idx) =>
        idx === state.activeStaffIndex ? { ...staff, elements: newElements } : staff
      );
      const newScore = { ...state.present, staves: newStaves };

      return pushHistory(state, newScore);
    }

    case 'DELETE_PRECEDING': {
      if (state.cursorIndex <= 0) return state;
      const staff = state.present.staves[state.activeStaffIndex];
      if (!staff) return state;
      const newElements = [...staff.elements];
      newElements.splice(state.cursorIndex - 1, 1);

      const newStaves = [...state.present.staves];
      newStaves[state.activeStaffIndex] = { ...staff, elements: newElements };
      const newScore = { ...state.present, staves: newStaves };

      return {
        ...pushHistory(state, newScore),
        cursorIndex: Math.max(0, state.cursorIndex - 1),
      };
    }

    case 'DELETE_FOLLOWING': {
      const staff = state.present.staves[state.activeStaffIndex];
      if (!staff) return state;
      if (state.cursorIndex >= staff.elements.length) return state;
      const newElements = [...staff.elements];
      newElements.splice(state.cursorIndex, 1);

      const newStaves = [...state.present.staves];
      newStaves[state.activeStaffIndex] = { ...staff, elements: newElements };
      const newScore = { ...state.present, staves: newStaves };

      return pushHistory(state, newScore);
    }

    case 'ADD_CHORD_PITCH': {
      const staff = state.present.staves[state.activeStaffIndex];
      if (!staff) return state;
      const targetIndex = state.cursorIndex > 0 ? state.cursorIndex - 1 : 0;
      const targetElement = staff.elements[targetIndex];
      if (!targetElement || targetElement.type !== 'note') return state;

      const exists = targetElement.pitches.some((p) => p.diatonicOffset === action.pitch.diatonicOffset);
      if (exists) return state;

      const updatedNote: NoteElement = {
        ...targetElement,
        pitches: [...targetElement.pitches, action.pitch].sort((a, b) => a.diatonicOffset - b.diatonicOffset),
      };

      const newElements = [...staff.elements];
      newElements[targetIndex] = updatedNote;

      const newStaves = [...state.present.staves];
      newStaves[state.activeStaffIndex] = { ...staff, elements: newElements };
      const newScore = { ...state.present, staves: newStaves };

      return pushHistory(state, newScore);
    }

    case 'TOGGLE_NOTE_ATTRIBUTE': {
      const staff = state.present.staves[state.activeStaffIndex];
      if (!staff || staff.elements.length === 0) return state;
      const isEligible = (elem: MusicElement | undefined): boolean => {
        if (!elem) return false;
        if (elem.type === 'note') return true;
        if (action.attribute === 'fermata' && elem.type === 'rest') return true;
        return false;
      };
      let targetIndex = -1;
      if (isEligible(staff.elements[state.cursorIndex])) {
        targetIndex = state.cursorIndex;
      } else if (state.cursorIndex > 0 && isEligible(staff.elements[state.cursorIndex - 1])) {
        targetIndex = state.cursorIndex - 1;
      } else if (isEligible(staff.elements[0])) {
        targetIndex = 0;
      }
      if (targetIndex === -1) return state;
      const targetElement = staff.elements[targetIndex];

      let updatedElement: MusicElement;
      if (targetElement.type === 'note') {
        updatedElement = {
          ...targetElement,
          [action.attribute]: !targetElement[action.attribute],
        };
      } else if (targetElement.type === 'rest' && action.attribute === 'fermata') {
        updatedElement = {
          ...targetElement,
          fermata: !targetElement.fermata,
        };
      } else {
        return state;
      }

      const newElements = [...staff.elements];
      newElements[targetIndex] = updatedElement;

      const newStaves = [...state.present.staves];
      newStaves[state.activeStaffIndex] = { ...staff, elements: newElements };
      const newScore = { ...state.present, staves: newStaves };

      return pushHistory(state, newScore);
    }

    case 'TOGGLE_NOTE_EXPRESSION': {
      const staff = state.present.staves[state.activeStaffIndex];
      if (!staff || staff.elements.length === 0) return state;

      const isEligible = (elem: MusicElement | undefined): boolean => {
        if (!elem) return false;
        if (elem.type === 'note') return true;
        if (action.expression === 'fermata' && elem.type === 'rest') return true;
        return false;
      };

      let targetIndex = -1;
      if (isEligible(staff.elements[state.cursorIndex])) {
        targetIndex = state.cursorIndex;
      } else if (state.cursorIndex > 0 && isEligible(staff.elements[state.cursorIndex - 1])) {
        targetIndex = state.cursorIndex - 1;
      } else if (isEligible(staff.elements[0])) {
        targetIndex = 0;
      }

      if (targetIndex === -1) return state;
      const targetElement = staff.elements[targetIndex];

      let updatedElement: MusicElement;

      if (isOrnament(action.expression)) {
        if (targetElement.type !== 'note') return state;
        const note = targetElement as NoteElement;
        if (note.ornament === action.expression) {
          const { ornament: _, ...restNote } = note;
          updatedElement = restNote;
        } else {
          updatedElement = { ...note, ornament: action.expression };
        }
      } else if (targetElement.type === 'note') {
        const note = targetElement as NoteElement;
        const prop = action.expression as NoteArticulation;
        updatedElement = {
          ...note,
          [prop]: !note[prop],
        };
      } else if (targetElement.type === 'rest' && action.expression === 'fermata') {
        const rest = targetElement as RestElement;
        updatedElement = {
          ...rest,
          fermata: !rest.fermata,
        };
      } else {
        return state;
      }

      const newElements = [...staff.elements];
      newElements[targetIndex] = updatedElement;

      const newStaves = [...state.present.staves];
      newStaves[state.activeStaffIndex] = { ...staff, elements: newElements };
      const newScore = { ...state.present, staves: newStaves };

      return pushHistory(state, newScore);
    }

    case 'TOGGLE_STEM_DIRECTION': {
      const staff = state.present.staves[state.activeStaffIndex];
      if (!staff || staff.elements.length === 0) return state;
      let targetIndex = -1;
      if (state.cursorIndex < staff.elements.length && staff.elements[state.cursorIndex]?.type === 'note') {
        targetIndex = state.cursorIndex;
      } else if (state.cursorIndex > 0 && staff.elements[state.cursorIndex - 1]?.type === 'note') {
        targetIndex = state.cursorIndex - 1;
      } else if (staff.elements[0]?.type === 'note') {
        targetIndex = 0;
      }
      if (targetIndex === -1) return state;
      const targetElement = staff.elements[targetIndex] as NoteElement;

      const nextDir = action.direction
        ? action.direction
        : targetElement.stemDirection === 'auto'
        ? 'up'
        : targetElement.stemDirection === 'up'
        ? 'down'
        : 'auto';

      const updatedNote: NoteElement = {
        ...targetElement,
        stemDirection: nextDir,
      };

      const newElements = [...staff.elements];
      newElements[targetIndex] = updatedNote;

      const newStaves = [...state.present.staves];
      newStaves[state.activeStaffIndex] = { ...staff, elements: newElements };
      const newScore = { ...state.present, staves: newStaves };

      return pushHistory(state, newScore);
    }

    case 'TOGGLE_BEAM': {
      const staff = state.present.staves[state.activeStaffIndex];
      if (!staff || staff.elements.length === 0) return state;
      let targetIndex = -1;
      if (state.cursorIndex < staff.elements.length && staff.elements[state.cursorIndex]?.type === 'note') {
        targetIndex = state.cursorIndex;
      } else if (state.cursorIndex > 0 && staff.elements[state.cursorIndex - 1]?.type === 'note') {
        targetIndex = state.cursorIndex - 1;
      } else if (staff.elements[0]?.type === 'note') {
        targetIndex = 0;
      }
      if (targetIndex === -1) return state;
      const targetElement = staff.elements[targetIndex] as NoteElement;

      const curBeam = targetElement.beam || 'auto';
      const nextBeam: BeamMode =
        curBeam === 'auto'
          ? 'break'
          : curBeam === 'break'
          ? 'join'
          : 'auto';

      const updatedNote: NoteElement = {
        ...targetElement,
        beam: nextBeam,
      };

      const newElements = [...staff.elements];
      newElements[targetIndex] = updatedNote;

      const newStaves = [...state.present.staves];
      newStaves[state.activeStaffIndex] = { ...staff, elements: newElements };
      return pushHistory(state, { ...state.present, staves: newStaves });
    }

    case 'SET_SCORE_INFO':
    case 'UPDATE_SCORE_INFO': {
      const newScore: Score = {
        ...state.present,
        info: { ...state.present.info, ...action.info },
      };
      return pushHistory(state, newScore);
    }

    case 'ADD_STAFF': {
      const newStaff: Staff = {
        id: `staff-${Date.now()}`,
        name: action.name || `Staff ${state.present.staves.length + 1}`,
        initialClef: action.clef || 'treble',
        elements: [],
        lyrics: [],
        muted: false,
        volume: 1.0,
        instrument: action.instrument || 'piano',
      };
      const newScore: Score = {
        ...state.present,
        staves: [...state.present.staves, newStaff],
      };
      return pushHistory(state, newScore);
    }

    case 'ADD_SUBSTAFF': {
      const parentIdx = state.present.staves.findIndex(s => s.id === action.parentStaffId);
      if (parentIdx === -1) return state;
      const parent = state.present.staves[parentIdx];
      const newSubstaff: Staff = {
        id: crypto.randomUUID(),
        name: `${parent.name} (Voice 2)`,
        initialClef: parent.initialClef,
        elements: [],
        lyrics: [],
        muted: false,
        volume: parent.volume,
        instrument: parent.instrument,
        substaffOf: parent.id,
      };

      const newStaves = [...state.present.staves];
      newStaves.splice(parentIdx + 1, 0, newSubstaff);

      const nextPresent: Score = {
        ...state.present,
        staves: newStaves,
      };
      return {
        ...pushHistory(state, nextPresent),
        activeStaffIndex: parentIdx + 1,
        cursorIndex: 0,
      };
    }

    case 'UPDATE_STAFF': {
      const staff = state.present.staves[action.staffIndex];
      if (!staff) return state;
      const newStaves = [...state.present.staves];
      newStaves[action.staffIndex] = { ...staff, ...action.updates };
      const newScore = { ...state.present, staves: newStaves };
      return pushHistory(state, newScore);
    }

    case 'REORDER_STAVES': {
      const { fromIndex, toIndex } = action;
      if (
        fromIndex < 0 ||
        fromIndex >= state.present.staves.length ||
        toIndex < 0 ||
        toIndex >= state.present.staves.length ||
        fromIndex === toIndex
      ) {
        return state;
      }

      const newStaves = [...state.present.staves];
      const [moved] = newStaves.splice(fromIndex, 1);
      newStaves.splice(toIndex, 0, moved);

      let newActiveStaffIndex = state.activeStaffIndex;
      if (state.activeStaffIndex === fromIndex) {
        newActiveStaffIndex = toIndex;
      } else if (state.activeStaffIndex > fromIndex && state.activeStaffIndex <= toIndex) {
        newActiveStaffIndex--;
      } else if (state.activeStaffIndex < fromIndex && state.activeStaffIndex >= toIndex) {
        newActiveStaffIndex++;
      }

      const newScore: Score = {
        ...state.present,
        staves: newStaves,
      };

      return {
        ...pushHistory(state, newScore),
        activeStaffIndex: newActiveStaffIndex,
      };
    }

    case 'REMOVE_STAFF': {
      if (state.present.staves.length <= 1) return state; // Prevent removing only staff
      const targetStaff = state.present.staves[action.staffIndex];
      if (!targetStaff) return state;

      // Filter out target staff AND any child substaves of this staff
      let newStaves = state.present.staves.filter(
        (s, idx) => idx !== action.staffIndex && s.substaffOf !== targetStaff.id
      );
      if (newStaves.length === 0) {
        newStaves = [
          {
            id: `staff-${Date.now()}`,
            name: 'Staff 1',
            initialClef: 'treble',
            elements: [],
            lyrics: [],
            muted: false,
            volume: 1.0,
            instrument: 'piano',
          },
        ];
      }

      const safeStaffIndex = Math.min(state.activeStaffIndex, newStaves.length - 1);
      const staff = newStaves[safeStaffIndex];
      const nextPresent: Score = {
        ...state.present,
        staves: newStaves,
      };
      return {
        ...pushHistory(state, nextPresent),
        activeStaffIndex: safeStaffIndex,
        cursorIndex: Math.min(state.cursorIndex, staff?.elements.length || 0),
      };
    }

    case 'SET_ACTIVE_STAFF': {
      const targetStaffIndex = Math.max(0, Math.min(action.index, state.present.staves.length - 1));
      const staff = state.present.staves[targetStaffIndex];
      return {
        ...state,
        activeStaffIndex: targetStaffIndex,
        cursorIndex: Math.min(state.cursorIndex, staff?.elements.length || 0),
      };
    }

    case 'SET_CURSOR_INDEX': {
      const currentStaff = state.present.staves[state.activeStaffIndex];
      const maxIndex = currentStaff ? currentStaff.elements.length : 0;
      return { ...state, cursorIndex: Math.max(0, Math.min(action.index, maxIndex)) };
    }

    case 'SET_PITCH_OFFSET':
      return { ...state, pitchOffset: Math.max(-14, Math.min(14, action.offset)) };

    case 'LOAD_SCORE':
      return {
        past: [],
        present: action.score,
        future: [],
        activeStaffIndex: 0,
        cursorIndex: 0,
        pitchOffset: 0,
        selectedRange: null,
        selectionAnchorIndex: null,
      };

    case 'SET_STAFF_LYRICS': {
      const staff = state.present.staves[action.staffIndex];
      if (!staff) return state;
      const newStaves = [...state.present.staves];
      newStaves[action.staffIndex] = { ...staff, lyrics: action.lyrics };
      const newScore = { ...state.present, staves: newStaves };
      return pushHistory(state, newScore);
    }

    case 'UNDO': {
      if (state.past.length === 0) return state;
      const previous = state.past[state.past.length - 1];
      const newPast = state.past.slice(0, state.past.length - 1);
      const safeStaffIndex = Math.min(state.activeStaffIndex, previous.staves.length - 1);
      return {
        ...state,
        past: newPast,
        present: previous,
        future: [state.present, ...state.future],
        activeStaffIndex: safeStaffIndex,
        cursorIndex: Math.min(state.cursorIndex, previous.staves[safeStaffIndex]?.elements.length || 0),
      };
    }

    case 'REDO': {
      if (state.future.length === 0) return state;
      const next = state.future[0];
      const newFuture = state.future.slice(1);
      const safeStaffIndex = Math.min(state.activeStaffIndex, next.staves.length - 1);
      return {
        ...state,
        past: [...state.past, state.present],
        present: next,
        future: newFuture,
        activeStaffIndex: safeStaffIndex,
        cursorIndex: Math.min(state.cursorIndex, next.staves[safeStaffIndex]?.elements.length || 0),
      };
    }

    case 'SET_SELECTION_RANGE': {
      return {
        ...state,
        selectedRange: action.range,
        selectionAnchorIndex: action.anchorIndex !== undefined ? action.anchorIndex : (state.selectionAnchorIndex ?? null),
      };
    }

    case 'CLEAR_SELECTION': {
      return {
        ...state,
        selectedRange: null,
        selectionAnchorIndex: null,
      };
    }

    case 'BATCH_SET_DURATION': {
      if (!state.selectedRange) return state;
      const start = Math.min(state.selectedRange.startIndex, state.selectedRange.endIndex);
      const end = Math.max(state.selectedRange.startIndex, state.selectedRange.endIndex);
      if (start === end) return state;
      const staff = state.present.staves[state.activeStaffIndex];
      if (!staff) return state;

      const hasNoteOrRest = staff.elements
        .slice(start, end)
        .some((e) => e.type === 'note' || e.type === 'rest');
      if (!hasNoteOrRest) return state;

      const newElements = staff.elements.map((elem, idx) => {
        if (idx >= start && idx < end) {
          if (elem.type === 'note' || elem.type === 'rest') {
            return { ...elem, duration: action.duration };
          }
        }
        return elem;
      });

      const newStaves = [...state.present.staves];
      newStaves[state.activeStaffIndex] = { ...staff, elements: newElements };
      return pushHistory(state, { ...state.present, staves: newStaves });
    }

    case 'BATCH_SET_ACCIDENTAL': {
      if (!state.selectedRange) return state;
      const start = Math.min(state.selectedRange.startIndex, state.selectedRange.endIndex);
      const end = Math.max(state.selectedRange.startIndex, state.selectedRange.endIndex);
      if (start === end) return state;
      const staff = state.present.staves[state.activeStaffIndex];
      if (!staff) return state;

      const notesInRange = staff.elements
        .slice(start, end)
        .filter((e): e is NoteElement => e.type === 'note');
      if (notesInRange.length === 0) return state;

      const allHaveIt =
        action.accidental !== undefined &&
        notesInRange.every(
          (n) => n.pitches.length > 0 && n.pitches.every((p) => p.accidental === action.accidental)
        );
      const targetAccidental = allHaveIt ? undefined : action.accidental;

      const newElements = staff.elements.map((elem, idx) => {
        if (idx >= start && idx < end && elem.type === 'note') {
          return {
            ...elem,
            pitches: elem.pitches.map((p) => {
              const updated: PitchItem = { diatonicOffset: p.diatonicOffset };
              if (targetAccidental !== undefined) {
                updated.accidental = targetAccidental;
              }
              return updated;
            }),
          };
        }
        return elem;
      });

      const newStaves = [...state.present.staves];
      newStaves[state.activeStaffIndex] = { ...staff, elements: newElements };
      return pushHistory(state, { ...state.present, staves: newStaves });
    }

    case 'BATCH_TOGGLE_DOT': {
      if (!state.selectedRange) return state;
      const start = Math.min(state.selectedRange.startIndex, state.selectedRange.endIndex);
      const end = Math.max(state.selectedRange.startIndex, state.selectedRange.endIndex);
      if (start === end) return state;
      const staff = state.present.staves[state.activeStaffIndex];
      if (!staff) return state;

      const hasNoteOrRest = staff.elements
        .slice(start, end)
        .some((e) => e.type === 'note' || e.type === 'rest');
      if (!hasNoteOrRest) return state;

      const newElements = staff.elements.map((elem, idx) => {
        if (idx >= start && idx < end) {
          if (elem.type === 'note' || elem.type === 'rest') {
            return {
              ...elem,
              dots: ((elem.dots || 0) + 1) % 3,
            };
          }
        }
        return elem;
      });

      const newStaves = [...state.present.staves];
      newStaves[state.activeStaffIndex] = { ...staff, elements: newElements };
      return pushHistory(state, { ...state.present, staves: newStaves });
    }

    case 'BATCH_CONVERT_TO_REST': {
      if (!state.selectedRange) return state;
      const start = Math.min(state.selectedRange.startIndex, state.selectedRange.endIndex);
      const end = Math.max(state.selectedRange.startIndex, state.selectedRange.endIndex);
      if (start === end) return state;
      const staff = state.present.staves[state.activeStaffIndex];
      if (!staff) return state;

      const hasNotes = staff.elements
        .slice(start, end)
        .some((e) => e.type === 'note');
      if (!hasNotes) return state;

      const newElements = staff.elements.map((elem, idx) => {
        if (idx >= start && idx < end && elem.type === 'note') {
          const rest: RestElement = {
            id: elem.id,
            type: 'rest',
            duration: elem.duration,
            dots: elem.dots,
          };
          return rest;
        }
        return elem;
      });

      const newStaves = [...state.present.staves];
      newStaves[state.activeStaffIndex] = { ...staff, elements: newElements };
      return pushHistory(state, { ...state.present, staves: newStaves });
    }

    case 'BATCH_CONVERT_TO_NOTE': {
      if (!state.selectedRange) return state;
      const start = Math.min(state.selectedRange.startIndex, state.selectedRange.endIndex);
      const end = Math.max(state.selectedRange.startIndex, state.selectedRange.endIndex);
      if (start === end) return state;
      const staff = state.present.staves[state.activeStaffIndex];
      if (!staff) return state;

      const hasRests = staff.elements
        .slice(start, end)
        .some((e) => e.type === 'rest');
      if (!hasRests) return state;

      const clampedPitch = Math.max(-14, Math.min(14, action.pitchOffset));
      const newElements = staff.elements.map((elem, idx) => {
        if (idx >= start && idx < end && elem.type === 'rest') {
          const note: NoteElement = {
            id: elem.id,
            type: 'note',
            duration: elem.duration,
            dots: elem.dots,
            pitches: [{ diatonicOffset: clampedPitch }],
            stemDirection: 'auto',
          };
          return note;
        }
        return elem;
      });

      const newStaves = [...state.present.staves];
      newStaves[state.activeStaffIndex] = { ...staff, elements: newElements };
      return pushHistory(state, { ...state.present, staves: newStaves });
    }

    case 'BATCH_TRANSPOSE': {
      if (!state.selectedRange) return state;
      const start = Math.min(state.selectedRange.startIndex, state.selectedRange.endIndex);
      const end = Math.max(state.selectedRange.startIndex, state.selectedRange.endIndex);
      if (start === end) return state;
      const staff = state.present.staves[state.activeStaffIndex];
      if (!staff) return state;

      const hasNotes = staff.elements
        .slice(start, end)
        .some((e) => e.type === 'note');
      if (!hasNotes) return state;

      const newElements = staff.elements.map((elem, idx) => {
        if (idx >= start && idx < end && elem.type === 'note') {
          return {
            ...elem,
            pitches: elem.pitches.map((p) => ({
              ...p,
              diatonicOffset: Math.max(-14, Math.min(14, p.diatonicOffset + action.delta)),
            })),
          };
        }
        return elem;
      });

      const newStaves = [...state.present.staves];
      newStaves[state.activeStaffIndex] = { ...staff, elements: newElements };
      return pushHistory(state, { ...state.present, staves: newStaves });
    }

    case 'BATCH_DELETE': {
      if (!state.selectedRange) return state;
      const start = Math.min(state.selectedRange.startIndex, state.selectedRange.endIndex);
      const end = Math.max(state.selectedRange.startIndex, state.selectedRange.endIndex);
      if (start === end) return state;
      const staff = state.present.staves[state.activeStaffIndex];
      if (!staff) return state;

      const newElements = staff.elements.filter((_, idx) => idx < start || idx >= end);
      const newStaves = [...state.present.staves];
      newStaves[state.activeStaffIndex] = { ...staff, elements: newElements };
      const newScore = { ...state.present, staves: newStaves };

      return {
        ...pushHistory(state, newScore),
        cursorIndex: Math.max(0, Math.min(start, newElements.length)),
        selectedRange: null,
        selectionAnchorIndex: null,
      };
    }

    case 'BATCH_TOGGLE_ATTRIBUTE': {
      if (!state.selectedRange) return state;
      const start = Math.min(state.selectedRange.startIndex, state.selectedRange.endIndex);
      const end = Math.max(state.selectedRange.startIndex, state.selectedRange.endIndex);
      if (start === end) return state;
      const staff = state.present.staves[state.activeStaffIndex];
      if (!staff) return state;

      if (action.attribute === 'fermata') {
        const eligibleInRange = staff.elements
          .slice(start, end)
          .filter((e): e is NoteElement | RestElement => e.type === 'note' || e.type === 'rest');
        if (eligibleInRange.length === 0) return state;

        const allHaveIt = eligibleInRange.every((e) => !!e.fermata);
        const nextVal = !allHaveIt;

        const newElements = staff.elements.map((elem, idx) => {
          if (idx >= start && idx < end && (elem.type === 'note' || elem.type === 'rest')) {
            return {
              ...elem,
              fermata: nextVal,
            };
          }
          return elem;
        });

        const newStaves = [...state.present.staves];
        newStaves[state.activeStaffIndex] = { ...staff, elements: newElements };
        return pushHistory(state, { ...state.present, staves: newStaves });
      }

      const notesInRange = staff.elements
        .slice(start, end)
        .filter((e): e is NoteElement => e.type === 'note');
      if (notesInRange.length === 0) return state;

      const allHaveIt = notesInRange.every((n) => !!n[action.attribute]);
      const nextVal = !allHaveIt;

      const newElements = staff.elements.map((elem, idx) => {
        if (idx >= start && idx < end && elem.type === 'note') {
          return {
            ...elem,
            [action.attribute]: nextVal,
          };
        }
        return elem;
      });

      const newStaves = [...state.present.staves];
      newStaves[state.activeStaffIndex] = { ...staff, elements: newElements };
      return pushHistory(state, { ...state.present, staves: newStaves });
    }

    case 'BATCH_TOGGLE_NOTE_EXPRESSION': {
      if (!state.selectedRange) return state;
      const start = Math.min(state.selectedRange.startIndex, state.selectedRange.endIndex);
      const end = Math.max(state.selectedRange.startIndex, state.selectedRange.endIndex);
      if (start === end) return state;
      const staff = state.present.staves[state.activeStaffIndex];
      if (!staff) return state;

      if (isOrnament(action.expression)) {
        const ornament = action.expression;
        const notesInRange = staff.elements
          .slice(start, end)
          .filter((e): e is NoteElement => e.type === 'note');
        if (notesInRange.length === 0) return state;

        const allHaveIt = notesInRange.every((n) => n.ornament === ornament);

        const newElements = staff.elements.map((elem, idx) => {
          if (idx >= start && idx < end && elem.type === 'note') {
            if (allHaveIt) {
              const { ornament: _, ...restNote } = elem;
              return restNote;
            } else {
              return { ...elem, ornament };
            }
          }
          return elem;
        });

        const newStaves = [...state.present.staves];
        newStaves[state.activeStaffIndex] = { ...staff, elements: newElements };
        return pushHistory(state, { ...state.present, staves: newStaves });
      }

      if (action.expression === 'fermata') {
        const eligibleInRange = staff.elements
          .slice(start, end)
          .filter((e): e is NoteElement | RestElement => e.type === 'note' || e.type === 'rest');
        if (eligibleInRange.length === 0) return state;

        const allHaveIt = eligibleInRange.every((e) => !!e.fermata);
        const nextVal = !allHaveIt;

        const newElements = staff.elements.map((elem, idx) => {
          if (idx >= start && idx < end && (elem.type === 'note' || elem.type === 'rest')) {
            return {
              ...elem,
              fermata: nextVal,
            };
          }
          return elem;
        });

        const newStaves = [...state.present.staves];
        newStaves[state.activeStaffIndex] = { ...staff, elements: newElements };
        return pushHistory(state, { ...state.present, staves: newStaves });
      }

      const notesInRange = staff.elements
        .slice(start, end)
        .filter((e): e is NoteElement => e.type === 'note');
      if (notesInRange.length === 0) return state;

      const prop = action.expression as NoteArticulation;
      const allHaveIt = notesInRange.every((n) => !!n[prop]);
      const nextVal = !allHaveIt;

      const newElements = staff.elements.map((elem, idx) => {
        if (idx >= start && idx < end && elem.type === 'note') {
          return {
            ...elem,
            [prop]: nextVal,
          };
        }
        return elem;
      });

      const newStaves = [...state.present.staves];
      newStaves[state.activeStaffIndex] = { ...staff, elements: newElements };
      return pushHistory(state, { ...state.present, staves: newStaves });
    }

    case 'BATCH_CYCLE_STEM_DIRECTION': {
      if (!state.selectedRange) return state;
      const start = Math.min(state.selectedRange.startIndex, state.selectedRange.endIndex);
      const end = Math.max(state.selectedRange.startIndex, state.selectedRange.endIndex);
      if (start === end) return state;
      const staff = state.present.staves[state.activeStaffIndex];
      if (!staff) return state;

      const notesInRange = staff.elements
        .slice(start, end)
        .filter((e): e is NoteElement => e.type === 'note');
      if (notesInRange.length === 0) return state;

      const newElements = staff.elements.map((elem, idx) => {
        if (idx >= start && idx < end && elem.type === 'note') {
          const nextDir: StemDirection =
            elem.stemDirection === 'auto'
              ? 'up'
              : elem.stemDirection === 'up'
              ? 'down'
              : 'auto';
          return {
            ...elem,
            stemDirection: nextDir,
          };
        }
        return elem;
      });

      const newStaves = [...state.present.staves];
      newStaves[state.activeStaffIndex] = { ...staff, elements: newElements };
      return pushHistory(state, { ...state.present, staves: newStaves });
    }

    case 'BATCH_TOGGLE_BEAM': {
      if (!state.selectedRange) return state;
      const start = Math.min(state.selectedRange.startIndex, state.selectedRange.endIndex);
      const end = Math.max(state.selectedRange.startIndex, state.selectedRange.endIndex);
      if (start === end) return state;
      const staff = state.present.staves[state.activeStaffIndex];
      if (!staff) return state;

      const notesInRange = staff.elements
        .slice(start, end)
        .filter((e): e is NoteElement => e.type === 'note');
      if (notesInRange.length === 0) return state;

      // If all notes in range are already joined, toggle to 'break' (unbeam).
      // Otherwise, beam them together with 'join' and a unique group ID.
      const allJoined = notesInRange.every((n) => n.beam === 'join');
      const nextBeam: BeamMode = allJoined ? 'break' : 'join';
      const newGroupId =
        nextBeam === 'join'
          ? `bg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`
          : undefined;

      const newElements = staff.elements.map((elem, idx) => {
        if (idx >= start && idx < end && elem.type === 'note') {
          return {
            ...elem,
            beam: nextBeam,
            beamGroupId: newGroupId,
          };
        }
        return elem;
      });

      // If we are beaming notes, ensure the immediately following note (if any) breaks
      // so it does not accidentally beam itself or merge with the beamed group
      if (nextBeam === 'join' && end < newElements.length) {
        const following = newElements[end];
        if (following && following.type === 'note' && !following.beam) {
          newElements[end] = {
            ...following,
            beam: 'break',
          };
        }
      }

      const newStaves = [...state.present.staves];
      newStaves[state.activeStaffIndex] = { ...staff, elements: newElements };
      return pushHistory(state, { ...state.present, staves: newStaves });
    }

    case 'BATCH_TOGGLE_TUPLET': {
      const staff = state.present.staves[state.activeStaffIndex];
      if (!staff) return state;

      if (!state.selectedRange) {
        let targetIdx = -1;
        if (
          state.cursorIndex < staff.elements.length &&
          (staff.elements[state.cursorIndex]?.type === 'note' ||
            staff.elements[state.cursorIndex]?.type === 'rest')
        ) {
          targetIdx = state.cursorIndex;
        } else if (
          state.cursorIndex > 0 &&
          (staff.elements[state.cursorIndex - 1]?.type === 'note' ||
            staff.elements[state.cursorIndex - 1]?.type === 'rest')
        ) {
          targetIdx = state.cursorIndex - 1;
        } else if (
          staff.elements[0]?.type === 'note' ||
          staff.elements[0]?.type === 'rest'
        ) {
          targetIdx = 0;
        }
        if (targetIdx === -1) return state;
        const elem = staff.elements[targetIdx];
        if (elem.type !== 'note' && elem.type !== 'rest') return state;

        const newElements = [...staff.elements];
        if (elem.tuplet) {
          const { tuplet, ...rest } = elem;
          newElements[targetIdx] = rest as typeof elem;
        } else {
          newElements[targetIdx] = {
            ...elem,
            tuplet: { actual: action.actual ?? 3, normal: action.normal ?? 2 },
          };
        }
        const newStaves = [...state.present.staves];
        newStaves[state.activeStaffIndex] = { ...staff, elements: newElements };
        return pushHistory(state, { ...state.present, staves: newStaves });
      }

      const start = Math.min(state.selectedRange.startIndex, state.selectedRange.endIndex);
      const end = Math.max(state.selectedRange.startIndex, state.selectedRange.endIndex);
      if (start === end) return state;

      const rhythmInRange = staff.elements
        .slice(start, end)
        .filter((e): e is NoteElement | RestElement => e.type === 'note' || e.type === 'rest');
      if (rhythmInRange.length === 0) return state;

      const allHaveTuplet = rhythmInRange.every((e) => !!e.tuplet);
      const actualCount = action.actual ?? (rhythmInRange.length > 0 ? rhythmInRange.length : 3);
      const normalCount = action.normal ?? (actualCount === 3 ? 2 : actualCount <= 4 ? 2 : 4);

      const newElements = staff.elements.map((elem, idx) => {
        if (idx >= start && idx < end && (elem.type === 'note' || elem.type === 'rest')) {
          if (allHaveTuplet) {
            const { tuplet, ...rest } = elem;
            return rest as typeof elem;
          } else {
            return {
              ...elem,
              tuplet: {
                actual: actualCount,
                normal: normalCount,
              },
            };
          }
        }
        return elem;
      });

      const newStaves = [...state.present.staves];
      newStaves[state.activeStaffIndex] = { ...staff, elements: newElements };
      return pushHistory(state, { ...state.present, staves: newStaves });
    }

    case 'TOGGLE_AUTO_BEAMING': {
      const cur = state.present.info.autoBeaming === true;
      const newScore: Score = {
        ...state.present,
        info: {
          ...state.present.info,
          autoBeaming: !cur,
        },
      };
      return pushHistory(state, newScore);
    }

    case 'TOGGLE_SLUR_RANGE': {
      const staff = state.present.staves[state.activeStaffIndex];
      if (!staff || staff.elements.length === 0) return state;

      // Determine if active selection range with >= 2 notes
      if (state.selectedRange && state.selectedRange.startIndex !== state.selectedRange.endIndex) {
        const start = Math.min(state.selectedRange.startIndex, state.selectedRange.endIndex);
        const end = Math.max(state.selectedRange.startIndex, state.selectedRange.endIndex);
        const notesWithIndices: { note: NoteElement; index: number }[] = [];
        for (let i = start; i < end; i++) {
          const elem = staff.elements[i];
          if (elem && elem.type === 'note') {
            notesWithIndices.push({ note: elem, index: i });
          }
        }

        if (notesWithIndices.length >= 2) {
          const first = notesWithIndices[0];
          const last = notesWithIndices[notesWithIndices.length - 1];
          const isTargetingLast = first.note.slur?.targetNoteId === last.note.id;

          const newElements = [...staff.elements];
          if (isTargetingLast) {
            // Remove slur
            const updatedFirst: NoteElement = { ...first.note };
            delete updatedFirst.slur;
            newElements[first.index] = updatedFirst;
          } else {
            // Attach slur
            newElements[first.index] = {
              ...first.note,
              slur: {
                targetNoteId: last.note.id,
                direction: action.direction || 'auto',
              },
            };
          }
          const newStaves = [...state.present.staves];
          newStaves[state.activeStaffIndex] = { ...staff, elements: newElements };
          return pushHistory(state, { ...state.present, staves: newStaves });
        }
      }

      // If no valid multi-note selection, target single note at cursor
      let targetIndex = -1;
      if (state.cursorIndex < staff.elements.length && staff.elements[state.cursorIndex]?.type === 'note') {
        targetIndex = state.cursorIndex;
      } else if (state.cursorIndex > 0 && staff.elements[state.cursorIndex - 1]?.type === 'note') {
        targetIndex = state.cursorIndex - 1;
      } else {
        targetIndex = staff.elements.findIndex((e) => e.type === 'note');
      }

      if (targetIndex === -1) return state;
      const targetNote = staff.elements[targetIndex] as NoteElement;

      if (targetNote.slur) {
        // Toggle off
        const updated: NoteElement = { ...targetNote };
        delete updated.slur;
        const newElements = [...staff.elements];
        newElements[targetIndex] = updated;
        const newStaves = [...state.present.staves];
        newStaves[state.activeStaffIndex] = { ...staff, elements: newElements };
        return pushHistory(state, { ...state.present, staves: newStaves });
      } else {
        // Connect to next note if available
        let nextNoteIndex = -1;
        for (let i = targetIndex + 1; i < staff.elements.length; i++) {
          if (staff.elements[i].type === 'note') {
            nextNoteIndex = i;
            break;
          }
        }
        if (nextNoteIndex === -1) return state;
        const nextNote = staff.elements[nextNoteIndex] as NoteElement;

        const updated: NoteElement = {
          ...targetNote,
          slur: {
            targetNoteId: nextNote.id,
            direction: action.direction || 'auto',
          },
        };
        const newElements = [...staff.elements];
        newElements[targetIndex] = updated;
        const newStaves = [...state.present.staves];
        newStaves[state.activeStaffIndex] = { ...staff, elements: newElements };
        return pushHistory(state, { ...state.present, staves: newStaves });
      }
    }

    case 'CYCLE_SLUR_DIRECTION': {
      const staff = state.present.staves[state.activeStaffIndex];
      if (!staff || staff.elements.length === 0) return state;

      let targetIndex = -1;
      if (state.selectedRange && state.selectedRange.startIndex !== state.selectedRange.endIndex) {
        const start = Math.min(state.selectedRange.startIndex, state.selectedRange.endIndex);
        const end = Math.max(state.selectedRange.startIndex, state.selectedRange.endIndex);
        for (let i = start; i < end; i++) {
          const elem = staff.elements[i];
          if (elem && elem.type === 'note' && (elem as NoteElement).slur) {
            targetIndex = i;
            break;
          }
        }
      }

      if (targetIndex === -1) {
        if (state.cursorIndex < staff.elements.length && (staff.elements[state.cursorIndex] as NoteElement)?.slur) {
          targetIndex = state.cursorIndex;
        } else if (state.cursorIndex > 0 && (staff.elements[state.cursorIndex - 1] as NoteElement)?.slur) {
          targetIndex = state.cursorIndex - 1;
        } else {
          targetIndex = staff.elements.findIndex((e) => e.type === 'note' && (e as NoteElement).slur);
        }
      }

      if (targetIndex === -1) return state;
      const targetNote = staff.elements[targetIndex] as NoteElement;
      if (!targetNote.slur) return state;

      const currentDir: SlurDirection = targetNote.slur.direction || 'auto';
      const nextDir: SlurDirection =
        currentDir === 'auto'
          ? 'above'
          : currentDir === 'above'
          ? 'below'
          : 'auto';

      const updatedNote: NoteElement = {
        ...targetNote,
        slur: {
          ...targetNote.slur,
          direction: nextDir,
        },
      };

      const newElements = [...staff.elements];
      newElements[targetIndex] = updatedNote;
      const newStaves = [...state.present.staves];
      newStaves[state.activeStaffIndex] = { ...staff, elements: newElements };
      return pushHistory(state, { ...state.present, staves: newStaves });
    }

    case 'TOGGLE_HAIRPIN_RANGE': {
      const staff = state.present.staves[state.activeStaffIndex];
      if (!staff || staff.elements.length === 0) return state;

      // Determine if active selection range with >= 2 notes
      if (state.selectedRange && state.selectedRange.startIndex !== state.selectedRange.endIndex) {
        const start = Math.min(state.selectedRange.startIndex, state.selectedRange.endIndex);
        const end = Math.max(state.selectedRange.startIndex, state.selectedRange.endIndex);
        const notesWithIndices: { note: NoteElement; index: number }[] = [];
        for (let i = start; i < end; i++) {
          const elem = staff.elements[i];
          if (elem && elem.type === 'note') {
            notesWithIndices.push({ note: elem, index: i });
          }
        }

        if (notesWithIndices.length >= 2) {
          const first = notesWithIndices[0];
          const last = notesWithIndices[notesWithIndices.length - 1];
          const isSameHairpin =
            first.note.hairpin?.targetNoteId === last.note.id &&
            first.note.hairpin?.type === action.hairpinType;

          const newElements = [...staff.elements];
          if (isSameHairpin) {
            // Remove hairpin
            const updatedFirst: NoteElement = { ...first.note };
            delete updatedFirst.hairpin;
            newElements[first.index] = updatedFirst;
          } else {
            // Attach or replace hairpin
            newElements[first.index] = {
              ...first.note,
              hairpin: {
                type: action.hairpinType,
                targetNoteId: last.note.id,
              },
            };
          }
          const newStaves = [...state.present.staves];
          newStaves[state.activeStaffIndex] = { ...staff, elements: newElements };
          return pushHistory(state, { ...state.present, staves: newStaves });
        }
      }

      // If no valid multi-note selection, target single note at cursor
      let targetIndex = -1;
      if (state.cursorIndex < staff.elements.length && staff.elements[state.cursorIndex]?.type === 'note') {
        targetIndex = state.cursorIndex;
      } else if (state.cursorIndex > 0 && staff.elements[state.cursorIndex - 1]?.type === 'note') {
        targetIndex = state.cursorIndex - 1;
      } else {
        targetIndex = staff.elements.findIndex((e) => e.type === 'note');
      }

      if (targetIndex !== -1) {
        const targetNote = staff.elements[targetIndex] as NoteElement;
        const newElements = [...staff.elements];
        if (targetNote.hairpin) {
          const updated: NoteElement = { ...targetNote };
          delete updated.hairpin;
          newElements[targetIndex] = updated;
        } else {
          // Look for next note in staff to target
          const nextNote = staff.elements.slice(targetIndex + 1).find((e): e is NoteElement => e.type === 'note');
          if (nextNote) {
            newElements[targetIndex] = {
              ...targetNote,
              hairpin: {
                type: action.hairpinType,
                targetNoteId: nextNote.id,
              },
            };
          } else {
            return state;
          }
        }
        const newStaves = [...state.present.staves];
        newStaves[state.activeStaffIndex] = { ...staff, elements: newElements };
        return pushHistory(state, { ...state.present, staves: newStaves });
      }

      return state;
    }

    case 'COPY_SELECTION': {
      const staff = state.present.staves[state.activeStaffIndex];
      if (!staff || staff.elements.length === 0) return state;

      let elementsToCopy: MusicElement[] = [];

      if (state.selectedRange) {
        const start = Math.min(state.selectedRange.startIndex, state.selectedRange.endIndex);
        const end = Math.max(state.selectedRange.startIndex, state.selectedRange.endIndex);
        if (start !== end) {
          elementsToCopy = staff.elements.slice(start, end);
        }
      }

      if (elementsToCopy.length === 0) {
        const target =
          staff.elements[state.cursorIndex] ??
          (state.cursorIndex > 0 ? staff.elements[state.cursorIndex - 1] : undefined);
        if (target) {
          elementsToCopy = [target];
        }
      }

      if (elementsToCopy.length === 0) return state;

      const cloned = JSON.parse(JSON.stringify(elementsToCopy)) as MusicElement[];

      return {
        ...state,
        clipboard: cloned,
      };
    }

    case 'CUT_SELECTION': {
      const staff = state.present.staves[state.activeStaffIndex];
      if (!staff || staff.elements.length === 0) return state;

      let start = -1;
      let end = -1;
      let elementsToCut: MusicElement[] = [];

      if (state.selectedRange) {
        const rStart = Math.min(state.selectedRange.startIndex, state.selectedRange.endIndex);
        const rEnd = Math.max(state.selectedRange.startIndex, state.selectedRange.endIndex);
        if (rStart !== rEnd) {
          start = rStart;
          end = rEnd;
          elementsToCut = staff.elements.slice(start, end);
        }
      }

      if (elementsToCut.length === 0) {
        if (state.cursorIndex < staff.elements.length) {
          start = state.cursorIndex;
          end = state.cursorIndex + 1;
          elementsToCut = [staff.elements[state.cursorIndex]];
        } else if (state.cursorIndex > 0 && staff.elements.length > 0) {
          start = state.cursorIndex - 1;
          end = state.cursorIndex;
          elementsToCut = [staff.elements[start]];
        }
      }

      if (elementsToCut.length === 0) return state;

      const cloned = JSON.parse(JSON.stringify(elementsToCut)) as MusicElement[];
      const newElements = staff.elements.filter((_, idx) => idx < start || idx >= end);
      const newStaves = [...state.present.staves];
      newStaves[state.activeStaffIndex] = { ...staff, elements: newElements };
      const newScore = { ...state.present, staves: newStaves };

      return {
        ...pushHistory(state, newScore),
        clipboard: cloned,
        cursorIndex: Math.max(0, Math.min(start, newElements.length)),
        selectedRange: null,
        selectionAnchorIndex: null,
      };
    }

    case 'PASTE_CLIPBOARD': {
      if (!state.clipboard || state.clipboard.length === 0) return state;
      const staff = state.present.staves[state.activeStaffIndex];
      if (!staff) return state;

      const idMap = new Map<string, string>();
      state.clipboard.forEach((elem) => {
        const newId = `${elem.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
        idMap.set(elem.id, newId);
      });

      const pastedElements: MusicElement[] = state.clipboard.map((elem) => {
        const cloned = JSON.parse(JSON.stringify(elem)) as MusicElement;
        cloned.id =
          idMap.get(elem.id) ||
          `${elem.type}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

        if (cloned.type === 'note' && cloned.slur) {
          if (idMap.has(cloned.slur.targetNoteId)) {
            cloned.slur = {
              ...cloned.slur,
              targetNoteId: idMap.get(cloned.slur.targetNoteId)!,
            };
          } else {
            delete cloned.slur;
          }
        }

        if (cloned.type === 'note' && cloned.hairpin) {
          if (idMap.has(cloned.hairpin.targetNoteId)) {
            cloned.hairpin = {
              ...cloned.hairpin,
              targetNoteId: idMap.get(cloned.hairpin.targetNoteId)!,
            };
          } else {
            delete cloned.hairpin;
          }
        }

        return cloned;
      });

      const insertIndex = Math.max(0, Math.min(state.cursorIndex, staff.elements.length));
      const newElements = [...staff.elements];
      newElements.splice(insertIndex, 0, ...pastedElements);

      const newStaves = [...state.present.staves];
      newStaves[state.activeStaffIndex] = { ...staff, elements: newElements };
      const newScore = { ...state.present, staves: newStaves };

      const newCursorIndex = insertIndex + pastedElements.length;

      return {
        ...pushHistory(state, newScore),
        cursorIndex: newCursorIndex,
        selectedRange: {
          startIndex: insertIndex,
          endIndex: newCursorIndex,
        },
        selectionAnchorIndex: insertIndex,
      };
    }

    default:
      return state;
  }
}

