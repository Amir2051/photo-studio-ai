import { useCallback, useEffect, useRef, useState } from 'react';
import type { Canvas as FabricCanvas } from 'fabric';
import type { Application, Sprite } from 'pixi.js';
import type Cropper from 'cropperjs';
import 'cropperjs/dist/cropper.css';

type ToolTab = 'fabric' | 'pixi' | 'cropper';
type Props = {
  sourceUrl: string;
  sourceName: string;
  onApply: (blob: Blob, suffix: string) => void;
  onApplyAdjustments: (values: {
    brightness: number;
    contrast: number;
    saturation: number;
  }) => void;
  onApplyCrop: (transform: {
    crop: { x: number; y: number; width: number; height: number };
    rotation: 0 | 90 | 180 | 270;
  }) => void;
};

const tabs: { id: ToolTab; label: string; detail: string }[] = [
  { id: 'fabric', label: 'Fabric.js', detail: 'Layers & drawing' },
  { id: 'pixi', label: 'PixiJS', detail: 'GPU adjustments' },
  { id: 'cropper', label: 'Cropper.js', detail: 'Precision crop' },
];

function toBlobFromDataUrl(dataUrl: string): Promise<Blob> {
  return fetch(dataUrl).then((response) => response.blob());
}

export default function LibraryToolsPanel({
  sourceUrl,
  sourceName,
  onApply,
  onApplyAdjustments,
  onApplyCrop,
}: Props) {
  const [tab, setTab] = useState<ToolTab>('fabric');
  const [status, setStatus] = useState('');
  const [drawing, setDrawing] = useState(false);
  const [brightness, setBrightness] = useState(0);
  const [contrast, setContrast] = useState(0);
  const [saturation, setSaturation] = useState(0);
  const fabricElement = useRef<HTMLCanvasElement>(null);
  const fabricApi = useRef<typeof import('fabric') | null>(null);
  const fabricInstance = useRef<FabricCanvas | null>(null);
  const fabricPreviewScale = useRef(1);
  const pixiHost = useRef<HTMLDivElement>(null);
  const pixiApi = useRef<typeof import('pixi.js') | null>(null);
  const pixiApp = useRef<Application | null>(null);
  const pixiSprite = useRef<Sprite | null>(null);
  const pixiSourceSize = useRef({ width: 0, height: 0 });
  const cropImage = useRef<HTMLImageElement>(null);
  const cropper = useRef<Cropper | null>(null);

  useEffect(() => {
    if (tab !== 'fabric' || !fabricElement.current) return;
    let cancelled = false;
    let instance: FabricCanvas | null = null;
    const image = new Image();
    image.onload = async () => {
      if (cancelled || !fabricElement.current) return;
      const scale = Math.min(1, 1400 / Math.max(image.naturalWidth, image.naturalHeight));
      const width = Math.max(1, Math.round(image.naturalWidth * scale));
      const height = Math.max(1, Math.round(image.naturalHeight * scale));
      fabricPreviewScale.current = scale;
      const fabric = await import('fabric');
      if (cancelled || !fabricElement.current) return;
      fabricApi.current = fabric;
      const canvas = new fabric.Canvas(fabricElement.current, {
        width,
        height,
        preserveObjectStacking: true,
        selection: true,
      });
      const background = await fabric.FabricImage.fromURL(sourceUrl);
      if (cancelled) {
        void canvas.dispose();
        return;
      }
      background.set({
        left: 0,
        top: 0,
        scaleX: width / image.naturalWidth,
        scaleY: height / image.naturalHeight,
        selectable: false,
        evented: false,
      });
      canvas.add(background);
      canvas.sendObjectToBack(background);
      canvas.renderAll();
      instance = canvas;
      fabricInstance.current = canvas;
    };
    image.onerror = () => setStatus('Fabric.js could not load this photo.');
    image.src = sourceUrl;
    return () => {
      cancelled = true;
      if (instance) void instance.dispose();
      fabricInstance.current = null;
    };
  }, [sourceUrl, tab]);

  useEffect(() => {
    const canvas = fabricInstance.current;
    if (!canvas) return;
    canvas.isDrawingMode = drawing;
    if (drawing) {
      const fabric = fabricApi.current;
      if (!fabric) return;
      const brush = new fabric.PencilBrush(canvas);
      brush.width = 8;
      brush.color = '#e7b875';
      canvas.freeDrawingBrush = brush;
    }
  }, [drawing, tab]);

  useEffect(() => {
    if (tab !== 'pixi' || !pixiHost.current) return;
    let cancelled = false;
    let app: Application | null = null;
    const setup = async () => {
      try {
        const pixi = await import('pixi.js');
        pixiApi.current = pixi;
        const imageTexture = await pixi.Assets.load(sourceUrl);
        if (cancelled || !pixiHost.current) return;
        const scale = Math.min(1, 1400 / Math.max(imageTexture.width, imageTexture.height));
        const previewWidth = Math.max(1, Math.round(imageTexture.width * scale));
        const previewHeight = Math.max(1, Math.round(imageTexture.height * scale));
        app = new pixi.Application();
        await app.init({
          width: previewWidth,
          height: previewHeight,
          backgroundAlpha: 0,
          antialias: true,
          autoDensity: true,
          resolution: 1,
        });
        if (cancelled || !pixiHost.current) {
          await app.destroy(true);
          return;
        }
        const sprite = new pixi.Sprite(imageTexture);
        sprite.width = previewWidth;
        sprite.height = previewHeight;
        app.renderer.resize(previewWidth, previewHeight);
        app.stage.addChild(sprite);
        pixiHost.current.replaceChildren(app.canvas);
        pixiApp.current = app;
        pixiSprite.current = sprite;
        pixiSourceSize.current = { width: imageTexture.width, height: imageTexture.height };
        setStatus('PixiJS GPU preview ready.');
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'PixiJS could not initialize.');
      }
    };
    void setup();
    return () => {
      cancelled = true;
      pixiSprite.current = null;
      pixiApp.current = null;
      if (app) void app.destroy(true, { children: true, texture: false, textureSource: false });
      if (pixiHost.current) pixiHost.current.replaceChildren();
    };
  }, [sourceUrl, tab]);

  useEffect(() => {
    const app = pixiApp.current;
    const sprite = pixiSprite.current;
    if (tab !== 'pixi' || !app || !sprite) return;
    const pixi = pixiApi.current;
    if (!pixi) return;
    const matrix = new pixi.ColorMatrixFilter();
    matrix.brightness(1 + brightness / 100, false);
    matrix.contrast(contrast / 100, true);
    matrix.saturate(saturation / 100, true);
    sprite.filters = [matrix];
    app.renderer.render(app.stage);
  }, [brightness, contrast, saturation, tab]);

  useEffect(() => {
    if (tab !== 'cropper' || !cropImage.current) return;
    let cancelled = false;
    let instance: Cropper | null = null;
    const setup = async () => {
      try {
        const module = await import('cropperjs');
        if (cancelled || !cropImage.current) return;
        const CropperConstructor = module.default;
        instance = new CropperConstructor(cropImage.current, {
          viewMode: 1,
          dragMode: 'move',
          autoCropArea: 0.9,
          responsive: true,
          background: false,
          movable: true,
          zoomable: true,
          rotatable: true,
          scalable: true,
          checkOrientation: true,
        });
        cropper.current = instance;
      } catch (error) {
        setStatus(error instanceof Error ? error.message : 'Cropper.js failed to load.');
      }
    };
    void setup();
    return () => {
      cancelled = true;
      instance?.destroy();
      cropper.current = null;
    };
  }, [sourceUrl, tab]);

  const addText = useCallback(() => {
    const canvas = fabricInstance.current;
    if (!canvas) return;
    const fabric = fabricApi.current;
    if (!fabric) return;
    const text = new fabric.IText('Double-click to edit', {
      left: 40,
      top: 40,
      fontSize: Math.max(22, Math.round(canvas.getWidth() / 24)),
      fill: '#ffffff',
      stroke: '#17201b',
      strokeWidth: 0.5,
      shadow: new fabric.Shadow({ color: 'rgba(0,0,0,.7)', blur: 8, offsetX: 0, offsetY: 2 }),
    });
    canvas.add(text);
    canvas.setActiveObject(text);
    canvas.renderAll();
  }, []);

  const addShape = useCallback(() => {
    const canvas = fabricInstance.current;
    if (!canvas) return;
    const fabric = fabricApi.current;
    if (!fabric) return;
    const shape = new fabric.Rect({
      left: 60,
      top: 60,
      width: Math.max(80, canvas.getWidth() * 0.18),
      height: Math.max(60, canvas.getHeight() * 0.12),
      fill: 'rgba(210,176,125,0.12)',
      stroke: '#e7b875',
      strokeWidth: 3,
      rx: 8,
      ry: 8,
    });
    canvas.add(shape);
    canvas.setActiveObject(shape);
    canvas.renderAll();
  }, []);

  const applyFabric = async () => {
    const canvas = fabricInstance.current;
    if (!canvas) return;
    const blob = await toBlobFromDataUrl(
      canvas.toDataURL({ format: 'png', multiplier: 1 / fabricPreviewScale.current }),
    );
    onApply(blob, 'fabric-layers');
    setStatus('Fabric.js layer composition applied to the main editor.');
  };

  const applyPixi = () => {
    if (!pixiApp.current || !pixiSprite.current) return;
    onApplyAdjustments({ brightness, contrast, saturation });
    setStatus(
      'GPU preview adjustments added to the shared document as editable, undoable settings.',
    );
  };

  const applyCrop = () => {
    const instance = cropper.current;
    if (!instance) return;
    const imageData = instance.getImageData();
    const cropData = instance.getData(true);
    if (!imageData.naturalWidth || !imageData.naturalHeight) {
      setStatus('Cropper.js could not read the source dimensions.');
      return;
    }
    const rotation = (((Math.round(cropData.rotate / 90) * 90) % 360) + 360) % 360;
    if (![0, 90, 180, 270].includes(rotation)) {
      setStatus('Only quarter-turn rotation is supported by the shared document right now.');
      return;
    }
    onApplyCrop({
      crop: {
        x: Math.max(0, cropData.x / imageData.naturalWidth),
        y: Math.max(0, cropData.y / imageData.naturalHeight),
        width: Math.min(1, cropData.width / imageData.naturalWidth),
        height: Math.min(1, cropData.height / imageData.naturalHeight),
      },
      rotation: rotation as 0 | 90 | 180 | 270,
    });
    setStatus('Crop and rotation added to the shared document as editable, undoable transforms.');
  };

  const clearFabric = () => {
    const canvas = fabricInstance.current;
    if (!canvas) return;
    const objects = canvas.getObjects();
    objects.slice(1).forEach((object) => canvas.remove(object));
    canvas.renderAll();
    setDrawing(false);
    setStatus('Fabric.js overlay objects cleared.');
  };

  return (
    <section className="library-tools-panel" aria-label="Additional manual editing engines">
      <div className="library-tools-heading">
        <div>
          <p className="eyebrow">MANUAL ENGINE LAB</p>
          <h2>Editing engines</h2>
          <p>Three focused local tools. No API keys, uploads or per-edit charges.</p>
          <p>
            GPU adjustments and crop transforms join the shared edit history. Fabric compositions
            still export as a flattened working image and are marked as experimental.
          </p>
        </div>
        <span className="offline-tag">ON DEVICE</span>
      </div>
      <div className="library-tools-tabs" role="tablist" aria-label="Editing engine">
        {tabs.map((item) => (
          <button
            key={item.id}
            type="button"
            role="tab"
            aria-selected={tab === item.id}
            className={tab === item.id ? 'active' : ''}
            onClick={() => {
              setTab(item.id);
              setStatus('');
            }}
          >
            <strong>{item.label}</strong>
            <small>{item.detail}</small>
          </button>
        ))}
      </div>
      <div className="library-tools-content">
        {tab === 'fabric' && (
          <>
            <div className="library-tools-actions">
              <button className="button" onClick={addText}>
                Add text
              </button>
              <button className="button" onClick={addShape}>
                Add shape
              </button>
              <button
                className={drawing ? 'button button-primary' : 'button'}
                onClick={() => setDrawing((value) => !value)}
              >
                {drawing ? 'Stop drawing' : 'Freehand brush'}
              </button>
              <button className="button button-quiet" onClick={clearFabric}>
                Clear overlays
              </button>
              <button className="button button-primary" onClick={() => void applyFabric()}>
                Apply flattened composition
              </button>
            </div>
            <div className="library-fabric-stage">
              <canvas ref={fabricElement} />
            </div>
            <p className="tool-note">
              Select, move, resize and rotate objects. Double-click text to edit. Freehand drawing
              and shape/text layers are composited into the result.
            </p>
          </>
        )}
        {tab === 'pixi' && (
          <>
            <div className="library-sliders">
              {(
                [
                  ['Brightness', brightness, setBrightness],
                  ['Contrast', contrast, setContrast],
                  ['Saturation', saturation, setSaturation],
                ] as const
              ).map(([label, value, setter]) => (
                <label className="range-control" key={label}>
                  <span>
                    <span>{label}</span>
                    <strong>
                      {value > 0 ? '+' : ''}
                      {value}
                    </strong>
                  </span>
                  <input
                    type="range"
                    min={-100}
                    max={100}
                    value={value}
                    onChange={(event) => setter(Number(event.target.value))}
                  />
                </label>
              ))}
            </div>
            <div className="library-pixi-stage" ref={pixiHost}>
              <span>Preparing GPU preview…</span>
            </div>
            <div className="library-tools-actions">
              <button
                className="button button-quiet"
                onClick={() => {
                  setBrightness(0);
                  setContrast(0);
                  setSaturation(0);
                }}
              >
                Reset adjustments
              </button>
              <button className="button button-primary" onClick={applyPixi}>
                Apply to document
              </button>
            </div>
            <p className="tool-note">
              PixiJS renders the preview with WebGL/WebGPU acceleration where supported. Export
              remains local in your browser.
            </p>
          </>
        )}
        {tab === 'cropper' && (
          <>
            <div className="library-crop-stage">
              <img ref={cropImage} src={sourceUrl} alt="Crop preview" />
            </div>
            <div className="library-tools-actions">
              <button className="button" onClick={() => cropper.current?.rotate(-90)}>
                Rotate left
              </button>
              <button className="button" onClick={() => cropper.current?.rotate(90)}>
                Rotate right
              </button>
              <button className="button" onClick={() => cropper.current?.reset()}>
                Reset crop
              </button>
              <button className="button button-primary" onClick={applyCrop}>
                Apply crop to document
              </button>
            </div>
            <p className="tool-note">
              Drag the crop frame, move or zoom the image, and rotate before applying.
            </p>
          </>
        )}
      </div>
      {status && (
        <p className="library-tools-status" role="status">
          {status}
        </p>
      )}
      <p className="library-tools-source">
        Working copy: {sourceName} · original file remains unchanged until export.
      </p>
    </section>
  );
}
