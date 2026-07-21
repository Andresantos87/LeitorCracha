import type { Metadata } from "next";
import "./globals.css";
import { Inter } from 'next/font/google';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: "Gestão de Treinamentos - CMPC",
  description: "Painel Administrativo para controle de treinamentos e presenças.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body
        className={`${inter.className} antialiased flex bg-[#0f172a] text-slate-100 min-h-screen`}
      >
        {/* Sidebar */}
        <aside className="w-64 bg-slate-900 border-r border-slate-800 flex flex-col hidden md:flex">
          <div className="p-6 border-b border-slate-800">
            <h1 className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400">
              CMPC Treinamentos
            </h1>
          </div>
          <nav className="flex-1 p-4 space-y-2">
            <a href="/" className="flex items-center space-x-3 px-3 py-2 rounded-lg bg-blue-600 text-white font-medium">
              <span>Dashboard</span>
            </a>
            <a href="/treinamentos" className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors">
              <span>Treinamentos</span>
            </a>
            <a href="/colaboradores" className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors">
              <span>Colaboradores (Excel)</span>
            </a>
            <a href="/relatorios" className="flex items-center space-x-3 px-3 py-2 rounded-lg hover:bg-slate-800 text-slate-300 transition-colors">
              <span>Relatórios</span>
            </a>
          </nav>
          <div className="p-4 border-t border-slate-800 text-sm text-slate-500">
            <span>Admin Logado</span>
          </div>
        </aside>

        {/* Main Content */}
        <main className="flex-1 flex flex-col min-h-screen overflow-hidden">
          <header className="h-16 border-b border-slate-800 flex items-center px-6 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-10 md:hidden">
            <h1 className="text-lg font-bold">CMPC Treinamentos</h1>
          </header>
          <div className="flex-1 overflow-auto p-6 md:p-8">
            {children}
          </div>
        </main>
      </body>
    </html>
  );
}
