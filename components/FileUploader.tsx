
import React, { useState, useCallback } from 'react';
import { UploadIcon, ImagesIcon } from './icons';

interface FileUploaderProps {
  onFilesUpload: (files: File[]) => void;
  compact?: boolean;
}

const FileUploader: React.FC<FileUploaderProps> = ({ onFilesUpload, compact = false }) => {
  const [isDragging, setIsDragging] = useState(false);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files.length > 0) {
      const filesArray = (Array.from(e.target.files) as File[]).filter((file: File) =>
        file.type.startsWith('image/')
      );
      if (filesArray.length > 0) {
        onFilesUpload(filesArray);
      }
      e.target.value = ''; // Reset input to allow selecting same files again if needed
    }
  };

  const handleDrop = useCallback(
    (e: React.DragEvent<HTMLLabelElement>) => {
      e.preventDefault();
      e.stopPropagation();
      setIsDragging(false);
      if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
        const filesArray = (Array.from(e.dataTransfer.files) as File[]).filter((file: File) =>
          file.type.startsWith('image/')
        );
        if (filesArray.length > 0) {
          onFilesUpload(filesArray);
        }
      }
    },
    [onFilesUpload]
  );

  const handleDragOver = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
  };

  const handleDragEnter = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent<HTMLLabelElement>) => {
    e.preventDefault();
    e.stopPropagation();
    setIsDragging(false);
  };

  if (compact) {
    return (
      <div>
        <label
          htmlFor="file-upload-compact"
          onDrop={handleDrop}
          onDragOver={handleDragOver}
          onDragEnter={handleDragEnter}
          onDragLeave={handleDragLeave}
          className={`flex items-center justify-center gap-2 w-full p-2.5 border-2 border-dashed rounded-xl cursor-pointer transition-all duration-200 ${
            isDragging
              ? 'border-cyan-400 bg-cyan-950/30 text-cyan-300'
              : 'border-slate-700 hover:border-slate-500 bg-slate-800/60 hover:bg-slate-800 text-slate-300'
          }`}
        >
          <UploadIcon className="w-4 h-4 text-cyan-400 flex-shrink-0" />
          <span className="text-xs font-medium">Add more images (Multiple)</span>
          <input
            id="file-upload-compact"
            type="file"
            className="hidden"
            accept="image/*"
            multiple
            onChange={handleFileChange}
          />
        </label>
      </div>
    );
  }

  return (
    <div>
      <div className="flex items-center justify-between mb-3">
        <h2 className="text-base font-semibold text-slate-200">Upload Images</h2>
        <span className="text-[11px] font-medium text-cyan-400 bg-cyan-950/60 border border-cyan-800/80 px-2 py-0.5 rounded-full">
          Batch Support
        </span>
      </div>

      <label
        htmlFor="file-upload-main"
        onDrop={handleDrop}
        onDragOver={handleDragOver}
        onDragEnter={handleDragEnter}
        onDragLeave={handleDragLeave}
        className={`flex flex-col items-center justify-center w-full min-h-[190px] p-6 border-2 border-slate-600 border-dashed rounded-2xl cursor-pointer bg-slate-800/70 hover:bg-slate-800 transition-all duration-200 group ${
          isDragging ? 'border-cyan-400 bg-cyan-950/20 shadow-lg shadow-cyan-950/30' : ''
        }`}
      >
        <div className="flex flex-col items-center justify-center text-center text-slate-400">
          <div className="w-12 h-12 rounded-xl bg-slate-700/60 border border-slate-600 flex items-center justify-center mb-3 text-cyan-400 group-hover:scale-105 group-hover:border-cyan-500/50 transition-transform">
            <ImagesIcon className="w-6 h-6" />
          </div>

          <p className="mb-1.5 text-sm text-slate-200">
            <span className="font-semibold text-cyan-400 group-hover:underline">
              Choose images
            </span>{' '}
            or drag and drop here
          </p>

          <p className="text-xs text-slate-400 mb-2">
            Upload multiple files at once (JPG, PNG, WEBP, etc.)
          </p>

          <div className="inline-flex items-center gap-1.5 text-[11px] text-slate-500 bg-slate-900/60 px-2.5 py-1 rounded-md border border-slate-800">
            <span>Preserves exact original filenames without alterations</span>
          </div>
        </div>

        <input
          id="file-upload-main"
          type="file"
          className="hidden"
          accept="image/*"
          multiple
          onChange={handleFileChange}
        />
      </label>
    </div>
  );
};

export default FileUploader;
