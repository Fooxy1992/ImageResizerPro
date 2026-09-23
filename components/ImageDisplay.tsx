import React, { RefObject, useState } from 'react';
import ReactCrop from 'react-image-crop';
import { ImageDimensions, Crop, PixelCrop, OutputFormat, getPreservedFilename, getFormatLabel } from '../types';
import { DownloadIcon, CopyIcon, CheckIcon } from './icons';

interface ImageDisplayProps {
  imgRef: RefObject<HTMLImageElement | null>;
  originalImage: string | null;
  originalFilename?: string;
  originalDimensions: ImageDimensions | null;
  originalSize?: number;
  resizedImage: string | null;
  resizedDimensions: ImageDimensions;
  resizedSize: number | null;
  format: OutputFormat;
  outputFormat?: OutputFormat;
  status?: string;
  isLoading: boolean;
  error: string | null;
  crop: Crop | undefined;
  onCropChange: (crop: Crop) => void;
  onCropComplete: (crop: PixelCrop) => void;
  onResetCrop: () => void;
  aspectRatioPreset: string;
  showCropGrid: boolean;
  onApplyResize?: () => void;
}

const formatBytes = (bytes?: number, decimals = 1) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const getExtension = (format: OutputFormat): string => {
  switch (format) {
    case OutputFormat.PNG:
      return 'png';
    case OutputFormat.WEBP:
      return 'webp';
    case OutputFormat.JPEG:
    default:
      return 'jpg';
  }
};

const ImageDisplay: React.FC<ImageDisplayProps> = ({
  imgRef,
  originalImage,
  originalFilename,
  originalDimensions,
  originalSize,
  resizedImage,
  resizedDimensions,
  resizedSize,
  format,
  outputFormat,
  status = 'done',
  isLoading,
  error,
  crop,
  onCropChange,
  onCropComplete,
  onResetCrop,
  aspectRatioPreset,
  showCropGrid,
  onApplyResize,
}) => {
  const [copied, setCopied] = useState(false);

  if (!originalImage) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[480px] bg-slate-800/30 rounded-2xl border-2 border-dashed border-slate-700/80 p-8 text-center">
        <div className="w-16 h-16 rounded-full bg-slate-800 flex items-center justify-center text-slate-400 mb-4 border border-slate-700">
          <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
          </svg>
        </div>
        <p className="text-lg font-medium text-slate-200 mb-1">No Image Selected</p>
        <p className="text-sm text-slate-400 max-w-sm">
          Upload an image using the panel on the left to start resizing, cropping, and converting.
        </p>
      </div>
    );
  }

  const getAspect = () => {
    if (!originalDimensions) return undefined;
    switch (aspectRatioPreset) {
      case 'freeform':
        return undefined;
      case 'original':
        return originalDimensions.width / originalDimensions.height;
      case '1:1':
        return 1;
      case '4:3':
        return 4 / 3;
      case '16:9':
        return 16 / 9;
      case '9:16':
        return 9 / 16;
      case 'custom':
        if (resizedDimensions.height > 0) {
          return resizedDimensions.width / resizedDimensions.height;
        }
        return undefined;
      default:
        return undefined;
    }
  };

  const handleCopyToClipboard = async () => {
    if (!resizedImage) return;
    try {
      const response = await fetch(resizedImage);
      const blob = await response.blob();
      // Most browsers require image/png for clipboard
      if (blob.type === 'image/png') {
        await navigator.clipboard.write([new ClipboardItem({ 'image/png': blob })]);
      } else {
        // Convert to PNG on a temporary canvas if needed for clipboard
        const img = new Image();
        img.crossOrigin = 'anonymous';
        await new Promise<void>((resolve, reject) => {
          img.onload = () => resolve();
          img.onerror = reject;
          img.src = resizedImage;
        });
        const c = document.createElement('canvas');
        c.width = img.width;
        c.height = img.height;
        const ctx = c.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0);
          const pngBlob = await new Promise<Blob | null>((res) => c.toBlob(res, 'image/png'));
          if (pngBlob) {
            await navigator.clipboard.write([new ClipboardItem({ 'image/png': pngBlob })]);
          }
        }
      }
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch (err) {
      console.error('Failed to copy to clipboard', err);
    }
  };

  // Calculate size difference percentage
  let sizeDiffText = '';
  let isSmaller = false;
  if (originalSize && resizedSize && originalSize > 0) {
    const diff = ((resizedSize - originalSize) / originalSize) * 100;
    if (diff < 0) {
      sizeDiffText = `${Math.abs(Math.round(diff))}% smaller`;
      isSmaller = true;
    } else if (diff > 0) {
      sizeDiffText = `+${Math.round(diff)}% larger`;
      isSmaller = false;
    } else {
      sizeDiffText = 'same size';
    }
  }

  const activeFormat = outputFormat || format;
  const downloadFilename = originalFilename
    ? getPreservedFilename(originalFilename, activeFormat)
    : `image.${getExtension(activeFormat)}`;

  const isPending = status === 'pending' || (!resizedImage && !isLoading);

  return (
    <div className="space-y-6">
      {error && (
        <div className="bg-red-950/60 border border-red-800 text-red-200 p-4 rounded-xl text-sm flex items-center justify-between">
          <span>{error}</span>
        </div>
      )}

      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        {/* Original Image Card */}
        <div className="bg-slate-800/40 rounded-2xl border border-slate-700/60 p-4 flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-700/40">
            <div className="truncate max-w-[200px]">
              <span className="text-sm font-semibold text-slate-200 block truncate">
                {originalFilename || 'Original Image'}
              </span>
              <span className="text-[10px] text-slate-400">Crop Source</span>
            </div>
            {crop && crop.width && crop.width > 0 && (
              <button
                type="button"
                onClick={onResetCrop}
                className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
              >
                Clear Crop
              </button>
            )}
          </div>

          <div className="relative w-full aspect-square bg-slate-900/60 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800">
            <ReactCrop
              crop={crop}
              onChange={(_, percentCrop) => onCropChange(percentCrop)}
              onComplete={(c) => onCropComplete(c)}
              aspect={getAspect()}
              className={showCropGrid ? 'show-grid' : ''}
            >
              <img
                ref={imgRef}
                src={originalImage}
                alt="Original"
                className="max-w-full max-h-[360px] object-contain select-none"
              />
            </ReactCrop>
          </div>

          <div className="mt-4 pt-2 flex items-center justify-between text-xs text-slate-400">
            <span>
              {originalDimensions ? `${originalDimensions.width} × ${originalDimensions.height} px` : '—'}
            </span>
            <span className="font-mono bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              {formatBytes(originalSize)}
            </span>
          </div>
        </div>

        {/* Resized Result Card */}
        <div className="bg-slate-800/40 rounded-2xl border border-slate-700/60 p-4 flex flex-col">
          <div className="flex items-center justify-between pb-3 mb-2 border-b border-slate-700/40">
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-200">Resized Output</span>
              {sizeDiffText && !isPending && (
                <span
                  className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${
                    isSmaller
                      ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
                      : 'bg-slate-700 text-slate-300 border border-slate-600'
                  }`}
                >
                  {sizeDiffText}
                </span>
              )}
            </div>
            <span className="text-xs uppercase font-mono font-medium text-cyan-400 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/50">
              {getFormatLabel(activeFormat, originalFilename)}
            </span>
          </div>

          <div className="relative w-full aspect-square bg-slate-900/60 rounded-xl overflow-hidden flex items-center justify-center border border-slate-800">
            {resizedImage && !isPending ? (
              <img
                src={resizedImage}
                alt="Resized result"
                className="max-w-full max-h-[360px] object-contain"
              />
            ) : (
              <div className="flex flex-col items-center justify-center p-6 text-center gap-3">
                <div className="w-12 h-12 rounded-full bg-cyan-950/60 border border-cyan-700/60 flex items-center justify-center text-cyan-400">
                  <CheckIcon className="w-6 h-6" />
                </div>
                <div className="space-y-1">
                  <p className="text-xs font-semibold text-slate-200">
                    Aguardando clique em "OK"
                  </p>
                  <p className="text-[11px] text-slate-400 max-w-[240px]">
                    Defina as configurações e clique no botão "OK — Redimensionar" para processar.
                  </p>
                </div>
                {onApplyResize && (
                  <button
                    type="button"
                    onClick={onApplyResize}
                    className="mt-1 inline-flex items-center gap-1.5 text-xs font-bold py-2 px-4 rounded-xl bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 text-white shadow-md transition-all active:scale-95"
                  >
                    <CheckIcon className="w-4 h-4" />
                    <span>OK — Redimensionar Agora</span>
                  </button>
                )}
              </div>
            )}

            {isLoading && (
              <div className="absolute inset-0 bg-slate-900/75 flex flex-col items-center justify-center z-10 gap-3 backdrop-blur-xs">
                <div className="w-10 h-10 border-3 border-slate-600 border-t-cyan-400 rounded-full animate-spin"></div>
                <span className="text-xs text-slate-300 font-medium">Processing image...</span>
              </div>
            )}
          </div>

          <div className="mt-4 pt-2 flex items-center justify-between text-xs text-slate-400">
            <span>
              {resizedDimensions.width} × {resizedDimensions.height} px
            </span>
            <span className="font-mono bg-slate-800 px-2 py-0.5 rounded border border-slate-700">
              {formatBytes(resizedSize ?? undefined)}
            </span>
          </div>

          {/* Action buttons */}
          <div className="mt-4 pt-3 border-t border-slate-700/40 space-y-2">
            {resizedImage && !isPending && !isLoading && (
              <>
                <div className="flex items-center gap-2">
                  <a
                    href={resizedImage}
                    download={downloadFilename}
                    className="flex-1 inline-flex items-center justify-center gap-2 bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-slate-950 font-semibold py-2.5 px-4 rounded-xl shadow transition-colors text-xs truncate"
                  >
                    <DownloadIcon className="w-4 h-4 text-slate-950 flex-shrink-0" />
                    <span className="truncate font-mono">Download {downloadFilename}</span>
                  </a>

                  <button
                    type="button"
                    onClick={handleCopyToClipboard}
                    title="Copy image to clipboard"
                    className="inline-flex items-center justify-center gap-1.5 bg-slate-700 hover:bg-slate-600 active:bg-slate-800 text-slate-200 font-medium py-2.5 px-3 rounded-xl border border-slate-600 transition-colors text-xs flex-shrink-0"
                  >
                    {copied ? (
                      <>
                        <CheckIcon className="w-4 h-4 text-emerald-400" />
                        <span className="text-emerald-400">Copied!</span>
                      </>
                    ) : (
                      <>
                        <CopyIcon className="w-4 h-4" />
                        <span>Copy</span>
                      </>
                    )}
                  </button>
                </div>

                <div className="text-[11px] text-emerald-400/90 flex items-center justify-center gap-1">
                  <CheckIcon className="w-3 h-3 text-emerald-400" />
                  <span>Exact initial filename preserved without alteration</span>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ImageDisplay;
