import { createHash } from "crypto";
import { NextResponse } from "next/server";

function normalizeEntityTag(entityTag: string): string {
  return entityTag.trim().replace(/^W\//, "");
}

export function createWeakEtag(payload: unknown): string {
  const serializedPayload = JSON.stringify(payload);
  const hash = createHash("sha1").update(serializedPayload).digest("base64url");
  return `W/"${hash}"`;
}

export function requestMatchesEtag(request: Request, etag: string): boolean {
  const ifNoneMatchHeader = request.headers.get("if-none-match");
  if (!ifNoneMatchHeader) {
    return false;
  }

  const trimmedHeader = ifNoneMatchHeader.trim();
  if (trimmedHeader === "*") {
    return true;
  }

  const normalizedCurrentTag = normalizeEntityTag(etag);
  return trimmedHeader
    .split(",")
    .map((value) => normalizeEntityTag(value))
    .includes(normalizedCurrentTag);
}

export function jsonWithEtag<T>(
  request: Request,
  body: T,
  init: ResponseInit = {},
) {
  const etag = createWeakEtag(body);
  const headers = new Headers(init.headers);
  headers.set("ETag", etag);
  headers.set("Cache-Control", "no-cache");

  if (requestMatchesEtag(request, etag)) {
    return new NextResponse(null, {
      status: 304,
      headers,
    });
  }

  return NextResponse.json(body, {
    ...init,
    headers,
  });
}
