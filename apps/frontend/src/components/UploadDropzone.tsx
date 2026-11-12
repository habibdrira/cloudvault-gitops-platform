"use client";

import React, { useState, useRef } from "react";
import { UploadCloud, ShieldAlert, CheckCircle } from "lucide-react";
import { ProgressBar } from "./ProgressBar";

interface UploadDropzoneProps {
  onFilesUpload: (files: File[]) => void;
  isUploading: boolean;
  uploadProgress: number;
  uploadStatusText?: string;
  onErrorNotification?: (msg: string) => void;
}

const ALLOWED_EXTENSIONS = ["pdf", "png", "jpg", "jpeg", "txt", "json"];
const FORBIDDEN_EXTENSIONS = ["exe", "bat", "sh", "bin", "cmd", "msi", "ps1", "vbs"];

export const UploadDropzone: React.FC<UploadDropzoneProps> = ({
  onFilesUpload,
  isUploading,
  uploadProgress,
  uploadStatusText,
  onErrorNotification,
}) => {
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFiles = (fileList: FileList | null) => {
    if (!fileList || fileList.length === 0 || isUploading) return;

    const validFiles: File[] = [];
    for (let i = 0; i < fileList.length; i++) {
      const file = fileList[i];
      const ext = file.name.split(".").pop()?.toLowerCase() || "";

      if (FORBIDDEN_EXTENSIONS.includes(ext)) {
        if (onErrorNotification) {
          onErrorNotification(
            `Fichier "${file.name}" rejeté : les exécutables ou scripts (.${ext}) sont interdits par la politique de sécurité Zero-Trust.`
          );
        }
        return;
      }
      validFiles.push(file);
    }

    if (validFiles.length > 0) {
      onFilesUpload(validFiles);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    processFiles(e.dataTransfer.files);
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
      fileInputRef.current.value = "";
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
        multiple
        onChange={(e) => processFiles(e.target.files)}
        disabled={isUploading}
        className="hidden"
      />

      <div className="p-4 rounded-full bg-cyan-500/10 text-cyan-400 mb-3 border border-cyan-500/20 shadow-inner">
        <UploadCloud className="w-8 h-8" />
      </div>

      <h3 className="text-base md:text-lg font-semibold text-slate-200 mb-1">
        Déposez un ou plusieurs documents ou cliquez pour parcourir
      </h3>
      <p className="text-xs md:text-sm text-slate-400 max-w-sm mb-3">
        Téléversement chiffré direct vers S3 LocalStack via URL pré-signée cryptographique.
      </p>

      {/* Badges des formats autorisés */}
      <div className="flex flex-wrap items-center justify-center gap-1.5 mb-2">
        {ALLOWED_EXTENSIONS.map((ext) => (
          <span
            key={ext}
            className="px-2 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-800 text-slate-400 border border-slate-700/80 uppercase"
          >
            .{ext}
          </span>
        ))}
        <span className="text-[11px] text-slate-500 ml-1.5">• Max 50 Mo</span>
      </div>

      {/* Jauge de progression dynamique réelle */}
      {isUploading && (
        <div className="w-full mt-3" onClick={(e) => e.stopPropagation()}>
          <ProgressBar progress={uploadProgress} statusText={uploadStatusText} />
        </div>
      )}
    </div>
  );
};
