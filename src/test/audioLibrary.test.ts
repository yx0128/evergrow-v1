import { describe, expect, it } from 'vitest';
import {
  AMBIENCE_TRACKS,
  AUDIO_TRACKS,
  MUSIC_TRACKS,
} from '../lib/audioLibrary';

describe('audio library', () => {
  it('lists the bundled music and ambience files', () => {
    expect(MUSIC_TRACKS).toHaveLength(16);
    expect(AMBIENCE_TRACKS).toHaveLength(9);
    expect(AUDIO_TRACKS.music).toBe(MUSIC_TRACKS);
    expect(AUDIO_TRACKS.ambience).toBe(AMBIENCE_TRACKS);
  });

  it('builds readable titles and base-relative sources', () => {
    expect(MUSIC_TRACKS.find((track) => track.id === 'music:morning_breeze.mp3')?.title).toBe(
      'Morning Breeze',
    );
    expect(AMBIENCE_TRACKS.find((track) => track.id === 'ambience:forest_birds_01.ogg')?.title).toBe(
      'Forest Birds',
    );
    expect(AMBIENCE_TRACKS.find((track) => track.id === 'ambience:stream_01.ogg')?.title).toBe(
      'Stream',
    );
    expect(MUSIC_TRACKS[0].src).toBe('/music/above.mp3');
    expect(AMBIENCE_TRACKS[0].src).toBe('/ambience/River.ogg');
  });
});
