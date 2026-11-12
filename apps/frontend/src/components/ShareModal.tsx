"use client";

import React, { useState } from "react";
import { Share2, Clock, Copy, Check, X, RefreshCw, ExternalLink } from "lucide-react";
import { DocumentItem } from "../types/document";

interface ShareModalProps {
  isOpen: boolean;
  document: DocumentItem | null;
  onClose: () => void;
}

export const ShareModal: React.FC<ShareModalProps> = ({
  isOpen,
  document,
  onClose,
}) => {
  const [duration, setDuration] = useState<number>(15);
  const [loading, setLoading] = useState<boolean>(false);
  const [shareUrl, setShareUrl] = useState<string>("");
  const [copied, setCopied] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  if (!isOpen || !document) return null;

  const handleGenerateShare = async () => {
    try {
      setLoading(true);
      setError(null);
      setCopied(false);

      const res = await fetch(`/api/v1/documents/${encodeURIComponent(document.key)}/share`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ expires_in_minutes: duration }),
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Erreur HTTP ${res.status}`);
      }

      const data = await res.json();
      setShareUrl(data.share_url);
    } catch (err: any) {
      console.error("Generate share URL failed:", err);
      setError(err.message || "Échec de génération du lien de partage");
    } finally {
      setLoading(false);
    }
  };

  const handleCopy = () => {
    if (!shareUrl) return;
    navigator.clipboard.writeText(shareUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2500);
  };

  const handleModalClose = () => {
    setShareUrl("");
    setCopied(false);
    setError(null);
    onClose();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-lg bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={handleModalClose}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-4">
          <div className="p-3 bg-indigo-500/10 border border-indigo-500/20 text-indigo-400 rounded-xl">
            <Share2 className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">
              Partage temporaire sécurisé
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Génère une URL S3 pré-signée éphémère avec expiration automatique
            </p>
          </div>
        </div>

        {/* Document Info Card */}
        <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl mb-5 text-xs text-slate-300">
          <p className="font-semibold text-slate-200 truncate mb-1">
            {document.filename}
          </p>
          <div className="flex items-center gap-3 text-[11px] text-slate-500 font-mono">
            <span className="truncate">Clé : {document.key}</span>
            {document.version_id && (
              <span className="text-cyan-400">Ver : {document.version_id.slice(0, 8)}</span>
            )}
          </div>
        </div>

        {/* Expiration Selection */}
        <div className="mb-5">
          <label className="block text-xs font-medium text-slate-300 mb-2 flex items-center gap-1.5">
            <Clock className="w-3.5 h-3.5 text-indigo-400" />
            Durée de validité du lien :
          </label>
          <div className="grid grid-cols-3 gap-2.5">
            {[
              { label: "15 minutes", value: 15 },
              { label: "1 heure", value: 60 },
              { label: "24 heures", value: 1440 },
            ].map((option) => (
              <button
                key={option.value}
                type="button"
                onClick={() => {
                  setDuration(option.value);
                  setShareUrl("");
                }}
                className={`py-2 px-3 text-xs font-medium rounded-xl border transition-all ${
                  duration === option.value
                    ? "bg-indigo-600/20 border-indigo-500 text-indigo-300 shadow-sm shadow-indigo-900/30"
                    : "bg-slate-950/40 border-slate-800 text-slate-400 hover:border-slate-700 hover:text-slate-300"
                }`}
              >
                {option.label}
              </button>
            ))}
          </div>
        </div>

        {/* Error message */}
        {error && (
          <div className="p-3 mb-4 rounded-xl bg-rose-950/40 border border-rose-500/30 text-rose-300 text-xs">
            {error}
          </div>
        )}

        {/* Generated Share URL display */}
        {shareUrl ? (
          <div className="mb-6 p-4 bg-slate-950 border border-indigo-500/30 rounded-xl animate-in fade-in duration-200">
            <p className="text-xs font-medium text-indigo-300 mb-2 flex items-center justify-between">
              <span>Lien sécurisé généré ({duration < 60 ? `${duration} min` : `${duration / 60} h`}) :</span>
              <a
                href={shareUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="text-indigo-400 hover:text-indigo-300 inline-flex items-center gap-1"
              >
                Ouvrir <ExternalLink className="w-3 h-3" />
              </a>
            </p>
            <div className="flex items-center gap-2">
              <input
                type="text"
                readOnly
                value={shareUrl}
                className="w-full bg-slate-900 border border-slate-800 text-slate-300 text-xs rounded-lg px-3 py-2 font-mono truncate focus:outline-none"
              />
              <button
                type="button"
                onClick={handleCopy}
                className="inline-flex items-center gap-1.5 px-3 py-2 text-xs font-semibold rounded-lg bg-indigo-600 hover:bg-indigo-500 text-white transition-colors flex-shrink-0"
              >
                {copied ? (
                  <>
                    <Check className="w-3.5 h-3.5 text-emerald-300" />
                    Copié !
                  </>
                ) : (
                  <>
                    <Copy className="w-3.5 h-3.5" />
                    Copier
                  </>
                )}
              </button>
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={handleGenerateShare}
            disabled={loading}
            className="w-full mb-6 inline-flex items-center justify-center gap-2 py-2.5 px-4 text-xs font-semibold rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white transition-colors disabled:opacity-50 shadow-md shadow-indigo-900/30"
          >
            {loading ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Génération de l'URL pré-signée...
              </>
            ) : (
              <>
                <Share2 className="w-3.5 h-3.5" />
                Générer le lien temporaire
              </>
            )}
          </button>
        )}

        {/* Footer */}
        <div className="flex items-center justify-end">
          <button
            type="button"
            onClick={handleModalClose}
            className="px-4 py-2 text-xs font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
          >
            Fermer
          </button>
        </div>
      </div>
    </div>
  );
};

