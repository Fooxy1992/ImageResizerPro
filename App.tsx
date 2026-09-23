import React, { useState, useCallback, useEffect, useRef } from 'react';
import JSZip from 'jszip';
import {
  OutputFormat,
  ImageDimensions,
  Crop,
  PixelCrop,
  ResizeMode,
  PadBackground,
  ImageItem,
  getPreservedFilename,
  getFormatLabel,
} from './types';
import FileUploader from './components/FileUploader';
import ResizeControls from './components/ResizeControls';
import ImageDisplay from './components/ImageDisplay';
import BatchImageList from './components/BatchImageList';
import { DownloadIcon, BrandIcon, RefreshIcon, ArchiveIcon, CheckIcon } from './components/icons';
import { processImageItem, ProcessOptions } from './utils/processImage';

const App: React.FC = () => {
  const [images, setImages] = useState<ImageItem[]>([]);
  const [activeId, setActiveId] = useState<string | null>(null);

  // Dimension & Scaling Controls
  const [width, setWidth] = useState<number>(0);
  const [height, setHeight] = useState<number>(0);
  const [scaleMultiplier, setScaleMultiplier] = useState<number | null>(null);

  // Format & Quality Controls
  const [format, setFormat] = useState<OutputFormat>(OutputFormat.ORIGINAL);
  const [quality, setQuality] = useState<number>(0.92);

  // Aspect Ratio & Crop Controls
  const [aspectRatioPreset, setAspectRatioPreset] = useState<string>('freeform');
  const [lockAspectRatio, setLockAspectRatio] = useState<boolean>(true);
  const [smoothing, setSmoothing] = useState<'high' | 'pixelated'>('high');

  // Anti-Distortion Fitting Controls
  const [resizeMode, setResizeMode] = useState<ResizeMode>(ResizeMode.FIT);
  const [padBg, setPadBg] = useState<PadBackground>(PadBackground.TRANSPARENT);

  // AI Upscaling Controls
  const [useAiUpscale, setUseAiUpscale] = useState<boolean>(true);
  const [upscaleStrength, setUpscaleStrength] = useState<number>(55);

  // State flags
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isZipping, setIsZipping] = useState<boolean>(false);
  const [isBatchProcessing, setIsBatchProcessing] = useState<boolean>(false);
  const [hasUnappliedChanges, setHasUnappliedChanges] = useState<boolean>(false);
  const [processingStatus, setProcessingStatus] = useState<string | null>(null);
  const [successBanner, setSuccessBanner] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Cropping
  const [crop, setCrop] = useState<Crop>();
  const [completedCrop, setCompletedCrop] = useState<PixelCrop | null>(null);
  const imgRef = useRef<HTMLImageElement | null>(null);
  const [showCropGrid, setShowCropGrid] = useState<boolean>(true);

  // Active image derivation
  const activeItem = images.find((img) => img.id === activeId) || (images.length > 0 ? images[0] : null);

  // Reset entire state
  const resetState = () => {
    setImages([]);
    setActiveId(null);
    setWidth(0);
    setHeight(0);
    setScaleMultiplier(null);
    setIsLoading(false);
    setIsZipping(false);
    setIsBatchProcessing(false);
    setHasUnappliedChanges(false);
    setProcessingStatus(null);
    setSuccessBanner(null);
    setError(null);
    setCrop(undefined);
    setCompletedCrop(null);
    setAspectRatioPreset('freeform');
    setShowCropGrid(true);
    setResizeMode(ResizeMode.FIT);
  };

  // Reset crop for current active image
  const handleResetCrop = () => {
    setCrop(undefined);
    setCompletedCrop(null);
    if (activeItem) {
      setImages((prev) =>
        prev.map((img) =>
          img.id === activeItem.id ? { ...img, crop: undefined, completedCrop: null } : img
        )
      );
      setWidth(activeItem.originalDimensions.width);
      setHeight(activeItem.originalDimensions.height);
    }
  };

  // Reset dimensions to active image's natural dimensions
  const handleResetDimensions = () => {
    if (activeItem) {
      setWidth(activeItem.originalDimensions.width);
      setHeight(activeItem.originalDimensions.height);
      setScaleMultiplier(null);
    }
  };

  // Multiple File Upload Handler (preserving initial filenames)
  const handleFilesUpload = async (files: File[]) => {
    if (!files || files.length === 0) return;
    setError(null);
    setIsLoading(true);

    try {
      const newItems: ImageItem[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        const id = `${Date.now()}-${i}-${Math.random().toString(36).substring(2, 7)}`;

        const originalUrl = await new Promise<string>((resolve, reject) => {
          const reader = new FileReader();
          reader.onload = (e) => resolve(e.target?.result as string);
          reader.onerror = reject;
          reader.readAsDataURL(file);
        });

        const dims = await new Promise<ImageDimensions>((resolve, reject) => {
          const img = new Image();
          img.onload = () => resolve({ width: img.naturalWidth, height: img.naturalHeight });
          img.onerror = reject;
          img.src = originalUrl;
        });

        // Exact initial file name is saved without modification
        newItems.push({
          id,
          file,
          name: file.name,
          originalUrl,
          originalDimensions: dims,
          originalSize: file.size,
          resizedUrl: null,
          resizedBlob: null,
          resizedDimensions: dims,
          resizedSize: null,
          status: 'pending',
        });
      }

      setImages((prev) => {
        const updated = [...prev, ...newItems];
        return updated;
      });
      setHasUnappliedChanges(true);

      // If nothing was selected previously, focus first uploaded image
      if (!activeId && newItems.length > 0) {
        const first = newItems[0];
        setActiveId(first.id);
        setWidth(first.originalDimensions.width);
        setHeight(first.originalDimensions.height);
      }
    } catch (err) {
      console.error('Failed to load images:', err);
      setError('Failed to load one or more images.');
    } finally {
      setIsLoading(false);
    }
  };

  // Remove an image from the batch queue
  const handleRemoveImage = (idToRemove: string) => {
    setImages((prev) => {
      const remaining = prev.filter((item) => item.id !== idToRemove);
      if (activeId === idToRemove) {
        setActiveId(remaining.length > 0 ? remaining[0].id : null);
        if (remaining.length > 0) {
          setWidth(remaining[0].originalDimensions.width);
          setHeight(remaining[0].originalDimensions.height);
        }
      }
      return remaining;
    });
  };

  // Switch active image for preview & crop
  const handleSelectImage = (id: string) => {
    setActiveId(id);
    const selected = images.find((item) => item.id === id);
    if (selected) {
      setCrop(selected.crop);
      setCompletedCrop(selected.completedCrop || null);
      if (scaleMultiplier !== null) {
        setWidth(Math.max(1, Math.round(selected.originalDimensions.width * scaleMultiplier)));
        setHeight(Math.max(1, Math.round(selected.originalDimensions.height * scaleMultiplier)));
      }
    }
  };

  // Calculate current source dimensions for active image
  const getSourceDimensions = useCallback((): ImageDimensions => {
    if (!activeItem) return { width: 0, height: 0 };
    if (!completedCrop || !completedCrop.width || !completedCrop.height || !imgRef.current) {
      return activeItem.originalDimensions;
    }
    const image = imgRef.current;
    const scaleX = image.naturalWidth / image.width;
    const scaleY = image.naturalHeight / image.height;
    return {
      width: Math.max(1, Math.round(completedCrop.width * scaleX)),
      height: Math.max(1, Math.round(completedCrop.height * scaleY)),
    };
  }, [activeItem, completedCrop]);

  const currentSourceDims = getSourceDimensions();

  // Apply resize and format conversion across all batch images upon OK click
  const handleApplyResize = async () => {
    if (images.length === 0 || width <= 0 || height <= 0) return;

    setIsLoading(true);
    setIsBatchProcessing(true);
    setError(null);

    const options: ProcessOptions = {
      width,
      height,
      scaleMultiplier,
      format,
      quality,
      resizeMode,
      padBg,
      smoothing,
      useAiUpscale,
      upscaleStrength,
    };

    try {
      const currentList = [...images];
      const results: ImageItem[] = [];

      for (let i = 0; i < currentList.length; i++) {
        const item = currentList[i];
        setProcessingStatus(`Redimensionando ${i + 1} de ${currentList.length}: ${item.name}...`);

        const imgToProcess: ImageItem = {
          ...item,
          crop: item.id === activeId ? crop : item.crop,
          completedCrop: item.id === activeId ? completedCrop : item.completedCrop,
        };

        try {
          const res = await processImageItem(imgToProcess, options);
          results.push({
            ...item,
            ...res,
            crop: imgToProcess.crop,
            completedCrop: imgToProcess.completedCrop,
            status: 'done',
          });
        } catch (itemErr) {
          console.error(`Falha ao processar ${item.name}:`, itemErr);
          results.push({
            ...item,
            status: 'error',
            error: itemErr instanceof Error ? itemErr.message : 'Falha ao processar imagem',
          });
        }
      }

      setImages(results);
      setHasUnappliedChanges(false);

      const successfulCount = results.filter((r) => r.status === 'done').length;
      setSuccessBanner(
        `✓ ${successfulCount} imagem(ns) redimensionada(s) com sucesso para o formato ${getFormatLabel(format)}!`
      );
      setTimeout(() => setSuccessBanner(null), 5000);
    } catch (err) {
      console.error('Erro ao redimensionar lote:', err);
      const msg = err instanceof Error ? err.message : 'Falha no processamento';
      setError(`Erro no redimensionamento: ${msg}`);
    } finally {
      setIsLoading(false);
      setIsBatchProcessing(false);
      setProcessingStatus(null);
    }
  };

  // Track setting changes to inform user that new changes await clicking "OK"
  useEffect(() => {
    if (images.length > 0) {
      setHasUnappliedChanges(true);
    }
  }, [
    width,
    height,
    scaleMultiplier,
    format,
    quality,
    resizeMode,
    padBg,
    smoothing,
    useAiUpscale,
    upscaleStrength,
    completedCrop,
  ]);

  // Download a single image (preserves original initial name and chosen format)
  const handleDownloadSingle = async (item: ImageItem) => {
    let urlToDownload = item.resizedUrl;
    let targetFormat = item.outputFormat || format;

    // If not processed yet or if format settings changed since processing
    if (!urlToDownload || item.outputFormat !== format) {
      const options: ProcessOptions = {
        width,
        height,
        scaleMultiplier,
        format,
        quality,
        resizeMode,
        padBg,
        smoothing,
        useAiUpscale,
        upscaleStrength,
      };

      try {
        const res = await processImageItem(item, options);
        urlToDownload = res.resizedUrl;
        targetFormat = res.outputFormat;
      } catch (err) {
        console.error('Falha ao processar download:', err);
        return;
      }
    }

    if (!urlToDownload) return;
    const outputFilename = getPreservedFilename(item.name, targetFormat);
    const link = document.createElement('a');
    link.href = urlToDownload;
    link.download = outputFilename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // Download All as ZIP (all files preserve their exact original initial name)
  const handleDownloadAllAsZip = async () => {
    if (images.length === 0) return;
    setIsZipping(true);
    setError(null);

    try {
      const zip = new JSZip();
      const options: ProcessOptions = {
        width,
        height,
        scaleMultiplier,
        format,
        quality,
        resizeMode,
        padBg,
        smoothing,
        useAiUpscale,
        upscaleStrength,
      };

      for (let i = 0; i < images.length; i++) {
        const item = images[i];
        let blob = item.resizedBlob;
        let itemFormat = item.outputFormat || format;

        // Ensure processed with the latest user format & dimensions
        if (!blob || item.outputFormat !== format) {
          const res = await processImageItem(item, options);
          blob = res.resizedBlob;
          itemFormat = res.outputFormat;
        }

        if (blob) {
          const preservedName = getPreservedFilename(item.name, itemFormat);
          zip.file(preservedName, blob);
        }
      }

      const zipBlob = await zip.generateAsync({
        type: 'blob',
        compression: 'DEFLATE',
        compressionOptions: { level: 6 },
      });

      const zipUrl = URL.createObjectURL(zipBlob);
      const link = document.createElement('a');
      link.href = zipUrl;
      link.download = 'images.zip';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(zipUrl);
    } catch (err) {
      console.error('ZIP generation failed:', err);
      setError('Falha ao gerar arquivo ZIP.');
    } finally {
      setIsZipping(false);
    }
  };

  // Download all files individually (sequential trigger, each keeping its original filename)
  const handleDownloadAllIndividual = async () => {
    for (let i = 0; i < images.length; i++) {
      await handleDownloadSingle(images[i]);
      if (i < images.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 250));
      }
    }
  };

  const activeOutputFilename = activeItem
    ? getPreservedFilename(activeItem.name, activeItem.outputFormat || format)
    : `image.${format === OutputFormat.PNG ? 'png' : format === OutputFormat.WEBP ? 'webp' : 'jpg'}`;

  return (
    <div className="min-h-screen bg-slate-900 font-sans text-slate-200 p-4 sm:p-6 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-6">
        {/* Top App Header */}
        <header className="flex flex-wrap items-center justify-between gap-4 pb-5 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-cyan-500/10 border border-cyan-500/30 flex items-center justify-center text-cyan-400 shadow-xs">
              <BrandIcon className="w-6 h-6" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-xl sm:text-2xl font-bold text-slate-100 tracking-tight">
                  Image Resizer Pro
                </h1>
                {images.length > 1 && (
                  <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded bg-cyan-500/20 text-cyan-300 border border-cyan-500/40">
                    Batch ({images.length})
                  </span>
                )}
              </div>
              <p className="text-xs text-slate-400">
                Batch image resize, format conversion & distortion-free scaling with preserved initial filenames
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            {images.length > 0 && (
              <button
                type="button"
                onClick={resetState}
                className="inline-flex items-center gap-1.5 bg-slate-800 hover:bg-slate-700 active:bg-slate-900 text-slate-300 text-xs font-medium py-2 px-3 rounded-lg border border-slate-700 transition-colors"
                title="Clear all images and start fresh"
              >
                <RefreshIcon className="w-3.5 h-3.5" />
                <span>New Upload</span>
              </button>
            )}

            {images.length > 1 && (
              <button
                type="button"
                onClick={handleDownloadAllAsZip}
                disabled={isZipping}
                className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-xs font-semibold py-2 px-3.5 rounded-lg shadow-sm transition-colors"
                title="Download all resized images in a ZIP archive with preserved filenames"
              >
                <ArchiveIcon className="w-4 h-4 text-white" />
                <span>{isZipping ? 'Creating ZIP...' : `Download ZIP (${images.length})`}</span>
              </button>
            )}

            {activeItem?.resizedUrl && !isLoading && (
              <a
                href={activeItem.resizedUrl}
                download={activeOutputFilename}
                className="inline-flex items-center gap-2 bg-cyan-500 hover:bg-cyan-400 active:bg-cyan-600 text-slate-950 text-xs font-semibold py-2 px-3.5 rounded-lg shadow-sm transition-colors"
                title={`Download ${activeOutputFilename}`}
              >
                <DownloadIcon className="w-4 h-4 text-slate-950" />
                <span className="truncate max-w-[160px]">Download {activeOutputFilename}</span>
              </a>
            )}
          </div>
        </header>

        {/* Success Banner if batch resize completed */}
        {successBanner && (
          <div className="p-3.5 rounded-xl bg-emerald-950/70 border border-emerald-700/80 text-emerald-200 text-xs flex items-center justify-between shadow-lg">
            <div className="flex items-center gap-2">
              <CheckIcon className="w-4 h-4 text-emerald-400 flex-shrink-0" />
              <span>{successBanner}</span>
            </div>
            <button
              type="button"
              onClick={() => setSuccessBanner(null)}
              className="text-emerald-400 hover:text-emerald-200 text-xs ml-4"
            >
              Fechar
            </button>
          </div>
        )}

        {/* Global Batch Queue Strip if images are uploaded */}
        {images.length > 0 && (
          <BatchImageList
            items={images}
            activeId={activeItem?.id || null}
            onSelectImage={handleSelectImage}
            onRemoveImage={handleRemoveImage}
            onAddMoreImages={handleFilesUpload}
            onClearAll={resetState}
            onDownloadZip={handleDownloadAllAsZip}
            onDownloadAllIndividual={handleDownloadAllIndividual}
            format={format}
            isProcessingBatch={isBatchProcessing}
            isZipping={isZipping}
            onApplyResize={handleApplyResize}
            hasUnappliedChanges={hasUnappliedChanges}
            processingStatus={processingStatus || undefined}
          />
        )}

        {/* Main Grid */}
        <main className="grid grid-cols-1 lg:grid-cols-12 gap-8">
          {/* Controls Column */}
          <div className="lg:col-span-4">
            <div className="space-y-6 bg-slate-800/40 p-5 rounded-2xl border border-slate-700/60 backdrop-blur-xs">
              {images.length === 0 ? (
                <FileUploader onFilesUpload={handleFilesUpload} />
              ) : (
                <>
                  <div className="flex items-center justify-between pb-3 border-b border-slate-700/50">
                    <div className="flex items-center gap-2.5 overflow-hidden">
                      <div className="w-8 h-8 rounded-lg bg-slate-700 flex items-center justify-center text-xs font-mono text-cyan-400 flex-shrink-0">
                        IMG
                      </div>
                      <div className="truncate">
                        <p className="text-xs font-medium text-slate-200 truncate" title={activeItem?.name}>
                          {activeItem?.name || 'Selected Image'}
                        </p>
                        <p className="text-[11px] text-slate-400">
                          {currentSourceDims.width} × {currentSourceDims.height} px
                          {completedCrop && completedCrop.width > 0 && ' (Cropped)'}
                        </p>
                      </div>
                    </div>

                    <button
                      type="button"
                      onClick={resetState}
                      className="text-xs text-slate-400 hover:text-rose-400 transition-colors flex-shrink-0"
                    >
                      Clear All
                    </button>
                  </div>

                  {activeItem && (
                    <ResizeControls
                      width={width}
                      setWidth={setWidth}
                      height={height}
                      setHeight={setHeight}
                      format={format}
                      setFormat={setFormat}
                      quality={quality}
                      setQuality={setQuality}
                      aspectRatioPreset={aspectRatioPreset}
                      setAspectRatioPreset={setAspectRatioPreset}
                      originalDimensions={activeItem.originalDimensions}
                      currentSourceDimensions={currentSourceDims}
                      showCropGrid={showCropGrid}
                      setShowCropGrid={setShowCropGrid}
                      lockAspectRatio={lockAspectRatio}
                      setLockAspectRatio={setLockAspectRatio}
                      smoothing={smoothing}
                      setSmoothing={setSmoothing}
                      resizeMode={resizeMode}
                      setResizeMode={setResizeMode}
                      padBg={padBg}
                      setPadBg={setPadBg}
                      useAiUpscale={useAiUpscale}
                      setUseAiUpscale={setUseAiUpscale}
                      upscaleStrength={upscaleStrength}
                      setUpscaleStrength={setUpscaleStrength}
                      onResetDimensions={handleResetDimensions}
                      totalImagesCount={images.length}
                      scaleMultiplier={scaleMultiplier}
                      setScaleMultiplier={setScaleMultiplier}
                      onApplyResize={handleApplyResize}
                      isProcessing={isBatchProcessing || isLoading}
                      hasUnappliedChanges={hasUnappliedChanges}
                    />
                  )}
                </>
              )}
            </div>
          </div>

          {/* Display & Preview Column */}
          <div className="lg:col-span-8">
            <ImageDisplay
              imgRef={imgRef}
              originalImage={activeItem?.originalUrl || null}
              originalFilename={activeItem?.name}
              originalDimensions={activeItem?.originalDimensions || null}
              originalSize={activeItem?.originalSize}
              resizedImage={activeItem?.resizedUrl || null}
              resizedDimensions={activeItem?.resizedDimensions || { width, height }}
              resizedSize={activeItem?.resizedSize || null}
              format={format}
              outputFormat={activeItem?.outputFormat}
              status={activeItem?.status}
              isLoading={isLoading}
              error={error}
              crop={crop}
              onCropChange={setCrop}
              onCropComplete={setCompletedCrop}
              onResetCrop={handleResetCrop}
              aspectRatioPreset={aspectRatioPreset}
              showCropGrid={showCropGrid}
              onApplyResize={handleApplyResize}
            />
          </div>
        </main>

        <footer className="text-center mt-12 py-6 border-t border-slate-800/80 text-slate-500 text-xs">
          <p>
            Image Resizer Pro &bull; Batch Processing &bull; Preserved Initial Filenames &bull; Distortion-Free Resizing &bull; AI Upscaling
          </p>
        </footer>
      </div>
    </div>
  );
};

export default App;
