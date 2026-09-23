
import type { Crop, PixelCrop } from 'react-image-crop';

export enum OutputFormat {
  ORIGINAL = 'original', // Keeps each image's original format and extension
  JPEG = 'image/jpeg',
  PNG = 'image/png',
  WEBP = 'image/webp',
}

export enum ResizeMode {
  FIT = 'fit',         // Fit proportionally (keeps ratio, prevents deformation)
  COVER = 'cover',     // Fill & center crop to exact dimensions without distortion
  PAD = 'pad',         // Letterbox / pad onto background (no distortion)
  STRETCH = 'stretch', // Stretch to exact dimensions (may deform)
}

export enum PadBackground {
  TRANSPARENT = 'transparent',
  BLACK = '#000000',
  WHITE = '#ffffff',
  SLATE = '#0f172a',
}

export interface ImageDimensions {
  width: number;
  height: number;
}

export interface ImageItem {
  id: string;
  file: File;
  name: string; // Exact original filename (e.g. "photo.jpg")
  originalUrl: string;
  originalDimensions: ImageDimensions;
  originalSize: number;
  
  // Resized result
  resizedUrl: string | null;
  resizedBlob?: Blob | null;
  resizedDimensions: ImageDimensions;
  resizedSize: number | null;
  outputFormat?: OutputFormat;
  outputMime?: string;
  
  // Custom crop if applied to this specific item
  crop?: Crop;
  completedCrop?: PixelCrop | null;
  
  status: 'idle' | 'pending' | 'processing' | 'done' | 'error';
  error?: string;
}

export function getFormatLabel(format: OutputFormat, originalFilename?: string): string {
  if (format === OutputFormat.ORIGINAL) {
    if (originalFilename) {
      const ext = originalFilename.split('.').pop()?.toUpperCase();
      return ext ? `ORIGINAL (${ext})` : 'ORIGINAL';
    }
    return 'ORIGINAL';
  }
  if (format === OutputFormat.PNG) return 'PNG';
  if (format === OutputFormat.WEBP) return 'WEBP';
  if (format === OutputFormat.JPEG) return 'JPEG';
  return 'IMAGE';
}

export function getOutputExtension(format: OutputFormat, originalFilename?: string): string {
  if (format === OutputFormat.ORIGINAL) {
    if (originalFilename) {
      const ext = originalFilename.split('.').pop()?.toLowerCase();
      if (ext) return ext;
    }
    return 'jpg';
  }
  if (format === OutputFormat.PNG) return 'png';
  if (format === OutputFormat.WEBP) return 'webp';
  if (format === OutputFormat.JPEG) return 'jpg';
  return 'jpg';
}

/**
 * Returns the exact output filename keeping the original base name intact without alterations or prefixes.
 */
export function getPreservedFilename(originalName: string, targetFormat: OutputFormat, originalMime?: string): string {
  const lastDotIndex = originalName.lastIndexOf('.');
  const baseName = lastDotIndex !== -1 ? originalName.substring(0, lastDotIndex) : originalName;
  const originalExt = lastDotIndex !== -1 ? originalName.substring(lastDotIndex + 1).toLowerCase() : '';

  if (targetFormat === OutputFormat.ORIGINAL) {
    return originalName;
  }

  if (targetFormat === OutputFormat.PNG) {
    return `${baseName}.png`;
  }
  if (targetFormat === OutputFormat.WEBP) {
    return `${baseName}.webp`;
  }
  if (targetFormat === OutputFormat.JPEG) {
    // Preserve .jpeg if original was .jpeg, otherwise .jpg
    const ext = originalExt === 'jpeg' ? 'jpeg' : 'jpg';
    return `${baseName}.${ext}`;
  }

  return originalName;
}

export type { Crop, PixelCrop };
