const studioOrigin = 'https://studio.safenestt.com';
const guestSignalOrigin = 'https://every-frame-guest-signal.onrender.com';

async function fetchWithTimeout(url, options = {}) {
  return fetch(url, { ...options, signal: AbortSignal.timeout(15_000) });
}

async function expectPage(path, description) {
  const url = new URL(path, studioOrigin);
  const response = await fetchWithTimeout(url);
  if (!response.ok) throw new Error(`${description} returned HTTP ${response.status}: ${url}`);
  const html = await response.text();
  if (!/<!doctype html/i.test(html) || !/<html\b/i.test(html) || !/<\/html>/i.test(html)) {
    throw new Error(`${description} did not return a complete HTML document: ${url}`);
  }
  console.log(`OK ${description}: HTTP ${response.status}`);
  return html;
}

const rootHtml = await expectPage('/', 'studio home');
if (!/Every Frame First Studio/i.test(rootHtml))
  throw new Error('Studio home has an unexpected page title.');

const editorHtml = await expectPage('/video-studio/', 'video editor');
if (!/Every Frame First Video Studio/i.test(editorHtml))
  throw new Error('Video editor metadata is missing.');
const editorAssetPaths = [
  ...editorHtml.matchAll(/(?:src|href)="([^"]*\/_app\/immutable\/[^"]+)"/g),
].map((match) => match[1].replaceAll('&amp;', '&'));
if (editorAssetPaths.length === 0)
  throw new Error('Video editor HTML did not reference any immutable editor assets.');
for (const assetPath of new Set(editorAssetPaths)) {
  const assetUrl = new URL(assetPath, studioOrigin);
  const response = await fetchWithTimeout(assetUrl, { method: 'HEAD' });
  if (!response.ok) throw new Error(`Editor asset returned HTTP ${response.status}: ${assetUrl}`);
}
console.log(`OK editor assets: ${new Set(editorAssetPaths).size} references checked`);

const guestHtml = await expectPage('/video-studio/guest.html', 'guest invite page');
if (!/guest|participant/i.test(guestHtml))
  throw new Error('Guest invite page does not contain its expected interface.');

let healthResponse;
let lastHealthError;
for (let attempt = 1; attempt <= 12; attempt += 1) {
  try {
    healthResponse = await fetchWithTimeout(`${guestSignalOrigin}/health`);
    if (healthResponse.ok) break;
    lastHealthError = new Error(`health returned HTTP ${healthResponse.status}`);
  } catch (error) {
    lastHealthError = error;
  }
  if (attempt < 12) await new Promise((resolve) => setTimeout(resolve, 10_000));
}
if (!healthResponse?.ok) throw new Error(`Guest signaling health check failed: ${lastHealthError}`);
const health = await healthResponse.json();
if (health.status !== 'ok') throw new Error('Guest signaling health response was unexpected.');
console.log('OK guest signaling health');

const preflight = await fetchWithTimeout(`${guestSignalOrigin}/api/guest-rooms`, {
  method: 'OPTIONS',
  headers: {
    Origin: studioOrigin,
    'Access-Control-Request-Method': 'POST',
    'Access-Control-Request-Headers': 'content-type',
  },
});
if (
  preflight.status !== 204 ||
  preflight.headers.get('access-control-allow-origin') !== studioOrigin
) {
  throw new Error(`Guest signaling CORS preflight failed: HTTP ${preflight.status}`);
}
console.log('OK guest signaling CORS for the production origin');
