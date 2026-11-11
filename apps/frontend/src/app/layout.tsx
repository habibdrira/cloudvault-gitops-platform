import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "CloudVault — Secure Cloud Document Safe",
  description: "GitOps-driven enterprise storage platform powered by K3s, LocalStack & Argo CD",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="fr" className="dark">
      <body className="min-h-screen bg-slate-950 text-slate-100 antialiased">
        {children}
      </body>
    </html>
  );
}

