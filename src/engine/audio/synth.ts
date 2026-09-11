import { ClefType, AccidentalType, InstrumentType } from '../../types/score';
import { diatonicOffsetToMidi, midiToFrequency } from '../../utils/pitchUtils';

let audioCtx: AudioContext | null = null;

export function getAudioContext(): AudioContext | null {
  try {
    if (typeof window === 'undefined') return null;
    const AudioContextClass =
      window.AudioContext ||
      (window as unknown as { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;

    if (!AudioContextClass) {
      audioCtx = null;
      return null;
    }

    if (!audioCtx) {
      audioCtx = new AudioContextClass();
    }
    if (audioCtx.state === 'suspended') {
      audioCtx.resume();
    }
    return audioCtx;
  } catch {
    return null;
  }
}

export function resetAudioContextForTesting(): void {
  audioCtx = null;
}

export function playTone(
  midi: number,
  durationSec: number = 0.3,
  instrument?: InstrumentType | string,
  volume: number = 1.0,
  isSlurred: boolean = false,
  isSlurContinuation: boolean = false,
  isTrill: boolean = false
): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const now = ctx.currentTime;
    const vol = Math.max(0, Math.min(1, volume));
    const inst = (instrument || 'piano') as InstrumentType;

    const masterGain = ctx.createGain();
    masterGain.connect(ctx.destination);

    // Setup filter if supported
    const filter = ctx.createBiquadFilter ? ctx.createBiquadFilter() : null;
    if (filter) {
      filter.connect(masterGain);
    }
    const dest: AudioNode = filter || masterGain;

    const fundamentalFreq = midiToFrequency(midi);
    const oscillators: OscillatorNode[] = [];
    const toneOscillators: { osc: OscillatorNode; baseFreq: number }[] = [];

    switch (inst) {
      case 'grand-piano': {
        if (filter) {
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(3800, now);
          filter.Q.setValueAtTime(1.2, now);
        }

        const osc1 = ctx.createOscillator();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(fundamentalFreq, now);
        osc1.connect(dest);
        oscillators.push(osc1);
        toneOscillators.push({ osc: osc1, baseFreq: fundamentalFreq });

        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(fundamentalFreq * 2, now);
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.4, now);
        osc2.connect(g2);
        g2.connect(dest);
        oscillators.push(osc2);
        toneOscillators.push({ osc: osc2, baseFreq: fundamentalFreq * 2 });

        const osc3 = ctx.createOscillator();
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(fundamentalFreq * 3, now);
        const g3 = ctx.createGain();
        g3.gain.setValueAtTime(0.2, now);
        osc3.connect(g3);
        g3.connect(dest);
        oscillators.push(osc3);
        toneOscillators.push({ osc: osc3, baseFreq: fundamentalFreq * 3 });

        const attack = 0.008;
        const decay = Math.min(0.45, durationSec * 0.6);
        const sustain = 0.15 * vol;
        const releaseTime = isSlurred
          ? now + durationSec
          : now + Math.max(attack + decay, durationSec - 0.05);

        masterGain.gain.setValueAtTime(0, now);
        masterGain.gain.linearRampToValueAtTime(0.28 * vol, now + attack);
        masterGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, sustain), now + attack + decay);
        masterGain.gain.setValueAtTime(Math.max(0.0001, sustain), releaseTime);
        masterGain.gain.linearRampToValueAtTime(0.0001, now + (isSlurred ? durationSec + 0.03 : durationSec));
        break;
      }

      case 'violin': {
        if (filter) {
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(2500, now);
          filter.Q.setValueAtTime(2.0, now);
        }

        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(fundamentalFreq, now);
        osc.connect(dest);
        oscillators.push(osc);
        toneOscillators.push({ osc, baseFreq: fundamentalFreq });

        // 5.5Hz vibrato LFO
        const lfo = ctx.createOscillator();
        lfo.frequency.setValueAtTime(5.5, now);
        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(6.0, now);
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        oscillators.push(lfo);

        const attack = isSlurContinuation ? 0.006 : Math.min(0.06, durationSec * 0.2);
        masterGain.gain.setValueAtTime(isSlurContinuation ? 0.18 * vol : 0, now);
        masterGain.gain.linearRampToValueAtTime(0.22 * vol, now + attack);
        if (isSlurred) {
          masterGain.gain.setValueAtTime(0.22 * vol, now + durationSec);
          masterGain.gain.linearRampToValueAtTime(0.0001, now + durationSec + 0.03);
        } else {
          masterGain.gain.setValueAtTime(0.22 * vol, Math.max(now + attack, now + durationSec - 0.05));
          masterGain.gain.linearRampToValueAtTime(0.0001, now + durationSec);
        }
        break;
      }

      case 'viola': {
        if (filter) {
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(1200, now);
          filter.Q.setValueAtTime(1.5, now);
        }

        const osc1 = ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(fundamentalFreq, now);
        osc1.connect(dest);
        oscillators.push(osc1);
        toneOscillators.push({ osc: osc1, baseFreq: fundamentalFreq });

        const osc2 = ctx.createOscillator();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(fundamentalFreq, now);
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.25, now);
        osc2.connect(g2);
        g2.connect(dest);
        oscillators.push(osc2);
        toneOscillators.push({ osc: osc2, baseFreq: fundamentalFreq });

        // 5.0Hz vibrato LFO
        const lfo = ctx.createOscillator();
        lfo.frequency.setValueAtTime(5.0, now);
        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(5.0, now);
        lfo.connect(lfoGain);
        lfoGain.connect(osc1.frequency);
        oscillators.push(lfo);

        const attack = isSlurContinuation ? 0.006 : Math.min(0.08, durationSec * 0.2);
        masterGain.gain.setValueAtTime(isSlurContinuation ? 0.18 * vol : 0, now);
        masterGain.gain.linearRampToValueAtTime(0.22 * vol, now + attack);
        if (isSlurred) {
          masterGain.gain.setValueAtTime(0.22 * vol, now + durationSec);
          masterGain.gain.linearRampToValueAtTime(0.0001, now + durationSec + 0.03);
        } else {
          masterGain.gain.setValueAtTime(0.22 * vol, Math.max(now + attack, now + durationSec - 0.06));
          masterGain.gain.linearRampToValueAtTime(0.0001, now + durationSec);
        }
        break;
      }

      case 'cello': {
        if (filter) {
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(700, now);
          filter.Q.setValueAtTime(1.8, now);
        }

        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';
        osc.frequency.setValueAtTime(fundamentalFreq, now);
        osc.connect(dest);
        oscillators.push(osc);
        toneOscillators.push({ osc, baseFreq: fundamentalFreq });

        // 4.5Hz vibrato LFO
        const lfo = ctx.createOscillator();
        lfo.frequency.setValueAtTime(4.5, now);
        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(4.0, now);
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        oscillators.push(lfo);

        const attack = isSlurContinuation ? 0.008 : Math.min(0.09, durationSec * 0.25);
        masterGain.gain.setValueAtTime(isSlurContinuation ? 0.20 * vol : 0, now);
        masterGain.gain.linearRampToValueAtTime(0.24 * vol, now + attack);
        if (isSlurred) {
          masterGain.gain.setValueAtTime(0.24 * vol, now + durationSec);
          masterGain.gain.linearRampToValueAtTime(0.0001, now + durationSec + 0.04);
        } else {
          masterGain.gain.setValueAtTime(0.24 * vol, Math.max(now + attack, now + durationSec - 0.08));
          masterGain.gain.linearRampToValueAtTime(0.0001, now + durationSec);
        }
        break;
      }

      case 'flute': {
        if (filter) {
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(4200, now);
        }

        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(fundamentalFreq, now);
        osc1.connect(dest);
        oscillators.push(osc1);
        toneOscillators.push({ osc: osc1, baseFreq: fundamentalFreq });

        const osc2 = ctx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(fundamentalFreq, now);
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.35, now);
        osc2.connect(g2);
        g2.connect(dest);
        oscillators.push(osc2);
        toneOscillators.push({ osc: osc2, baseFreq: fundamentalFreq });

        // 5.0Hz breath vibrato LFO
        const lfo = ctx.createOscillator();
        lfo.frequency.setValueAtTime(5.0, now);
        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(3.0, now);
        lfo.connect(lfoGain);
        lfoGain.connect(osc1.frequency);
        oscillators.push(lfo);

        const attack = isSlurContinuation ? 0.005 : Math.min(0.05, durationSec * 0.15);
        masterGain.gain.setValueAtTime(isSlurContinuation ? 0.18 * vol : 0, now);
        masterGain.gain.linearRampToValueAtTime(0.22 * vol, now + attack);
        if (isSlurred) {
          masterGain.gain.setValueAtTime(0.22 * vol, now + durationSec);
          masterGain.gain.linearRampToValueAtTime(0.0001, now + durationSec + 0.02);
        } else {
          masterGain.gain.setValueAtTime(0.22 * vol, Math.max(now + attack, now + durationSec - 0.04));
          masterGain.gain.linearRampToValueAtTime(0.0001, now + durationSec);
        }
        break;
      }

      case 'piccolo': {
        if (filter) {
          filter.type = 'highpass';
          filter.frequency.setValueAtTime(3200, now);
        }

        const piccoloFreq = fundamentalFreq * 2; // 8va (+12 semitones)

        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(piccoloFreq, now);
        osc1.connect(dest);
        oscillators.push(osc1);
        toneOscillators.push({ osc: osc1, baseFreq: piccoloFreq });

        const osc2 = ctx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(piccoloFreq, now);
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.3, now);
        osc2.connect(g2);
        g2.connect(dest);
        oscillators.push(osc2);
        toneOscillators.push({ osc: osc2, baseFreq: piccoloFreq });

        // 6.0Hz flutter LFO
        const lfo = ctx.createOscillator();
        lfo.frequency.setValueAtTime(6.0, now);
        const lfoGain = ctx.createGain();
        lfoGain.gain.setValueAtTime(4.0, now);
        lfo.connect(lfoGain);
        lfoGain.connect(osc1.frequency);
        oscillators.push(lfo);

        const attack = isSlurContinuation ? 0.005 : Math.min(0.03, durationSec * 0.1);
        masterGain.gain.setValueAtTime(isSlurContinuation ? 0.16 * vol : 0, now);
        masterGain.gain.linearRampToValueAtTime(0.20 * vol, now + attack);
        if (isSlurred) {
          masterGain.gain.setValueAtTime(0.20 * vol, now + durationSec);
          masterGain.gain.linearRampToValueAtTime(0.0001, now + durationSec + 0.02);
        } else {
          masterGain.gain.setValueAtTime(0.20 * vol, Math.max(now + attack, now + durationSec - 0.03));
          masterGain.gain.linearRampToValueAtTime(0.0001, now + durationSec);
        }
        break;
      }

      case 'harp': {
        if (filter) {
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(4800, now);
          filter.frequency.exponentialRampToValueAtTime(900, now + Math.min(1.5, durationSec));
        }

        const osc1 = ctx.createOscillator();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(fundamentalFreq, now);
        osc1.connect(dest);
        oscillators.push(osc1);
        toneOscillators.push({ osc: osc1, baseFreq: fundamentalFreq });

        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(fundamentalFreq * 2, now);
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.35, now);
        osc2.connect(g2);
        g2.connect(dest);
        oscillators.push(osc2);
        toneOscillators.push({ osc: osc2, baseFreq: fundamentalFreq * 2 });

        const attack = 0.003;
        masterGain.gain.setValueAtTime(0, now);
        masterGain.gain.linearRampToValueAtTime(0.26 * vol, now + attack);
        masterGain.gain.exponentialRampToValueAtTime(0.0001, now + Math.min(1.5, durationSec));
        masterGain.gain.linearRampToValueAtTime(0.0001, now + (isSlurred ? durationSec + 0.05 : durationSec));
        break;
      }

      case 'pipe-organ': {
        if (filter) {
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(5000, now);
        }

        // 8' fundamental
        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(fundamentalFreq, now);
        osc1.connect(dest);
        oscillators.push(osc1);
        toneOscillators.push({ osc: osc1, baseFreq: fundamentalFreq });

        // 4' octave
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(fundamentalFreq * 2, now);
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.4, now);
        osc2.connect(g2);
        g2.connect(dest);
        oscillators.push(osc2);
        toneOscillators.push({ osc: osc2, baseFreq: fundamentalFreq * 2 });

        // 2⅔' fifth / 12th
        const osc3 = ctx.createOscillator();
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(fundamentalFreq * 3, now);
        const g3 = ctx.createGain();
        g3.gain.setValueAtTime(0.25, now);
        osc3.connect(g3);
        g3.connect(dest);
        oscillators.push(osc3);
        toneOscillators.push({ osc: osc3, baseFreq: fundamentalFreq * 3 });

        const attack = isSlurContinuation ? 0.005 : Math.min(0.04, durationSec * 0.1);
        masterGain.gain.setValueAtTime(isSlurContinuation ? 0.18 * vol : 0, now);
        masterGain.gain.linearRampToValueAtTime(0.22 * vol, now + attack);
        if (isSlurred) {
          masterGain.gain.setValueAtTime(0.22 * vol, now + durationSec);
          masterGain.gain.linearRampToValueAtTime(0.0001, now + durationSec + 0.02);
        } else {
          masterGain.gain.setValueAtTime(0.22 * vol, Math.max(now + attack, now + durationSec - 0.03));
          masterGain.gain.linearRampToValueAtTime(0.0001, now + durationSec);
        }
        break;
      }

      case 'bagpipe': {
        if (filter) {
          filter.type = 'bandpass';
          filter.frequency.setValueAtTime(1800, now);
          filter.Q.setValueAtTime(2.2, now);
        }

        const osc1 = ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(fundamentalFreq, now);
        osc1.connect(dest);
        oscillators.push(osc1);
        toneOscillators.push({ osc: osc1, baseFreq: fundamentalFreq });

        const osc2 = ctx.createOscillator();
        osc2.type = 'square';
        osc2.frequency.setValueAtTime(fundamentalFreq, now);
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.35, now);
        osc2.connect(g2);
        g2.connect(dest);
        oscillators.push(osc2);
        toneOscillators.push({ osc: osc2, baseFreq: fundamentalFreq });

        const osc3 = ctx.createOscillator();
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(fundamentalFreq * 2, now);
        const g3 = ctx.createGain();
        g3.gain.setValueAtTime(0.18, now);
        osc3.connect(g3);
        g3.connect(dest);
        oscillators.push(osc3);
        toneOscillators.push({ osc: osc3, baseFreq: fundamentalFreq * 2 });

        const attack = isSlurContinuation ? 0.004 : Math.min(0.03, durationSec * 0.1);
        masterGain.gain.setValueAtTime(isSlurContinuation ? 0.18 * vol : 0, now);
        masterGain.gain.linearRampToValueAtTime(0.22 * vol, now + attack);
        if (isSlurred) {
          masterGain.gain.setValueAtTime(0.22 * vol, now + durationSec);
          masterGain.gain.linearRampToValueAtTime(0.0001, now + durationSec + 0.02);
        } else {
          masterGain.gain.setValueAtTime(0.22 * vol, Math.max(now + attack, now + durationSec - 0.03));
          masterGain.gain.linearRampToValueAtTime(0.0001, now + durationSec);
        }
        break;
      }

      case 'trumpet': {
        if (filter) {
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(2800, now);
          filter.Q.setValueAtTime(1.5, now);
        }

        const osc1 = ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(fundamentalFreq, now);
        osc1.connect(dest);
        oscillators.push(osc1);
        toneOscillators.push({ osc: osc1, baseFreq: fundamentalFreq });

        const osc2 = ctx.createOscillator();
        osc2.type = 'triangle';
        osc2.frequency.setValueAtTime(fundamentalFreq * 2, now);
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.3, now);
        osc2.connect(g2);
        g2.connect(dest);
        oscillators.push(osc2);
        toneOscillators.push({ osc: osc2, baseFreq: fundamentalFreq * 2 });

        const osc3 = ctx.createOscillator();
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(fundamentalFreq * 3, now);
        const g3 = ctx.createGain();
        g3.gain.setValueAtTime(0.15, now);
        osc3.connect(g3);
        g3.connect(dest);
        oscillators.push(osc3);
        toneOscillators.push({ osc: osc3, baseFreq: fundamentalFreq * 3 });

        const attack = isSlurContinuation ? 0.005 : Math.min(0.04, durationSec * 0.15);
        masterGain.gain.setValueAtTime(isSlurContinuation ? 0.20 * vol : 0, now);
        masterGain.gain.linearRampToValueAtTime(0.24 * vol, now + attack);
        if (isSlurred) {
          masterGain.gain.setValueAtTime(0.24 * vol, now + durationSec);
          masterGain.gain.linearRampToValueAtTime(0.0001, now + durationSec + 0.02);
        } else {
          masterGain.gain.setValueAtTime(0.24 * vol, Math.max(now + attack, now + durationSec - 0.04));
          masterGain.gain.linearRampToValueAtTime(0.0001, now + durationSec);
        }
        break;
      }

      case 'tuba': {
        if (filter) {
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(850, now);
          filter.Q.setValueAtTime(1.8, now);
        }

        const osc1 = ctx.createOscillator();
        osc1.type = 'sawtooth';
        osc1.frequency.setValueAtTime(fundamentalFreq, now);
        osc1.connect(dest);
        oscillators.push(osc1);
        toneOscillators.push({ osc: osc1, baseFreq: fundamentalFreq });

        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(fundamentalFreq, now);
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.5, now);
        osc2.connect(g2);
        g2.connect(dest);
        oscillators.push(osc2);
        toneOscillators.push({ osc: osc2, baseFreq: fundamentalFreq });

        const osc3 = ctx.createOscillator();
        osc3.type = 'triangle';
        osc3.frequency.setValueAtTime(fundamentalFreq * 2, now);
        const g3 = ctx.createGain();
        g3.gain.setValueAtTime(0.25, now);
        osc3.connect(g3);
        g3.connect(dest);
        oscillators.push(osc3);
        toneOscillators.push({ osc: osc3, baseFreq: fundamentalFreq * 2 });

        const attack = isSlurContinuation ? 0.008 : Math.min(0.06, durationSec * 0.2);
        masterGain.gain.setValueAtTime(isSlurContinuation ? 0.20 * vol : 0, now);
        masterGain.gain.linearRampToValueAtTime(0.26 * vol, now + attack);
        if (isSlurred) {
          masterGain.gain.setValueAtTime(0.26 * vol, now + durationSec);
          masterGain.gain.linearRampToValueAtTime(0.0001, now + durationSec + 0.03);
        } else {
          masterGain.gain.setValueAtTime(0.26 * vol, Math.max(now + attack, now + durationSec - 0.05));
          masterGain.gain.linearRampToValueAtTime(0.0001, now + durationSec);
        }
        break;
      }

      case 'piano':
      default: {
        if (filter) {
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(2400, now);
        }

        const osc1 = ctx.createOscillator();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(fundamentalFreq, now);
        osc1.connect(dest);
        oscillators.push(osc1);
        toneOscillators.push({ osc: osc1, baseFreq: fundamentalFreq });

        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(fundamentalFreq * 2, now);
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.2, now);
        osc2.connect(g2);
        g2.connect(dest);
        oscillators.push(osc2);
        toneOscillators.push({ osc: osc2, baseFreq: fundamentalFreq * 2 });

        const attack = Math.min(0.01, durationSec * 0.1);
        const decay = Math.min(0.09, durationSec * 0.4);
        const sustainDuration = Math.max(0, durationSec - attack - decay - (durationSec * 0.2));
        const releaseTime = isSlurred
          ? now + durationSec
          : now + attack + decay + sustainDuration;

        masterGain.gain.setValueAtTime(0, now);
        masterGain.gain.linearRampToValueAtTime(0.25 * vol, now + attack);
        masterGain.gain.exponentialRampToValueAtTime(Math.max(0.0001, 0.12 * vol), now + attack + decay);
        masterGain.gain.setValueAtTime(Math.max(0.0001, 0.12 * vol), releaseTime);
        masterGain.gain.linearRampToValueAtTime(0.0001, now + (isSlurred ? durationSec + 0.03 : durationSec));
        break;
      }
    }

    if (isTrill) {
      const trillFreq = midiToFrequency(midi + 2);
      const ratio = trillFreq / fundamentalFreq;
      const step = 0.1;
      let stepIndex = 1;
      for (let t = step; t < durationSec - 0.01; t += step, stepIndex++) {
        const isUpper = stepIndex % 2 === 1;
        toneOscillators.forEach(({ osc, baseFreq }) => {
          osc.frequency.setValueAtTime(isUpper ? baseFreq * ratio : baseFreq, now + t);
        });
      }
    }

    const stopTime = isSlurred ? now + durationSec + 0.05 : now + durationSec;
    oscillators.forEach((osc) => {
      osc.start(now);
      osc.stop(stopTime);
    });
  } catch (err) {
    console.warn('AudioContext playback error:', err);
  }
}

export function playPitchAudition(
  diatonicOffset: number,
  clef: ClefType,
  accidental?: AccidentalType,
  keyAccidentalsCount: number = 0,
  instrument?: InstrumentType | string,
  durationSec: number = 0.3,
  volume: number = 1.0
): void {
  const midi = diatonicOffsetToMidi(diatonicOffset, clef, accidental, keyAccidentalsCount);
  playTone(midi, durationSec, instrument, volume);
}

