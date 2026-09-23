import React from 'react';
import { ImageItem, OutputFormat, getPreservedFilename, getFormatLabel } from '../types';
import { DownloadIcon, TrashIcon, ArchiveIcon, PlusIcon, CheckIcon } from './icons';
import FileUploader from './FileUploader';

interface BatchImageListProps {
  items: ImageItem[];
  activeId: string | null;
  onSelectImage: (id: string) => void;
  onRemoveImage: (id: string) => void;
  onAddMoreImages: (files: File[]) => void;
  onClearAll: () => void;
  onDownloadZip: () => void;
  onDownloadAllIndividual: () => void;
  onApplyResize: () => void;
  format: OutputFormat;
  isProcessingBatch: boolean;
  isZipping: boolean;
  hasUnappliedChanges?: boolean;
  processingStatus?: string | null;
}

const formatBytes = (bytes?: number | null, decimals = 1) => {
  if (!bytes || bytes === 0) return '0 B';
  const k = 1024;
  const dm = decimals < 0 ? 0 : decimals;
  const sizes = ['B', 'KB', 'MB', 'GB'];
  const i = Math.floor(Math.log(bytes) / Math.log(k));
  return parseFloat((bytes / Math.pow(k, i)).toFixed(dm)) + ' ' + sizes[i];
};

const BatchImageList: React.FC<BatchImageListProps> = ({
  items,
  activeId,
  onSelectImage,
  onRemoveImage,
  onAddMoreImages,
  onClearAll,
  onDownloadZip,
  onDownloadAllIndividual,
  onApplyResize,
  format,
  isProcessingBatch,
  isZipping,
  hasUnappliedChanges = false,
  processingStatus = null,
}) => {
  if (items.length === 0) return null;

  const processedCount = items.filter((item) => item.status === 'done' && item.resizedUrl).length;
  const allProcessed = processedCount === items.length && items.length > 0;

  return (
    <div className="bg-slate-800/40 rounded-2xl border border-slate-700/60 p-4 space-y-3.5 backdrop-blur-xs">
      {/* Header with Batch Info & Actions */}
      <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-700/50">
        <div className="flex items-center gap-2.5 flex-wrap">
          <div className="flex items-center gap-1.5">
            <span className="text-sm font-semibold text-slate-100">Batch Queue</span>
            <span className="text-xs font-mono font-semibold px-2 py-0.5 rounded-full bg-cyan-500/20 text-cyan-300 border border-cyan-500/30">
              {items.length} {items.length === 1 ? 'image' : 'images'}
            </span>
          </div>

          {processedCount > 0 && (
            <span className="text-[11px] text-emerald-400 font-medium flex items-center gap-1 bg-emerald-950/40 px-2 py-0.5 rounded border border-emerald-800/40">
              <CheckIcon className="w-3.5 h-3.5" />
              {processedCount}/{items.length} ready
            </span>
          )}

          <span className="text-[11px] text-cyan-300 bg-cyan-950/40 px-2 py-0.5 rounded border border-cyan-800/50 font-mono">
            Output: {getFormatLabel(format)}
          </span>
        </div>

        {/* Global Batch Action Buttons */}
        <div className="flex items-center gap-2 flex-wrap">
          {/* Primary Action Button: OK — Redimensionar */}
          <button
            type="button"
            onClick={onApplyResize}
            disabled={isProcessingBatch}
            className={`inline-flex items-center gap-1.5 text-xs font-bold py-1.5 px-3.5 rounded-lg shadow-sm transition-all transform active:scale-95 ${
              isProcessingBatch
                ? 'bg-slate-700 text-slate-400 cursor-not-allowed border border-slate-600'
                : hasUnappliedChanges || processedCount === 0
                ? 'bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-400 hover:to-teal-400 text-white shadow-emerald-950/50 ring-2 ring-emerald-400/40 animate-pulse'
                : 'bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white shadow-cyan-950/40'
            }`}
            title="Clique para redimensionar todas as imagens com as configurações selecionadas"
          >
            {isProcessingBatch ? (
              <>
                <div className="w-3.5 h-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                <span>Processando...</span>
              </>
            ) : (
              <>
                <CheckIcon className="w-4 h-4" />
                <span>
                  {hasUnappliedChanges || processedCount === 0
                    ? `OK — Redimensionar (${items.length})`
                    : `OK — Atualizar (${items.length})`}
                </span>
              </>
            )}
          </button>

          {items.length > 1 && (
            <button
              type="button"
              onClick={onDownloadZip}
              disabled={isZipping || processedCount === 0}
              className={`inline-flex items-center gap-1.5 text-xs font-semibold py-1.5 px-3 rounded-lg shadow-xs transition-all ${
                isZipping || processedCount === 0
                  ? 'bg-slate-700/60 text-slate-500 cursor-not-allowed border border-slate-700'
                  : 'bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white'
              }`}
              title="Download all images in a ZIP keeping their original names"
            >
              <ArchiveIcon className="w-4 h-4" />
              <span>{isZipping ? 'Creating ZIP...' : 'Download All (ZIP)'}</span>
            </button>
          )}

          {processedCount > 0 && (
            <button
              type="button"
              onClick={onDownloadAllIndividual}
              className="inline-flex items-center gap-1 text-xs text-slate-300 hover:text-white bg-slate-700/70 hover:bg-slate-700 py-1.5 px-2.5 rounded-lg border border-slate-600 transition-colors"
              title="Download each image individually with its original filename"
            >
              <DownloadIcon className="w-3.5 h-3.5 text-cyan-400" />
              <span className="hidden sm:inline">Individual Files</span>
            </button>
          )}

          <button
            type="button"
            onClick={onClearAll}
            className="inline-flex items-center gap-1 text-xs text-rose-400 hover:text-rose-300 bg-rose-950/30 hover:bg-rose-950/50 py-1.5 px-2.5 rounded-lg border border-rose-900/50 transition-colors"
            title="Clear all images from the queue"
          >
            <TrashIcon className="w-3.5 h-3.5" />
            <span>Clear Queue</span>
          </button>
        </div>
      </div>

      {/* Preservation & Status reminder badge */}
      <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-slate-400 bg-slate-900/50 px-3 py-2 rounded-lg border border-slate-800">
        <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
          <CheckIcon className="w-3.5 h-3.5 flex-shrink-0" />
          <span>Initial filenames preserved: No prefixes or name alterations are added.</span>
        </span>

        {processingStatus ? (
          <span className="text-cyan-300 font-mono animate-pulse">{processingStatus}</span>
        ) : hasUnappliedChanges ? (
          <span className="text-amber-300 font-medium">
            Settings changed &bull; Click "OK" button to apply resize
          </span>
        ) : (
          <span className="text-[10px] text-slate-500 hidden md:inline">
            Click any card below to preview or crop
          </span>
        )}
      </div>

      {/* Horizontal Scrollable Thumbnails Strip */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-2.5 max-h-[300px] overflow-y-auto pr-1">
        {items.map((item, index) => {
          const isActive = item.id === activeId;
          const currentOutputFormat = item.outputFormat || format;
          const outputName = getPreservedFilename(item.name, currentOutputFormat);

          return (
            <div
              key={item.id}
              onClick={() => onSelectImage(item.id)}
              className={`group relative p-2.5 rounded-xl border text-left cursor-pointer transition-all duration-150 flex items-center gap-3 ${
                isActive
                  ? 'bg-cyan-950/30 border-cyan-500 shadow-sm ring-1 ring-cyan-500/40'
                  : 'bg-slate-800/80 hover:bg-slate-800 border-slate-700/80 hover:border-slate-600'
              }`}
            >
              {/* Thumbnail image */}
              <div className="relative w-14 h-14 rounded-lg bg-slate-900 overflow-hidden flex-shrink-0 border border-slate-700 flex items-center justify-center">
                <img
                  src={item.resizedUrl || item.originalUrl}
                  alt={item.name}
                  className="w-full h-full object-cover"
                />
                {isActive && (
                  <div className="absolute top-1 left-1 w-2 h-2 rounded-full bg-cyan-400 ring-2 ring-slate-900"></div>
                )}
                <span className="absolute bottom-0 right-0 text-[8px] font-mono bg-slate-900/90 text-slate-300 px-1 rounded-tl">
                  #{index + 1}
                </span>
              </div>

              {/* Information */}
              <div className="flex-1 min-w-0">
                <p
                  className={`text-xs font-semibold truncate ${
                    isActive ? 'text-cyan-300' : 'text-slate-200'
                  }`}
                  title={item.name}
                >
                  {item.name}
                </p>

                <div className="flex items-center gap-1.5 text-[10px] text-slate-400 mt-0.5 flex-wrap">
                  {item.status === 'done' && item.resizedUrl ? (
                    <>
                      <span className="text-slate-200 font-medium">
                        {item.resizedDimensions.width}×{item.resizedDimensions.height}
                      </span>
                      <span>&bull;</span>
                      <span>{formatBytes(item.resizedSize)}</span>
                    </>
                  ) : (
                    <>
                      <span className="text-slate-400">
                        {item.originalDimensions.width}×{item.originalDimensions.height} (orig)
                      </span>
                      <span>&bull;</span>
                      <span>{formatBytes(item.originalSize)}</span>
                    </>
                  )}
                </div>

                <div className="mt-1 flex items-center gap-1.5 flex-wrap">
                  {item.status === 'processing' ? (
                    <span className="text-[9px] font-mono text-cyan-400 animate-pulse">
                      Processing...
                    </span>
                  ) : item.status === 'done' && item.resizedUrl ? (
                    <span className="text-[9px] text-emerald-400 font-medium flex items-center gap-0.5">
                      <CheckIcon className="w-2.5 h-2.5" />
                      Ready ({getFormatLabel(item.outputFormat || format, item.name)})
                    </span>
                  ) : (
                    <span className="text-[9px] text-amber-400/90 bg-amber-950/40 px-1.5 py-0.2 rounded border border-amber-800/40 font-medium">
                      Waiting for OK
                    </span>
                  )}
                </div>
              </div>

              {/* Individual Actions */}
              <div className="flex items-center gap-1 opacity-80 group-hover:opacity-100">
                {item.resizedUrl && item.status === 'done' && (
                  <a
                    href={item.resizedUrl}
                    download={outputName}
                    onClick={(e) => e.stopPropagation()}
                    className="p-1.5 text-slate-400 hover:text-cyan-300 hover:bg-slate-700 rounded-md transition-colors"
                    title={`Download ${outputName}`}
                  >
                    <DownloadIcon className="w-3.5 h-3.5" />
                  </a>
                )}

                <button
                  type="button"
                  onClick={(e) => {
                    e.stopPropagation();
                    onRemoveImage(item.id);
                  }}
                  className="p-1.5 text-slate-400 hover:text-rose-400 hover:bg-slate-700 rounded-md transition-colors"
                  title="Remove from batch"
                >
                  <TrashIcon className="w-3.5 h-3.5" />
                </button>
              </div>
            </div>
          );
        })}
      </div>

      {/* Add more images inline dropzone */}
      <div className="pt-2">
        <FileUploader onFilesUpload={onAddMoreImages} compact={true} />
      </div>
    </div>
  );
};

export default BatchImageList;
