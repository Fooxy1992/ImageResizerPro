import React, { useState, useEffect } from 'react';
import { OutputFormat, ImageDimensions, ResizeMode, PadBackground } from '../types';
import {
  GridIcon,
  DesktopComputerIcon,
  LockClosedIcon,
  LockOpenIcon,
  SparklesIcon,
  FitIcon,
  CoverIcon,
  StretchIcon,
  InfoIcon,
  CheckIcon,
} from './icons';

interface ResizeControlsProps {
  width: number;
  setWidth: (width: number) => void;
  height: number;
  setHeight: (height: number) => void;
  format: OutputFormat;
  setFormat: (format: OutputFormat) => void;
  quality: number;
  setQuality: (quality: number) => void;
  aspectRatioPreset: string;
  setAspectRatioPreset: (preset: string) => void;
  originalDimensions: ImageDimensions;
  currentSourceDimensions: ImageDimensions;
  showCropGrid: boolean;
  setShowCropGrid: (show: boolean) => void;
  lockAspectRatio: boolean;
  setLockAspectRatio: (locked: boolean) => void;
  smoothing: 'high' | 'pixelated';
  setSmoothing: (smoothing: 'high' | 'pixelated') => void;
  resizeMode: ResizeMode;
  setResizeMode: (mode: ResizeMode) => void;
  padBg: PadBackground;
  setPadBg: (bg: PadBackground) => void;
  useAiUpscale: boolean;
  setUseAiUpscale: (enabled: boolean) => void;
  upscaleStrength: number;
  setUpscaleStrength: (strength: number) => void;
  onResetDimensions: () => void;
  totalImagesCount?: number;
  scaleMultiplier?: number | null;
  setScaleMultiplier?: (multiplier: number | null) => void;
  onApplyResize?: () => void;
  isProcessing?: boolean;
  hasUnappliedChanges?: boolean;
}

const ResizeControls: React.FC<ResizeControlsProps> = ({
  width,
  setWidth,
  height,
  setHeight,
  format,
  setFormat,
  quality,
  setQuality,
  aspectRatioPreset,
  setAspectRatioPreset,
  originalDimensions,
  currentSourceDimensions,
  showCropGrid,
  setShowCropGrid,
  lockAspectRatio,
  setLockAspectRatio,
  smoothing,
  setSmoothing,
  resizeMode,
  setResizeMode,
  padBg,
  setPadBg,
  useAiUpscale,
  setUseAiUpscale,
  upscaleStrength,
  setUpscaleStrength,
  onResetDimensions,
  totalImagesCount = 1,
  scaleMultiplier = null,
  setScaleMultiplier,
  onApplyResize,
  isProcessing = false,
  hasUnappliedChanges = false,
}) => {
  const [resolutionPreset, setResolutionPreset] = useState<string>('custom');

  // Source aspect ratio (source can be cropped or full image)
  const sourceWidth = currentSourceDimensions.width || originalDimensions.width || 1;
  const sourceHeight = currentSourceDimensions.height || originalDimensions.height || 1;
  const sourceRatio = sourceWidth / sourceHeight;

  // Detect if current target dimensions upscale the source
  const isUpscaling = width > sourceWidth || height > sourceHeight;
  const upscaleFactor = Math.max(
    sourceWidth > 0 ? width / sourceWidth : 1,
    sourceHeight > 0 ? height / sourceHeight : 1
  );

  const handlePresetSelect = (presetWidth: number, presetHeight: number, presetKey: string) => {
    setResolutionPreset(presetKey);

    if (resizeMode === ResizeMode.FIT) {
      // Fit proportionally into bounding box without deformation
      const boxRatio = presetWidth / presetHeight;
      if (sourceRatio > boxRatio) {
        setWidth(presetWidth);
        setHeight(Math.max(1, Math.round(presetWidth / sourceRatio)));
      } else {
        setHeight(presetHeight);
        setWidth(Math.max(1, Math.round(presetHeight * sourceRatio)));
      }
    } else {
      // In Cover, Pad, or Stretch mode, set exact dimensions
      setWidth(presetWidth);
      setHeight(presetHeight);
    }
    setScaleMultiplier?.(null);
  };

  const handleScaleMultiplier = (factor: number) => {
    setResolutionPreset('custom');
    const newW = Math.max(1, Math.round(sourceWidth * factor));
    const newH = Math.max(1, Math.round(sourceHeight * factor));
    setWidth(newW);
    setHeight(newH);
    setScaleMultiplier?.(factor);
  };

  const handleWidthChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    const newWidth = isNaN(val) ? 0 : Math.max(0, val);
    setWidth(newWidth);
    setResolutionPreset('custom');
    setScaleMultiplier?.(null);

    // Prevent deformation: if locked or in Fit mode, automatically sync height
    if ((lockAspectRatio || resizeMode === ResizeMode.FIT) && newWidth > 0) {
      const newHeight = Math.max(1, Math.round(newWidth / sourceRatio));
      setHeight(newHeight);
    }
  };

  const handleHeightChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseInt(e.target.value, 10);
    const newHeight = isNaN(val) ? 0 : Math.max(0, val);
    setHeight(newHeight);
    setResolutionPreset('custom');
    setScaleMultiplier?.(null);

    // Prevent deformation: if locked or in Fit mode, automatically sync width
    if ((lockAspectRatio || resizeMode === ResizeMode.FIT) && newHeight > 0) {
      const newWidth = Math.max(1, Math.round(newHeight * sourceRatio));
      setWidth(newWidth);
    }
  };

  const handleCropAspectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newPreset = e.target.value;
    setAspectRatioPreset(newPreset);
  };

  // Sync resolution dropdown if current dimensions match a preset
  useEffect(() => {
    const key = `${width}x${height}`;
    const recognized = [
      '1280x720',
      '1920x1080',
      '2560x1440',
      '3840x2160',
      '1080x1080',
      '1080x1920',
      '1200x675',
    ];
    if (recognized.includes(key)) {
      setResolutionPreset(key);
    } else {
      setResolutionPreset('custom');
    }
  }, [width, height]);

  const scalePercent = sourceWidth > 0 ? Math.round((width / sourceWidth) * 100) : 100;

  return (
    <div className="space-y-6">
      {/* Batch sync banner if multiple images */}
      {totalImagesCount > 1 && (
        <div className="p-3 rounded-xl bg-cyan-950/40 border border-cyan-800/60 text-xs text-cyan-200 flex items-start gap-2.5">
          <div className="w-2 h-2 rounded-full bg-cyan-400 mt-1 flex-shrink-0 animate-pulse" />
          <div className="flex-1">
            <span className="font-semibold block text-cyan-100">
              Batch Mode Active ({totalImagesCount} images)
            </span>
            <span className="text-[11px] text-cyan-300/80">
              Size, format, and anti-distortion settings apply to all {totalImagesCount} images. Original filenames are preserved without alteration.
            </span>
          </div>
        </div>
      )}

      {/* Primary Action Button: OK — Redimensionar */}
      {onApplyResize && (
        <div className="p-3.5 rounded-xl bg-slate-800/90 border border-slate-700/80 shadow-md">
          <div className="flex items-center justify-between gap-2 mb-2">
            <span className="text-xs font-semibold text-slate-200">
              {totalImagesCount > 1 ? 'Confirmação do Lote' : 'Aplicar Redimensionamento'}
            </span>
            {hasUnappliedChanges && (
              <span className="text-[10px] font-medium text-amber-400 bg-amber-950/40 px-2 py-0.5 rounded border border-amber-800/50">
                Alterações pendentes
              </span>
            )}
          </div>
          <button
            type="button"
            onClick={onApplyResize}
            disabled={isProcessing}
            className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all duration-150 transform active:scale-[0.98] ${
              isProcessing
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed border border-slate-600'
                : hasUnappliedChanges
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white ring-2 ring-emerald-400/40 shadow-emerald-950/50 animate-pulse'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-950/50'
            }`}
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Redimensionando imagens...</span>
              </>
            ) : (
              <>
                <CheckIcon className="w-5 h-5" />
                <span>
                  {totalImagesCount > 1
                    ? `OK — Redimensionar ${totalImagesCount} Imagens`
                    : 'OK — Redimensionar Imagem'}
                </span>
              </>
            )}
          </button>
          <p className="text-[11px] text-slate-400 text-center mt-2">
            {totalImagesCount > 1
              ? 'As imagens serão redimensionadas e convertidas somente após clicar em OK.'
              : 'Clique em OK para aplicar as dimensões e formato escolhidos.'}
          </p>
        </div>
      )}

      {/* Dimensions & Fitting Mode Header */}
      <div>
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <h2 className="text-base font-semibold text-slate-200">Output Dimensions</h2>
            <span className="text-[11px] font-mono px-2 py-0.5 rounded bg-slate-700/80 text-cyan-400 border border-slate-600">
              {sourceRatio >= 1
                ? `${sourceRatio.toFixed(2)}:1`
                : `1:${(1 / sourceRatio).toFixed(2)}`}
            </span>
          </div>
          <button
            type="button"
            onClick={onResetDimensions}
            className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
          >
            Reset to original
          </button>
        </div>

        {/* Resizing / Anti-Deformation Fit Modes */}
        <div className="mb-4">
          <div className="flex items-center justify-between mb-1.5">
            <label className="text-xs font-medium text-slate-300">
              Fitting Mode (Avoid Deformation)
            </label>
          </div>
          <div className="grid grid-cols-3 gap-1.5">
            <button
              type="button"
              onClick={() => {
                setResizeMode(ResizeMode.FIT);
                setLockAspectRatio(true);
                // Adjust height to match aspect ratio
                if (width > 0) {
                  setHeight(Math.max(1, Math.round(width / sourceRatio)));
                }
              }}
              title="Fit proportionally without stretching or cropping"
              className={`p-2 text-xs rounded-lg border text-center transition-all flex flex-col items-center gap-1 ${
                resizeMode === ResizeMode.FIT
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-semibold shadow-xs'
                  : 'bg-slate-700/60 border-slate-600 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <FitIcon className="w-4 h-4 text-cyan-400" />
              <span className="leading-tight">Fit Ratio</span>
              <span className="text-[9px] text-slate-400 font-normal">No deformation</span>
            </button>

            <button
              type="button"
              onClick={() => setResizeMode(ResizeMode.COVER)}
              title="Fill exact dimensions with smart center crop (never distorted)"
              className={`p-2 text-xs rounded-lg border text-center transition-all flex flex-col items-center gap-1 ${
                resizeMode === ResizeMode.COVER
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-semibold shadow-xs'
                  : 'bg-slate-700/60 border-slate-600 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <CoverIcon className="w-4 h-4 text-cyan-400" />
              <span className="leading-tight">Crop to Fill</span>
              <span className="text-[9px] text-slate-400 font-normal">Exact size</span>
            </button>

            <button
              type="button"
              onClick={() => setResizeMode(ResizeMode.PAD)}
              title="Letterbox inside exact dimensions without cropping or stretching"
              className={`p-2 text-xs rounded-lg border text-center transition-all flex flex-col items-center gap-1 ${
                resizeMode === ResizeMode.PAD
                  ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-semibold shadow-xs'
                  : 'bg-slate-700/60 border-slate-600 text-slate-300 hover:bg-slate-700'
              }`}
            >
              <div className="w-4 h-4 rounded border border-cyan-400 flex items-center justify-center text-[8px] font-mono">
                PAD
              </div>
              <span className="leading-tight">Pad Canvas</span>
              <span className="text-[9px] text-slate-400 font-normal">Letterbox</span>
            </button>
          </div>

          {resizeMode === ResizeMode.PAD && (
            <div className="mt-2.5 p-2 bg-slate-700/40 rounded-lg border border-slate-700 flex items-center justify-between">
              <span className="text-[11px] text-slate-300">Padding background:</span>
              <div className="flex gap-1.5">
                {[
                  { key: PadBackground.TRANSPARENT, label: 'Clear' },
                  { key: PadBackground.BLACK, label: 'Black' },
                  { key: PadBackground.WHITE, label: 'White' },
                  { key: PadBackground.SLATE, label: 'Dark' },
                ].map((bg) => (
                  <button
                    key={bg.key}
                    type="button"
                    onClick={() => setPadBg(bg.key)}
                    className={`px-2 py-0.5 text-[10px] rounded border transition-colors ${
                      padBg === bg.key
                        ? 'bg-cyan-500 text-slate-950 font-bold border-cyan-400'
                        : 'bg-slate-800 text-slate-300 border-slate-600 hover:border-slate-500'
                    }`}
                  >
                    {bg.label}
                  </button>
                ))}
              </div>
            </div>
          )}

          {resizeMode === ResizeMode.STRETCH && (
            <div className="mt-2 p-2 rounded bg-amber-950/40 border border-amber-800/60 text-amber-200 text-xs flex items-center gap-2">
              <InfoIcon className="w-4 h-4 text-amber-400 flex-shrink-0" />
              <span>Stretch mode may deform the original image aspect ratio.</span>
            </div>
          )}
        </div>

        {/* Quick Scale Multipliers (Downscale & Upscale) */}
        <div className="mb-4">
          <div className="flex justify-between items-center mb-1.5">
            <label className="text-xs font-medium text-slate-400">
              Quick Multipliers ({scalePercent}%)
            </label>
            {isUpscaling && (
              <span className="text-[10px] font-semibold text-cyan-400 bg-cyan-950/60 px-1.5 py-0.5 rounded border border-cyan-800">
                {upscaleFactor.toFixed(1)}x Upscaling
              </span>
            )}
          </div>
          <div className="grid grid-cols-6 gap-1.5">
            {[
              { label: '50%', factor: 0.5 },
              { label: '75%', factor: 0.75 },
              { label: '100%', factor: 1.0 },
              { label: '150%', factor: 1.5 },
              { label: '200%', factor: 2.0 },
              { label: '400%', factor: 4.0 },
            ].map((item) => (
              <button
                key={item.label}
                type="button"
                onClick={() => handleScaleMultiplier(item.factor)}
                className={`py-1.5 px-1 text-xs font-medium rounded-md transition-colors ${
                  Math.abs(scalePercent - item.factor * 100) < 2
                    ? 'bg-cyan-500 text-slate-950 font-bold shadow-xs'
                    : 'bg-slate-700 hover:bg-slate-600 text-slate-200'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </div>

        {/* Resolution presets */}
        <div className="space-y-3">
          <div>
            <label htmlFor="resolution" className="block text-xs font-medium text-slate-400 mb-1">
              Standard Presets
            </label>
            <div className="relative">
              <select
                id="resolution"
                value={resolutionPreset}
                onChange={(e) => {
                  const val = e.target.value;
                  if (val === 'custom') {
                    setResolutionPreset('custom');
                  } else {
                    const [w, h] = val.split('x').map(Number);
                    handlePresetSelect(w, h, val);
                  }
                }}
                className="w-full bg-slate-700/80 border border-slate-600 rounded-lg p-2 text-sm text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 appearance-none pl-9"
              >
                <option value="custom">Custom Dimensions</option>
                <option value="1280x720">HD 720p (1280 × 720)</option>
                <option value="1920x1080">Full HD 1080p (1920 × 1080)</option>
                <option value="2560x1440">2K QHD (2560 × 1440)</option>
                <option value="3840x2160">4K UHD (3840 × 2160)</option>
                <option value="1080x1080">Square 1:1 (1080 × 1080)</option>
                <option value="1080x1920">Vertical Story / Reels (1080 × 1920)</option>
                <option value="1200x675">Social Post (1200 × 675)</option>
              </select>
              <DesktopComputerIcon className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400 pointer-events-none" />
            </div>
          </div>

          {/* Width, Lock Toggle, Height */}
          <div className="flex items-center gap-2">
            <div className="flex-1">
              <label htmlFor="width" className="block text-xs font-medium text-slate-400 mb-1">
                Width (px)
              </label>
              <input
                type="number"
                id="width"
                min="1"
                max="10000"
                value={width || ''}
                onChange={handleWidthChange}
                className="w-full bg-slate-700/80 border border-slate-600 rounded-lg p-2 text-sm text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                placeholder="Width"
              />
            </div>

            <div className="pt-5">
              <button
                type="button"
                onClick={() => {
                  const nextLock = !lockAspectRatio;
                  setLockAspectRatio(nextLock);
                  if (nextLock && width > 0) {
                    setHeight(Math.max(1, Math.round(width / sourceRatio)));
                  }
                }}
                title={lockAspectRatio ? 'Aspect ratio locked (Proportional)' : 'Aspect ratio unlocked'}
                className={`p-2.5 rounded-lg border transition-colors ${
                  lockAspectRatio
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-400'
                    : 'bg-slate-700 border-slate-600 text-slate-400 hover:text-slate-200'
                }`}
              >
                {lockAspectRatio ? (
                  <LockClosedIcon className="w-4 h-4" />
                ) : (
                  <LockOpenIcon className="w-4 h-4" />
                )}
              </button>
            </div>

            <div className="flex-1">
              <label htmlFor="height" className="block text-xs font-medium text-slate-400 mb-1">
                Height (px)
              </label>
              <input
                type="number"
                id="height"
                min="1"
                max="10000"
                value={height || ''}
                onChange={handleHeightChange}
                className="w-full bg-slate-700/80 border border-slate-600 rounded-lg p-2 text-sm text-slate-100 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
                placeholder="Height"
              />
            </div>
          </div>
        </div>
      </div>

      {/* AI Super-Resolution Upscaling Section */}
      <div className="pt-4 border-t border-slate-700/60">
        <div className="flex items-center justify-between p-3.5 rounded-xl bg-gradient-to-r from-slate-800 to-cyan-950/30 border border-cyan-500/30 shadow-xs">
          <div className="flex items-center gap-3">
            <div className="w-8 h-8 rounded-lg bg-cyan-500/20 border border-cyan-500/40 flex items-center justify-center text-cyan-400">
              <SparklesIcon className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <span className="text-xs font-semibold text-slate-100">AI Super-Resolution Upscaler</span>
                {isUpscaling && (
                  <span className="text-[9px] bg-cyan-500 text-slate-950 font-bold px-1.5 py-0.2 rounded-full">
                    ACTIVE
                  </span>
                )}
              </div>
              <p className="text-[11px] text-slate-400">
                Sharpen edges & restore fine details when enlarging
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => setUseAiUpscale(!useAiUpscale)}
            className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
              useAiUpscale ? 'bg-cyan-500' : 'bg-slate-600'
            }`}
          >
            <span
              aria-hidden="true"
              className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                useAiUpscale ? 'translate-x-5' : 'translate-x-0'
              }`}
            />
          </button>
        </div>

        {useAiUpscale && (
          <div className="mt-3 p-3 bg-slate-800/60 rounded-xl border border-slate-700/70 space-y-3">
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="upscale-strength" className="text-xs font-medium text-slate-300">
                  Detail Sharpness & Reconstruction
                </label>
                <span className="text-xs font-semibold text-cyan-400 font-mono">
                  {upscaleStrength}%
                </span>
              </div>
              <input
                type="range"
                id="upscale-strength"
                min="10"
                max="100"
                step="5"
                value={upscaleStrength}
                onChange={(e) => setUpscaleStrength(parseInt(e.target.value, 10))}
                className="w-full h-1.5 bg-slate-700 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>Subtle</span>
                <span>Balanced HD (Recommended)</span>
                <span>Ultra Sharp</span>
              </div>
            </div>

            {/* Quick 2x / 4x Upscale buttons */}
            <div className="pt-2 border-t border-slate-700/50 flex items-center justify-between text-xs">
              <span className="text-slate-400 text-[11px]">Instant Upscale:</span>
              <div className="flex gap-1.5">
                <button
                  type="button"
                  onClick={() => handleScaleMultiplier(2.0)}
                  className="px-2.5 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 text-cyan-300 font-semibold border border-slate-600"
                >
                  2× HD Upscale
                </button>
                <button
                  type="button"
                  onClick={() => handleScaleMultiplier(4.0)}
                  className="px-2.5 py-1 text-xs rounded bg-slate-700 hover:bg-slate-600 text-cyan-300 font-semibold border border-slate-600"
                >
                  4× 4K Upscale
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Output Format & Compression */}
      <div className="pt-4 border-t border-slate-700/60">
        <h2 className="text-base font-semibold text-slate-200 mb-3">Format & Compression</h2>
        <div className="space-y-4">
          <div>
            <label htmlFor="output-format" className="block text-xs font-medium text-slate-400 mb-1">
              File Format
            </label>
            <select
              id="output-format"
              value={format}
              onChange={(e) => setFormat(e.target.value as OutputFormat)}
              className="w-full bg-slate-700/80 border border-slate-600 rounded-lg p-2 text-sm text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            >
              <option value={OutputFormat.ORIGINAL}>Keep Original Format (Preserves file extension)</option>
              <option value={OutputFormat.JPEG}>JPEG (.jpg) — Best for photos</option>
              <option value={OutputFormat.PNG}>PNG (.png) — Lossless, transparency</option>
              <option value={OutputFormat.WEBP}>WEBP (.webp) — Modern, superior compression</option>
            </select>
          </div>

          <div className="p-2.5 rounded-lg bg-emerald-950/30 border border-emerald-800/50 flex items-start gap-2 text-emerald-300 text-xs">
            <span className="text-emerald-400 font-bold mt-0.5">✓</span>
            <div>
              <span className="font-semibold block text-emerald-200">Preserved Filename</span>
              <span className="text-[11px] text-emerald-300/80">
                Downloaded images keep their exact initial name without alterations, prefixes, or added suffixes.
              </span>
            </div>
          </div>

          {(format === OutputFormat.JPEG || format === OutputFormat.WEBP || format === OutputFormat.ORIGINAL) && (
            <div>
              <div className="flex justify-between items-center mb-1">
                <label htmlFor="quality" className="text-xs font-medium text-slate-400">
                  Quality
                </label>
                <span className="text-xs font-semibold text-cyan-400">
                  {Math.round(quality * 100)}%
                </span>
              </div>
              <input
                type="range"
                id="quality"
                min="0.1"
                max="1.0"
                step="0.01"
                value={quality}
                onChange={(e) => setQuality(parseFloat(e.target.value))}
                className="w-full h-2 bg-slate-600 rounded-lg appearance-none cursor-pointer accent-cyan-400"
              />
              <div className="flex justify-between text-[10px] text-slate-500 mt-1">
                <span>Smaller file</span>
                <span>Balanced</span>
                <span>Maximum quality</span>
              </div>
            </div>
          )}

          {/* Resampling Mode */}
          <div>
            <label className="block text-xs font-medium text-slate-400 mb-1.5">
              Resampling Interpolation
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setSmoothing('high')}
                className={`p-2 text-xs rounded-lg border transition-colors text-left ${
                  smoothing === 'high'
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-medium'
                    : 'bg-slate-700/60 border-slate-600 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="block font-semibold">Bicubic Smooth</span>
                <span className="text-[10px] text-slate-400">Smooth photos & artwork</span>
              </button>
              <button
                type="button"
                onClick={() => setSmoothing('pixelated')}
                className={`p-2 text-xs rounded-lg border transition-colors text-left ${
                  smoothing === 'pixelated'
                    ? 'bg-cyan-500/20 border-cyan-500 text-cyan-300 font-medium'
                    : 'bg-slate-700/60 border-slate-600 text-slate-400 hover:text-slate-200'
                }`}
              >
                <span className="block font-semibold">Pixelated / Sharp</span>
                <span className="text-[10px] text-slate-400">Crisp for pixel art & icons</span>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Crop Options */}
      <div className="pt-4 border-t border-slate-700/60">
        <h2 className="text-base font-semibold text-slate-200 mb-3">Crop Options</h2>
        <div className="space-y-3">
          <div>
            <label htmlFor="aspect-ratio" className="block text-xs font-medium text-slate-400 mb-1">
              Crop Aspect Ratio Lock
            </label>
            <select
              id="aspect-ratio"
              value={aspectRatioPreset}
              onChange={handleCropAspectChange}
              className="w-full bg-slate-700/80 border border-slate-600 rounded-lg p-2 text-sm text-slate-200 focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500"
            >
              <option value="freeform">Freeform (Any rectangle)</option>
              <option value="original">Original Aspect Ratio</option>
              <option value="1:1">1:1 Square</option>
              <option value="4:3">4:3 Standard</option>
              <option value="16:9">16:9 Landscape</option>
              <option value="9:16">9:16 Portrait</option>
            </select>
          </div>

          <div className="flex items-center justify-between p-3 rounded-lg bg-slate-700/50 border border-slate-700">
            <div className="flex items-center gap-3">
              <GridIcon className="w-5 h-5 text-cyan-400" />
              <div>
                <span className="text-xs font-medium text-slate-200">Show crop grid</span>
                <p className="text-[11px] text-slate-400">Rule-of-thirds alignment guide</p>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setShowCropGrid(!showCropGrid)}
              className={`relative inline-flex h-6 w-11 flex-shrink-0 cursor-pointer rounded-full border-2 border-transparent transition-colors duration-200 ease-in-out focus:outline-none focus:ring-2 focus:ring-cyan-500 ${
                showCropGrid ? 'bg-cyan-500' : 'bg-slate-600'
              }`}
            >
              <span
                aria-hidden="true"
                className={`pointer-events-none inline-block h-5 w-5 transform rounded-full bg-white shadow ring-0 transition duration-200 ease-in-out ${
                  showCropGrid ? 'translate-x-5' : 'translate-x-0'
                }`}
              />
            </button>
          </div>
        </div>
      </div>

      {/* Bottom OK button so user never has to scroll up */}
      {onApplyResize && (
        <div className="pt-2">
          <button
            type="button"
            onClick={onApplyResize}
            disabled={isProcessing}
            className={`w-full py-3 px-4 rounded-xl font-bold text-sm flex items-center justify-center gap-2 shadow-lg transition-all duration-150 transform active:scale-[0.98] ${
              isProcessing
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed border border-slate-600'
                : hasUnappliedChanges
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white ring-2 ring-emerald-400/40 shadow-emerald-950/50 animate-pulse'
                : 'bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-cyan-950/50'
            }`}
          >
            {isProcessing ? (
              <>
                <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Redimensionando imagens...</span>
              </>
            ) : (
              <>
                <CheckIcon className="w-5 h-5" />
                <span>
                  {totalImagesCount > 1
                    ? `OK — Redimensionar ${totalImagesCount} Imagens`
                    : 'OK — Redimensionar Imagem'}
                </span>
              </>
            )}
          </button>
        </div>
      )}
    </div>
  );
};

export default ResizeControls;
