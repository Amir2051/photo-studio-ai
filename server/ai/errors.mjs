// Fail-closed error types shared by provider adapters and the M2B router.
// Messages never include credentials, headers, or raw provider payloads.

export class AiFoundationError extends Error {
  constructor(code, message) {
    super(message);
    this.name = 'AiFoundationError';
    this.code = code;
  }
}

export class InvalidCredentialsError extends AiFoundationError {
  constructor(message = 'AI provider credentials are missing or invalid.') {
    super('invalid_credentials', message);
    this.name = 'InvalidCredentialsError';
  }
}

export class RateLimitedError extends AiFoundationError {
  constructor(message = 'The AI provider is rate limiting requests.') {
    super('rate_limited', message);
    this.name = 'RateLimitedError';
  }
}

export class ProviderTimeoutError extends AiFoundationError {
  constructor(message = 'The AI provider did not respond in time.') {
    super('provider_timeout', message);
    this.name = 'ProviderTimeoutError';
  }
}

export class ProviderUnavailableError extends AiFoundationError {
  constructor(message = 'The requested AI provider or model is unavailable.') {
    super('provider_unavailable', message);
    this.name = 'ProviderUnavailableError';
  }
}

export class ProviderResponseError extends AiFoundationError {
  constructor(message = 'The AI provider returned an unusable response.') {
    super('provider_response', message);
    this.name = 'ProviderResponseError';
  }
}

export function toPublicError(error) {
  if (error instanceof AiFoundationError) return { code: error.code, message: error.message };
  return { code: 'internal_error', message: 'The AI request could not be completed.' };
}
