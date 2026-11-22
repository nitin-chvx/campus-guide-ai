const SAFE_MESSAGES = {
  quota: "Provider quota or rate limit reached.",
  authentication: "Provider authentication or project permission was rejected.",
  invalid_request: "Provider rejected the request as invalid.",
  model_endpoint: "Configured provider model or endpoint was not found.",
  unavailable: "Provider is temporarily unavailable.",
  response: "Provider returned an unusable response.",
  transport: "Network transport to the provider failed.",
  other: "Provider returned an unsuccessful response.",
};

function classifyHttpStatus(status) {
  if (status === 429) return "quota";
  if (status === 401 || status === 403) return "authentication";
  if (status === 400) return "invalid_request";
  if (status === 404) return "model_endpoint";
  if (status === 503) return "unavailable";
  return "other";
}

export class ProviderApiError extends Error {
  constructor(provider, httpStatus, providerError = null) {
    const category = classifyHttpStatus(httpStatus);
    super(SAFE_MESSAGES[category]);
    this.name = "ProviderApiError";
    this.provider = provider;
    this.httpStatus = httpStatus;
    this.providerCode = providerError?.status ?? providerError?.code ?? null;
    this.providerNumericCode = providerError?.code ?? null;
    this.category = category;
    this.safeMessage = SAFE_MESSAGES[category];
  }
}

export class ProviderResponseError extends Error {
  constructor(provider, httpStatus = null) {
    super(SAFE_MESSAGES.response);
    this.name = "ProviderResponseError";
    this.provider = provider;
    this.httpStatus = httpStatus;
    this.providerCode = null;
    this.category = "response";
    this.safeMessage = SAFE_MESSAGES.response;
  }
}

export class ProviderTransportError extends Error {
  constructor(provider) {
    super(SAFE_MESSAGES.transport);
    this.name = "ProviderTransportError";
    this.provider = provider;
    this.httpStatus = null;
    this.providerCode = null;
    this.category = "transport";
    this.safeMessage = SAFE_MESSAGES.transport;
  }
}

function getSafeCode(code) {
  if (Number.isInteger(code)) return String(code);
  if (typeof code === "string" && /^[A-Z][A-Z0-9_]{0,63}$/.test(code)) {
    return code;
  }
  return "unavailable";
}

export function logProviderFailure(provider, error) {
  const httpStatus = Number.isInteger(error?.httpStatus)
    ? error.httpStatus
    : "unavailable";
  const providerCode = getSafeCode(error?.providerCode);
  const safeMessage = error?.safeMessage || "Provider request failed.";

  console.error(
    `${provider} API failure (HTTP ${httpStatus}, code ${providerCode}): ${safeMessage}`
  );
}
