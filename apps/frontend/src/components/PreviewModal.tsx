"use client";

import React from "react";
import { Eye, Download, X, FileText, Image as ImageIcon, ExternalLink } from "lucide-react";
import { DocumentItem } from "../types/document";

interface PreviewModalProps {
  isOpen: boolean;
  document: DocumentItem | null;
  onClose: () => void;
}

export const PreviewModal: React.FC<PreviewModalProps> = ({
  isOpen,
  document,
  onClose,
}) => {
  if (!isOpen || !document) return null;

  const url = document.preview_url || document.download_url;
  const ext = document.filename.split(".").pop()?.toLowerCase() || "";
  const isImage = ["png", "jpg", "jpeg", "webp", "gif"].includes(ext);
  const isPdf = ext === "pdf";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div
        className="w-full max-w-4xl bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative flex flex-col max-h-[90vh]"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors z-10"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-4 pr-8">
          <div className="p-2.5 bg-cyan-500/10 border border-cyan-500/20 text-cyan-400 rounded-xl">
            <Eye className="w-6 h-6" />
          </div>
          <div className="min-w-0">
            <h3 className="text-lg font-bold text-slate-100 truncate">
              Aperçu sécurisé : {document.filename}
            </h3>
            <p className="text-xs text-slate-400 mt-0.5 flex items-center gap-2">
              <span>Clé S3 : <code className="text-slate-300">{document.key}</code></span>
              {document.version_id && (
                <span className="text-cyan-400 font-mono">v{document.version_id.slice(0, 8)}</span>
              )}
            </p>
          </div>
        </div>

        {/* Content Preview Container */}
        <div className="flex-1 min-h-[300px] max-h-[60vh] bg-slate-950 rounded-xl border border-slate-800/80 overflow-hidden flex items-center justify-center p-2">
          {isImage ? (
            <img
              src={url}
              alt={document.filename}
              className="max-h-full max-w-full object-contain rounded-lg"
            />
          ) : isPdf ? (
            <iframe
              src={`${url}#toolbar=0`}
              title={document.filename}
              className="w-full h-full min-h-[450px] border-0 rounded-lg bg-slate-900"
            />
          ) : (
            <div className="text-center p-8 text-slate-400 flex flex-col items-center gap-3">
              <FileText className="w-12 h-12 text-slate-600" />
              <p className="text-sm">
                Aperçu non disponible directement dans le navigateur pour ce type de fichier ({ext}).
              </p>
              <a
                href={url}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-2 px-4 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 rounded-lg text-xs font-medium transition-colors"
              >
                Ouvrir dans un nouvel onglet <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="flex items-center justify-between mt-4 pt-3 border-t border-slate-800">
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs text-slate-400 hover:text-slate-200 inline-flex items-center gap-1 transition-colors"
          >
            Ouvrir plein écran <ExternalLink className="w-3 h-3" />
          </a>

          <div className="flex items-center gap-2">
            <a
              href={document.download_url}
              className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl bg-cyan-600 hover:bg-cyan-500 text-white text-xs font-semibold transition-colors shadow-md shadow-cyan-950"
            >
              <Download className="w-3.5 h-3.5" />
              Télécharger le fichier
            </a>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 text-xs font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              Fermer
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

