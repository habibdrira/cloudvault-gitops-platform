"use client";

import React, { useState, useRef } from "react";
import { UploadCloud } from "lucide-react";
import { ProgressBar } from "./ProgressBar";

interface UploadDropzoneProps {
  onFileUpload: (file: File) => void;
  isUploading: boolean;
  uploadProgress: number;
  uploadStatusText?: string;
}

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  onFileUpload,
  isUploading,
  uploadProgress,
  uploadStatusText,
}) => {
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (!isUploading && e.dataTransfer.files && e.dataTransfer.files[0]) {
      onFileUpload(e.dataTransfer.files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    if (!isUploading) setIsDragOver(true);
  };

  const handleDragLeave = () => {
    setIsDragOver(false);
  };

  const handleClick = () => {
    if (!isUploading && fileInputRef.current) {
      fileInputRef.current.click();
    }
  };

  return (
    <div
      onDragOver={handleDragOver}
      onDragLeave={handleDragLeave}
      onDrop={handleDrop}
      onClick={handleClick}
      className={`p-8 md:p-12 rounded-2xl border-2 border-dashed transition-all duration-200 flex flex-col items-center justify-center text-center cursor-pointer ${
        isUploading
          ? "border-cyan-500/50 bg-slate-900/60 cursor-not-allowed"
          : isDragOver
          ? "border-cyan-400 bg-cyan-950/20 scale-[1.005]"
          : "border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70"
      }`}
    >
      <input
        type="file"
        ref={fileInputRef}
        onChange={(e) => {
          if (e.target.files?.[0]) {
            onFileUpload(e.target.files[0]);
          }
        }}
        disabled={isUploading}
        className="hidden"
      />

      <div className="p-4 rounded-full bg-cyan-500/10 text-cyan-400 mb-3 border border-cyan-500/20 shadow-inner">
        <UploadCloud className="w-8 h-8" />
      </div>

      <h3 className="text-base md:text-lg font-semibold text-slate-200 mb-1">
        Déposez un document ou cliquez pour parcourir
      </h3>
      <p className="text-xs md:text-sm text-slate-400 max-w-sm mb-2">
        Téléversement chiffré direct vers S3 LocalStack via URL pré-signée cryptographique.
      </p>

      {/* Jauge de progression dynamique réelle */}
      {isUploading && (
        <div className="w-full mt-3" onClick={(e) => e.stopPropagation()}>
          <ProgressBar progress={uploadProgress} statusText={uploadStatusText} />
        </div>
      )}
    </div>
  );
};

