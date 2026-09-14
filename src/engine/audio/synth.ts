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
  stopAllGlissando();
  audioCtx = null;
}

function createNoiseTransient(
  ctx: AudioContext,
  durationSec: number,
  now: number,
  peakGain: number,
  bandpassFreq?: number,
  bandpassQ: number = 1.0,
  destNode?: AudioNode
): AudioBufferSourceNode | null {
  if (!ctx.createBuffer || !ctx.createBufferSource) return null;
  try {
    const sampleRate = ctx.sampleRate || 44100;
    const frameCount = Math.max(1, Math.floor(sampleRate * durationSec));
    const buffer = ctx.createBuffer(1, frameCount, sampleRate);
    const data = buffer.getChannelData(0);
    for (let i = 0; i < frameCount; i++) {
      const decay = 1 - i / frameCount;
      data[i] = (Math.random() * 2 - 1) * decay;
    }
    const source = ctx.createBufferSource();
    source.buffer = buffer;

    const gainNode = ctx.createGain();
    gainNode.gain.setValueAtTime(peakGain, now);
    gainNode.gain.exponentialRampToValueAtTime(0.0001, now + durationSec);

    if (bandpassFreq && ctx.createBiquadFilter) {
      const filterNode = ctx.createBiquadFilter();
      filterNode.type = 'bandpass';
      filterNode.frequency.setValueAtTime(bandpassFreq, now);
      filterNode.Q.setValueAtTime(bandpassQ, now);
      source.connect(filterNode);
      filterNode.connect(gainNode);
    } else {
      source.connect(gainNode);
    }

    if (destNode) {
      gainNode.connect(destNode);
    }
    source.start(now);
    source.stop(now + durationSec);
    return source;
  } catch {
    return null;
  }
}

// Tracking last pitch played by instrument for continuous legato portamento transitions
const lastPitchByInstrument: Record<string, { midi: number; time: number }> = {};

let activeGlissandoTimeouts: ReturnType<typeof setTimeout>[] = [];

export function stopAllGlissando(): void {
  activeGlissandoTimeouts.forEach((t) => clearTimeout(t));
  activeGlissandoTimeouts = [];
}

export function resetLastPitchForTesting(): void {
  for (const key of Object.keys(lastPitchByInstrument)) {
    delete lastPitchByInstrument[key];
  }
}

export function playTone(
  midi: number,
  durationSec: number = 0.3,
  instrument?: InstrumentType | string,
  volume: number = 1.0,
  isSlurred: boolean = false,
  isSlurContinuation: boolean = false,
  isTrill: boolean = false,
  prevMidi?: number,
  glissandoTargetMidi?: number,
  glissandoStyle?: 'wavy' | 'straight',
  isMordent?: boolean,
  isTurn?: boolean,
  isTenuto?: boolean
): void {
  try {
    const ctx = getAudioContext();
    if (!ctx) return;

    const totalDurationSec = durationSec;
    const isGlissandoHead =
      glissandoTargetMidi !== undefined &&
      glissandoTargetMidi !== midi &&
      Math.abs(glissandoTargetMidi - midi) > 1;

    if (isGlissandoHead) {
      durationSec = Math.min(0.14, Math.max(0.06, totalDurationSec * 0.28));
    }

    const now = ctx.currentTime;
    const vol = Math.max(0, Math.min(1, volume));
    const inst = (instrument || 'piano') as InstrumentType;

    const effectivePrevMidi = prevMidi !== undefined
      ? prevMidi
      : (lastPitchByInstrument[inst] && (now - lastPitchByInstrument[inst].time < 1.0) ? lastPitchByInstrument[inst].midi : undefined);

    lastPitchByInstrument[inst] = { midi, time: now + totalDurationSec };

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
          // Dynamic velocity curve: soft notes darker, loud notes brighter
          const cutoff = 1600 + 2200 * vol;
          filter.frequency.setValueAtTime(cutoff, now);
          // Dynamic filter envelope: sweeps down from bright hammer attack to warm singing body
          const sustainCutoff = Math.max(900, cutoff * 0.45);
          filter.frequency.exponentialRampToValueAtTime(
            sustainCutoff,
            now + Math.min(0.35, durationSec * 0.7)
          );
          filter.Q.setValueAtTime(1.2, now);
        }

        // Two-tone hammer strike: low-mid soundboard thump + high felt impact
        createNoiseTransient(ctx, 0.008, now, 0.12 * vol, 220, 2.0, dest);
        createNoiseTransient(ctx, 0.005, now, 0.16 * vol, 3500, 1.2, dest);

        // String stiffness inharmonicity factor
        const inharmonicStretch = (harmonicNum: number) => Math.sqrt(1 + 0.00008 * harmonicNum * harmonicNum);

        // Primary fundamental oscillator
        const osc1 = ctx.createOscillator();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(fundamentalFreq, now);
        osc1.connect(dest);
        oscillators.push(osc1);
        toneOscillators.push({ osc: osc1, baseFreq: fundamentalFreq });

        // Detuned fundamental strings (±1.2Hz) simulating multi-string chorus
        const oscDetune1 = ctx.createOscillator();
        oscDetune1.type = 'triangle';
        oscDetune1.frequency.setValueAtTime(fundamentalFreq + 1.2, now);
        const gDetune1 = ctx.createGain();
        gDetune1.gain.setValueAtTime(0.35, now);
        oscDetune1.connect(gDetune1);
        gDetune1.connect(dest);
        oscillators.push(oscDetune1);
        toneOscillators.push({ osc: oscDetune1, baseFreq: fundamentalFreq + 1.2 });

        const oscDetune2 = ctx.createOscillator();
        oscDetune2.type = 'triangle';
        oscDetune2.frequency.setValueAtTime(fundamentalFreq - 1.2, now);
        const gDetune2 = ctx.createGain();
        gDetune2.gain.setValueAtTime(0.25, now);
        oscDetune2.connect(gDetune2);
        gDetune2.connect(dest);
        oscillators.push(oscDetune2);
        toneOscillators.push({ osc: oscDetune2, baseFreq: fundamentalFreq - 1.2 });

        // Multi-harmonic overtone bank with frequency-dependent damping (higher harmonics decay faster)
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        const h2Freq = fundamentalFreq * 2 * inharmonicStretch(2);
        osc2.frequency.setValueAtTime(h2Freq, now);
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.4, now);
        g2.gain.exponentialRampToValueAtTime(Math.max(0.0001, 0.08 * vol), now + Math.min(0.45, durationSec * 0.8));
        osc2.connect(g2);
        g2.connect(dest);
        oscillators.push(osc2);
        toneOscillators.push({ osc: osc2, baseFreq: h2Freq });

        const osc3 = ctx.createOscillator();
        osc3.type = 'sine';
        const h3Freq = fundamentalFreq * 3 * inharmonicStretch(3);
        osc3.frequency.setValueAtTime(h3Freq, now);
        const g3 = ctx.createGain();
        g3.gain.setValueAtTime(0.2, now);
        g3.gain.exponentialRampToValueAtTime(Math.max(0.0001, 0.02 * vol), now + Math.min(0.30, durationSec * 0.6));
        osc3.connect(g3);
        g3.connect(dest);
        oscillators.push(osc3);
        toneOscillators.push({ osc: osc3, baseFreq: h3Freq });

        const osc4 = ctx.createOscillator();
        osc4.type = 'sine';
        const h4Freq = fundamentalFreq * 4 * inharmonicStretch(4);
        osc4.frequency.setValueAtTime(h4Freq, now);
        const g4 = ctx.createGain();
        g4.gain.setValueAtTime(0.1, now);
        g4.gain.exponentialRampToValueAtTime(0.0001, now + Math.min(0.20, durationSec * 0.45));
        osc4.connect(g4);
        g4.connect(dest);
        oscillators.push(osc4);
        toneOscillators.push({ osc: osc4, baseFreq: h4Freq });

        const osc5 = ctx.createOscillator();
        osc5.type = 'sine';
        const h5Freq = fundamentalFreq * 5 * inharmonicStretch(5);
        osc5.frequency.setValueAtTime(h5Freq, now);
        const g5 = ctx.createGain();
        g5.gain.setValueAtTime(0.05, now);
        g5.gain.exponentialRampToValueAtTime(0.0001, now + Math.min(0.15, durationSec * 0.35));
        osc5.connect(g5);
        g5.connect(dest);
        oscillators.push(osc5);
        toneOscillators.push({ osc: osc5, baseFreq: h5Freq });

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

        // Secondary body formant filter (1200Hz)
        if (ctx.createBiquadFilter) {
          const bodyFilter = ctx.createBiquadFilter();
          bodyFilter.type = 'bandpass';
          bodyFilter.frequency.setValueAtTime(1200, now);
          bodyFilter.Q.setValueAtTime(1.5, now);
          bodyFilter.connect(dest);
        }

        // Bow friction attack transient (suppressed on seamless slurred legato continuation)
        if (!isSlurContinuation) {
          createNoiseTransient(
            ctx,
            Math.min(0.04, durationSec * 0.15),
            now,
            0.09 * vol,
            2500,
            2.0,
            dest
          );
        }

        // Primary bowed string sawtooth oscillator
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';

        // Warm acoustic body resonance oscillator
        const oscBody = ctx.createOscillator();
        oscBody.type = 'triangle';

        if (isSlurContinuation && effectivePrevMidi !== undefined && effectivePrevMidi !== midi) {
          const prevFreq = midiToFrequency(effectivePrevMidi);
          osc.frequency.setValueAtTime(prevFreq, now);
          if (osc.frequency.exponentialRampToValueAtTime) {
            osc.frequency.exponentialRampToValueAtTime(fundamentalFreq, now + 0.028);
          }
          oscBody.frequency.setValueAtTime(prevFreq, now);
          if (oscBody.frequency.exponentialRampToValueAtTime) {
            oscBody.frequency.exponentialRampToValueAtTime(fundamentalFreq, now + 0.028);
          }
        } else {
          // Fresh note attack: fundamental pitch with organic finger-settle micro-intonation
          osc.frequency.setValueAtTime(fundamentalFreq, now);
          osc.frequency.setValueAtTime(fundamentalFreq * 0.993, now);
          if (osc.frequency.exponentialRampToValueAtTime) {
            osc.frequency.exponentialRampToValueAtTime(fundamentalFreq, now + 0.015);
          }

          oscBody.frequency.setValueAtTime(fundamentalFreq, now);
          oscBody.frequency.setValueAtTime(fundamentalFreq * 0.993, now);
          if (oscBody.frequency.exponentialRampToValueAtTime) {
            oscBody.frequency.exponentialRampToValueAtTime(fundamentalFreq, now + 0.015);
          }
        }

        osc.connect(dest);
        oscillators.push(osc);
        toneOscillators.push({ osc, baseFreq: fundamentalFreq });

        const gBody = ctx.createGain();
        gBody.gain.setValueAtTime(0.25, now);
        oscBody.connect(gBody);
        gBody.connect(dest);
        oscillators.push(oscBody);
        toneOscillators.push({ osc: oscBody, baseFreq: fundamentalFreq });

        // Natural progressive vibrato: LFO onset delayed, swelling from 0 to 6.0 depth
        const lfo = ctx.createOscillator();
        lfo.frequency.setValueAtTime(5.5, now);
        const lfoGain = ctx.createGain();
        const vibDelay = isSlurContinuation ? 0.02 : Math.min(0.2, durationSec * 0.3);
        lfoGain.gain.setValueAtTime(0, now);
        lfoGain.gain.linearRampToValueAtTime(6.0, now + vibDelay);
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfoGain.connect(oscBody.frequency);
        oscillators.push(lfo);

        masterGain.gain.setValueAtTime(isSlurContinuation ? 0.22 * vol : 0, now);
        if (!isSlurContinuation) {
          const attack = Math.min(0.06, durationSec * 0.2);
          masterGain.gain.linearRampToValueAtTime(0.22 * vol, now + attack);
        }
        if (isSlurred) {
          masterGain.gain.setValueAtTime(0.22 * vol, now + durationSec);
          masterGain.gain.linearRampToValueAtTime(0.0001, now + durationSec + 0.03);
        } else {
          const attack = isSlurContinuation ? 0.006 : Math.min(0.06, durationSec * 0.2);
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

        // Secondary body formant filter (900Hz)
        if (ctx.createBiquadFilter) {
          const bodyFilter = ctx.createBiquadFilter();
          bodyFilter.type = 'bandpass';
          bodyFilter.frequency.setValueAtTime(900, now);
          bodyFilter.Q.setValueAtTime(1.5, now);
          bodyFilter.connect(dest);
        }

        // Bow friction attack transient
        if (!isSlurContinuation) {
          createNoiseTransient(
            ctx,
            Math.min(0.045, durationSec * 0.18),
            now,
            0.09 * vol,
            1200,
            1.5,
            dest
          );
        }

        const osc1 = ctx.createOscillator();
        osc1.type = 'sawtooth';

        const osc2 = ctx.createOscillator();
        osc2.type = 'square';

        if (isSlurContinuation && effectivePrevMidi !== undefined && effectivePrevMidi !== midi) {
          const prevFreq = midiToFrequency(effectivePrevMidi);
          osc1.frequency.setValueAtTime(prevFreq, now);
          if (osc1.frequency.exponentialRampToValueAtTime) {
            osc1.frequency.exponentialRampToValueAtTime(fundamentalFreq, now + 0.032);
          }
          osc2.frequency.setValueAtTime(prevFreq, now);
          if (osc2.frequency.exponentialRampToValueAtTime) {
            osc2.frequency.exponentialRampToValueAtTime(fundamentalFreq, now + 0.032);
          }
        } else {
          osc1.frequency.setValueAtTime(fundamentalFreq, now);
          osc1.frequency.setValueAtTime(fundamentalFreq * 0.993, now);
          if (osc1.frequency.exponentialRampToValueAtTime) {
            osc1.frequency.exponentialRampToValueAtTime(fundamentalFreq, now + 0.016);
          }

          osc2.frequency.setValueAtTime(fundamentalFreq, now);
          osc2.frequency.setValueAtTime(fundamentalFreq * 0.993, now);
          if (osc2.frequency.exponentialRampToValueAtTime) {
            osc2.frequency.exponentialRampToValueAtTime(fundamentalFreq, now + 0.016);
          }
        }

        osc1.connect(dest);
        oscillators.push(osc1);
        toneOscillators.push({ osc: osc1, baseFreq: fundamentalFreq });

        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.25, now);
        osc2.connect(g2);
        g2.connect(dest);
        oscillators.push(osc2);
        toneOscillators.push({ osc: osc2, baseFreq: fundamentalFreq });

        // Natural progressive vibrato (5.0Hz)
        const lfo = ctx.createOscillator();
        lfo.frequency.setValueAtTime(5.0, now);
        const lfoGain = ctx.createGain();
        const vibDelay = isSlurContinuation ? 0.02 : Math.min(0.2, durationSec * 0.3);
        lfoGain.gain.setValueAtTime(0, now);
        lfoGain.gain.linearRampToValueAtTime(5.0, now + vibDelay);
        lfo.connect(lfoGain);
        lfoGain.connect(osc1.frequency);
        lfoGain.connect(osc2.frequency);
        oscillators.push(lfo);

        masterGain.gain.setValueAtTime(isSlurContinuation ? 0.22 * vol : 0, now);
        if (!isSlurContinuation) {
          const attack = Math.min(0.08, durationSec * 0.2);
          masterGain.gain.linearRampToValueAtTime(0.22 * vol, now + attack);
        }
        if (isSlurred) {
          masterGain.gain.setValueAtTime(0.22 * vol, now + durationSec);
          masterGain.gain.linearRampToValueAtTime(0.0001, now + durationSec + 0.03);
        } else {
          const attack = isSlurContinuation ? 0.006 : Math.min(0.08, durationSec * 0.2);
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

        // Secondary body formant filter (600Hz)
        if (ctx.createBiquadFilter) {
          const bodyFilter = ctx.createBiquadFilter();
          bodyFilter.type = 'bandpass';
          bodyFilter.frequency.setValueAtTime(600, now);
          bodyFilter.Q.setValueAtTime(1.5, now);
          bodyFilter.connect(dest);
        }

        // Bow friction attack transient
        if (!isSlurContinuation) {
          createNoiseTransient(
            ctx,
            Math.min(0.05, durationSec * 0.2),
            now,
            0.10 * vol,
            700,
            1.8,
            dest
          );
        }

        // Primary bowed string sawtooth oscillator
        const osc = ctx.createOscillator();
        osc.type = 'sawtooth';

        // Deep woody cello body resonance oscillator
        const oscBody = ctx.createOscillator();
        oscBody.type = 'triangle';

        if (isSlurContinuation && effectivePrevMidi !== undefined && effectivePrevMidi !== midi) {
          const prevFreq = midiToFrequency(effectivePrevMidi);
          osc.frequency.setValueAtTime(prevFreq, now);
          if (osc.frequency.exponentialRampToValueAtTime) {
            osc.frequency.exponentialRampToValueAtTime(fundamentalFreq, now + 0.035);
          }
          oscBody.frequency.setValueAtTime(prevFreq, now);
          if (oscBody.frequency.exponentialRampToValueAtTime) {
            oscBody.frequency.exponentialRampToValueAtTime(fundamentalFreq, now + 0.035);
          }
        } else {
          osc.frequency.setValueAtTime(fundamentalFreq, now);
          osc.frequency.setValueAtTime(fundamentalFreq * 0.993, now);
          if (osc.frequency.exponentialRampToValueAtTime) {
            osc.frequency.exponentialRampToValueAtTime(fundamentalFreq, now + 0.018);
          }

          oscBody.frequency.setValueAtTime(fundamentalFreq, now);
          oscBody.frequency.setValueAtTime(fundamentalFreq * 0.993, now);
          if (oscBody.frequency.exponentialRampToValueAtTime) {
            oscBody.frequency.exponentialRampToValueAtTime(fundamentalFreq, now + 0.018);
          }
        }

        osc.connect(dest);
        oscillators.push(osc);
        toneOscillators.push({ osc, baseFreq: fundamentalFreq });

        const gBody = ctx.createGain();
        gBody.gain.setValueAtTime(0.26, now);
        oscBody.connect(gBody);
        gBody.connect(dest);
        oscillators.push(oscBody);
        toneOscillators.push({ osc: oscBody, baseFreq: fundamentalFreq });

        // Natural progressive vibrato (4.5Hz)
        const lfo = ctx.createOscillator();
        lfo.frequency.setValueAtTime(4.5, now);
        const lfoGain = ctx.createGain();
        const vibDelay = isSlurContinuation ? 0.02 : Math.min(0.2, durationSec * 0.3);
        lfoGain.gain.setValueAtTime(0, now);
        lfoGain.gain.linearRampToValueAtTime(4.0, now + vibDelay);
        lfo.connect(lfoGain);
        lfoGain.connect(osc.frequency);
        lfoGain.connect(oscBody.frequency);
        oscillators.push(lfo);

        const attack = isSlurContinuation ? 0.008 : Math.min(0.09, durationSec * 0.25);
        masterGain.gain.setValueAtTime(isSlurContinuation ? 0.20 * vol : 0, now);
        if (!isSlurContinuation) {
          masterGain.gain.linearRampToValueAtTime(0.24 * vol, now + attack);
        }
        if (isSlurred) {
          masterGain.gain.setValueAtTime(0.24 * vol, now + durationSec);
          masterGain.gain.linearRampToValueAtTime(0.0001, now + durationSec + 0.04);
        } else {
          masterGain.gain.setValueAtTime(0.24 * vol, Math.max(now + attack, now + durationSec - 0.07));
          masterGain.gain.linearRampToValueAtTime(0.0001, now + durationSec);
        }
        break;
      }

      case 'flute': {
        if (filter) {
          filter.type = 'lowpass';
          filter.frequency.setValueAtTime(4200, now);
        }

        // Breath turbulence noise tracking pitch range
        createNoiseTransient(
          ctx,
          Math.min(0.25, durationSec * 0.5),
          now,
          0.05 * vol,
          fundamentalFreq * 2.5,
          1.5,
          dest
        );

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

        // 2nd harmonic overtone
        const osc3 = ctx.createOscillator();
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(fundamentalFreq * 2, now);
        const g3 = ctx.createGain();
        g3.gain.setValueAtTime(0.22, now);
        osc3.connect(g3);
        g3.connect(dest);
        oscillators.push(osc3);
        toneOscillators.push({ osc: osc3, baseFreq: fundamentalFreq * 2 });

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

        // Breath turbulence noise
        createNoiseTransient(
          ctx,
          Math.min(0.2, durationSec * 0.4),
          now,
          0.05 * vol,
          piccoloFreq * 2,
          1.5,
          dest
        );

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

        // 2nd harmonic overtone for piccolo
        const osc3 = ctx.createOscillator();
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(piccoloFreq * 2, now);
        const g3 = ctx.createGain();
        g3.gain.setValueAtTime(0.2, now);
        osc3.connect(g3);
        g3.connect(dest);
        oscillators.push(osc3);
        toneOscillators.push({ osc: osc3, baseFreq: piccoloFreq * 2 });

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

        // Pluck impulse transient
        createNoiseTransient(ctx, 0.015, now, 0.20 * vol, 4800, 1.2, dest);

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

        const osc3 = ctx.createOscillator();
        osc3.type = 'sine';
        osc3.frequency.setValueAtTime(fundamentalFreq * 3, now);
        const g3 = ctx.createGain();
        g3.gain.setValueAtTime(0.15, now);
        osc3.connect(g3);
        g3.connect(dest);
        oscillators.push(osc3);
        toneOscillators.push({ osc: osc3, baseFreq: fundamentalFreq * 3 });

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

        // Multi-rank additive harmonic drawbars:
        // 8' fundamental (1x)
        const osc1 = ctx.createOscillator();
        osc1.type = 'sine';
        osc1.frequency.setValueAtTime(fundamentalFreq, now);
        osc1.connect(dest);
        oscillators.push(osc1);
        toneOscillators.push({ osc: osc1, baseFreq: fundamentalFreq });

        // 16' sub-octave (0.5x)
        const osc16 = ctx.createOscillator();
        osc16.type = 'sine';
        osc16.frequency.setValueAtTime(fundamentalFreq * 0.5, now);
        const g16 = ctx.createGain();
        g16.gain.setValueAtTime(0.35, now);
        osc16.connect(g16);
        g16.connect(dest);
        oscillators.push(osc16);
        toneOscillators.push({ osc: osc16, baseFreq: fundamentalFreq * 0.5 });

        // 4' octave (2x)
        const osc4 = ctx.createOscillator();
        osc4.type = 'sine';
        osc4.frequency.setValueAtTime(fundamentalFreq * 2, now);
        const g4 = ctx.createGain();
        g4.gain.setValueAtTime(0.4, now);
        osc4.connect(g4);
        g4.connect(dest);
        oscillators.push(osc4);
        toneOscillators.push({ osc: osc4, baseFreq: fundamentalFreq * 2 });

        // 2⅔' fifth / twelfth (3x)
        const osc2_23 = ctx.createOscillator();
        osc2_23.type = 'sine';
        osc2_23.frequency.setValueAtTime(fundamentalFreq * 3, now);
        const g2_23 = ctx.createGain();
        g2_23.gain.setValueAtTime(0.25, now);
        osc2_23.connect(g2_23);
        g2_23.connect(dest);
        oscillators.push(osc2_23);
        toneOscillators.push({ osc: osc2_23, baseFreq: fundamentalFreq * 3 });

        // 2' fifteenth (4x)
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        osc2.frequency.setValueAtTime(fundamentalFreq * 4, now);
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.20, now);
        osc2.connect(g2);
        g2.connect(dest);
        oscillators.push(osc2);
        toneOscillators.push({ osc: osc2, baseFreq: fundamentalFreq * 4 });

        // 1⅗' seventeenth / tierce (5x)
        const osc1_35 = ctx.createOscillator();
        osc1_35.type = 'sine';
        osc1_35.frequency.setValueAtTime(fundamentalFreq * 5, now);
        const g1_35 = ctx.createGain();
        g1_35.gain.setValueAtTime(0.15, now);
        osc1_35.connect(g1_35);
        g1_35.connect(dest);
        oscillators.push(osc1_35);
        toneOscillators.push({ osc: osc1_35, baseFreq: fundamentalFreq * 5 });

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
          // Dynamic velocity curve: soft notes warmer, loud notes brighter
          const cutoff = 1200 + 1200 * vol;
          filter.frequency.setValueAtTime(cutoff, now);
          // Dynamic filter decay envelope
          const sustainCutoff = Math.max(700, cutoff * 0.5);
          filter.frequency.exponentialRampToValueAtTime(
            sustainCutoff,
            now + Math.min(0.35, durationSec * 0.7)
          );
        }

        // Two-tone hammer strike: low-mid soundboard thump + high felt impact
        createNoiseTransient(ctx, 0.008, now, 0.10 * vol, 220, 2.0, dest);
        createNoiseTransient(ctx, 0.005, now, 0.15 * vol, 3000, 1.2, dest);

        // String stiffness inharmonicity factor
        const inharmonicStretch = (harmonicNum: number) => Math.sqrt(1 + 0.00008 * harmonicNum * harmonicNum);

        // Primary fundamental oscillator
        const osc1 = ctx.createOscillator();
        osc1.type = 'triangle';
        osc1.frequency.setValueAtTime(fundamentalFreq, now);
        osc1.connect(dest);
        oscillators.push(osc1);
        toneOscillators.push({ osc: osc1, baseFreq: fundamentalFreq });

        // Detuned fundamental string (+1.2Hz) for acoustic chorus
        const oscChorus = ctx.createOscillator();
        oscChorus.type = 'triangle';
        oscChorus.frequency.setValueAtTime(fundamentalFreq + 1.2, now);
        const gChorus = ctx.createGain();
        gChorus.gain.setValueAtTime(0.3, now);
        oscChorus.connect(gChorus);
        gChorus.connect(dest);
        oscillators.push(oscChorus);
        toneOscillators.push({ osc: oscChorus, baseFreq: fundamentalFreq + 1.2 });

        // Multi-harmonic overtone bank with frequency-dependent damping
        const osc2 = ctx.createOscillator();
        osc2.type = 'sine';
        const h2Freq = fundamentalFreq * 2 * inharmonicStretch(2);
        osc2.frequency.setValueAtTime(h2Freq, now);
        const g2 = ctx.createGain();
        g2.gain.setValueAtTime(0.2, now);
        g2.gain.exponentialRampToValueAtTime(Math.max(0.0001, 0.05 * vol), now + Math.min(0.40, durationSec * 0.7));
        osc2.connect(g2);
        g2.connect(dest);
        oscillators.push(osc2);
        toneOscillators.push({ osc: osc2, baseFreq: h2Freq });

        const osc3 = ctx.createOscillator();
        osc3.type = 'sine';
        const h3Freq = fundamentalFreq * 3 * inharmonicStretch(3);
        osc3.frequency.setValueAtTime(h3Freq, now);
        const g3 = ctx.createGain();
        g3.gain.setValueAtTime(0.12, now);
        g3.gain.exponentialRampToValueAtTime(Math.max(0.0001, 0.02 * vol), now + Math.min(0.25, durationSec * 0.5));
        osc3.connect(g3);
        g3.connect(dest);
        oscillators.push(osc3);
        toneOscillators.push({ osc: osc3, baseFreq: h3Freq });

        const osc4 = ctx.createOscillator();
        osc4.type = 'sine';
        const h4Freq = fundamentalFreq * 4 * inharmonicStretch(4);
        osc4.frequency.setValueAtTime(h4Freq, now);
        const g4 = ctx.createGain();
        g4.gain.setValueAtTime(0.06, now);
        g4.gain.exponentialRampToValueAtTime(0.0001, now + Math.min(0.18, durationSec * 0.4));
        osc4.connect(g4);
        g4.connect(dest);
        oscillators.push(osc4);
        toneOscillators.push({ osc: osc4, baseFreq: h4Freq });

        const osc5 = ctx.createOscillator();
        osc5.type = 'sine';
        const h5Freq = fundamentalFreq * 5 * inharmonicStretch(5);
        osc5.frequency.setValueAtTime(h5Freq, now);
        const g5 = ctx.createGain();
        g5.gain.setValueAtTime(0.03, now);
        g5.gain.exponentialRampToValueAtTime(0.0001, now + Math.min(0.12, durationSec * 0.3));
        osc5.connect(g5);
        g5.connect(dest);
        oscillators.push(osc5);
        toneOscillators.push({ osc: osc5, baseFreq: h5Freq });

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

    if (isMordent) {
      const lowerFreq = midiToFrequency(midi - 1);
      const ratio = lowerFreq / fundamentalFreq;
      toneOscillators.forEach(({ osc, baseFreq }) => {
        osc.frequency.setValueAtTime(baseFreq, now);
        osc.frequency.setValueAtTime(baseFreq * ratio, now + 0.035);
        osc.frequency.setValueAtTime(baseFreq, now + 0.07);
      });
    }

    if (isTurn) {
      const upperFreq = midiToFrequency(midi + 2);
      const lowerFreq = midiToFrequency(midi - 1);
      const step = Math.min(0.06, durationSec / 5);
      toneOscillators.forEach(({ osc, baseFreq }) => {
        osc.frequency.setValueAtTime(baseFreq * (upperFreq / fundamentalFreq), now);
        osc.frequency.setValueAtTime(baseFreq, now + step);
        osc.frequency.setValueAtTime(baseFreq * (lowerFreq / fundamentalFreq), now + step * 2);
        osc.frequency.setValueAtTime(baseFreq, now + step * 3);
      });
    }

    if (isGlissandoHead) {
      const totalDiff = glissandoTargetMidi! - midi;
      const totalSemitones = Math.abs(totalDiff);
      const cascadeStartSec = durationSec;
      const cascadeDurationSec = Math.max(0.08, totalDurationSec - cascadeStartSec);
      const minStepSec = 0.038;
      const maxSteps = Math.max(1, Math.floor(cascadeDurationSec / minStepSec));
      const numSteps = Math.min(totalSemitones - 1, maxSteps);

      if (numSteps > 0) {
        const stepDt = cascadeDurationSec / (numSteps + 1);
        const stepDur = Math.max(0.045, stepDt * 1.25);

        for (let s = 1; s <= numSteps; s++) {
          const stepPitch = Math.round(midi + s * (totalDiff / (numSteps + 1)));
          const delayMs = (cascadeStartSec + (s - 1) * stepDt) * 1000;
          const wavyMultiplier = glissandoStyle === 'wavy' ? (s % 2 === 0 ? 1.05 : 0.95) : 1.0;
          const stepVol = Math.min(1.0, vol * 0.85 * wavyMultiplier);
          const tId = setTimeout(() => {
            playTone(stepPitch, stepDur, inst, stepVol, true, true);
          }, delayMs);
          activeGlissandoTimeouts.push(tId);
        }
      }
    }

    const stopTime = isSlurred || isTenuto ? now + durationSec + 0.05 : now + durationSec;
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
  volume: number = 1.0,
  semitoneShift: number = 0
): void {
  const midi = diatonicOffsetToMidi(diatonicOffset, clef, accidental, keyAccidentalsCount) + semitoneShift;
  playTone(midi, durationSec, instrument, volume);
}

