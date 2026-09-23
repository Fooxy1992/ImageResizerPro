/**
 * High-performance client-side Super-Resolution upscaler and edge enhancer.
 * Uses progressive multi-pass resampling and adaptive unsharp-mask convolution
 * to reconstruct high-frequency details and eliminate blur when upscaling.
 */

export interface UpscaleOptions {
  strength: number; // 0 to 100
  enableSharpening?: boolean;
}

/**
 * Apply unsharp mask convolution to enhance edge contrast and fine textures.
 */
export function applySuperResolutionEnhance(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  strength = 50
): void {
  if (strength <= 0 || width <= 0 || height <= 0) return;

  // Don't run convolution on excessively massive canvases to preserve 60fps UI responsiveness
  if (width * height > 16_000_000) return;

  try {
    const imageData = ctx.getImageData(0, 0, width, height);
    const data = imageData.data;
    const len = data.length;
    const copy = new Uint8ClampedArray(data);

    // Kernel weight k based on strength
    // strength 50 -> k = 0.35, strength 100 -> k = 0.70
    const k = (strength / 100) * 0.7;
    const center = 1 + 4 * (k / 4);
    const edge = -(k / 4);

    const w = width;
    const h = height;

    for (let y = 1; y < h - 1; y++) {
      const rowOffset = y * w;
      for (let x = 1; x < w - 1; x++) {
        const idx = (rowOffset + x) * 4;

        // Skip fully transparent pixels
        if (copy[idx + 3] === 0) continue;

        const upIdx = (rowOffset - w + x) * 4;
        const downIdx = (rowOffset + w + x) * 4;
        const leftIdx = (rowOffset + x - 1) * 4;
        const rightIdx = (rowOffset + x + 1) * 4;

        // Red
        const r =
          copy[idx] * center +
          (copy[upIdx] + copy[downIdx] + copy[leftIdx] + copy[rightIdx]) * edge;
        data[idx] = r < 0 ? 0 : r > 255 ? 255 : r;

        // Green
        const g =
          copy[idx + 1] * center +
          (copy[upIdx + 1] + copy[downIdx + 1] + copy[leftIdx + 1] + copy[rightIdx + 1]) * edge;
        data[idx + 1] = g < 0 ? 0 : g > 255 ? 255 : g;

        // Blue
        const b =
          copy[idx + 2] * center +
          (copy[upIdx + 2] + copy[downIdx + 2] + copy[leftIdx + 2] + copy[rightIdx + 2]) * edge;
        data[idx + 2] = b < 0 ? 0 : b > 255 ? 255 : b;
      }
    }

    ctx.putImageData(imageData, 0, 0);
  } catch (err) {
    console.warn('Canvas Super-Resolution filtering skipped:', err);
  }
}

/**
 * Multi-step progressive upscaling for smoother gradients and sharper edges
 */
export function progressiveUpscale(
  sourceCanvas: HTMLCanvasElement,
  targetWidth: number,
  targetHeight: number
): HTMLCanvasElement {
  let currentWidth = sourceCanvas.width;
  let currentHeight = sourceCanvas.height;

  let currentCanvas = sourceCanvas;

  // If scaling factor is > 1.6x, do intermediate scale steps
  while (currentWidth * 1.6 < targetWidth || currentHeight * 1.6 < targetHeight) {
    const nextW = Math.min(targetWidth, Math.round(currentWidth * 1.5));
    const nextH = Math.min(targetHeight, Math.round(currentHeight * 1.5));

    const stepCanvas = document.createElement('canvas');
    stepCanvas.width = nextW;
    stepCanvas.height = nextH;
    const stepCtx = stepCanvas.getContext('2d');
    if (!stepCtx) break;

    stepCtx.imageSmoothingEnabled = true;
    stepCtx.imageSmoothingQuality = 'high';
    stepCtx.drawImage(currentCanvas, 0, 0, nextW, nextH);

    currentCanvas = stepCanvas;
    currentWidth = nextW;
    currentHeight = nextH;
  }

  // Final step to exact target dimension
  const finalCanvas = document.createElement('canvas');
  finalCanvas.width = targetWidth;
  finalCanvas.height = targetHeight;
  const finalCtx = finalCanvas.getContext('2d');
  if (finalCtx) {
    finalCtx.imageSmoothingEnabled = true;
    finalCtx.imageSmoothingQuality = 'high';
    finalCtx.drawImage(currentCanvas, 0, 0, targetWidth, targetHeight);
  }

  return finalCanvas;
}
