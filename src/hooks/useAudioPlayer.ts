import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AUDIO_TRACKS, type AudioKind } from '../lib/audioLibrary';

const DEFAULT_VOLUME = 0.55;

export function useAudioPlayer() {
  const [kind, setKindState] = useState<AudioKind>('music');
  const [index, setIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const [loop, setLoop] = useState(false);
  const [loopMinutes, setLoopMinutes] = useState(0);
  const [volume, setVolume] = useState(DEFAULT_VOLUME);
  const [muted, setMuted] = useState(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const deadlineRef = useRef<number | null>(null);

  const tracks = AUDIO_TRACKS[kind];
  const currentTrack = tracks[index] ?? tracks[0];

  useEffect(() => {
    const audio = new Audio();
    audio.preload = 'auto';
    audioRef.current = audio;
    const handleEnded = () => {
      if (!audio.loop) setIsPlaying(false);
    };
    audio.addEventListener('ended', handleEnded);
    return () => {
      audio.removeEventListener('ended', handleEnded);
      audio.pause();
      audio.src = '';
      audioRef.current = null;
    };
  }, []);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (audio.src !== new URL(currentTrack.src, window.location.href).href) {
      audio.src = currentTrack.src;
      audio.load();
    }
  }, [currentTrack.src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      void audio.play().catch(() => setIsPlaying(false));
    } else {
      audio.pause();
    }
  }, [isPlaying, currentTrack.src]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.loop = loop;
  }, [loop]);

  useEffect(() => {
    const audio = audioRef.current;
    if (audio) audio.volume = muted ? 0 : volume;
  }, [muted, volume]);

  useEffect(() => {
    if (!isPlaying || !loop || loopMinutes <= 0) {
      deadlineRef.current = null;
      return;
    }
    deadlineRef.current = Date.now() + loopMinutes * 60_000;
    const timer = window.setInterval(() => {
      if (deadlineRef.current && Date.now() >= deadlineRef.current) {
        audioRef.current?.pause();
        deadlineRef.current = null;
        setIsPlaying(false);
      }
    }, 500);
    return () => window.clearInterval(timer);
  }, [isPlaying, loop, loopMinutes]);

  const play = useCallback(() => {
    const audio = audioRef.current;
    if (audio) {
      void audio.play().catch(() => setIsPlaying(false));
    }
    setIsPlaying(true);
  }, []);
  const pause = useCallback(() => {
    audioRef.current?.pause();
    setIsPlaying(false);
  }, []);
  const toggle = useCallback(() => {
    if (isPlaying) pause();
    else play();
  }, [isPlaying, pause, play]);
  const next = useCallback(() => {
    setIndex((current) => (current + 1) % tracks.length);
  }, [tracks.length]);
  const prev = useCallback(() => {
    setIndex((current) => (current - 1 + tracks.length) % tracks.length);
  }, [tracks.length]);

  const setKind = useCallback((nextKind: AudioKind) => {
    setKindState(nextKind);
    setIndex(0);
  }, []);

  const selectTrack = useCallback((nextKind: AudioKind, nextIndex: number) => {
    setKindState(nextKind);
    setIndex(nextIndex);
  }, []);

  const playTrack = useCallback(
    (nextKind: AudioKind, nextIndex: number) => {
      const track = AUDIO_TRACKS[nextKind][nextIndex];
      const audio = audioRef.current;
      if (audio && track) {
        if (audio.src !== new URL(track.src, window.location.href).href) {
          audio.src = track.src;
          audio.load();
        }
        audio.loop = loop;
        audio.volume = muted ? 0 : volume;
        void audio.play().catch(() => setIsPlaying(false));
      }
      setKindState(nextKind);
      setIndex(nextIndex);
      setIsPlaying(true);
    },
    [loop, muted, volume],
  );

  const api = useMemo(
    () => ({
      kind,
      index,
      tracks,
      currentTrack,
      isPlaying,
      loop,
      loopMinutes,
      volume,
      muted,
      play,
      pause,
      toggle,
      next,
      prev,
      setKind,
      selectTrack,
      playTrack,
      setLoop,
      setLoopMinutes,
      setVolume,
      setMuted,
    }),
    [
      kind,
      index,
      tracks,
      currentTrack,
      isPlaying,
      loop,
      loopMinutes,
      volume,
      muted,
      play,
      pause,
      toggle,
      next,
      prev,
      setKind,
      selectTrack,
      playTrack,
    ],
  );

  return api;
}

export type AudioPlayerApi = ReturnType<typeof useAudioPlayer>;
