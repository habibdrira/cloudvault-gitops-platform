"use client";

import React, { useState, useMemo } from "react";
import { FileText, Download, Trash2, RefreshCw, Share2, Eye, Search } from "lucide-react";
import { DocumentItem } from "../types/document";

interface DocumentListProps {
  documents: DocumentItem[];
  loading: boolean;
  onRefresh: () => void;
  onDeleteClick: (doc: DocumentItem) => void;
  onShareClick: (doc: DocumentItem) => void;
  onPreviewClick: (doc: DocumentItem) => void;
}

export const DocumentList: React.FC<DocumentListProps> = ({
  documents,
  loading,
  onRefresh,
  onDeleteClick,
  onShareClick,
  onPreviewClick,
}) => {
  const [searchQuery, setSearchQuery] = useState<string>("");

  const formatBytes = (bytes: number) => {
    if (bytes === 0) return "0 Octet";
    const k = 1024;
    const sizes = ["Octets", "Ko", "Mo", "Go"];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + " " + sizes[i];
  };

  const formatDate = (dateStr: string) => {
    try {
      return new Date(dateStr).toLocaleString("fr-FR", {
        day: "2-digit",
        month: "2-digit",
        year: "numeric",
        hour: "2-digit",
        minute: "2-digit",
      });
    } catch {
      return dateStr;
    }
  };

  const filteredDocuments = useMemo(() => {
    if (!searchQuery.trim()) return documents;
    const query = searchQuery.toLowerCase().trim();
    return documents.filter(
      (doc) =>
        doc.filename.toLowerCase().includes(query) ||
        doc.key.toLowerCase().includes(query)
    );
  }, [documents, searchQuery]);

  return (
    <div className="mt-10">
      {/* Header and Controls */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4">
        <div className="flex items-center gap-2">
          <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
            <FileText className="w-5 h-5 text-cyan-400" />
            Répertoire des documents sécurisés
          </h2>
          <span className="text-xs font-medium px-2 py-0.5 rounded-full bg-slate-800 text-slate-400 border border-slate-700/80">
            {filteredDocuments.length} / {documents.length}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Search bar */}
          <div className="relative flex-1 sm:w-64">
            <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Rechercher un document..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-slate-900 border border-slate-800 rounded-lg pl-8 pr-3 py-1.5 text-xs text-slate-200 placeholder-slate-500 focus:outline-none focus:border-cyan-500/50"
            />
          </div>

          <button
            onClick={onRefresh}
            disabled={loading}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors disabled:opacity-50 flex-shrink-0"
          >
            <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
            Actualiser
          </button>
        </div>
      </div>

      <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden shadow-lg">
        {loading && documents.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-sm flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-cyan-400" />
            Chargement des documents depuis S3...
          </div>
        ) : documents.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-sm">
            Aucun document n'a encore été stocké dans le coffre-fort.
          </div>
        ) : filteredDocuments.length === 0 ? (
          <div className="p-10 text-center text-slate-500 text-sm">
            Aucun document ne correspond à la recherche "{searchQuery}".
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase font-medium border-b border-slate-800">
                <tr>
                  <th className="px-6 py-3.5">Fichier</th>
                  <th className="px-6 py-3.5">Taille</th>
                  <th className="px-6 py-3.5">Date d'enregistrement</th>
                  <th className="px-6 py-3.5 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {filteredDocuments.map((doc) => (
                  <tr
                    key={doc.key}
                    className="hover:bg-slate-800/30 transition-colors group"
                  >
                    <td className="px-6 py-4 font-medium text-slate-200 flex items-center gap-2.5">
                      <FileText className="w-4 h-4 text-cyan-400/70 flex-shrink-0" />
                      <span className="truncate max-w-xs md:max-w-md" title={doc.filename}>
                        {doc.filename}
                      </span>
                      {/* Badge de Version S3 FinOps */}
                      {doc.version_id ? (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-cyan-950/60 text-cyan-400 border border-cyan-500/30" title={`Version S3: ${doc.version_id}`}>
                          v{doc.version_id.length > 8 ? doc.version_id.slice(0, 8) : doc.version_id}
                        </span>
                      ) : (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded text-[10px] font-mono font-medium bg-slate-800 text-slate-400 border border-slate-700">
                          v1
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs">
                      {formatBytes(doc.size)}
                    </td>
                    <td className="px-6 py-4 text-slate-400 text-xs">
                      {formatDate(doc.last_modified)}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <div className="flex items-center justify-end gap-2">
                        {/* Bouton Aperçu Sécurisé */}
                        <button
                          type="button"
                          onClick={() => onPreviewClick(doc)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-sky-500/10 hover:bg-sky-500/20 text-sky-400 text-xs font-medium transition-colors border border-sky-500/20"
                          title="Visualiser le document"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          Aperçu
                        </button>

                        {/* Bouton Partager Temporaire */}
                        <button
                          type="button"
                          onClick={() => onShareClick(doc)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-indigo-500/10 hover:bg-indigo-500/20 text-indigo-400 text-xs font-medium transition-colors border border-indigo-500/20"
                          title="Générer un lien de partage temporaire sécurisé"
                        >
                          <Share2 className="w-3.5 h-3.5" />
                          Partager
                        </button>

                        {/* Bouton Télécharger */}
                        <a
                          href={doc.download_url}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-medium transition-colors border border-cyan-500/20"
                          title="Télécharger le fichier sur votre machine"
                        >
                          <Download className="w-3.5 h-3.5" />
                          Télécharger
                        </a>

                        {/* Bouton Supprimer */}
                        <button
                          type="button"
                          onClick={() => onDeleteClick(doc)}
                          className="inline-flex items-center gap-1.5 px-2.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 text-xs font-medium transition-colors border border-rose-500/20"
                          title="Supprimer ce document"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                          Supprimer
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
};
