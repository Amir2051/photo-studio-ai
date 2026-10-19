// Utility functions

import { Point, Rect, Resolution } from './types';

export function clamp(value: number, min: number, max: number): number {
  return Math.max(min, Math.min(max, value));
}

export function lerp(a: number, b: number, t: number): number {
  return a + (b - a) * t;
}

export function lerpColor(
  c1: { r: number; g: number; b: number },
  c2: { r: number; g: number; b: number },
  t: number
): { r: number; g: number; b: number } {
  return {
    r: clamp(Math.round(lerp(c1.r, c2.r, t)), 0, 255),
    g: clamp(Math.round(lerp(c1.g, c2.g, t)), 0, 255),
    b: clamp(Math.round(lerp(c1.b, c2.b, t)), 0, 255),
  };
}

export function mapRange(value: number, inMin: number, inMax: number, outMin: number, outMax: number): number {
  return ((value - inMin) / (inMax - inMin)) * (outMax - outMin) + outMin;
}

export function distance(p1: Point, p2: Point): number {
  return Math.sqrt((p2.x - p1.x) ** 2 + (p2.y - p1.y) ** 2);
}

export function getRectCenter(rect: Rect): Point {
  return { x: rect.x + rect.width / 2, y: rect.y + rect.height / 2 };
}

export function resizeRect(rect: Rect, scale: number): Rect {
  return {
    x: rect.x * scale,
    y: rect.y * scale,
    width: rect.width * scale,
    height: rect.height * scale,
  };
}

export function getAspectRatio(width: number, height: number): number {
  return width / height;
}

export function constrainAspectRatio(
  width: number,
  height: number,
  targetRatio: number
): { width: number; height: number } {
  if (targetRatio === 0) return { width, height };
  const currentRatio = getAspectRatio(width, height);
  if (currentRatio > targetRatio) {
    return { width: height * targetRatio, height };
  }
  return { width, height: width / targetRatio };
}

export function debounce<T extends (...args: unknown[]) => unknown>(
  fn: T,
  delay: number
): (...args: Parameters<T>) => void {
  let timeoutId: ReturnType<typeof setTimeout>;
  return (...args: Parameters<T>) => {
    clearTimeout(timeoutId);
    timeoutId = setTimeout(() => fn(...args), delay);
  };
}

export function throttle<T extends (...args: unknown[]) => unknown>(
  fn: T,
  threshold: number
): (...args: Parameters<T>) => void {
  let lastCall = 0;
  return (...args: Parameters<T>) => {
    const now = Date.now();
    if (now - lastCall >= threshold) {
      lastCall = now;
      fn(...args);
    }
  };
}

export function digestUrl(dataUrl: string): string {
  // Simple hash for generating stable IDs from data
  let hash = 0;
  const str = dataUrl;
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i);
    hash = (hash << 5) - hash + char;
    hash = hash & hash;
  }
  return Math.abs(hash).toString(36);
}

export function generateId(): string {
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 9)}-${Math.random().toString(36).slice(2, 9)}`;
}

export function formatBytes(bytes: number): string {
  if (bytes === 0) return '0 B';
  const k = 1024;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return `${parseFloat((bytes / Math.pow(k, i)).toFixed(2))} ${sizes[i]}`;
}

export function formatTime(date: Date): string {
  return date.toLocaleString('en-US', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  });
}

export function formatDate(date: Date): string {
  return date.toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}

export function isMobileDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  const mobileKeywords = ['Mobile', 'Android', 'iPhone', 'iPad', 'iPod'];
  return mobileKeywords.some((kw) => ua.includes(kw));
}

export function isTabletDevice(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = navigator.userAgent || '';
  return /iPad/.test(ua) || /Tablet/.test(ua) || /Android/.test(ua);
}

export function isIOS(): boolean {
  if (typeof window === 'undefined') return false;
  return /iPad|iPhone|iPod/.test(navigator.userAgent);
}

export function isAndroid(): boolean {
  if (typeof window === 'undefined') return false;
  return /Android/.test(navigator.userAgent);
}

export function getDeviceType(): 'mobile' | 'tablet' | 'desktop' {
  if (typeof window === 'undefined') return 'desktop';
  const width = window.innerWidth;
  const height = window.innerHeight;
  const isTablet = width >= 768 && width < 1024;
  const isMobile = width < 768 && width > 320;
  const isDesktop = width >= 1024;

  if (isTablet) return 'tablet';
  if (isMobile) return 'mobile';
  return 'desktop';
}

export function getSafeAreaInsets(): { safeTop: number; safeBottom: number; safeLeft: number; safeRight: number; env: { top: number; bottom: number; left: number; right: number; width: number; height: number } } {
  const doc = document.documentElement;
  const vvp = (window as any).visualViewport;
  const visualViewport = vvp || { top: 0, bottom: 0, left: 0, right: 0, width: window.innerWidth, height: window.innerHeight };
  const vp = visualViewport as { top: number; bottom: number; left: number; right: number; width: number; height: number };
  return {
    safeTop: vp.top || 0,
    safeBottom: vp.bottom || 0,
    safeLeft: vp.left || 0,
    safeRight: vp.right || 0,
    env: {
      top: vp.top ?? 0,
      bottom: vp.bottom ?? 0,
      left: vp.left ?? 0,
      right: vp.right ?? 0,
      width: vp.width ?? window.innerWidth,
      height: vp.height ?? window.innerHeight,
    },
  };
}

export function isDarkMode(): boolean {
  const stored = localStorage.getItem('sf-theme');
  if (stored) return stored === 'dark';
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches; return prefersDark;
}

export function hexToRgb(hex: string): { r: number; g: number; b: number } | null {
  const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
  if (!result) return null;
  return {
    r: parseInt(result[1], 16),
    g: parseInt(result[2], 16),
    b: parseInt(result[3], 16),
  };
}

export function rgbToHex(r: number, g: number, b: number): string {
  return `#${[r, g, b]
    .map((x) => Math.round(clamp(x, 0, 255)).toString(16).padStart(2, '0'))
    .join('')}`;
}

export function colorLuminance(r: number, g: number, b: number): number {
  const [rs, gs, bs] = [r, g, b].map((c) => {
    const s = c / 255;
    return s <= 0.03928 ? s / 12.92 : Math.pow((s + 0.055) / 1.055, 2.4);
  });
  return 0.2126 * rs + 0.7152 * gs + 0.0722 * bs;
}

export function readFileAsDataURL(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result as string);
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

export function downloadFile(dataUrl: string, filename: string, mime: string) {
  const link = document.createElement('a');
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export function applyCmykToRgb(cmyk: { c: number; m: number; y: number; k: number }) {
  const c = cmyk.c / 100;
  const m = cmyk.m / 100;
  const y = cmyk.y / 100;
  const k = cmyk.k / 100;
  const r = 255 * (1 - c) * (1 - k);
  const g = 255 * (1 - m) * (1 - k);
  const b = 255 * (1 - y) * (1 - k);
  return { r: clamp(r, 0, 255), g: clamp(g, 0, 255), b: clamp(b, 0, 255) };
}

export function applyRgbToCmyk(rgb: { r: number; g: number; b: number }) {
  const r = rgb.r / 255;
  const g = rgb.g / 255;
  const b = rgb.b / 255;
  const k = 1 - Math.max(r, g, b);
  if (k === 1) {
    return { c: 0, m: 0, y: 0, k: 100 };
  }
  const c = (1 - r - k) / (1 - k);
  const m = (1 - g - k) / (1 - k);
  const y = (1 - b - k) / (1 - k);
  return { c: clamp(c, 0, 1) * 100, m: clamp(m, 0, 1) * 100, y: clamp(y, 0, 1) * 100, k: clamp(k, 0, 1) * 100 };
}
