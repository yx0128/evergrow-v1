import { useEffect } from 'react';
import { createPortal } from 'react-dom';
import {
  Music2,
  Pause,
  Play,
  Repeat,
  SkipBack,
  SkipForward,
  Volume2,
  VolumeX,
  Waves,
  X,
} from 'lucide-react';
import { AUDIO_KIND_LABELS, type AudioKind } from '../../lib/audioLibrary';
import { playSound } from '../../lib/sound';
import type { AudioPlayerApi } from '../../hooks/useAudioPlayer';

interface AudioPanelProps {
  open: boolean;
  player: AudioPlayerApi;
  onClose: () => void;
}

const KINDS: AudioKind[] = ['music', 'ambience'];

export function AudioPanel({ open, player, onClose }: AudioPanelProps) {
  useEffect(() => {
    if (!open) return;
    function onKeyDown(event: KeyboardEvent) {
      if (event.key === 'Escape') onClose();
    }
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const Icon = player.kind === 'music' ? Music2 : Waves;

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4"
      role="dialog"
      aria-modal="true"
      aria-labelledby="audio-title"
    >
      <button
        type="button"
        className="absolute inset-0 cursor-default bg-ink/25 backdrop-blur-[2px]"
        onClick={onClose}
        aria-label="Close sound player"
      />
      <div className="glass-panel relative flex h-[82vh] max-h-[680px] w-full max-w-3xl animate-panel-in flex-col overflow-hidden rounded-[28px] shadow-panel">
        <header className="flex items-start justify-between gap-4 border-b border-ink/10 px-5 pb-3 pt-4">
          <div>
            <p className="text-[10px] font-bold uppercase tracking-[0.2em] text-sage-deep">
              Sound
            </p>
            <h2 id="audio-title" className="mt-0.5 font-display text-[21px] leading-tight text-ink">
              Music &amp; ambience
            </h2>
            <p className="mt-0.5 text-[11px] text-ink-soft">
              Nothing plays until you press play.
            </p>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="hud-icon focus-ring !h-9 !w-9"
            aria-label="Close sound player"
          >
            <X size={17} />
          </button>
        </header>

        <div className="flex items-center gap-1.5 px-5 pt-3">
          {KINDS.map((kind) => {
            const active = player.kind === kind;
            return (
              <button
                key={kind}
                type="button"
                onClick={() => {
                  player.setKind(kind);
                  playSound('ui');
                }}
                className={`focus-ring flex items-center gap-1.5 rounded-full px-3 py-1.5 text-[11.5px] font-semibold transition ${
                  active
                    ? 'bg-sage-deep text-ivory shadow-float'
                    : 'bg-white/50 text-ink-soft hover:bg-white/80 hover:text-ink'
                }`}
                aria-pressed={active}
              >
                {kind === 'music' ? <Music2 size={13} /> : <Waves size={13} />}
                {AUDIO_KIND_LABELS[kind]}
              </button>
            );
          })}
        </div>

        <div className="panel-scroll mt-3 min-h-0 flex-1 overflow-y-auto px-5 pb-3">
          <ul className="grid gap-1.5 sm:grid-cols-2">
            {player.tracks.map((track, index) => {
              const active = index === player.index;
              const playing = active && player.isPlaying;
              return (
                <li key={track.id}>
                  <div
                    className={`flex items-center gap-2 rounded-xl border px-2.5 py-1.5 transition ${
                      active
                        ? 'border-sage-deep/35 bg-sage/15'
                        : 'border-ink/8 bg-white/40 hover:bg-white/65'
                    }`}
                  >
                    <button
                      type="button"
                      onClick={() => {
                        player.selectTrack(player.kind, index);
                        playSound('ui');
                      }}
                      className="focus-ring min-w-0 flex-1 truncate text-left text-[11.5px] font-semibold text-ink"
                      aria-pressed={active}
                      title={track.title}
                    >
                      {track.title}
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        if (playing) player.pause();
                        else player.playTrack(player.kind, index);
                        playSound('ui');
                      }}
                      className={`focus-ring flex h-6 w-6 shrink-0 items-center justify-center rounded-full transition ${
                        playing
                          ? 'bg-sage-deep text-ivory'
                          : 'bg-white/70 text-sage-deep hover:bg-sage/25'
                      }`}
                      aria-label={playing ? `Pause ${track.title}` : `Play ${track.title}`}
                    >
                      {playing ? <Pause size={11} /> : <Play size={11} />}
                    </button>
                  </div>
                </li>
              );
            })}
          </ul>
        </div>

        <div className="border-t border-ink/10 bg-white/25 px-5 py-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex min-w-0 items-center gap-2">
              <Icon size={15} className="shrink-0 text-sage-deep" />
              <div className="min-w-0">
                <p className="truncate text-[12px] font-semibold text-ink">
                  {player.currentTrack.title}
                </p>
                <p className="text-[9.5px] font-semibold uppercase tracking-wide text-ink-soft/70">
                  {AUDIO_KIND_LABELS[player.kind]} · {player.isPlaying ? 'Playing' : 'Paused'}
                  {player.loop
                    ? player.loopMinutes > 0
                      ? ` · loops ${player.loopMinutes} min`
                      : ' · loops endlessly'
                    : ''}
                </p>
              </div>
            </div>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={player.prev}
                className="hud-icon focus-ring !h-8 !w-8"
                aria-label="Previous track"
                title="Previous track"
              >
                <SkipBack size={15} />
              </button>
              <button
                type="button"
                onClick={() => {
                  player.toggle();
                  playSound('ui');
                }}
                className="focus-ring flex h-10 w-10 items-center justify-center rounded-full bg-sage-deep text-ivory shadow-float transition hover:bg-moss active:scale-95"
                aria-label={player.isPlaying ? 'Pause audio' : 'Play audio'}
                title={player.isPlaying ? 'Pause' : 'Play'}
              >
                {player.isPlaying ? <Pause size={17} /> : <Play size={17} />}
              </button>
              <button
                type="button"
                onClick={player.next}
                className="hud-icon focus-ring !h-8 !w-8"
                aria-label="Next track"
                title="Next track"
              >
                <SkipForward size={15} />
              </button>
            </div>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-3">
            <button
              type="button"
              onClick={() => {
                player.setLoop(!player.loop);
                playSound('ui');
              }}
              className={`focus-ring flex items-center gap-1 rounded-full px-2 py-1 text-[10.5px] font-semibold transition ${
                player.loop
                  ? 'bg-sage-deep text-ivory'
                  : 'bg-white/55 text-ink-soft hover:bg-white/80'
              }`}
              aria-pressed={player.loop}
            >
              <Repeat size={12} />
              Loop
            </button>
            <label className="flex items-center gap-1 text-[10px] font-semibold text-ink-soft">
              For
              <input
                type="number"
                min={0}
                max={480}
                value={player.loopMinutes}
                disabled={!player.loop}
                onChange={(event) => {
                  const next = Number(event.target.value);
                  player.setLoopMinutes(Number.isFinite(next) ? Math.max(0, Math.min(480, Math.floor(next))) : 0);
                }}
                className="focus-ring w-14 rounded-lg border border-ink/10 bg-ivory/100 px-1.5 py-1 text-[10.5px] text-ink disabled:opacity-40"
                aria-label="Loop duration in minutes; zero loops endlessly"
              />
              min
            </label>

            <div className="ml-auto flex min-w-[140px] flex-1 items-center gap-1.5">
              <button
                type="button"
                onClick={() => {
                  player.setMuted(!player.muted);
                  playSound('ui');
                }}
                className="hud-icon focus-ring !h-7 !w-7"
                aria-label={player.muted ? 'Unmute audio' : 'Mute audio'}
                aria-pressed={player.muted}
                title={player.muted ? 'Unmute' : 'Mute'}
              >
                {player.muted ? <VolumeX size={14} /> : <Volume2 size={14} />}
              </button>
              <input
                type="range"
                min={0}
                max={100}
                value={Math.round(player.volume * 100)}
                onChange={(event) => player.setVolume(Number(event.target.value) / 100)}
                className="focus-ring h-1.5 min-w-0 flex-1 accent-sage-deep"
                aria-label="Audio volume"
              />
            </div>
          </div>
        </div>
      </div>
    </div>,
    document.body,
  );
}
