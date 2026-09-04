/** Metro web stub — no on-disk audio; `availableBytes` is unbounded so storage alerts never fire. */
export function ensureAudioDirectory(): void {}

export function destinationPath(trackId: string): string {
  return `/downloads/${trackId}.mp3`;
}

export function playableUri(_trackId: string): string | null {
  return null;
}

export function deleteLocalFile(_trackId: string): void {}

export function localFile(_trackId: string): { exists: boolean } {
  return { exists: false };
}

export function downloadedBytesOnDisk(_trackId: string): number | null {
  return null;
}

export function availableBytes(): number {
  return Number.MAX_SAFE_INTEGER;
}
