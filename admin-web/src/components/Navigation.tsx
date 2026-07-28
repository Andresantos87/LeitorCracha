"use client";

import { usePathname } from "next/navigation";
import { Sidebar } from "./Sidebar";
import { MobileNav } from "./MobileNav";
import { LanguageToggle } from "./LanguageToggle";

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
      <header className="h-16 border-b border-slate-800 flex items-center justify-between px-4 bg-slate-900/80 backdrop-blur-md sticky top-0 z-50 md:hidden">
        <div className="flex items-center gap-2">
          <img src="/logo-cmpc.png" alt="CMPC" className="h-8 w-8 object-contain bg-white rounded-full p-0.5" />
          <span className="text-base font-bold text-white tracking-tight">CMPC <span className="text-blue-400 font-semibold text-xs">TREINAMENTOS</span></span>
        </div>
        <div className="flex items-center gap-2">
          <LanguageToggle />
          <MobileNav role={role} />
        </div>
      </header>
    </>
  );
}
