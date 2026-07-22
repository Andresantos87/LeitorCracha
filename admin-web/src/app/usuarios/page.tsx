"use client";
import { useState, useEffect } from "react";
import { Plus, Trash2, Shield, User, ShieldAlert } from "lucide-react";

export default function UsuariosPage() {
  const [usuarios, setUsuarios] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [formData, setFormData] = useState({ nome: '', email: '', password: '', role: 'leitor' });

  useEffect(() => {
    carregarUsuarios();
  }, []);

  const carregarUsuarios = async () => {
    const res = await fetch("/api/usuarios");
    const json = await res.json();
    if (json.success) setUsuarios(json.data);
    setLoading(false);
  };

  const handleCreateSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    await fetch("/api/usuarios", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(formData)
    });
    
    setIsSubmitting(false);
    setIsModalOpen(false);
    setFormData({ nome: '', email: '', password: '', role: 'leitor' });
    carregarUsuarios();
  };

  const excluirUsuario = async (id: string, email: string) => {
    if (email === "admin@cmpc.com") {
      alert("Não é possível excluir o Administrador principal.");
      return;
    }
    if (!confirm(`Tem certeza que deseja excluir o acesso de ${email}?`)) return;
    
    await fetch(`/api/usuarios?id=${id}`, { method: "DELETE" });
    carregarUsuarios();
  };

  const getRoleBadge = (role: string) => {
    if (role === 'admin') return <span className="inline-flex items-center gap-1 py-1 px-2.5 rounded-full text-xs font-medium bg-red-900/30 text-red-400 border border-red-800"><ShieldAlert className="h-3 w-3"/> Admin</span>;
    if (role === 'gestor') return <span className="inline-flex items-center gap-1 py-1 px-2.5 rounded-full text-xs font-medium bg-blue-900/30 text-blue-400 border border-blue-800"><Shield className="h-3 w-3"/> Gestor</span>;
    return <span className="inline-flex items-center gap-1 py-1 px-2.5 rounded-full text-xs font-medium bg-slate-800 text-slate-300 border border-slate-700"><User className="h-3 w-3"/> Leitor</span>;
  };

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Controle de Acessos</h2>
          <p className="text-slate-400 mt-2">Gerencie quem pode acessar o sistema e seus níveis de visão.</p>
        </div>
        <button 
          onClick={() => setIsModalOpen(true)}
          className="flex items-center space-x-2 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors shadow-lg shadow-blue-900/20"
        >
          <Plus className="h-4 w-4" />
          <span>Novo Usuário</span>
        </button>
      </div>

      <div className="bg-slate-800/50 rounded-xl border border-slate-700 overflow-hidden">
        <table className="w-full text-left text-sm">
          <thead className="bg-slate-900/50 border-b border-slate-700 text-slate-300">
            <tr>
              <th className="px-6 py-4 font-medium">Nome</th>
              <th className="px-6 py-4 font-medium">E-mail</th>
              <th className="px-6 py-4 font-medium">Nível (Role)</th>
              <th className="px-6 py-4 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-700/50 text-slate-300">
            {loading ? (
              <tr><td colSpan={4} className="p-8 text-center text-slate-400">Carregando...</td></tr>
            ) : usuarios.map(u => (
              <tr key={u.id} className="hover:bg-slate-800/50 transition-colors">
                <td className="px-6 py-4 font-medium text-white">{u.nome}</td>
                <td className="px-6 py-4 text-slate-400">{u.email}</td>
                <td className="px-6 py-4">{getRoleBadge(u.role)}</td>
                <td className="px-6 py-4 text-right">
                  <button 
                    onClick={() => excluirUsuario(u.id, u.email)}
                    className="p-2 text-slate-400 hover:text-red-400 hover:bg-red-900/20 rounded-lg transition-colors inline-block"
                    title="Remover Acesso"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {isModalOpen && (
        <div className="fixed inset-0 bg-slate-950/80 backdrop-blur-sm z-50 flex items-center justify-center p-4">
          <div className="bg-slate-900 border border-slate-700 rounded-2xl p-6 w-full max-w-md shadow-2xl animate-in fade-in zoom-in-95 duration-200">
            <h3 className="text-xl font-bold text-white mb-6">Criar Novo Usuário</h3>
            
            <form onSubmit={handleCreateSubmit} className="space-y-4">
              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Nome completo</label>
                <input 
                  type="text" 
                  required
                  value={formData.nome}
                  onChange={e => setFormData({...formData, nome: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                  placeholder="Ex: João Silva"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">E-mail corporativo</label>
                <input 
                  type="email" 
                  required
                  value={formData.email}
                  onChange={e => setFormData({...formData, email: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                  placeholder="joao@cmpc.com"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Senha temporária</label>
                <input 
                  type="text" 
                  required
                  value={formData.password}
                  onChange={e => setFormData({...formData, password: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                  placeholder="Defina uma senha"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-slate-300">Nível de Acesso</label>
                <select 
                  value={formData.role}
                  onChange={e => setFormData({...formData, role: e.target.value})}
                  className="w-full px-4 py-2 bg-slate-800 border border-slate-700 rounded-lg focus:outline-none focus:border-blue-500 text-slate-200"
                >
                  <option value="leitor">Leitor (Apenas ver planilhas)</option>
                  <option value="gestor">Gestor (Gerenciar treinamentos)</option>
                  <option value="admin">Administrador (Acesso total)</option>
                </select>
              </div>

              <div className="pt-4 flex items-center justify-end space-x-3">
                <button 
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 text-slate-300 hover:text-white hover:bg-slate-800 rounded-lg font-medium transition-colors"
                >
                  Cancelar
                </button>
                <button 
                  type="submit"
                  disabled={isSubmitting}
                  className="px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg font-medium transition-colors disabled:opacity-50"
                >
                  {isSubmitting ? 'Salvando...' : 'Criar Usuário'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
