// Provider registry. Adapters are constructed server-side from configuration;
// browser requests can only name an already-registered provider.

import { ProviderUnavailableError } from './errors.mjs';
import { createOpenRouterAdapter } from './providers/openrouter.mjs';

const factories = new Map();

export function registerProvider(id, factory) {
  if (typeof id !== 'string' || !id.trim()) throw new Error('A provider id is required.');
  if (typeof factory !== 'function') throw new Error('A provider factory is required.');
  factories.set(id, factory);
}

export function listProviders() {
  return [...factories.keys()];
}

export function getProvider(id) {
  const factory = factories.get(id);
  if (!factory) throw new ProviderUnavailableError(`Provider ${String(id)} is not registered.`);
  return factory();
}

// Default registry. Credentials are injected by the caller of chat(), never
// read from browser input or stored in the registry.
registerProvider('openrouter', () => createOpenRouterAdapter());
