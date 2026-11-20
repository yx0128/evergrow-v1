let audioContext: AudioContext | null = null;

function getContext(): AudioContext | null {
  if (typeof window === 'undefined') return null;
  const Ctor =
    window.AudioContext ??
    (window as unknown as { webkitAudioContext?: typeof AudioContext })
      .webkitAudioContext;
  if (!Ctor) return null;
  if (!audioContext) audioContext = new Ctor();
  if (audioContext.state === 'suspended') {
    void audioContext.resume();
  }
  return audioContext;
}

interface ToneOptions {
  frequency: number;
  delay?: number;
  duration?: number;
  gain?: number;
  type?: OscillatorType;
}

function tone(ctx: AudioContext, options: ToneOptions): void {
  const {
    frequency,
    delay = 0,
    duration = 0.32,
    gain = 0.045,
    type = 'sine',
  } = options;
  const start = ctx.currentTime + delay;
  const oscillator = ctx.createOscillator();
  const amp = ctx.createGain();
  oscillator.type = type;
  oscillator.frequency.setValueAtTime(frequency, start);
  amp.gain.setValueAtTime(0.0001, start);
  amp.gain.exponentialRampToValueAtTime(gain, start + 0.02);
  amp.gain.exponentialRampToValueAtTime(0.0001, start + duration);
  oscillator.connect(amp).connect(ctx.destination);
  oscillator.start(start);
  oscillator.stop(start + duration + 0.05);
}

export type SoundName = 'task' | 'place' | 'buy' | 'store' | 'error' | 'ui';

export function playSound(name: SoundName): void {
  const ctx = getContext();
  if (!ctx) return;
  switch (name) {
    case 'task':
      tone(ctx, { frequency: 523.25, gain: 0.05, duration: 0.5 });
      tone(ctx, { frequency: 659.25, delay: 0.09, gain: 0.045, duration: 0.55 });
      tone(ctx, { frequency: 783.99, delay: 0.18, gain: 0.04, duration: 0.7 });
      break;
    case 'place':
      tone(ctx, { frequency: 392, type: 'triangle', gain: 0.035, duration: 0.18 });
      tone(ctx, { frequency: 587.33, delay: 0.04, type: 'triangle', gain: 0.03, duration: 0.22 });
      break;
    case 'buy':
      tone(ctx, { frequency: 659.25, type: 'triangle', gain: 0.035, duration: 0.16 });
      tone(ctx, { frequency: 880, delay: 0.05, type: 'triangle', gain: 0.028, duration: 0.2 });
      break;
    case 'store':
      tone(ctx, { frequency: 440, type: 'sine', gain: 0.03, duration: 0.2 });
      tone(ctx, { frequency: 329.63, delay: 0.06, type: 'sine', gain: 0.025, duration: 0.24 });
      break;
    case 'error':
      tone(ctx, { frequency: 170, type: 'sine', gain: 0.03, duration: 0.22 });
      break;
    case 'ui':
      tone(ctx, { frequency: 720, type: 'sine', gain: 0.018, duration: 0.08 });
      break;
  }
}
