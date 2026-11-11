"use client";

import React from "react";

interface ProgressBarProps {
  progress: number;
  fileName?: string;
  statusText?: string;
}

export const ProgressBar: React.FC<ProgressBarProps> = ({
  progress,
  fileName,
  statusText,
}) => {
  return (
    <div className="w-full max-w-md mx-auto my-3 bg-slate-900/90 border border-slate-700/60 p-4 rounded-xl shadow-lg">
      <div className="flex justify-between items-center mb-1.5 text-xs">
        <span className="font-medium text-slate-200 truncate max-w-[240px]">
          {fileName ? `Transfert : ${fileName}` : statusText || "Téléversement en cours..."}
        </span>
        <span className="font-mono font-semibold text-cyan-400">{progress}%</span>
      </div>

      {/* Progress Bar Container */}
      <div className="w-full h-2.5 bg-slate-800 rounded-full overflow-hidden p-0.5 border border-slate-700/50">
        <div
          className="h-full bg-gradient-to-r from-cyan-500 via-sky-400 to-indigo-500 rounded-full transition-all duration-150 ease-out shadow-sm"
          style={{ width: `${Math.min(100, Math.max(0, progress))}%` }}
        />
      </div>

      {statusText && (
        <p className="mt-1.5 text-[11px] text-slate-400 text-left">{statusText}</p>
      )}
    </div>
  );
};

