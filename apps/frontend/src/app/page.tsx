"use client";

import React, { useState, useEffect } from "react";
import { 
  ShieldCheck, 
  Database, 
  Layers, 
  HardDrive, 
  CheckCircle2, 
  AlertCircle 
} from "lucide-react";

import { DocumentItem, StatusMessage } from "../types/document";
import { UploadDropzone } from "../components/UploadDropzone";
import { DocumentList } from "../components/DocumentList";
import { DeleteModal } from "../components/DeleteModal";
import { ShareModal } from "../components/ShareModal";
import { PreviewModal } from "../components/PreviewModal";

export default function Home() {
  const [documents, setDocuments] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  
  // États de l'upload avec progression réelle XHR
  const [isUploading, setIsUploading] = useState<boolean>(false);
  const [uploadProgress, setUploadProgress] = useState<number>(0);
  const [uploadStatusText, setUploadStatusText] = useState<string>("");

  // États de la modale de suppression
  const [selectedDocForDelete, setSelectedDocForDelete] = useState<DocumentItem | null>(null);
  const [isDeleteModalOpen, setIsDeleteModalOpen] = useState<boolean>(false);
  const [isDeleting, setIsDeleting] = useState<boolean>(false);

  // États de la modale de partage temporaire
  const [selectedDocForShare, setSelectedDocForShare] = useState<DocumentItem | null>(null);
  const [isShareModalOpen, setIsShareModalOpen] = useState<boolean>(false);

  // États de la modale d'aperçu
  const [selectedDocForPreview, setSelectedDocForPreview] = useState<DocumentItem | null>(null);
  const [isPreviewModalOpen, setIsPreviewModalOpen] = useState<boolean>(false);

  // Notifications
  const [statusMessage, setStatusMessage] = useState<StatusMessage | null>(null);

  const fetchDocuments = async () => {
    try {
      setLoading(true);
      const res = await fetch("/api/v1/documents");
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

  // Téléversement d'un fichier individuel avec XHR et progression réelle
  const uploadSingleFile = (file: File, fileIndex: number, totalFiles: number): Promise<void> => {
    return new Promise(async (resolve, reject) => {
      try {
        setUploadStatusText(
          totalFiles > 1 
            ? `[${fileIndex}/${totalFiles}] Demande d'URL S3 pour "${file.name}"...`
            : `Génération de l'URL pré-signée S3...`
        );

        // 1. Demande d'URL pré-signée au backend Go
        const presignRes = await fetch("/api/v1/documents/upload-url", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            filename: file.name,
            content_type: file.type || "application/octet-stream",
          }),
        });

        if (!presignRes.ok) {
          const errData = await presignRes.json().catch(() => ({}));
          throw new Error(errData.error || `Erreur d'autorisation pour "${file.name}"`);
        }

        const { upload_url } = await presignRes.json();

        // 2. Upload direct vers S3 via XMLHttpRequest avec écoute de progression
        const xhr = new XMLHttpRequest();

        xhr.upload.onprogress = (event) => {
          if (event.lengthComputable) {
            const percentComplete = Math.round((event.loaded / event.total) * 100);
            setUploadProgress(percentComplete);
            setUploadStatusText(
              totalFiles > 1 
                ? `[${fileIndex}/${totalFiles}] Téléversement de "${file.name}" (${percentComplete}%)...`
                : `Téléversement direct vers LocalStack S3 (${percentComplete}%)...`
            );
          }
        };

        xhr.onload = () => {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve();
          } else {
            reject(new Error(`Échec du transfert S3 pour "${file.name}" (HTTP ${xhr.status})`));
          }
        };

        xhr.onerror = () => {
          reject(new Error(`Erreur réseau lors du téléversement de "${file.name}" vers S3`));
        };

        xhr.open("PUT", upload_url, true);
        xhr.setRequestHeader("Content-Type", file.type || "application/octet-stream");
        xhr.send(file);
      } catch (err) {
        reject(err);
      }
    });
  };

  // Téléversement multi-fichiers par lot
  const handleFilesUpload = async (files: File[]) => {
    try {
      setIsUploading(true);
      setUploadProgress(0);
      setStatusMessage(null);

      let successCount = 0;
      for (let i = 0; i < files.length; i++) {
        await uploadSingleFile(files[i], i + 1, files.length);
        successCount++;
      }

      setStatusMessage({
        type: "success",
        text: files.length === 1 
          ? `Fichier "${files[0].name}" stocké avec succès dans le coffre-fort S3 !`
          : `${successCount} fichiers stockés avec succès dans le coffre-fort S3 !`,
      });
      fetchDocuments();
    } catch (err: any) {
      console.error("Upload failed:", err);
      setStatusMessage({
        type: "error",
        text: err.message || "Erreur lors du téléversement",
      });
    } finally {
      setIsUploading(false);
      setUploadProgress(0);
      setUploadStatusText("");
    }
  };

  // Suppression après confirmation
  const handleDeleteConfirm = async () => {
    if (!selectedDocForDelete) return;

    try {
      setIsDeleting(true);
      const res = await fetch(`/api/v1/documents/${encodeURIComponent(selectedDocForDelete.key)}`, {
        method: "DELETE",
      });

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || `Erreur HTTP ${res.status}`);
      }

      setStatusMessage({
        type: "success",
        text: `Document "${selectedDocForDelete.filename}" supprimé du coffre-fort S3 avec succès.`,
      });
      closeDeleteModal();
      fetchDocuments();
    } catch (err: any) {
      console.error("Delete failed:", err);
      setStatusMessage({
        type: "error",
        text: err.message || "Impossible de supprimer le document",
      });
    } finally {
      setIsDeleting(false);
    }
  };

  const openDeleteModal = (doc: DocumentItem) => {
    setSelectedDocForDelete(doc);
    setIsDeleteModalOpen(true);
  };

  const closeDeleteModal = () => {
    if (!isDeleting) {
      setIsDeleteModalOpen(false);
      setSelectedDocForDelete(null);
    }
  };

  const openShareModal = (doc: DocumentItem) => {
    setSelectedDocForShare(doc);
    setIsShareModalOpen(true);
  };

  const closeShareModal = () => {
    setIsShareModalOpen(false);
    setSelectedDocForShare(null);
  };

  const openPreviewModal = (doc: DocumentItem) => {
    setSelectedDocForPreview(doc);
    setIsPreviewModalOpen(true);
  };

  const closePreviewModal = () => {
    setIsPreviewModalOpen(false);
    setSelectedDocForPreview(null);
  };

  return (
    <main className="min-h-screen bg-slate-950 p-6 md:p-12 text-slate-100">
      <div className="max-w-6xl mx-auto mb-8">
        {/* Header */}
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
              GitOps Synced & Ready
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

        {/* Notification Alert Banner */}
        {statusMessage && (
          <div className={`p-4 rounded-xl mb-6 flex items-center gap-3 border animate-in fade-in duration-200 ${
            statusMessage.type === "success" 
              ? "bg-emerald-950/40 border-emerald-500/30 text-emerald-200" 
              : "bg-rose-950/40 border-rose-500/30 text-rose-200"
          }`}>
            {statusMessage.type === "success" ? (
              <CheckCircle2 className="w-5 h-5 flex-shrink-0 text-emerald-400" />
            ) : (
              <AlertCircle className="w-5 h-5 flex-shrink-0 text-rose-400" />
            )}
            <span className="text-sm font-medium">{statusMessage.text}</span>
          </div>
        )}

        {/* Drag & Drop Zone Multi-fichiers avec Progression Réelle */}
        <UploadDropzone
          onFilesUpload={handleFilesUpload}
          isUploading={isUploading}
          uploadProgress={uploadProgress}
          uploadStatusText={uploadStatusText}
          onErrorNotification={(msg) => setStatusMessage({ type: "error", text: msg })}
        />

        {/* Tableau des Documents avec Recherche, Aperçu, Partage, Téléchargement et Suppression */}
        <DocumentList
          documents={documents}
          loading={loading}
          onRefresh={fetchDocuments}
          onDeleteClick={openDeleteModal}
          onShareClick={openShareModal}
          onPreviewClick={openPreviewModal}
        />
      </div>

      {/* Modale d'Aperçu Sécurisé */}
      <PreviewModal
        isOpen={isPreviewModalOpen}
        document={selectedDocForPreview}
        onClose={closePreviewModal}
      />

      {/* Modale de Partage Temporaire Sécurisé */}
      <ShareModal
        isOpen={isShareModalOpen}
        document={selectedDocForShare}
        onClose={closeShareModal}
      />

      {/* Modale de Confirmation de Suppression */}
      <DeleteModal
        isOpen={isDeleteModalOpen}
        document={selectedDocForDelete}
        onConfirm={handleDeleteConfirm}
        onCancel={closeDeleteModal}
        isDeleting={isDeleting}
      />
    </main>
  );
}
