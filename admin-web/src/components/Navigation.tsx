"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";

export function Navigation({ role, userName }: { role?: string; userName?: string }) {
  const pathname = usePathname();

  // Esconder a navegação inteira (Sidebar e Header mobile) nestas rotas
  if (pathname.startsWith("/login") || pathname.startsWith("/registrar")) {
    return null;
  }

  return (
    <>
      <Sidebar role={role} userName={userName} />
      
      {/* Main Content Mobile Header */}
      <header className="h-16 border-b border-slate-800 flex items-center justify-between px-6 bg-slate-900/50 backdrop-blur-sm sticky top-0 z-50 md:hidden">
        <h1 className="text-lg font-bold">CMPC Treinamentos</h1>
        <MobileNav role={role} />
      </header>
    </>
  );
}
