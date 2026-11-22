/**
 * Resolve and validate a WHIP session Location before it can be used with a
 * bearer token. WHIP resource URLs must remain on the configured HTTPS origin.
 */
export function resolveWhipSessionUrl(endpoint: string, location: string): { url: string; origin: string } {
  const endpointUrl = new URL(endpoint);
  if (endpointUrl.protocol !== 'https:' || endpointUrl.username || endpointUrl.password) {
    throw new Error('WHIP ingest endpoint must be a credential-free HTTPS URL.');
  }

  const sessionUrl = new URL(location, endpointUrl);
  if (
    sessionUrl.protocol !== 'https:' ||
    sessionUrl.origin !== endpointUrl.origin ||
    sessionUrl.username ||
    sessionUrl.password
  ) {
    throw new Error('WHIP session URL must use the same HTTPS origin as the ingest endpoint.');
  }

  return { url: sessionUrl.toString(), origin: endpointUrl.origin };
}
