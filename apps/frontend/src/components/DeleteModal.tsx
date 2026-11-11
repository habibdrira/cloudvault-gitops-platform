"use client";

import React from "react";
import { AlertTriangle, Trash2, X, RefreshCw } from "lucide-react";
import { DocumentItem } from "../types/document";

interface DeleteModalProps {
  isOpen: boolean;
  document: DocumentItem | null;
  onConfirm: () => void;
  onCancel: () => void;
  isDeleting: boolean;
}

export const DeleteModal: React.FC<DeleteModalProps> = ({
  isOpen,
  document,
  onConfirm,
  onCancel,
  isDeleting,
}) => {
  if (!isOpen || !document) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/80 backdrop-blur-sm animate-in fade-in duration-200">
      <div 
        className="w-full max-w-md bg-slate-900 border border-slate-800 rounded-2xl p-6 shadow-2xl relative text-left"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Close Button */}
        <button
          onClick={onCancel}
          disabled={isDeleting}
          className="absolute top-4 right-4 text-slate-400 hover:text-slate-200 transition-colors"
        >
          <X className="w-5 h-5" />
        </button>

        {/* Modal Header */}
        <div className="flex items-center gap-3.5 mb-4">
          <div className="p-3 bg-rose-500/10 border border-rose-500/20 text-rose-400 rounded-xl">
            <AlertTriangle className="w-6 h-6" />
          </div>
          <div>
            <h3 className="text-lg font-bold text-slate-100">
              Confirmer la suppression
            </h3>
            <p className="text-xs text-slate-400 mt-0.5">
              Action irréversible sur le stockage objet S3
            </p>
          </div>
        </div>

        {/* Document Info Card */}
        <div className="p-3.5 bg-slate-950/60 border border-slate-800/80 rounded-xl mb-5 text-xs text-slate-300">
          <p className="font-semibold text-slate-200 truncate mb-1">
            {document.filename}
          </p>
          <p className="text-[11px] text-slate-500 font-mono truncate">
            Clé S3 : {document.key}
          </p>
        </div>

        <p className="text-sm text-slate-300 mb-6">
          Êtes-vous sûr de vouloir supprimer définitivement ce document du coffre-fort CloudVault ? Cette ressource ne pourra plus être récupérée.
        </p>

        {/* Action Buttons */}
        <div className="flex items-center justify-end gap-3">
          <button
            type="button"
            onClick={onCancel}
            disabled={isDeleting}
            className="px-4 py-2 text-xs font-medium rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors disabled:opacity-50"
          >
            Annuler
          </button>
          <button
            type="button"
            onClick={onConfirm}
            disabled={isDeleting}
            className="inline-flex items-center gap-1.5 px-4 py-2 text-xs font-medium rounded-xl bg-rose-600 hover:bg-rose-500 text-white transition-colors disabled:opacity-50 shadow-md shadow-rose-900/30"
          >
            {isDeleting ? (
              <>
                <RefreshCw className="w-3.5 h-3.5 animate-spin" />
                Suppression...
              </>
            ) : (
              <>
                <Trash2 className="w-3.5 h-3.5" />
                Supprimer définitivement
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

