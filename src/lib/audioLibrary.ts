export type AudioKind = 'music' | 'ambience';

export interface AudioTrack {
  id: string;
  title: string;
  src: string;
  kind: AudioKind;
}

const MUSIC_FILES = [
  'above.mp3',
  'bubblegum.mp3',
  'cherry.mp3',
  'chocolate.mp3',
  'cream_soda.mp3',
  'halo.mp3',
  'hotaru.mp3',
  'magic_keys.mp3',
  'misugaru_latte.mp3',
  'morning_breeze.mp3',
  'popcorn.mp3',
  'popsicle.mp3',
  'stardust.mp3',
  'strawberry_mousse.mp3',
  'sunday_mood.mp3',
  'wizard.mp3',
];

const AMBIENCE_FILES = [
  'River.ogg',
  'firecamp.ogg',
  'forest_birds_01.ogg',
  'forest_wind.ogg',
  'rain.ogg',
  'sea.ogg',
  'stream_01.ogg',
  'waterfall.ogg',
  'wind.ogg',
];

const TITLE_OVERRIDES: Record<string, string> = {
  'forest_birds_01.ogg': 'Forest Birds',
  'stream_01.ogg': 'Stream',
};

function toTitle(file: string): string {
  return (
    TITLE_OVERRIDES[file] ??
    file
      .replace(/\.[^.]+$/, '')
      .replace(/[_-]+/g, ' ')
      .replace(/\b\w/g, (letter) => letter.toUpperCase())
  );
}

function buildTracks(kind: AudioKind, files: string[]): AudioTrack[] {
  const base = import.meta.env.BASE_URL;
  return files.map((file) => ({
    id: `${kind}:${file}`,
    title: toTitle(file),
    src: `${base}${kind === 'music' ? 'music' : 'ambience'}/${file}`,
    kind,
  }));
}

export const MUSIC_TRACKS = buildTracks('music', MUSIC_FILES);
export const AMBIENCE_TRACKS = buildTracks('ambience', AMBIENCE_FILES);

export const AUDIO_TRACKS: Record<AudioKind, AudioTrack[]> = {
  music: MUSIC_TRACKS,
  ambience: AMBIENCE_TRACKS,
};

export const AUDIO_KIND_LABELS: Record<AudioKind, string> = {
  music: 'Music',
  ambience: 'Ambience',
};
