import {
  ImageItem,
  OutputFormat,
  ResizeMode,
  PadBackground,
  ImageDimensions,
} from '../types';
import { applySuperResolutionEnhance } from './imageUpscaler';

export interface ProcessOptions {
  width: number;
  height: number;
  scaleMultiplier: number | null; // e.g. 0.5, 1.0, 2.0 or null if using fixed width/height
  format: OutputFormat;
  quality: number;
  resizeMode: ResizeMode;
  padBg: PadBackground;
  smoothing: 'high' | 'pixelated';
  useAiUpscale: boolean;
  upscaleStrength: number;
}

/**
 * Calculates target dimensions for an image item based on global options
 */
export function calculateTargetDimensions(
  sourceDims: ImageDimensions,
  options: ProcessOptions
): ImageDimensions {
  const { width, height, scaleMultiplier, resizeMode } = options;

  if (scaleMultiplier !== null && scaleMultiplier > 0) {
    return {
      width: Math.max(1, Math.round(sourceDims.width * scaleMultiplier)),
      height: Math.max(1, Math.round(sourceDims.height * scaleMultiplier)),
    };
  }

  if (resizeMode === ResizeMode.FIT) {
    const sourceRatio = sourceDims.width / sourceDims.height;
    const targetRatio = width / height;

    if (sourceRatio > targetRatio) {
      // Wider: match width, calculate height
      return {
        width,
        height: Math.max(1, Math.round(width / sourceRatio)),
      };
    } else {
      // Taller: match height, calculate width
      return {
        width: Math.max(1, Math.round(height * sourceRatio)),
        height,
      };
    }
  }

  // Cover, Pad, or Stretch: use exact specified dimensions
  return {
    width: Math.max(1, width),
    height: Math.max(1, height),
  };
}

/**
 * Resolves the actual mime type from the OutputFormat enum and the original file type
 */
export function resolveMimeType(format: OutputFormat, file: File): string {
  if (format === OutputFormat.ORIGINAL) {
    if (file.type && file.type.startsWith('image/')) {
      return file.type;
    }
    const ext = file.name.split('.').pop()?.toLowerCase();
    if (ext === 'png') return 'image/png';
    if (ext === 'webp') return 'image/webp';
    return 'image/jpeg';
  }
  return format;
}

/**
 * Processes an ImageItem with HTML5 Canvas, respecting fit modes and AI upscaling
 */
export async function processImageItem(
  item: ImageItem,
  options: ProcessOptions
): Promise<{
  resizedUrl: string;
  resizedBlob: Blob;
  resizedDimensions: ImageDimensions;
  resizedSize: number;
  outputFormat: OutputFormat;
  outputMime: string;
}> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.crossOrigin = 'anonymous';

    img.onload = () => {
      try {
        const hasCrop =
          item.completedCrop &&
          item.completedCrop.width > 0 &&
          item.completedCrop.height > 0;

        // Determine source rectangle
        let sourceX = 0;
        let sourceY = 0;
        let sourceWidth = img.naturalWidth;
        let sourceHeight = img.naturalHeight;

        if (hasCrop && item.completedCrop) {
          const scaleX = img.naturalWidth / (img.width || img.naturalWidth);
          const scaleY = img.naturalHeight / (img.height || img.naturalHeight);
          sourceX = item.completedCrop.x * scaleX;
          sourceY = item.completedCrop.y * scaleY;
          sourceWidth = Math.max(1, item.completedCrop.width * scaleX);
          sourceHeight = Math.max(1, item.completedCrop.height * scaleY);
        }

        const sourceDims: ImageDimensions = {
          width: Math.round(sourceWidth),
          height: Math.round(sourceHeight),
        };

        const targetDims = calculateTargetDimensions(sourceDims, options);
        const { width: targetW, height: targetH } = targetDims;

        const canvas = document.createElement('canvas');
        canvas.width = targetW;
        canvas.height = targetH;
        const ctx = canvas.getContext('2d');

        if (!ctx) {
          throw new Error('Canvas 2D context not available');
        }

        // Interpolation
        if (options.smoothing === 'pixelated') {
          ctx.imageSmoothingEnabled = false;
        } else {
          ctx.imageSmoothingEnabled = true;
          ctx.imageSmoothingQuality = 'high';
        }

        const sourceRatio = sourceWidth / sourceHeight;
        const targetRatio = targetW / targetH;

        // Background for Pad mode
        if (options.resizeMode === ResizeMode.PAD) {
          if (options.padBg === PadBackground.TRANSPARENT) {
            ctx.clearRect(0, 0, targetW, targetH);
          } else {
            ctx.fillStyle = options.padBg;
            ctx.fillRect(0, 0, targetW, targetH);
          }
        }

        // Render according to resizeMode without deformation
        if (options.resizeMode === ResizeMode.COVER) {
          let sW = sourceWidth;
          let sH = sourceHeight;
          let sX = sourceX;
          let sY = sourceY;

          if (sourceRatio > targetRatio) {
            sW = sourceHeight * targetRatio;
            sX = sourceX + (sourceWidth - sW) / 2;
          } else {
            sH = sourceWidth / targetRatio;
            sY = sourceY + (sourceHeight - sH) / 2;
          }

          ctx.drawImage(img, sX, sY, sW, sH, 0, 0, targetW, targetH);
        } else if (options.resizeMode === ResizeMode.PAD) {
          let dW = targetW;
          let dH = targetH;
          let dX = 0;
          let dY = 0;

          if (sourceRatio > targetRatio) {
            dH = Math.round(targetW / sourceRatio);
            dY = Math.round((targetH - dH) / 2);
          } else {
            dW = Math.round(targetH * sourceRatio);
            dX = Math.round((targetW - dW) / 2);
          }

          ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, dX, dY, dW, dH);
        } else if (options.resizeMode === ResizeMode.STRETCH) {
          ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, targetW, targetH);
        } else {
          // ResizeMode.FIT (Default)
          const ratioDiff = Math.abs(sourceRatio - targetRatio);
          if (ratioDiff > 0.01) {
            let dW = targetW;
            let dH = targetH;
            let dX = 0;
            let dY = 0;

            if (sourceRatio > targetRatio) {
              dH = Math.round(targetW / sourceRatio);
              dY = Math.round((targetH - dH) / 2);
            } else {
              dW = Math.round(targetH * sourceRatio);
              dX = Math.round((targetW - dW) / 2);
            }
            ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, dX, dY, dW, dH);
          } else {
            ctx.drawImage(img, sourceX, sourceY, sourceWidth, sourceHeight, 0, 0, targetW, targetH);
          }
        }

        // Apply AI Super-Resolution Enhancement if upscaling
        const isUpscaling = targetW > sourceWidth || targetH > sourceHeight;
        if (options.useAiUpscale && isUpscaling) {
          applySuperResolutionEnhance(ctx, targetW, targetH, options.upscaleStrength);
        }

        const mimeType = resolveMimeType(options.format, item.file);
        const targetQuality = mimeType === 'image/png' ? undefined : options.quality;

        canvas.toBlob(
          (blob) => {
            if (!blob) {
              reject(new Error('Failed to create image blob'));
              return;
            }
            const resizedUrl = canvas.toDataURL(mimeType, targetQuality);
            resolve({
              resizedUrl,
              resizedBlob: blob,
              resizedDimensions: targetDims,
              resizedSize: blob.size,
              outputFormat: options.format,
              outputMime: mimeType,
            });
          },
          mimeType,
          targetQuality
        );
      } catch (err) {
        reject(err);
      }
    };

    img.onerror = () => {
      reject(new Error(`Failed to load image: ${item.name}`));
    };

    img.src = item.originalUrl;
  });
}
