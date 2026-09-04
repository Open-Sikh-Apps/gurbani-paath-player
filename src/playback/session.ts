import type {
  Collection,
  Reciter,
  Scripture,
  SehajPaathCollection,
} from "@/types/catalogue";
import { playableUrlFor } from "@/downloads";
import type { PlayerSession, SessionTrack } from "@/playback/types";

export function sessionFromCollection(
  collection: Collection,
  reciter: Reciter | undefined,
  scripture?: Scripture,
): PlayerSession {
  const tracks: SessionTrack[] = collection.tracks.map((track) => ({
    id: track.id,
    url: track.url,
    remoteUrl: track.url,
    title: track.title,
    // Live radio tracks have no duration/byteSize/startAng; `in` keeps the union from throwing.
    durationSec: "durationSec" in track ? track.durationSec : undefined,
    byteSize: "byteSize" in track ? track.byteSize : undefined,
    startAng: "startAng" in track ? track.startAng : undefined,
  }));
  return {
    albumId: collection.id,
    reciterName: reciter?.name ?? collection.title ?? { en: collection.id },
    scriptureId: collection.scriptureId,
    collectionKind: collection.kind,
    // Sehaj paath uses scripture art — no reciter / Gursikh portraits.
    artworkUrl:
      collection.kind === "sehaj_paath"
        ? (scripture?.imageUrl ?? collection.artworkUrl)
        : collection.artworkUrl,
    tracks,
  };
}

export function sessionFromSehajPaath(
  collection: SehajPaathCollection,
  reciter: Reciter | undefined,
  scripture?: Scripture,
): PlayerSession {
  return sessionFromCollection(collection, reciter, scripture);
}

export function isLocalPlaybackUrl(url: string): boolean {
  return url.startsWith("file:");
}

export function withLocalUrls(session: PlayerSession): PlayerSession {
  return {
    ...session,
    tracks: session.tracks.map((track) => {
      // Keep `remoteUrl` as the CDN identity; only `url` may become a file: path.
      const local = playableUrlFor(track.id, track.remoteUrl);
      return { ...track, url: local ?? track.remoteUrl };
    }),
  };
}

export function snapshotsEqual(
  left: PlayerSession,
  right: PlayerSession,
): boolean {
  // Ids + urls: a catalogue refresh with the same files must not rebuild the native playlist.
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

// Keyed by the tracks array so freezeSession / withLocalUrls (new arrays) stay correct.
const tracksByIdCache = new WeakMap<
  SessionTrack[],
  Map<string, SessionTrack>
>();

function tracksById(tracks: SessionTrack[]): Map<string, SessionTrack> {
  const cached = tracksByIdCache.get(tracks);
  if (cached) {
    return cached;
  }
  const map = new Map<string, SessionTrack>();
  for (const track of tracks) {
    map.set(track.id, track);
  }
  tracksByIdCache.set(tracks, map);
  return map;
}

export function getSessionTrack(
  session: PlayerSession,
  trackId: string | null | undefined,
): SessionTrack | undefined {
  if (!trackId) {
    return undefined;
  }
  return tracksById(session.tracks).get(trackId);
}

export function trackIndex(session: PlayerSession, trackId: string): number {
  return session.tracks.findIndex((track) => track.id === trackId);
}
