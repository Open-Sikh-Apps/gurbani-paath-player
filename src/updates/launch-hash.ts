/** Extra param key sent as Expo SFV in `Expo-Extra-Params`. Worker skips when it matches. */
export const LAUNCH_HASH_EXTRA_PARAM = "launchHash";

type LaunchAssetHolder = {
  launchAsset?: { hash?: unknown };
};

export function launchAssetHashFromManifest(manifest: unknown): string | null {
  if (manifest === null || typeof manifest !== "object") {
    return null;
  }
  const hash = (manifest as LaunchAssetHolder).launchAsset?.hash;
  if (typeof hash !== "string" || hash.length === 0) {
    return null;
  }
  return hash;
}

export function isSameLaunchAsset(current: unknown, incoming: unknown): boolean {
  const running = launchAssetHashFromManifest(current);
  const next = launchAssetHashFromManifest(incoming);
  return running !== null && next !== null && running === next;
}

/**
 * Expo SFV dictionary (`launchHash="…"`). Missing/unparsable is not a skip — never block a real OTA.
 */
export function launchHashFromExtraParams(header: string | null): string | null {
  if (!header) {
    return null;
  }
  const match = /(?:^|,)\s*launchHash\s*=\s*(?:"((?:[^"\\]|\\.)*)"|([!#$%&'*+\-.^_`|~0-9A-Za-z]+))/i.exec(
    `,${header}`,
  );
  if (!match) {
    return null;
  }
  const quoted = match[1];
  if (quoted !== undefined) {
    return quoted.replace(/\\(.)/g, "$1");
  }
  return match[2] ?? null;
}

/** Format a SHA-256 hex digest as a UUID so expo-updates accepts it as `manifest.id`. */
export function uuidFromSha256Hex(hex: string): string {
  if (hex.length < 32) {
    throw new Error("sha256 hex is too short for an update id");
  }
  const clock = ((Number.parseInt(hex.slice(16, 18), 16) & 0x3f) | 0x80)
    .toString(16)
    .padStart(2, "0");
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-5${hex.slice(13, 16)}-${clock}${hex.slice(18, 20)}-${hex.slice(20, 32)}`;
}

/**
 * Native expo-updates only loads an OTA whose createdAt is after the running update.
 * A clean tree uses the git commit time so an APK built later from that commit is newer and skips.
 */
export function otaCreatedAt(args: {
  workingTreeDirty: boolean;
  gitCommitIso: string | null;
  nowMs: number;
}): string {
  if (!args.workingTreeDirty && args.gitCommitIso) {
    const parsed = Date.parse(args.gitCommitIso);
    if (!Number.isNaN(parsed)) {
      return new Date(parsed).toISOString();
    }
  }
  return new Date(args.nowMs).toISOString();
}

export function shouldSkipRemoteUpdate(args: {
  currentUpdateId: string | null;
  extraParamsHeader: string | null;
  manifest: { id?: unknown; launchAsset?: { hash?: unknown } };
}): boolean {
  const manifestId =
    typeof args.manifest.id === "string" && args.manifest.id.length > 0
      ? args.manifest.id
      : null;
  if (args.currentUpdateId && manifestId && args.currentUpdateId === manifestId) {
    return true;
  }
  const runningHash = launchHashFromExtraParams(args.extraParamsHeader);
  const incomingHash = launchAssetHashFromManifest(args.manifest);
  return runningHash !== null && incomingHash !== null && runningHash === incomingHash;
}
