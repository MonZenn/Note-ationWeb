import React, { useEffect } from 'react';
import { ScoreAction, ScoreState } from '../state/scoreStore';
import { DurationValue, AccidentalType, TextCategory } from '../types/score';
import { playPitchAudition } from '../engine/audio/synth';
import { getStaffContextAt } from '../utils/pitchUtils';

export interface EntryState {
  duration: DurationValue;
  accidental?: AccidentalType;
  dots: number;
  pitchOffset: number;
  tieOut?: boolean;
  slurOut?: boolean;
}

export interface ShortcutCallbacks {
  onPlayToggle?: () => void;
  onOpenClef?: () => void;
  onOpenKey?: () => void;
  onOpenTime?: () => void;
  onOpenRepeat?: () => void;
  onOpenFlow?: () => void;
  onOpenText?: (category?: TextCategory) => void;
  onOpenExpression?: () => void;
  onOpenTempo?: () => void;
  onOpenPageSetup?: () => void;
}

export type KeyboardShortcutsOptions = ShortcutCallbacks;

export type KeyActionOutput =
  | ScoreAction
  | { entryUpdate: Partial<EntryState> }
  | { modal: 'clef' | 'key' | 'time' | 'repeat' | 'flow' | 'text' | 'expression' | 'tempo' }
  | null;

export function mapKeyToScoreAction(
  key: string,
  ctrlKey: boolean,
  shiftKey: boolean,
  entry: EntryState,
  metaKey: boolean = false,
  altKey: boolean = false
): KeyActionOutput {
  const isCtrl = ctrlKey || metaKey;

  // Single-key shortcuts without Ctrl/Cmd
  if (!isCtrl) {
    // Duration keys: 1-6
    if (key === '1') return { entryUpdate: { duration: 1 } };
    if (key === '2') return { entryUpdate: { duration: 2 } };
    if (key === '3') return { entryUpdate: { duration: 4 } };
    if (key === '4') return { entryUpdate: { duration: 8 } };
    if (key === '5') return { entryUpdate: { duration: 16 } };
    if (key === '6') return { entryUpdate: { duration: 32 } };

    // Hairpin Spanners: < / Shift+, (crescendo), > / Shift+. (decrescendo)
    if (key === '<' || (shiftKey && key === ',')) {
      return { type: 'TOGGLE_HAIRPIN_RANGE', hairpinType: 'crescendo' };
    }
    if (key === '>' || (shiftKey && key === '.')) {
      return { type: 'TOGGLE_HAIRPIN_RANGE', hairpinType: 'decrescendo' };
    }

    // Dot: .
    if (key === '.') {
      const nextDots = (entry.dots + 1) % 3;
      return { entryUpdate: { dots: nextDots } };
    }

    // Accidentals: 7=natural, 8=flat, 9=sharp (toggle on and off)
    if (key === '7') return { entryUpdate: { accidental: entry.accidental === 'natural' ? undefined : 'natural' } };
    if (key === '8') return { entryUpdate: { accidental: entry.accidental === 'flat' ? undefined : 'flat' } };
    if (key === '9') return { entryUpdate: { accidental: entry.accidental === 'sharp' ? undefined : 'sharp' } };


    // Articulations & Slurs
    if (shiftKey && (key === '/' || key === '?')) return { type: 'CYCLE_SLUR_DIRECTION' };
    if (key === 'v' || key === 'V') return { type: 'CYCLE_SLUR_DIRECTION' };
    if (key === '/') return { type: 'TOGGLE_SLUR_RANGE' };
    if (key === ';') return { type: 'TOGGLE_NOTE_ATTRIBUTE', attribute: 'tieOut' };
    if (key === ',') return { type: 'TOGGLE_NOTE_ATTRIBUTE', attribute: 'staccato' };
    if (key === '_' || (shiftKey && key === '-')) return { type: 'TOGGLE_NOTE_ATTRIBUTE', attribute: 'tenuto' };


    // Structural & Expression Dialog Shortcuts
    if (altKey && (key === 't' || key === 'T')) return { modal: 'tempo' };
    if (key === 'c' || key === 'C') return { modal: 'clef' };
    if (key === 'k' || key === 'K') return { modal: 'key' };
    // Triplet shortcut: Shift + T
    if (shiftKey && (key === 't' || key === 'T')) return { type: 'BATCH_TOGGLE_TUPLET', actual: 3, normal: 2 };
    if (key === 'T' && !shiftKey) return { modal: 'time' };
    if (key === 't' && !shiftKey) return { modal: 'text' };
    if (key === 'r' || key === 'R') return { modal: 'repeat' };
    if (key === 'f' || key === 'F') return { modal: 'flow' };
    if (key === 'x' || key === 'X') return { modal: 'expression' };
    if (shiftKey && (key === 'e' || key === 'E')) return { modal: 'expression' };

    // Navigation Shortcuts
    if (key === 'Home') return { type: 'SET_CURSOR_INDEX', index: 0 };
    if (key === 'End') return { type: 'SET_CURSOR_INDEX', index: Infinity };

    // Stem Direction toggle ('d' / 'D' or Shift + Arrow keys)
    if (key === 'd' || key === 'D') return { type: 'TOGGLE_STEM_DIRECTION' };
    if (shiftKey && (key === 'ArrowUp' || key === 'ArrowDown')) {
      return { type: 'TOGGLE_STEM_DIRECTION' };
    }

    // Beam toggle ('b' / 'B')
    if (key === 'b' || key === 'B') return { type: 'TOGGLE_BEAM' };

    // Tab: Insert standard single bar line
    if (key === 'Tab') {
      return {
        type: 'INSERT_ELEMENT',
        element: {
          id: `bar-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: 'bar',
          barType: 'single',
        },
      };
    }

    // Space: Insert rest
    if (key === ' ') {
      return {
        type: 'INSERT_ELEMENT',
        element: {
          id: `rest-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
          type: 'rest',
          duration: entry.duration,
          dots: entry.dots,
        },
      };
    }

    // Deletions
    if (key === 'Backspace') return { type: 'DELETE_PRECEDING' };
    if (key === 'Delete') return { type: 'DELETE_FOLLOWING' };
  }

  // Enter: Insert note / Ctrl+Enter: Add chord note
  if (key === 'Enter') {
    if (isCtrl) {
      return {
        type: 'ADD_CHORD_PITCH',
        pitch: { diatonicOffset: entry.pitchOffset, accidental: entry.accidental },
      };
    }
    return {
      type: 'INSERT_ELEMENT',
      element: {
        id: `note-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        type: 'note',
        duration: entry.duration,
        dots: entry.dots,
        pitches: [{ diatonicOffset: entry.pitchOffset, accidental: entry.accidental }],
        stemDirection: 'auto',
        tieOut: entry.tieOut,
        slurOut: entry.slurOut,
      },
    };
  }

  // Undo / Redo
  if (isCtrl && (key === 'z' || key === 'Z')) {
    return shiftKey ? { type: 'REDO' } : { type: 'UNDO' };
  }
  if (isCtrl && (key === 'y' || key === 'Y')) {
    return { type: 'REDO' };
  }

  // Clipboard shortcuts
  if (isCtrl && (key === 'c' || key === 'C')) {
    return { type: 'COPY_SELECTION' };
  }
  if (isCtrl && (key === 'x' || key === 'X')) {
    return { type: 'CUT_SELECTION' };
  }
  if (isCtrl && (key === 'v' || key === 'V')) {
    return { type: 'PASTE_CLIPBOARD' };
  }

  return null;
}

export function handleKeyDown(
  e: KeyboardEvent,
  state: ScoreState,
  dispatch: React.Dispatch<ScoreAction> | ((action: ScoreAction) => void),
  entryState: EntryState,
  setEntryState: React.Dispatch<React.SetStateAction<EntryState>> | ((update: React.SetStateAction<EntryState>) => void),
  isModalOpen: boolean,
  onPlayToggle?: (() => void) | ShortcutCallbacks,
  dialogCallbacks?: ShortcutCallbacks
): void {
  // Strictly suspend notation shortcuts when typing in form fields or modals
  const target = e.target as HTMLElement | null;
  if (
    isModalOpen ||
    target?.tagName === 'INPUT' ||
    target?.tagName === 'TEXTAREA' ||
    target?.tagName === 'SELECT' ||
    Boolean(target?.isContentEditable)
  ) {
    return;
  }

  const playToggleFn =
    typeof onPlayToggle === 'function' ? onPlayToggle : onPlayToggle?.onPlayToggle;
  const openClefFn =
    dialogCallbacks?.onOpenClef ||
    (typeof onPlayToggle === 'object' ? onPlayToggle?.onOpenClef : undefined);
  const openKeyFn =
    dialogCallbacks?.onOpenKey ||
    (typeof onPlayToggle === 'object' ? onPlayToggle?.onOpenKey : undefined);
  const openTimeFn =
    dialogCallbacks?.onOpenTime ||
    (typeof onPlayToggle === 'object' ? onPlayToggle?.onOpenTime : undefined);
  const openRepeatFn =
    dialogCallbacks?.onOpenRepeat ||
    (typeof onPlayToggle === 'object' ? onPlayToggle?.onOpenRepeat : undefined);
  const openFlowFn =
    dialogCallbacks?.onOpenFlow ||
    (typeof onPlayToggle === 'object' ? onPlayToggle?.onOpenFlow : undefined);
  const openTextFn =
    dialogCallbacks?.onOpenText ||
    (typeof onPlayToggle === 'object' ? onPlayToggle?.onOpenText : undefined);
  const openExpressionFn =
    dialogCallbacks?.onOpenExpression ||
    (typeof onPlayToggle === 'object' ? onPlayToggle?.onOpenExpression : undefined);
  const openTempoFn =
    dialogCallbacks?.onOpenTempo ||
    (typeof onPlayToggle === 'object' ? onPlayToggle?.onOpenTempo : undefined);
  const openPageSetupFn =
    dialogCallbacks?.onOpenPageSetup ||
    (typeof onPlayToggle === 'object' ? onPlayToggle?.onOpenPageSetup : undefined);

  // Direct Tempo Shortcut: Alt / Option + T
  if (e.altKey && (e.key === 't' || e.key === 'T')) {
    e.preventDefault();
    openTempoFn?.();
    return;
  }

  // Triplet Shortcut: Shift + T
  if (e.shiftKey && (e.key === 't' || e.key === 'T') && !e.altKey && !e.ctrlKey && !e.metaKey) {
    e.preventDefault();
    dispatch({ type: 'BATCH_TOGGLE_TUPLET', actual: 3, normal: 2 });
    return;
  }

  const isCtrl = e.ctrlKey || e.metaKey;

  // Page Setup Shortcut: Ctrl/Cmd + Shift + P
  if (isCtrl && e.shiftKey && (e.key === 'p' || e.key === 'P')) {
    e.preventDefault();
    openPageSetupFn?.();
    return;
  }

  // Direct Text Category Shortcuts: Ctrl/Cmd + K (chord), Ctrl/Cmd + M (part)
  if (isCtrl && (e.key === 'k' || e.key === 'K')) {
    e.preventDefault();
    openTextFn?.('chord');
    return;
  }
  if (isCtrl && (e.key === 'm' || e.key === 'M')) {
    e.preventDefault();
    openTextFn?.('part');
    return;
  }

  if (e.key === 'F5' || e.key === 'F6') {
    e.preventDefault();
    playToggleFn?.();
    return;
  }

  // Shift + Arrow navigation for range selection
  if (e.shiftKey && (e.key === 'ArrowRight' || e.key === 'ArrowLeft')) {
    e.preventDefault();
    const currentStaff = state.present.staves[state.activeStaffIndex];
    const maxIdx = currentStaff ? currentStaff.elements.length : 0;
    const anchor = state.selectionAnchorIndex ?? state.cursorIndex;

    let nextCursor = e.key === 'ArrowRight' ? state.cursorIndex + 1 : state.cursorIndex - 1;
    nextCursor = Math.max(0, Math.min(maxIdx, nextCursor));

    if (nextCursor === anchor) {
      dispatch({ type: 'CLEAR_SELECTION' });
      dispatch({ type: 'SET_CURSOR_INDEX', index: nextCursor });
    } else {
      const start = Math.min(anchor, nextCursor);
      const end = Math.max(anchor, nextCursor);
      dispatch({
        type: 'SET_SELECTION_RANGE',
        range: { startIndex: start, endIndex: end },
        anchorIndex: anchor,
      });
      dispatch({ type: 'SET_CURSOR_INDEX', index: nextCursor });
    }
    return;
  }

  if (e.key === 'ArrowLeft') {
    e.preventDefault();
    dispatch({ type: 'CLEAR_SELECTION' });
    dispatch({ type: 'SET_CURSOR_INDEX', index: state.cursorIndex - 1 });
    return;
  }

  if (e.key === 'ArrowRight') {
    e.preventDefault();
    dispatch({ type: 'CLEAR_SELECTION' });
    dispatch({ type: 'SET_CURSOR_INDEX', index: state.cursorIndex + 1 });
    return;
  }

  if (e.key === 'ArrowUp') {
    e.preventDefault();
    if (e.shiftKey) {
      dispatch({ type: 'TOGGLE_STEM_DIRECTION' });
    } else if (isCtrl) {
      dispatch({ type: 'SET_ACTIVE_STAFF', index: state.activeStaffIndex - 1 });
    } else if (state.selectedRange) {
      dispatch({ type: 'BATCH_TRANSPOSE', delta: 1 });
    } else {
      setEntryState((prev) => ({ ...prev, pitchOffset: Math.min(14, prev.pitchOffset + 1) }));
    }
    return;
  }

  if (e.key === 'ArrowDown') {
    e.preventDefault();
    if (e.shiftKey) {
      dispatch({ type: 'TOGGLE_STEM_DIRECTION' });
    } else if (isCtrl) {
      dispatch({ type: 'SET_ACTIVE_STAFF', index: state.activeStaffIndex + 1 });
    } else if (state.selectedRange) {
      dispatch({ type: 'BATCH_TRANSPOSE', delta: -1 });
    } else {
      setEntryState((prev) => ({ ...prev, pitchOffset: Math.max(-14, prev.pitchOffset - 1) }));
    }
    return;
  }

  if (e.key === 'Home') {
    e.preventDefault();
    dispatch({ type: 'CLEAR_SELECTION' });
    dispatch({ type: 'SET_CURSOR_INDEX', index: 0 });
    return;
  }

  if (e.key === 'End') {
    e.preventDefault();
    dispatch({ type: 'CLEAR_SELECTION' });
    const currentStaff = state.present.staves[state.activeStaffIndex];
    dispatch({ type: 'SET_CURSOR_INDEX', index: currentStaff ? currentStaff.elements.length : 0 });
    return;
  }

  // Batch actions when selection is active
  if (state.selectedRange) {
    if (!isCtrl) {
      // Duration keys: 1-6
      if (e.key === '1') {
        e.preventDefault();
        dispatch({ type: 'BATCH_SET_DURATION', duration: 1 });
        return;
      }
      if (e.key === '2') {
        e.preventDefault();
        dispatch({ type: 'BATCH_SET_DURATION', duration: 2 });
        return;
      }
      if (e.key === '3') {
        e.preventDefault();
        dispatch({ type: 'BATCH_SET_DURATION', duration: 4 });
        return;
      }
      if (e.key === '4') {
        e.preventDefault();
        dispatch({ type: 'BATCH_SET_DURATION', duration: 8 });
        return;
      }
      if (e.key === '5') {
        e.preventDefault();
        dispatch({ type: 'BATCH_SET_DURATION', duration: 16 });
        return;
      }
      if (e.key === '6') {
        e.preventDefault();
        dispatch({ type: 'BATCH_SET_DURATION', duration: 32 });
        return;
      }

      // Accidentals: 7=natural, 8=flat, 9=sharp
      if (e.key === '7') {
        e.preventDefault();
        dispatch({ type: 'BATCH_SET_ACCIDENTAL', accidental: 'natural' });
        return;
      }
      if (e.key === '8') {
        e.preventDefault();
        dispatch({ type: 'BATCH_SET_ACCIDENTAL', accidental: 'flat' });
        return;
      }
      if (e.key === '9') {
        e.preventDefault();
        dispatch({ type: 'BATCH_SET_ACCIDENTAL', accidental: 'sharp' });
        return;
      }

      // Dot: .
      if (e.key === '.') {
        e.preventDefault();
        dispatch({ type: 'BATCH_TOGGLE_DOT' });
        return;
      }

      // Space: Convert to rest
      if (e.key === ' ') {
        e.preventDefault();
        dispatch({ type: 'BATCH_CONVERT_TO_REST' });
        return;
      }

      // Enter: Convert to note with current pitchOffset
      if (e.key === 'Enter') {
        e.preventDefault();
        dispatch({ type: 'BATCH_CONVERT_TO_NOTE', pitchOffset: entryState.pitchOffset });
        return;
      }

      // Deletions: Backspace / Delete
      if (e.key === 'Backspace' || e.key === 'Delete') {
        e.preventDefault();
        dispatch({ type: 'BATCH_DELETE' });
        return;
      }

      // Slurs: / and v / Shift + /
      if (e.key === '/') {
        if (e.shiftKey) {
          e.preventDefault();
          dispatch({ type: 'CYCLE_SLUR_DIRECTION' });
          return;
        }
        e.preventDefault();
        dispatch({ type: 'TOGGLE_SLUR_RANGE' });
        return;
      }
      if (e.key === '?' && e.shiftKey) {
        e.preventDefault();
        dispatch({ type: 'CYCLE_SLUR_DIRECTION' });
        return;
      }
      if (e.key === 'v' || e.key === 'V') {
        e.preventDefault();
        dispatch({ type: 'CYCLE_SLUR_DIRECTION' });
        return;
      }
      if (e.key === ';') {
        e.preventDefault();
        dispatch({ type: 'BATCH_TOGGLE_ATTRIBUTE', attribute: 'tieOut' });
        return;
      }

      // Hairpins: < (crescendo) and > (decrescendo)
      if (e.key === '<' || (e.shiftKey && e.key === ',')) {
        e.preventDefault();
        dispatch({ type: 'TOGGLE_HAIRPIN_RANGE', hairpinType: 'crescendo' });
        return;
      }
      if (e.key === '>' || (e.shiftKey && e.key === '.')) {
        e.preventDefault();
        dispatch({ type: 'TOGGLE_HAIRPIN_RANGE', hairpinType: 'decrescendo' });
        return;
      }

      if (e.key === ',') {
        e.preventDefault();
        dispatch({ type: 'BATCH_TOGGLE_ATTRIBUTE', attribute: 'staccato' });
        return;
      }
      if (e.key === '_' || (e.shiftKey && e.key === '-')) {
        e.preventDefault();
        dispatch({ type: 'BATCH_TOGGLE_ATTRIBUTE', attribute: 'tenuto' });
        return;
      }

      // Stem Direction: 'd' / 'D'
      if (e.key === 'd' || e.key === 'D') {
        e.preventDefault();
        dispatch({ type: 'BATCH_CYCLE_STEM_DIRECTION' });
        return;
      }

      // Beam: 'b' / 'B'
      if (e.key === 'b' || e.key === 'B') {
        e.preventDefault();
        dispatch({ type: 'BATCH_TOGGLE_BEAM' });
        return;
      }
    }
  }

  if (e.key === 'PageUp') {
    e.preventDefault();
    const currentStaff = state.present.staves[state.activeStaffIndex];
    if (!currentStaff) return;
    let targetIdx = 0;
    for (let i = state.cursorIndex - 1; i >= 0; i--) {
      if (currentStaff.elements[i].type === 'bar') {
        targetIdx = i;
        break;
      }
    }
    dispatch({ type: 'SET_CURSOR_INDEX', index: targetIdx });
    return;
  }

  if (e.key === 'PageDown') {
    e.preventDefault();
    const currentStaff = state.present.staves[state.activeStaffIndex];
    if (!currentStaff) return;
    let targetIdx = currentStaff.elements.length;
    for (let i = state.cursorIndex + 1; i < currentStaff.elements.length; i++) {
      if (currentStaff.elements[i].type === 'bar') {
        targetIdx = i;
        break;
      }
    }
    dispatch({ type: 'SET_CURSOR_INDEX', index: targetIdx });
    return;
  }

  const mapped = mapKeyToScoreAction(e.key, e.ctrlKey, e.shiftKey, entryState, e.metaKey, e.altKey);
  if (mapped) {
    e.preventDefault();
    if ('entryUpdate' in mapped) {
      setEntryState((prev) => ({ ...prev, ...mapped.entryUpdate }));
    } else if ('modal' in mapped) {
      if (mapped.modal === 'clef') openClefFn?.();
      if (mapped.modal === 'key') openKeyFn?.();
      if (mapped.modal === 'time') openTimeFn?.();
      if (mapped.modal === 'repeat') openRepeatFn?.();
      if (mapped.modal === 'flow') openFlowFn?.();
      if (mapped.modal === 'text') openTextFn?.(undefined);
      if (mapped.modal === 'expression') openExpressionFn?.();
    } else {
      if (mapped.type === 'TOGGLE_NOTE_ATTRIBUTE') {
        if (mapped.attribute === 'slurOut') {
          setEntryState((prev) => ({ ...prev, slurOut: !prev.slurOut }));
        } else if (mapped.attribute === 'tieOut') {
          setEntryState((prev) => ({ ...prev, tieOut: !prev.tieOut }));
        }
      } else if (mapped.type === 'TOGGLE_SLUR_RANGE') {
        setEntryState((prev) => ({ ...prev, slurOut: !prev.slurOut }));
      } else if (mapped.type === 'INSERT_ELEMENT' && mapped.element.type === 'note') {

        const staff = state.present.staves[state.activeStaffIndex];
        const context = getStaffContextAt(staff, state.cursorIndex);
        const pitch = mapped.element.pitches[0];
        if (pitch) {
          playPitchAudition(
            pitch.diatonicOffset,
            context.clef,
            pitch.accidental,
            context.keyAccidentalsCount,
            context.instrument,
            0.3
          );
        }
      } else if (mapped.type === 'ADD_CHORD_PITCH') {
        const staff = state.present.staves[state.activeStaffIndex];
        const context = getStaffContextAt(staff, state.cursorIndex);
        playPitchAudition(
          mapped.pitch.diatonicOffset,
          context.clef,
          mapped.pitch.accidental,
          context.keyAccidentalsCount,
          context.instrument,
          0.3
        );
      }
      dispatch(mapped);
    }
  }
}

export interface KeyboardShortcutProps extends ShortcutCallbacks {
  state: ScoreState;
  dispatch: React.Dispatch<ScoreAction> | ((action: ScoreAction) => void);
  entryState: EntryState;
  setEntryState: React.Dispatch<React.SetStateAction<EntryState>> | ((update: React.SetStateAction<EntryState>) => void);
  isModalOpen: boolean;
}

export function useKeyboardShortcuts(props: KeyboardShortcutProps): void;
export function useKeyboardShortcuts(
  state: ScoreState,
  dispatch: React.Dispatch<ScoreAction>,
  entryState: EntryState,
  setEntryState: React.Dispatch<React.SetStateAction<EntryState>>,
  isModalOpen: boolean,
  onPlayToggle?: (() => void) | ShortcutCallbacks,
  dialogCallbacks?: ShortcutCallbacks
): void;
export function useKeyboardShortcuts(
  stateOrProps: ScoreState | KeyboardShortcutProps,
  dispatch?: React.Dispatch<ScoreAction>,
  entryState?: EntryState,
  setEntryState?: React.Dispatch<React.SetStateAction<EntryState>>,
  isModalOpen?: boolean,
  onPlayToggle?: (() => void) | ShortcutCallbacks,
  dialogCallbacks?: ShortcutCallbacks
): void {
  const isPropsObject =
    stateOrProps &&
    typeof stateOrProps === 'object' &&
    'state' in stateOrProps &&
    'dispatch' in stateOrProps;

  const actualState = isPropsObject ? stateOrProps.state : (stateOrProps as ScoreState);
  const actualDispatch = isPropsObject ? stateOrProps.dispatch : dispatch!;
  const actualEntryState = isPropsObject ? stateOrProps.entryState : entryState!;
  const actualSetEntryState = isPropsObject ? stateOrProps.setEntryState : setEntryState!;
  const actualIsModalOpen = isPropsObject ? stateOrProps.isModalOpen : (isModalOpen ?? false);
  const actualOnPlayToggle = isPropsObject ? stateOrProps.onPlayToggle : onPlayToggle;
  const actualDialogCallbacks: ShortcutCallbacks | undefined = isPropsObject
    ? stateOrProps
    : dialogCallbacks;

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      handleKeyDown(
        e,
        actualState,
        actualDispatch,
        actualEntryState,
        actualSetEntryState,
        actualIsModalOpen,
        actualOnPlayToggle,
        actualDialogCallbacks
      );
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [
    actualState,
    actualDispatch,
    actualEntryState,
    actualSetEntryState,
    actualIsModalOpen,
    actualOnPlayToggle,
    actualDialogCallbacks,
  ]);
}
