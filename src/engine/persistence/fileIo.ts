import {
  Score,
  ClefType,
  InstrumentType,
  SlurDirection,
  BeamMode,
  DynamicMark,
  HairpinType,
  MeasureNumberingMode,
  TextCategory,
  TextPlacement,
  NoteOrnament,
  TempoBaseDuration,
  TempoDisplayMode,
  ScoreFontCategory,
} from '../../types/score';

export const VALID_SCORE_FONT_CATEGORIES: Set<ScoreFontCategory> = new Set([
  'title',
  'subtitle',
  'composer',
  'lyricist',
  'staffLyrics',
  'measureNumbers',
  'pageNumbers',
  'chordsAndText',
  'staffLabels',
]);

export const VALID_ORNAMENTS: Set<NoteOrnament> = new Set(['trill', 'mordent', 'turn']);
export const VALID_TEMPO_BASE_DURATIONS: Set<TempoBaseDuration> = new Set([2, 4, 8, 16]);
export const VALID_TEMPO_DISPLAY_MODES: Set<TempoDisplayMode> = new Set([
  'text-and-metronome',
  'metronome-only',
  'text-only',
]);
const NOTE_BOOLEAN_EXPRESSIONS = ['staccato', 'tenuto', 'accent', 'marcato', 'staccatissimo', 'fermata'] as const;

const VALID_CLEFS: Set<ClefType> = new Set(['treble', 'bass', 'alto', 'tenor']);
const VALID_MEASURE_NUMBERING: Set<MeasureNumberingMode> = new Set([
  'system-start',
  'all-measures',
  'interval-5',
  'none',
]);
const VALID_INSTRUMENTS: Set<InstrumentType> = new Set([
  'piano',
  'grand-piano',
  'violin',
  'viola',
  'cello',
  'flute',
  'piccolo',
  'harp',
  'pipe-organ',
  'bagpipe',
  'trumpet',
  'tuba',
]);
const VALID_SLUR_DIRECTIONS: Set<SlurDirection> = new Set(['auto', 'above', 'below']);
const VALID_BEAM_MODES: Set<BeamMode> = new Set(['auto', 'break', 'join']);
const VALID_DYNAMIC_MARKS: Set<DynamicMark> = new Set([
  'ppp',
  'pp',
  'p',
  'mp',
  'mf',
  'f',
  'ff',
  'fff',
  'sfz',
  'fz',
]);
const VALID_HAIRPIN_TYPES: Set<HairpinType> = new Set(['crescendo', 'decrescendo']);
const VALID_TEXT_CATEGORIES: Set<TextCategory> = new Set(['chord', 'part', 'note']);
const VALID_TEXT_PLACEMENTS: Set<TextPlacement> = new Set(['above', 'below']);

export function validateElement(elem: unknown): boolean {
  if (!elem || typeof elem !== 'object') return false;
  const e = elem as Record<string, unknown>;
  if (e.type === 'text') {
    if (
      typeof e.text !== 'string' ||
      !VALID_TEXT_CATEGORIES.has(e.category as TextCategory) ||
      (e.placement !== undefined && !VALID_TEXT_PLACEMENTS.has(e.placement as TextPlacement))
    ) {
      return false;
    }
    return true;
  }
  return true;
}


export function serializeScore(score: Score): string {
  return JSON.stringify(score, null, 2);
}

export function deserializeScore(jsonString: string): { success: true; score: Score } | { success: false; error: string } {
  try {
    const parsed = JSON.parse(jsonString);

    if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
      return { success: false, error: 'File does not contain a valid JSON object.' };
    }

    if (parsed.format !== 'noteweb') {
      return { success: false, error: 'File format mismatch: expected "format": "noteweb".' };
    }

    if (parsed.version !== '1.0') {
      return { success: false, error: 'File format mismatch: expected "version": "1.0".' };
    }

    if (typeof parsed.id !== 'string' || parsed.id.trim().length === 0) {
      return { success: false, error: 'Missing or invalid score "id": expected non-empty string.' };
    }

    if (!parsed.info || typeof parsed.info !== 'object' || Array.isArray(parsed.info)) {
      return { success: false, error: 'Missing or invalid "info" metadata block.' };
    }

    if (
      parsed.info.measureNumbering !== undefined &&
      !VALID_MEASURE_NUMBERING.has(parsed.info.measureNumbering as MeasureNumberingMode)
    ) {
      return {
        success: false,
        error: `Invalid "measureNumbering" '${parsed.info.measureNumbering}'. Expected one of: ${Array.from(VALID_MEASURE_NUMBERING).join(', ')}.`,
      };
    }

    if (
      parsed.info.hideEmptyStaves !== undefined &&
      typeof parsed.info.hideEmptyStaves !== 'boolean'
    ) {
      return {
        success: false,
        error: 'Invalid "hideEmptyStaves": expected boolean.',
      };
    }

    if (
      parsed.info.multiMeasureRests !== undefined &&
      typeof parsed.info.multiMeasureRests !== 'boolean'
    ) {
      return {
        success: false,
        error: 'Invalid "multiMeasureRests": expected boolean.',
      };
    }

    if (
      parsed.info.autoBeaming !== undefined &&
      typeof parsed.info.autoBeaming !== 'boolean'
    ) {
      return {
        success: false,
        error: 'Invalid "autoBeaming": expected boolean.',
      };
    }

    if (
      parsed.info.connectStaves !== undefined &&
      typeof parsed.info.connectStaves !== 'boolean'
    ) {
      return {
        success: false,
        error: 'Invalid "connectStaves": expected boolean.',
      };
    }

    if (parsed.info.pageSetup !== undefined) {
      if (!parsed.info.pageSetup || typeof parsed.info.pageSetup !== 'object' || Array.isArray(parsed.info.pageSetup)) {
        return { success: false, error: 'Invalid "pageSetup": expected an object.' };
      }
      const ps = parsed.info.pageSetup;
      if (ps.staffScale !== undefined && (typeof ps.staffScale !== 'number' || !Number.isFinite(ps.staffScale) || ps.staffScale <= 0)) {
        return { success: false, error: 'Invalid "pageSetup.staffScale": expected a positive number.' };
      }
      if (ps.staffSpacing !== undefined && (typeof ps.staffSpacing !== 'number' || !Number.isFinite(ps.staffSpacing) || ps.staffSpacing < 0)) {
        return { success: false, error: 'Invalid "pageSetup.staffSpacing": expected a non-negative number.' };
      }
      if (ps.systemSpacing !== undefined && (typeof ps.systemSpacing !== 'number' || !Number.isFinite(ps.systemSpacing) || ps.systemSpacing < 0)) {
        return { success: false, error: 'Invalid "pageSetup.systemSpacing": expected a non-negative number.' };
      }
      if (ps.margins !== undefined) {
        if (!ps.margins || typeof ps.margins !== 'object' || Array.isArray(ps.margins)) {
          return { success: false, error: 'Invalid "pageSetup.margins": expected an object.' };
        }
        for (const marginKey of ['topMm', 'bottomMm', 'leftMm', 'rightMm'] as const) {
          if (
            ps.margins[marginKey] !== undefined &&
            (typeof ps.margins[marginKey] !== 'number' || !Number.isFinite(ps.margins[marginKey]) || ps.margins[marginKey] < 0)
          ) {
            return { success: false, error: `Invalid "pageSetup.margins.${marginKey}": expected a non-negative number.` };
          }
        }
      }
    }

    if (parsed.info.fonts !== undefined) {
      if (!parsed.info.fonts || typeof parsed.info.fonts !== 'object' || Array.isArray(parsed.info.fonts)) {
        return { success: false, error: 'Invalid "fonts": expected an object.' };
      }
      for (const [cat, setting] of Object.entries(parsed.info.fonts)) {
        if (!VALID_SCORE_FONT_CATEGORIES.has(cat as ScoreFontCategory)) {
          return { success: false, error: `Invalid font category '${cat}'.` };
        }
        if (!setting || typeof setting !== 'object' || Array.isArray(setting)) {
          return { success: false, error: `Invalid font setting for '${cat}': expected an object.` };
        }
        const s = setting as Record<string, unknown>;
        if (s.family !== undefined && typeof s.family !== 'string') {
          return { success: false, error: `Invalid font family for '${cat}': expected a string.` };
        }
        if (s.sizePt !== undefined && (typeof s.sizePt !== 'number' || !Number.isFinite(s.sizePt) || s.sizePt <= 0)) {
          return { success: false, error: `Invalid font sizePt for '${cat}': expected a positive number.` };
        }
        if (s.bold !== undefined && typeof s.bold !== 'boolean') {
          return { success: false, error: `Invalid font bold flag for '${cat}': expected a boolean.` };
        }
        if (s.italic !== undefined && typeof s.italic !== 'boolean') {
          return { success: false, error: `Invalid font italic flag for '${cat}': expected a boolean.` };
        }
      }
    }

    if (!Array.isArray(parsed.staves)) {
      return { success: false, error: 'Missing or invalid "staves" array.' };
    }

    for (let i = 0; i < parsed.staves.length; i++) {
      const staff = parsed.staves[i];
      if (!staff || typeof staff !== 'object' || Array.isArray(staff)) {
        return { success: false, error: `Invalid staff at index ${i}: expected an object.` };
      }

      if (typeof staff.id !== 'string' || staff.id.trim().length === 0) {
        return { success: false, error: `Invalid staff at index ${i}: missing or empty "id".` };
      }

      if (typeof staff.name !== 'string') {
        return { success: false, error: `Invalid staff at index ${i}: missing or invalid "name".` };
      }

      if (!VALID_CLEFS.has(staff.initialClef as ClefType)) {
        return {
          success: false,
          error: `Invalid staff at index ${i}: invalid "initialClef" '${staff.initialClef}'. Expected one of: treble, bass, alto, tenor.`,
        };
      }

      if (staff.instrument !== undefined && !VALID_INSTRUMENTS.has(staff.instrument as InstrumentType)) {
        return {
          success: false,
          error: `Invalid staff at index ${i}: invalid "instrument" '${staff.instrument}'. Expected one of: ${Array.from(VALID_INSTRUMENTS).join(', ')}.`,
        };
      }

      if (staff.substaffOf !== undefined && (typeof staff.substaffOf !== 'string' || staff.substaffOf.trim().length === 0)) {
        return { success: false, error: `Invalid staff at index ${i}: "substaffOf" must be a non-empty string.` };
      }

      if (staff.beamWithNext !== undefined && typeof staff.beamWithNext !== 'boolean') {
        return { success: false, error: `Invalid staff at index ${i}: "beamWithNext" must be a boolean.` };
      }

      if (staff.lyrics !== undefined) {
        if (!Array.isArray(staff.lyrics) || !staff.lyrics.every((s: unknown) => typeof s === 'string')) {
          return { success: false, error: `Invalid staff at index ${i}: "lyrics" must be an array of strings.` };
        }
      }

      if (staff.verses !== undefined) {
        if (
          !Array.isArray(staff.verses) ||
          !staff.verses.every((v: unknown) => Array.isArray(v) && v.every((s: unknown) => typeof s === 'string'))
        ) {
          return { success: false, error: `Invalid staff at index ${i}: "verses" must be an array of string arrays.` };
        }
      }

      if (!Array.isArray(staff.elements)) {
        return { success: false, error: `Invalid staff at index ${i}: "elements" must be an array.` };
      }

      for (let j = 0; j < staff.elements.length; j++) {
        const elem = staff.elements[j];
        if (elem && typeof elem === 'object' && elem.type === 'note') {
          if (elem.slur !== undefined) {
            if (!elem.slur || typeof elem.slur !== 'object' || Array.isArray(elem.slur)) {
              return { success: false, error: `Invalid note at staff ${i}, element ${j}: "slur" must be an object.` };
            }
            if (typeof elem.slur.targetNoteId !== 'string' || elem.slur.targetNoteId.trim().length === 0) {
              return { success: false, error: `Invalid note at staff ${i}, element ${j}: "slur.targetNoteId" must be a non-empty string.` };
            }
            if (elem.slur.direction !== undefined && !VALID_SLUR_DIRECTIONS.has(elem.slur.direction as SlurDirection)) {
              return { success: false, error: `Invalid note at staff ${i}, element ${j}: invalid "slur.direction" '${elem.slur.direction}'. Expected auto, above, or below.` };
            }
          } else if (elem.slurOut === true) {
            // Legacy migration: connect to the next note if available
            const nextNote = staff.elements.slice(j + 1).find((e: any) => e && e.type === 'note');
            if (nextNote && typeof nextNote.id === 'string') {
              elem.slur = { targetNoteId: nextNote.id, direction: 'auto' };
            }
          }

          if (elem.beam !== undefined && !VALID_BEAM_MODES.has(elem.beam as BeamMode)) {
            return {
              success: false,
              error: `Invalid note at staff ${i}, element ${j}: invalid "beam" '${elem.beam}'. Expected auto, break, or join.`,
            };
          }

          if (elem.hairpin !== undefined) {
            if (!elem.hairpin || typeof elem.hairpin !== 'object' || Array.isArray(elem.hairpin)) {
              return { success: false, error: `Invalid note at staff ${i}, element ${j}: "hairpin" must be an object.` };
            }
            if (typeof elem.hairpin.targetNoteId !== 'string' || elem.hairpin.targetNoteId.trim().length === 0) {
              return { success: false, error: `Invalid note at staff ${i}, element ${j}: "hairpin.targetNoteId" must be a non-empty string.` };
            }
            if (!VALID_HAIRPIN_TYPES.has(elem.hairpin.type as HairpinType)) {
              return { success: false, error: `Invalid note at staff ${i}, element ${j}: invalid "hairpin.type" '${elem.hairpin.type}'. Expected crescendo or decrescendo.` };
            }
          }

          for (const prop of NOTE_BOOLEAN_EXPRESSIONS) {
            if (elem[prop] !== undefined && typeof elem[prop] !== 'boolean') {
              return {
                success: false,
                error: `Invalid note at staff ${i}, element ${j}: "${prop}" must be a boolean.`,
              };
            }
          }

          if (elem.ornament !== undefined && !VALID_ORNAMENTS.has(elem.ornament as NoteOrnament)) {
            return {
              success: false,
              error: `Invalid note at staff ${i}, element ${j}: invalid "ornament" '${elem.ornament}'. Expected trill, mordent, or turn.`,
            };
          }
        }

        if (elem && typeof elem === 'object' && elem.type === 'rest') {
          if (elem.fermata !== undefined && typeof elem.fermata !== 'boolean') {
            return {
              success: false,
              error: `Invalid rest at staff ${i}, element ${j}: "fermata" must be a boolean.`,
            };
          }
        }

        if (elem && typeof elem === 'object' && elem.type === 'dynamic') {
          if (!VALID_DYNAMIC_MARKS.has(elem.mark as DynamicMark)) {
            return {
              success: false,
              error: `Invalid dynamic element at staff ${i}, element ${j}: invalid "mark" '${elem.mark}'.`,
            };
          }
        }

        if (elem && typeof elem === 'object' && elem.type === 'text') {
          if (!validateElement(elem)) {
            return {
              success: false,
              error: `Invalid text element at staff ${i}, element ${j}: invalid "text", "category", or "placement".`,
            };
          }
        }

        if (elem && typeof elem === 'object' && elem.type === 'tempo') {
          if (typeof elem.bpm !== 'number' || isNaN(elem.bpm) || elem.bpm < 20 || elem.bpm > 400) {
            return {
              success: false,
              error: `Invalid tempo element at staff ${i}, element ${j}: "bpm" must be a number between 20 and 400.`,
            };
          }
          if (elem.baseDuration !== undefined && !VALID_TEMPO_BASE_DURATIONS.has(elem.baseDuration as TempoBaseDuration)) {
            return {
              success: false,
              error: `Invalid tempo element at staff ${i}, element ${j}: invalid "baseDuration" '${elem.baseDuration}'. Expected 2, 4, 8, or 16.`,
            };
          }
          if (elem.dotted !== undefined && typeof elem.dotted !== 'boolean') {
            return {
              success: false,
              error: `Invalid tempo element at staff ${i}, element ${j}: "dotted" must be a boolean.`,
            };
          }
          if (elem.text !== undefined && typeof elem.text !== 'string') {
            return {
              success: false,
              error: `Invalid tempo element at staff ${i}, element ${j}: "text" must be a string.`,
            };
          }
          if (elem.displayMode !== undefined && !VALID_TEMPO_DISPLAY_MODES.has(elem.displayMode as TempoDisplayMode)) {
            return {
              success: false,
              error: `Invalid tempo element at staff ${i}, element ${j}: invalid "displayMode" '${elem.displayMode}'.`,
            };
          }
        }
      }
    }

    return { success: true, score: parsed as Score };
  } catch (err) {
    return { success: false, error: `Invalid JSON syntax: ${(err as Error).message}` };
  }
}


export function downloadScoreFile(score: Score): void {
  const json = serializeScore(score);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8' });
  const url = URL.createObjectURL(blob);

  const trimmedTitle = (score.info?.title || '').trim();
  const sanitizedTitle = (trimmedTitle || 'Untitled').replace(/[^a-zA-Z0-9_-]/g, '_');
  const anchor = document.createElement('a');
  anchor.href = url;
  anchor.download = `${sanitizedTitle}.noteweb`;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);

  setTimeout(() => URL.revokeObjectURL(url), 1000);
}
