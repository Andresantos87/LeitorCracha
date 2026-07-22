import type { Metadata } from "next";
import "./globals.css";
import { Inter } from 'next/font/google';
import { Navigation } from '@/components/Navigation';
import { getSession } from '@/lib/auth';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "Gestão de Treinamentos - CMPC",
  description: "Painel Administrativo para controle de treinamentos e presenças.",
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const session = await getSession();
  const role = session?.role || "leitor";

  return (
    <html lang="pt-BR">
      <body
        className={`${inter.className} antialiased flex bg-[#0f172a] text-slate-100 min-h-screen`}
      >
        <Navigation role={role} userName={session?.nome} />

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
          <div className="flex-1 overflow-auto p-6 md:p-8">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
