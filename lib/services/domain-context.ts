export interface DomainContext {
  host: string | null;
  forwardedHost: string | null;
  protocol: string | null;
  domain: string | null;
}

interface HeaderReader {
  get(name: string): string | null;
}

function normalizeHeaderValue(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const firstValue = value.split(",")[0]?.trim().toLowerCase() ?? "";
  return firstValue.length > 0 ? firstValue : null;
}

function stripPort(host: string | null): string | null {
  if (!host) {
    return null;
  }

  if (host.startsWith("[")) {
    return host;
  }

  return host.split(":")[0] ?? host;
}

export function createDomainContextFromHeaders(headers: HeaderReader): DomainContext {
  const host = normalizeHeaderValue(headers.get("host"));
  const forwardedHost = normalizeHeaderValue(headers.get("x-forwarded-host"));
  const protocol = normalizeHeaderValue(headers.get("x-forwarded-proto"));
  const resolvedHost = forwardedHost ?? host;

  return {
    host: resolvedHost,
    forwardedHost,
    protocol,
    domain: stripPort(resolvedHost),
  };
}

export function createDomainContextFromRequest(request: Request): DomainContext {
  return createDomainContextFromHeaders(request.headers);
}

export const EMPTY_DOMAIN_CONTEXT: DomainContext = {
  host: null,
  forwardedHost: null,
  protocol: null,
  domain: null,
};
