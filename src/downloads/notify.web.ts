/** Metro web stub — notify-kit is native-only; ids still parse so restore code is shared. */
export async function initDownloadNotifications(): Promise<void> {}

export async function requestDownloadNotificationPermission(): Promise<void> {}

export function initDownloadNotificationOpens(): void {}

export async function relocalizeDownloadChannel(): Promise<void> {}

export function albumNotificationId(albumId: string): string {
  return `dl-album-${albumId}`;
}

export function trackNotificationId(trackId: string): string {
  return `dl-track-${trackId}`;
}

export async function showProgressNotification(_options: {
  id: string;
  title: string;
  body: string;
  percent: number;
  albumId: string;
}): Promise<void> {}

export async function showCompleteNotification(_options: {
  id: string;
  title: string;
  body: string;
  albumId: string;
}): Promise<void> {}

export async function cancelDownloadNotification(_id: string): Promise<void> {}

export async function displayedDownloadNotificationIds(): Promise<string[]> {
  return [];
}

export function isAlbumNotificationId(id: string): boolean {
  return id.startsWith("dl-album-");
}

export function isTrackNotificationId(id: string): boolean {
  return id.startsWith("dl-track-");
}

export function trackIdFromDownloadNotificationId(id: string): string | null {
  return id.startsWith("dl-track-") ? id.slice("dl-track-".length) : null;
}

export function albumIdFromDownloadNotificationId(id: string): string | null {
  if (id.startsWith("dl-album-")) {
    return id.slice("dl-album-".length);
  }
  return null;
}

export async function dismissStaleDownloadNotifications(
  _keepIds: Set<string>,
): Promise<void> {}
