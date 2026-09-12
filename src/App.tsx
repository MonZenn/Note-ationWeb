import React, { useState, useReducer, useRef } from 'react';
import { scoreReducer, createInitialScoreState } from './state/scoreStore';
import { HeaderBar } from './components/navigation/HeaderBar';
import { NotePalette } from './components/navigation/NotePalette';
import { RibbonCanvas } from './components/notation/RibbonCanvas';
import { PaginatedCanvas } from './components/notation/PaginatedCanvas';
import { ScoreInfoModal } from './components/modals/ScoreInfoModal';
import { ShortcutsCheatSheet } from './components/modals/ShortcutsCheatSheet';
import { PageSetupModal } from './components/modals/PageSetupModal';
import { LyricsDrawer } from './components/modals/LyricsDrawer';
import { StaffManagerModal } from './components/modals/StaffManagerModal';
import { ClefDialog } from './components/modals/ClefDialog';
import { KeyDialog } from './components/modals/KeyDialog';
import { TimeDialog } from './components/modals/TimeDialog';
import { RepeatDialog } from './components/modals/RepeatDialog';
import { FlowDialog } from './components/modals/FlowDialog';
import { TextDialog } from './components/modals/TextDialog';
import { ExpressionDialog } from './components/modals/ExpressionDialog';
import { TempoDialog } from './components/modals/TempoDialog';
import { TextCategory, TextElement, TempoElement, KeySignatureElement, BarType } from './types/score';
import { useKeyboardShortcuts, EntryState } from './hooks/useKeyboardShortcuts';
import { ScorePlaybackScheduler } from './engine/audio/playback';
import { getMeasureIndexAtCursor } from './engine/layout/measureUtils';
import { getActiveKeyAndClefAtMeasure } from './engine/layout/geometry';
import { downloadScoreFile, deserializeScore } from './engine/persistence/fileIo';

const playbackScheduler = new ScorePlaybackScheduler();

export default function App() {
  const [state, dispatch] = useReducer(scoreReducer, undefined, () => createInitialScoreState());

  const [entryState, setEntryState] = useState<EntryState>({
    duration: 4,
    accidental: undefined,
    dots: 0,
    pitchOffset: 0,
    staccato: false,
  });


  const [viewMode, setViewMode] = useState<'ribbon' | 'page'>('ribbon');
  const [isPlaying, setIsPlaying] = useState<boolean>(false);
  const [playbackCursor, setPlaybackCursor] = useState<{ staffIndex: number; elementIndex: number } | null>(null);
  const [isInfoOpen, setIsInfoOpen] = useState<boolean>(false);
  const [isShortcutsOpen, setIsShortcutsOpen] = useState<boolean>(false);
  const [isLyricsOpen, setIsLyricsOpen] = useState<boolean>(false);
  const [isStaffManagerOpen, setIsStaffManagerOpen] = useState<boolean>(false);
  const [isClefOpen, setIsClefOpen] = useState<boolean>(false);
  const [isKeyOpen, setIsKeyOpen] = useState<boolean>(false);
  const [isTimeOpen, setIsTimeOpen] = useState<boolean>(false);
  const [isRepeatOpen, setIsRepeatOpen] = useState<boolean>(false);
  const [isFlowOpen, setIsFlowOpen] = useState<boolean>(false);
  const [isExpressionOpen, setIsExpressionOpen] = useState<boolean>(false);
  const [isPageSetupOpen, setIsPageSetupOpen] = useState<boolean>(false);
  const [textModalState, setTextModalState] = useState<{
    isOpen: boolean;
    initialCategory?: TextCategory;
    editElement?: TextElement;
  }>({
    isOpen: false,
  });
  const [keyModalState, setKeyModalState] = useState<{
    isOpen: boolean;
    initialAccidentals?: number;
    editElement?: KeySignatureElement;
  }>({
    isOpen: false,
  });
  const [tempoModalState, setTempoModalState] = useState<{
    isOpen: boolean;
    editElement?: TempoElement;
  }>({
    isOpen: false,
  });

  const fileInputRef = useRef<HTMLInputElement>(null);

  const activeStaff = state.present.staves[state.activeStaffIndex];
  const activeCursorMeasure = activeStaff
    ? getMeasureIndexAtCursor(activeStaff.elements, state.cursorIndex)
    : 0;
  const activeStaffContext = activeStaff
    ? getActiveKeyAndClefAtMeasure(activeStaff.elements, activeStaff.initialClef, activeCursorMeasure)
    : { clef: 'treble' as const, key: { key: 'C Major', accidentalsCount: 0 } };

  const handlePlayToggle = () => {
    if (isPlaying) {
      playbackScheduler.stop();
      setIsPlaying(false);
      setPlaybackCursor(null);
    } else {
      const activeStaff = state.present.staves[state.activeStaffIndex];
      const startMeasureIndex = activeStaff ? getMeasureIndexAtCursor(activeStaff.elements, state.cursorIndex) : 0;
      setIsPlaying(true);
      playbackScheduler.play(state.present, {
        startMeasureIndex,
        onTick: (staffIndex, elementIndex) => {
          setPlaybackCursor({ staffIndex, elementIndex });
        },
        onEnd: () => {
          setIsPlaying(false);
          setPlaybackCursor(null);
        },
      });
    }
  };

  const isModalOpen =
    isInfoOpen ||
    isShortcutsOpen ||
    isLyricsOpen ||
    isStaffManagerOpen ||
    isClefOpen ||
    isKeyOpen ||
    keyModalState.isOpen ||
    isTimeOpen ||
    isRepeatOpen ||
    isFlowOpen ||
    isExpressionOpen ||
    isPageSetupOpen ||
    textModalState.isOpen ||
    tempoModalState.isOpen;

  useKeyboardShortcuts(
    state,
    dispatch,
    entryState,
    setEntryState,
    isModalOpen,
    handlePlayToggle,
    {
      onOpenClef: () => setIsClefOpen(true),
      onOpenKey: () => setIsKeyOpen(true),
      onOpenTime: () => setIsTimeOpen(true),
      onOpenRepeat: () => setIsRepeatOpen(true),
      onOpenFlow: () => setIsFlowOpen(true),
      onOpenExpression: () => setIsExpressionOpen(true),
      onOpenText: (category?: TextCategory) =>
        setTextModalState({ isOpen: true, initialCategory: category }),
      onOpenTempo: () => setTempoModalState({ isOpen: true }),
      onOpenPageSetup: () => setIsPageSetupOpen(true),
    }
  );

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const res = deserializeScore(text);
      if (res.success) {
        dispatch({ type: 'LOAD_SCORE', score: res.score });
      } else {
        alert(res.error);
      }
    };
    reader.readAsText(file);
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  const activeElement =
    activeStaff?.elements[state.cursorIndex] ??
    (state.cursorIndex > 0 ? activeStaff?.elements[state.cursorIndex - 1] : undefined);

  return (
    <div className="h-screen flex flex-col bg-slate-100 select-none overflow-hidden print:h-auto print:overflow-visible print:bg-white">
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleFileUpload}
        accept=".noteweb,.json"
        data-testid="file-upload-input"
        className="hidden no-print print:hidden"
      />

      <HeaderBar
        scoreInfo={state.present.info}
        isPlaying={isPlaying}
        viewMode={viewMode}
        onTogglePlay={handlePlayToggle}
        onOpenInfo={() => setIsInfoOpen(true)}
        onOpenShortcuts={() => setIsShortcutsOpen(true)}
        onSaveFile={() => downloadScoreFile(state.present)}
        onOpenFile={() => fileInputRef.current?.click()}
        onToggleViewMode={setViewMode}
        onOpenLyrics={() => setIsLyricsOpen(true)}
        onOpenStaffManager={() => setIsStaffManagerOpen(true)}
        onOpenPageSetup={() => setIsPageSetupOpen(true)}
        onCopy={() => dispatch({ type: 'COPY_SELECTION' })}
        onCut={() => dispatch({ type: 'CUT_SELECTION' })}
        onPaste={() => dispatch({ type: 'PASTE_CLIPBOARD' })}
        canPaste={Boolean(state.clipboard && state.clipboard.length > 0)}
      />

      {viewMode === 'ribbon' && (
        <NotePalette
          entryState={entryState}
          setEntryState={setEntryState}
          selectedRange={state.selectedRange}
          activeElement={activeElement}
          dispatch={dispatch}
          autoBeaming={state.present.info.autoBeaming === true}
          onInsertBar={(barType: BarType = 'single') =>
            dispatch({
              type: 'INSERT_ELEMENT',
              element: { id: `bar-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`, type: 'bar', barType },
            })
          }
          onToggleAttribute={(attribute) =>
            dispatch({ type: 'TOGGLE_NOTE_ATTRIBUTE', attribute })
          }
          onOpenClef={() => setIsClefOpen(true)}
          onOpenKey={() => setIsKeyOpen(true)}
          onOpenTime={() => setIsTimeOpen(true)}
          onOpenText={() => setTextModalState({ isOpen: true })}
          onOpenTempo={() => setTempoModalState({ isOpen: true })}
          onOpenRepeat={() => setIsRepeatOpen(true)}
          onInsertRepeatBar={(barType) =>
            dispatch({
              type: 'INSERT_ELEMENT',
              element: {
                id: `bar-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                type: 'bar',
                barType,
              },
            })
          }
          onOpenFlow={() => setIsFlowOpen(true)}
          onInsertFlowMark={(mark) =>
            dispatch({
              type: 'INSERT_ELEMENT',
              element: {
                id: `flow-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                type: 'flow',
                mark,
              },
            })
          }
          onOpenExpression={() => setIsExpressionOpen(true)}
        />
      )}

      {viewMode === 'ribbon' ? (
        <RibbonCanvas
          score={state.present}
          activeStaffIndex={state.activeStaffIndex}
          cursorIndex={state.cursorIndex}
          pitchOffset={entryState.pitchOffset}
          selectedRange={state.selectedRange}
          isPlaying={isPlaying}
          playbackCursor={playbackCursor}
          onRangeSelect={(range, anchorIndex) =>
            dispatch({ type: 'SET_SELECTION_RANGE', range, anchorIndex })
          }
          onSelectStaff={(idx) => dispatch({ type: 'SET_ACTIVE_STAFF', index: idx })}
          onStaffClick={(elemIdx, pOffset) => {
            const staff = state.present.staves[state.activeStaffIndex];
            const clickedElement = staff?.elements[elemIdx];
            if (clickedElement && clickedElement.type === 'text') {
              setTextModalState({
                isOpen: true,
                initialCategory: clickedElement.category,
                editElement: clickedElement,
              });
              return;
            }
            if (clickedElement && clickedElement.type === 'tempo') {
              setTempoModalState({
                isOpen: true,
                editElement: clickedElement,
              });
              return;
            }
            dispatch({ type: 'CLEAR_SELECTION' });
            dispatch({ type: 'SET_CURSOR_INDEX', index: elemIdx });
            setEntryState((prev) => ({ ...prev, pitchOffset: pOffset }));
          }}
          onTextClick={(element, staffIdx) => {
            dispatch({ type: 'SET_ACTIVE_STAFF', index: staffIdx });
            setTextModalState({
              isOpen: true,
              initialCategory: element.category,
              editElement: element,
            });
          }}
          onTempoClick={(element, staffIdx) => {
            dispatch({ type: 'SET_ACTIVE_STAFF', index: staffIdx });
            setTempoModalState({
              isOpen: true,
              editElement: element,
            });
          }}
          onKeyClick={(element, staffIdx) => {
            dispatch({ type: 'SET_ACTIVE_STAFF', index: staffIdx });
            setKeyModalState({
              isOpen: true,
              initialAccidentals: element.accidentalsCount,
              editElement: element,
            });
          }}
          onUpdateStaff={(idx, updates) =>
            dispatch({ type: 'UPDATE_STAFF', staffIndex: idx, updates })
          }
        />
      ) : (
        <PaginatedCanvas score={state.present} playbackCursor={playbackCursor} />
      )}

      <ScoreInfoModal
        isOpen={isInfoOpen}
        onClose={() => setIsInfoOpen(false)}
        scoreInfo={state.present.info}
        onSave={(info) => dispatch({ type: 'SET_SCORE_INFO', info })}
      />

      <PageSetupModal
        isOpen={isPageSetupOpen}
        onClose={() => setIsPageSetupOpen(false)}
        scoreInfo={state.present.info}
        onSave={(pageSetup, fonts) =>
          dispatch({
            type: 'UPDATE_SCORE_INFO',
            info: { ...state.present.info, pageSetup, fonts },
          })
        }
      />

      <ShortcutsCheatSheet
        isOpen={isShortcutsOpen}
        onClose={() => setIsShortcutsOpen(false)}
      />

      <LyricsDrawer
        isOpen={isLyricsOpen}
        onClose={() => setIsLyricsOpen(false)}
        initialLyrics={state.present.staves[state.activeStaffIndex]?.lyrics || []}
        totalRhythmSlots={
          state.present.staves[state.activeStaffIndex]?.elements.filter(
            (e) => e.type === 'note' || e.type === 'rest'
          ).length || 0
        }
        onSave={(syllables) => {
          dispatch({
            type: 'SET_STAFF_LYRICS',
            staffIndex: state.activeStaffIndex,
            lyrics: syllables,
          });
        }}
      />

      <StaffManagerModal
        isOpen={isStaffManagerOpen}
        onClose={() => setIsStaffManagerOpen(false)}
        staves={state.present.staves}
        activeStaffIndex={state.activeStaffIndex}
        onSelectStaff={(idx) => dispatch({ type: 'SET_ACTIVE_STAFF', index: idx })}
        onAddStaff={(name, clef, instrument) => dispatch({ type: 'ADD_STAFF', name, clef, instrument })}
        onAddSubstaff={(parentId) => dispatch({ type: 'ADD_SUBSTAFF', parentStaffId: parentId })}
        onRemoveStaff={(staffIndex) => dispatch({ type: 'REMOVE_STAFF', staffIndex })}
        onUpdateStaff={(staffIndex, updates) =>
          dispatch({ type: 'UPDATE_STAFF', staffIndex, updates })
        }
        onReorderStaves={(fromIndex, toIndex) =>
          dispatch({ type: 'REORDER_STAVES', fromIndex, toIndex })
        }
      />

      <ClefDialog
        isOpen={isClefOpen}
        onClose={() => setIsClefOpen(false)}
        onInsertClef={(clefType) =>
          dispatch({
            type: 'INSERT_ELEMENT',
            element: {
              id: `clef-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              type: 'clef',
              clefType,
            },
          })
        }
      />

      <KeyDialog
        isOpen={isKeyOpen || keyModalState.isOpen}
        initialAccidentals={
          keyModalState.isOpen
            ? (keyModalState.initialAccidentals ?? activeStaffContext.key.accidentalsCount)
            : activeStaffContext.key.accidentalsCount
        }
        onClose={() => {
          setIsKeyOpen(false);
          setKeyModalState({ isOpen: false });
        }}
        onInsertKey={(key, accidentalsCount, cancelCount, cancelType, cancelIndices) => {
          if (keyModalState.editElement) {
            dispatch({
              type: 'UPDATE_KEY',
              elementId: keyModalState.editElement.id,
              key,
              accidentalsCount,
              cancelCount,
              cancelType,
              cancelIndices,
            });
          } else {
            dispatch({
              type: 'INSERT_ELEMENT',
              element: {
                id: `key-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
                type: 'key',
                key,
                accidentalsCount,
                cancelCount,
                cancelType,
                cancelIndices,
              },
            });
          }
          setIsKeyOpen(false);
          setKeyModalState({ isOpen: false });
        }}
      />

      <TimeDialog
        isOpen={isTimeOpen}
        onClose={() => setIsTimeOpen(false)}
        onInsertTime={(numerator, denominator, symbol) =>
          dispatch({
            type: 'INSERT_ELEMENT',
            element: {
              id: `time-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              type: 'time',
              numerator,
              denominator,
              symbol,
            },
          })
        }
      />

      <RepeatDialog
        isOpen={isRepeatOpen}
        onClose={() => setIsRepeatOpen(false)}
        onInsertBar={(barType) =>
          dispatch({
            type: 'INSERT_ELEMENT',
            element: {
              id: `bar-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              type: 'bar',
              barType,
            },
          })
        }
        onInsertVolta={(endings, text, closed) =>
          dispatch({
            type: 'INSERT_ELEMENT',
            element: {
              id: `volta-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              type: 'volta',
              endings,
              text,
              closed,
            },
          })
        }
      />

      <FlowDialog
        isOpen={isFlowOpen}
        onClose={() => setIsFlowOpen(false)}
        onInsertFlow={(mark) =>
          dispatch({
            type: 'INSERT_ELEMENT',
            element: {
              id: `flow-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
              type: 'flow',
              mark,
            },
          })
        }
      />

      <TextDialog
        isOpen={textModalState.isOpen}
        initialCategory={textModalState.initialCategory || textModalState.editElement?.category}
        initialText={textModalState.editElement?.text}
        initialPlacement={textModalState.editElement?.placement}
        isEditing={Boolean(textModalState.editElement)}
        onSubmit={(data) => {
          if (textModalState.editElement) {
            dispatch({
              type: 'UPDATE_TEXT',
              elementId: textModalState.editElement.id,
              text: data.text,
              category: data.category,
              placement: data.placement,
            });
          } else {
            dispatch({
              type: 'INSERT_TEXT',
              category: data.category,
              text: data.text,
              placement: data.placement,
            });
          }
          setTextModalState({ isOpen: false });
        }}
        onDelete={
          textModalState.editElement
            ? () => {
                const elemId = textModalState.editElement!.id;
                const staff = state.present.staves[state.activeStaffIndex];
                const idx = staff?.elements.findIndex((e) => e.id === elemId);
                if (staff && idx !== undefined && idx >= 0) {
                  dispatch({
                    type: 'SET_SELECTION_RANGE',
                    range: { startIndex: idx, endIndex: idx + 1 },
                  });
                  dispatch({ type: 'BATCH_DELETE' });
                }
                setTextModalState({ isOpen: false });
              }
            : undefined
        }
        onClose={() => setTextModalState({ isOpen: false })}
      />

      <ExpressionDialog
        isOpen={isExpressionOpen}
        onClose={() => setIsExpressionOpen(false)}
        activeElement={activeElement}
        onToggleExpression={(expr) => {
          const hasActiveSelection = Boolean(
            state.selectedRange && state.selectedRange.startIndex !== state.selectedRange.endIndex
          );
          if (hasActiveSelection) {
            dispatch({ type: 'BATCH_TOGGLE_NOTE_EXPRESSION', expression: expr });
          } else {
            dispatch({ type: 'TOGGLE_NOTE_EXPRESSION', expression: expr });
          }
        }}
      />

      <TempoDialog
        isOpen={tempoModalState.isOpen}
        initialBpm={tempoModalState.editElement?.bpm}
        initialBaseDuration={tempoModalState.editElement?.baseDuration}
        initialDotted={tempoModalState.editElement?.dotted}
        initialText={tempoModalState.editElement?.text}
        initialDisplayMode={tempoModalState.editElement?.displayMode}
        isEditing={Boolean(tempoModalState.editElement)}
        onSubmit={(data) => {
          if (tempoModalState.editElement) {
            dispatch({
              type: 'UPDATE_TEMPO',
              elementId: tempoModalState.editElement.id,
              bpm: data.bpm,
              baseDuration: data.baseDuration,
              dotted: data.dotted,
              text: data.text,
              displayMode: data.displayMode,
            });
          } else {
            dispatch({
              type: 'INSERT_TEMPO',
              bpm: data.bpm,
              baseDuration: data.baseDuration,
              dotted: data.dotted,
              text: data.text,
              displayMode: data.displayMode,
            });
          }
          setTempoModalState({ isOpen: false });
        }}
        onDelete={
          tempoModalState.editElement
            ? () => {
                const elemId = tempoModalState.editElement!.id;
                const staff = state.present.staves[state.activeStaffIndex];
                const idx = staff?.elements.findIndex((e) => e.id === elemId);
                if (staff && idx !== undefined && idx >= 0) {
                  dispatch({
                    type: 'SET_SELECTION_RANGE',
                    range: { startIndex: idx, endIndex: idx + 1 },
                  });
                  dispatch({ type: 'BATCH_DELETE' });
                }
                setTempoModalState({ isOpen: false });
              }
            : undefined
        }
        onClose={() => setTempoModalState({ isOpen: false })}
      />
    </div>
  );
}
