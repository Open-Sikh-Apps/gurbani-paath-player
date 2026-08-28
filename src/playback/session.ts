import type { Reciter, SehajPaathCollection } from "@/types/catalogue";
import type { PlayerSession, SessionTrack } from "@/playback/types";

export function sessionFromSehajPaath(
  collection: SehajPaathCollection,
  reciter: Reciter | undefined,
): PlayerSession {
  const tracks: SessionTrack[] = collection.tracks.map((track) => ({
    id: track.id,
    url: track.url,
    title: track.title,
    durationSec: track.durationSec,
    startAng: track.startAng,
  }));
  return {
    albumId: collection.id,
    reciterName: reciter?.name ?? { en: collection.id },
    scriptureId: collection.scriptureId,
    artworkUrl: collection.artworkUrl,
    tracks,
  };
}

export function snapshotsEqual(
  left: PlayerSession,
  right: PlayerSession,
): boolean {
  return (
    left.albumId === right.albumId &&
    left.tracks.length === right.tracks.length &&
    left.tracks.every(
      (track, index) =>
        track.id === right.tracks[index]?.id &&
        track.url === right.tracks[index]?.url,
    )
  );
}

export function trackIndex(session: PlayerSession, trackId: string): number {
  return session.tracks.findIndex((track) => track.id === trackId);
}
