import { Directory, File, Paths } from "expo-file-system";
import { directories } from "@kesha-antonov/react-native-background-downloader";

const AUDIO_DIR = "audio";

function asFileUri(path: string): string {
  return path.startsWith("file:") ? path : `file://${path}`;
}

export function audioDirectory(): Directory {
  // Downloader documents dir, not Expo Paths.document — dest must match native jobs after reattach.
  return new Directory(asFileUri(`${directories.documents}/${AUDIO_DIR}`));
}

export function ensureAudioDirectory(): void {
  const dir = audioDirectory();
  if (!dir.exists) {
    dir.create({ idempotent: true, intermediates: true });
  }
}

export function destinationPath(trackId: string): string {
  // Documents, not cache — the OS may purge cache while a UIDT job still points here.
  return `${directories.documents}/${AUDIO_DIR}/${trackId}.mp3`;
}

export function localFile(trackId: string): File {
  return new File(audioDirectory(), `${trackId}.mp3`);
}

export function downloadedBytesOnDisk(trackId: string): number | null {
  // Downloader path vs Expo File URI can disagree after a process restart; try both.
  const candidates = [
    new File(audioDirectory(), `${trackId}.mp3`),
    new File(asFileUri(destinationPath(trackId))),
  ];
  for (const file of candidates) {
    try {
      if (!file.exists) {
        continue;
      }
      try {
        return file.size;
      } catch {
        // exists() was true but size() threw on a half-written dest; 0 keeps complete-scan waiting.
        return 0;
      }
    } catch {
      // This candidate's URI is unreadable after a restart; try the other form.
    }
  }
  return null;
}

export function playableUri(trackId: string): string | null {
  const file = localFile(trackId);
  if (!file.exists) {
    return null;
  }
  return file.uri;
}

export function deleteLocalFile(trackId: string): void {
  const file = localFile(trackId);
  if (file.exists) {
    file.delete();
  }
}

export function availableBytes(): number {
  return Paths.availableDiskSpace;
}
