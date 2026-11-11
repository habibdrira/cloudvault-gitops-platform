"use client";

import React, { useState, useEffect, useRef } from "react";
import { 
  ShieldCheck, 
  UploadCloud, 
  FileText, 
  Download, 
  RefreshCw, 
  CheckCircle2, 
  AlertCircle,
  Database,
  Layers,
  HardDrive
} from "lucide-react";

interface DocumentItem {
  key: string;
  filename: string;
  size: number;
  last_modified: string;
  download_url: string;
}

export default function Home() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [uploading, setUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<string>("");
  const [statusMessage, setStatusMessage] = useState<{ type: "success" | "error"; text: string } | null>(null);
  const [isDragOver, setIsDragOver] = useState<boolean>(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Détermine la base API (relative /api si routé via Ingress ou directe)
  const apiBase = typeof window !== "undefined" && window.location.hostname !== "localhost" 
    ? "" 
    : "";

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBase}/api/v1/documents`);
      if (!res.ok) throw new Error(`HTTP error ${res.status}`);
      const data = await res.json();
      setDocuments(data.documents || []);
    } catch (err: any) {
      console.error("Fetch documents failed:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDocuments();
  }, []);

  const handleFileUpload = async (file: File) => {
    try {
      setUploading(true);
      setStatusMessage(null);
      setUploadProgress(`Génération de l'URL pré-signée pour ${file.name}...`);

      // 1. Demande d'URL pré-signée au backend Go
      const presignRes = await fetch(`${apiBase}/api/v1/documents/upload-url`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          filename: file.name,
          content_type: file.type || "application/octet-stream",
        }),
      });

      if (!presignRes.ok) {
        throw new Error("Impossible d'obtenir l'URL d'upload pré-signée");
      }

      const { upload_url } = await presignRes.json();

      // 2. Upload direct vers S3 (LocalStack) via HTTP PUT
      setUploadProgress(`Téléversement direct vers LocalStack S3...`);
      const uploadRes = await fetch(upload_url, {
        method: "PUT",
        headers: {
          "Content-Type": file.type || "application/octet-stream",
        },
        body: file,
      });

      if (!uploadRes.ok) {
        throw new Error(`Échec du transfert vers le bucket (${uploadRes.status})`);
      }

      setStatusMessage({
        type: "success",
        text: `Fichier "${file.name}" stocké avec succès dans le coffre-fort S3 !`,
      });
      fetchDocuments();
    } catch (err: any) {
      console.error(err);
      setStatusMessage({
        type: "error",
        text: err.message || "Erreur lors du téléversement",
      });
    } finally {
      setUploading(false);
      setUploadProgress("");
      if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileUpload(e.dataTransfer.files[0]);
    }
  };

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

  return (
    <main className="min-h-screen bg-slate-950 p-6 md:p-12 text-slate-100">
      {/* Header */}
      <div className="max-w-6xl mx-auto mb-8">
        <div className="flex flex-col md:flex-row items-start md:items-center justify-between gap-4 pb-6 border-b border-slate-800">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-cyan-500/10 border border-cyan-500/30 rounded-xl text-cyan-400">
              <ShieldCheck className="w-8 h-8" />
            </div>
            <div>
              <h1 className="text-2xl md:text-3xl font-bold tracking-tight bg-gradient-to-r from-cyan-400 via-sky-300 to-indigo-400 bg-clip-text text-transparent">
                CloudVault GitOps Platform
              </h1>
              <p className="text-sm text-slate-400 mt-0.5">
                Coffre-fort documentaire résilient orchestré par Kubernetes K3s & LocalStack S3
              </p>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-medium bg-emerald-500/10 border border-emerald-500/30 text-emerald-400">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              GitOps Synced
            </span>
          </div>
        </div>

        {/* Stats Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 my-6">
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3.5">
            <Database className="w-6 h-6 text-cyan-400" />
            <div>
              <p className="text-xs text-slate-400 font-medium">Stockage Objet</p>
              <p className="text-sm font-semibold text-slate-200">LocalStack (cloudvault-documents)</p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3.5">
            <Layers className="w-6 h-6 text-indigo-400" />
            <div>
              <p className="text-xs text-slate-400 font-medium">Orchestration</p>
              <p className="text-sm font-semibold text-slate-200">K3s Cluster (Master + Worker)</p>
            </div>
          </div>
          <div className="p-4 rounded-xl bg-slate-900/60 border border-slate-800 flex items-center gap-3.5">
            <HardDrive className="w-6 h-6 text-sky-400" />
            <div>
              <p className="text-xs text-slate-400 font-medium">Fichiers Sécurisés</p>
              <p className="text-sm font-semibold text-slate-200">{documents.length} document(s)</p>
            </div>
          </div>
        </div>

        {/* Notifications */}
        {statusMessage && (
          <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 border ${
            statusMessage.type === "success" 
              ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-200" 
              : "bg-rose-950/40 border-rose-500/30 text-rose-200"
          }`}>
            {statusMessage.type === "success" ? <CheckCircle2 className="w-5 h-5 flex-shrink-0" /> : <AlertCircle className="w-5 h-5 flex-shrink-0" />}
            <span className="text-sm">{statusMessage.text}</span>
          </div>
        )}

        {/* Drag & Drop Zone */}
        <div 
          onDragOver={(e) => { e.preventDefault(); setIsDragOver(true); }}
          onDragLeave={() => setIsDragOver(false)}
          onDrop={onDrop}
          onClick={() => fileInputRef.current?.click()}
          className={`p-8 md:p-12 rounded-2xl border-2 border-dashed cursor-pointer transition-all duration-200 flex flex-col items-center justify-center text-center ${
            isDragOver 
              ? "border-cyan-400 bg-cyan-950/20" 
              : "border-slate-800 bg-slate-900/40 hover:border-slate-700 hover:bg-slate-900/70"
          }`}
        >
          <input 
            type="file" 
            ref={fileInputRef} 
            onChange={(e) => e.target.files?.[0] && handleFileUpload(e.target.files[0])} 
            className="hidden" 
          />
          <div className="p-4 rounded-full bg-cyan-500/10 text-cyan-400 mb-4">
            <UploadCloud className="w-8 h-8" />
          </div>
          <h3 className="text-base md:text-lg font-semibold text-slate-200 mb-1">
            Déposez un document ou cliquez pour parcourir
          </h3>
          <p className="text-xs md:text-sm text-slate-400 max-w-sm">
            Téléversement chiffré direct via URL pré-signée S3 générée par le microservice Go.
          </p>
          {uploading && (
            <div className="mt-4 flex items-center gap-2 text-cyan-400 text-sm font-medium animate-pulse">
              <RefreshCw className="w-4 h-4 animate-spin" />
              <span>{uploadProgress}</span>
            </div>
          )}
        </div>

        {/* Document Explorer Table */}
        <div className="mt-10">
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-lg font-semibold text-slate-200 flex items-center gap-2">
              <FileText className="w-5 h-5 text-cyan-400" />
              Répertoire des documents
            </h2>
            <button
              onClick={fetchDocuments}
              disabled={loading}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-medium rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 transition-colors"
            >
              <RefreshCw className={`w-3.5 h-3.5 ${loading ? "animate-spin" : ""}`} />
              Actualiser
            </button>
          </div>

          <div className="rounded-xl border border-slate-800 bg-slate-900/50 overflow-hidden">
            {loading && documents.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                Chargement des documents...
              </div>
            ) : documents.length === 0 ? (
              <div className="p-8 text-center text-slate-500 text-sm">
                Aucun document n'a encore été stocké dans le coffre-fort.
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-800/50 text-slate-400 text-xs uppercase font-medium border-b border-slate-800">
                    <tr>
                      <th className="px-6 py-3.5">Fichier</th>
                      <th className="px-6 py-3.5">Taille</th>
                      <th className="px-6 py-3.5">Date d'enregistrement</th>
                      <th className="px-6 py-3.5 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60">
                    {documents.map((doc) => (
                      <tr key={doc.key} className="hover:bg-slate-800/30 transition-colors">
                        <td className="px-6 py-4 font-medium text-slate-200 flex items-center gap-2.5">
                          <FileText className="w-4 h-4 text-slate-400 flex-shrink-0" />
                          <span className="truncate max-w-xs md:max-w-md">{doc.filename}</span>
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-xs">
                          {formatBytes(doc.size)}
                        </td>
                        <td className="px-6 py-4 text-slate-400 text-xs">
                          {formatDate(doc.last_modified)}
                        </td>
                        <td className="px-6 py-4 text-right">
                          <a
                            href={doc.download_url}
                            target="_blank"
                            rel="noopener noreferrer"
                            download
                            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-cyan-500/10 hover:bg-cyan-500/20 text-cyan-400 text-xs font-medium transition-colors"
                          >
                            <Download className="w-3.5 h-3.5" />
                            Télécharger
                          </a>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </main>
  );
}

