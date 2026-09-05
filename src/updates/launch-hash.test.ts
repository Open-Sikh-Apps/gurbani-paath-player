import assert from "node:assert/strict";
import { describe, it } from "node:test";

import {
  isSameLaunchAsset,
  launchAssetHashFromManifest,
  launchHashFromExtraParams,
  otaCreatedAt,
  shouldSkipRemoteUpdate,
  uuidFromSha256Hex,
} from "./launch-hash";

const HASH_A = "abcdefghij0123456789-_ABCDEFG";
const HASH_B = "zzzzzzzzzzzzzzzzzzzzzzzzzzzzz";

describe("launchAssetHashFromManifest", () => {
  it("reads protocol launchAsset.hash", () => {
    assert.equal(
      launchAssetHashFromManifest({ launchAsset: { hash: HASH_A, url: "https://cdn/x.bin" } }),
      HASH_A,
    );
  });

  it("returns null for the embedded APK shape (id + commitTime, no launchAsset)", () => {
    assert.equal(launchAssetHashFromManifest({ id: "aaaaaaaa-bbbb-cccc-dddd-eeeeeeeeeeee", commitTime: 1, assets: [] }), null);
  });

  it("returns null for empty or non-string hashes", () => {
    assert.equal(launchAssetHashFromManifest({ launchAsset: { hash: "" } }), null);
    assert.equal(launchAssetHashFromManifest({ launchAsset: { hash: 1 } }), null);
    assert.equal(launchAssetHashFromManifest(null), null);
  });
});

describe("isSameLaunchAsset", () => {
  it("is true only when both sides expose the same hash", () => {
    const ota = { launchAsset: { hash: HASH_A } };
    assert.equal(isSameLaunchAsset(ota, { launchAsset: { hash: HASH_A } }), true);
    assert.equal(isSameLaunchAsset(ota, { launchAsset: { hash: HASH_B } }), false);
  });

  it("does not skip when the running manifest has no hash (fresh APK)", () => {
    assert.equal(
      isSameLaunchAsset({ id: "embedded" }, { launchAsset: { hash: HASH_A } }),
      false,
    );
  });
});

describe("launchHashFromExtraParams", () => {
  it("parses a quoted Expo SFV dictionary member", () => {
    assert.equal(launchHashFromExtraParams(`launchHash="${HASH_A}"`), HASH_A);
  });

  it("parses when other members come first", () => {
    assert.equal(
      launchHashFromExtraParams(`channel="preview", launchHash="${HASH_A}"`),
      HASH_A,
    );
  });

  it("parses an unquoted token", () => {
    assert.equal(launchHashFromExtraParams("launchHash=abc_DEF-123"), "abc_DEF-123");
  });

  it("returns null when the header is missing or has no launchHash", () => {
    assert.equal(launchHashFromExtraParams(null), null);
    assert.equal(launchHashFromExtraParams('channel="preview"'), null);
  });
});

describe("shouldSkipRemoteUpdate", () => {
  const manifest = { id: "11111111-1111-4111-8111-111111111111", launchAsset: { hash: HASH_A } };

  it("skips when the running update id already matches", () => {
    assert.equal(
      shouldSkipRemoteUpdate({
        currentUpdateId: manifest.id,
        extraParamsHeader: null,
        manifest,
      }),
      true,
    );
  });

  it("skips when ids differ but the extra-param launch hash matches (new APK vs same JS)", () => {
    assert.equal(
      shouldSkipRemoteUpdate({
        currentUpdateId: "00000000-0000-4000-8000-000000000000",
        extraParamsHeader: `launchHash="${HASH_A}"`,
        manifest,
      }),
      true,
    );
  });

  it("does not skip when the phone is on older JS (hash mismatch)", () => {
    assert.equal(
      shouldSkipRemoteUpdate({
        currentUpdateId: "00000000-0000-4000-8000-000000000000",
        extraParamsHeader: `launchHash="${HASH_B}"`,
        manifest,
      }),
      false,
    );
  });

  it("does not skip a different runtime folder's lookup — caller never passes that manifest", () => {
    assert.equal(
      shouldSkipRemoteUpdate({
        currentUpdateId: "00000000-0000-4000-8000-000000000000",
        extraParamsHeader: null,
        manifest,
      }),
      false,
    );
  });
});

describe("uuidFromSha256Hex", () => {
  it("is a version-5-shaped UUID and is stable", () => {
    const hex = "0123456789abcdef0123456789abcdef0123456789abcdef0123456789abcdef";
    const first = uuidFromSha256Hex(hex);
    assert.match(first, /^[0-9a-f]{8}-[0-9a-f]{4}-5[0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/);
    assert.equal(uuidFromSha256Hex(hex), first);
  });
});

describe("otaCreatedAt", () => {
  const nowMs = Date.parse("2026-09-05T12:00:00.000Z");

  it("uses the git commit time on a clean tree so a later APK is newer than the OTA", () => {
    assert.equal(
      otaCreatedAt({
        workingTreeDirty: false,
        gitCommitIso: "2026-09-01T08:00:00-06:00",
        nowMs,
      }),
      "2026-09-01T14:00:00.000Z",
    );
  });

  it("uses now when the working tree is dirty so older APKs still see a newer update", () => {
    assert.equal(
      otaCreatedAt({
        workingTreeDirty: true,
        gitCommitIso: "2026-09-01T08:00:00-06:00",
        nowMs,
      }),
      "2026-09-05T12:00:00.000Z",
    );
  });
});
