import { shouldSkipRemoteUpdate } from "../../src/updates/launch-hash";

type Env = {
  BUCKET: R2Bucket;
};

type ProtocolManifest = {
  id?: string;
  runtimeVersion?: string;
  launchAsset?: { hash?: string };
};

const PROTOCOL_HEADERS = {
  "expo-protocol-version": "1",
  "expo-sfv-version": "0",
  // Clients must revalidate; a cached noUpdate would hide a newly published bundle.
  "cache-control": "private, max-age=0",
};

function multipart(
  parts: { name: string; json: unknown }[],
): Response {
  const boundary = `expo-updates-${crypto.randomUUID()}`;
  const chunks = parts.map(
    (part) =>
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="${part.name}"\r\n` +
      `Content-Type: application/json; charset=utf-8\r\n\r\n` +
      `${JSON.stringify(part.json)}\r\n`,
  );
  chunks.push(`--${boundary}--\r\n`);
  return new Response(chunks.join(""), {
    status: 200,
    headers: {
      ...PROTOCOL_HEADERS,
      "content-type": `multipart/mixed; boundary=${boundary}`,
    },
  });
}

function noUpdate(): Response {
  // 204 + protocol headers: expo-updates treats this as no-op. A 200 multipart
  // with only a `noUpdateAvailable` directive is easy for OkHttp to reject, which
  // showed as ota.failed on the 1.0.0 APK instead of "no update".
  return new Response(null, { status: 204, headers: PROTOCOL_HEADERS });
}

function contentType(path: string): string {
  const ext = path.split(".").pop()?.toLowerCase();
  if (ext === "js") return "application/javascript";
  if (ext === "hbc") return "application/octet-stream";
  if (ext === "png") return "image/png";
  if (ext === "jpg" || ext === "jpeg") return "image/jpeg";
  if (ext === "webp") return "image/webp";
  if (ext === "ttf" || ext === "otf") return "font/ttf";
  if (ext === "json") return "application/json";
  return "application/octet-stream";
}

export default {
  async fetch(request: Request, env: Env): Promise<Response> {
    const url = new URL(request.url);
    if (request.method !== "GET") {
      return new Response("method not allowed", { status: 405 });
    }
    if (url.pathname === "/health") {
      return Response.json({ ok: true });
    }

    if (url.pathname.startsWith("/files/")) {
      // Debug/fallback only. Publish puts launch bundles on the R2 CDN as `.bin`.
      const key = url.pathname.slice("/files/".length);
      const object = await env.BUCKET.get(key);
      if (!object) {
        return new Response("not found", { status: 404 });
      }
      const ext = key.split(".").pop()?.toLowerCase();
      const isBundle = ext === "hbc" || ext === "js";
      return new Response(object.body, {
        headers: {
          "content-type": object.httpMetadata?.contentType ?? contentType(key),
          "cache-control": isBundle
            ? "private, max-age=0"
            : "public, max-age=31536000, immutable",
        },
      });
    }

    // Manifest lives at GET / so app.json updates.url has no path suffix.
    if (url.pathname !== "/") {
      return new Response("not found", { status: 404 });
    }

    const platform = request.headers.get("expo-platform");
    const runtimeVersion = request.headers.get("expo-runtime-version");
    const channel = request.headers.get("expo-channel-name") ?? "preview";
    if (platform !== "ios" && platform !== "android") {
      return new Response("unsupported platform", { status: 400 });
    }
    if (!runtimeVersion) {
      return new Response("missing expo-runtime-version", { status: 400 });
    }

    const prefix = `${channel}/${platform}/${runtimeVersion}`;
    const object = await env.BUCKET.get(`${prefix}/manifest.json`);
    if (!object) {
      return noUpdate();
    }
    const manifest = (await object.json()) as ProtocolManifest;
    // Same R2 prefix as the request, but the JSON may have been written for another native runtime.
    if (manifest.runtimeVersion && manifest.runtimeVersion !== runtimeVersion) {
      return noUpdate();
    }
    // Id match: already running this publish. Hash match: extra-param launchHash
    // from a downloaded OTA whose Hermes bytes match (ids can still differ).
    if (
      shouldSkipRemoteUpdate({
        currentUpdateId: request.headers.get("expo-current-update-id"),
        extraParamsHeader: request.headers.get("expo-extra-params"),
        manifest,
      })
    ) {
      return noUpdate();
    }
    return multipart([
      { name: "manifest", json: manifest },
      // Protocol requires this part even when we do not set per-asset headers.
      { name: "extensions", json: { assetRequestHeaders: {} } },
    ]);
  },
};
