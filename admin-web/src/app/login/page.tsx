"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Lock, Mail, Loader2, LogIn } from "lucide-react";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await fetch("/api/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "login", email, password }),
      });

      const data = await res.json();
      
      if (res.ok && data.success) {
        router.push("/");
        router.refresh(); // recarrega layout com a nova sessão
      } else {
        setError(data.error || "Erro ao fazer login");
      }
    } catch (err) {
      setError("Erro de rede. Tente novamente.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-[#0f172a] p-4">
      
      <div className="w-full max-w-md animate-in slide-in-from-bottom-8 duration-700">
        <div className="bg-slate-900 border border-slate-800 p-8 rounded-2xl shadow-2xl">
          
          <div className="text-center mb-8">
            <h1 className="text-3xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-blue-400 to-indigo-400 mb-2">
              CMPC Treinamentos
            </h1>
            <p className="text-slate-400 text-sm">Entre com suas credenciais para acessar o painel</p>
          </div>

          {error && (
            <div className="bg-red-900/20 border border-red-900/50 text-red-400 p-3 rounded-lg mb-6 text-sm text-center animate-in fade-in">
              {error}
            </div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">E-mail corporativo</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Mail className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-200 transition-colors"
                  placeholder="seu.email@cmpc.com"
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <label className="text-sm font-medium text-slate-300">Senha</label>
              <div className="relative">
                <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                  <Lock className="h-5 w-5 text-slate-500" />
                </div>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  className="w-full pl-10 pr-4 py-2.5 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500 text-slate-200 transition-colors"
                  placeholder="••••••••"
                  required
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 text-white font-medium py-2.5 rounded-lg transition-colors shadow-lg shadow-blue-900/20 disabled:opacity-50 disabled:cursor-not-allowed mt-2"
            >
              {loading ? <Loader2 className="h-5 w-5 animate-spin" /> : <LogIn className="h-5 w-5" />}
              <span>{loading ? "Entrando..." : "Acessar Plataforma"}</span>
            </button>
          </form>
          
        </div>
        
        <p className="text-center text-slate-600 text-xs mt-6">
          Desenvolvido com padrão de qualidade e segurança © 2026
        </p>
      </div>

    </div>
  );
}
