// Shared browser-image helpers extracted from the editor page.

export function readAsDataUrl(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () =>
      typeof reader.result === 'string'
        ? resolve(reader.result)
        : reject(new Error('Could not read this image.'));
    reader.onerror = () => reject(new Error('Could not read this image.'));
    reader.readAsDataURL(file);
  });
}

export function loadImage(src: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = () =>
      reject(new Error('This image format could not be decoded by your browser.'));
    image.src = src;
  });
}

export function adjustmentFilter(a: {
  brightness: number;
  contrast: number;
  saturation: number;
}): string {
  return `brightness(${a.brightness}%) contrast(${a.contrast}%) saturate(${a.saturation}%)`;
}

export function safeExportName(name: string, fallback: string): string {
  return (
    name
      .replace(/[\\/:*?"<>|]+/g, '-')
      .replace(/\.[^.]+$/, '')
      .trim() || fallback
  ).slice(0, 100);
}
