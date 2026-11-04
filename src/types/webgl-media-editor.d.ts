declare module 'webgl-media-editor' {
  export class MediaEditor {
    setSource(source: string): void;
    setEditState(state: {
      effect?: number;
      intensity?: number;
      adjustments?: { brightness?: number; contrast?: number; saturation?: number };
      crop?: { x: number; y: number; width: number; height: number; rotate?: number };
    }): void;
    toBlob(): Promise<Blob>;
  }
}
