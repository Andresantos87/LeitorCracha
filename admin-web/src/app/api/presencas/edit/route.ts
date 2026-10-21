import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc, setDoc, deleteDoc, updateDoc } from 'firebase/firestore';

import fs from 'fs';
import path from 'path';

export async function PUT(req: Request) {
  try {
    const { treinamentoId, presencaId, novoNome, novaEmpresa, novoCargo, novaMatricula, novoTreinamentoId } = await req.json();

    if (!treinamentoId || !presencaId) {
      return NextResponse.json({ success: false, error: 'treinamentoId e presencaId são obrigatórios' }, { status: 400 });
    }

    const updates: Record<string, any> = {};
    if (novoNome !== undefined) updates.nome = novoNome;
    if (novaEmpresa !== undefined) {
      updates.empresa = novaEmpresa;
      updates.planta = novaEmpresa;
    }
    if (novoCargo !== undefined) updates.cargo = novoCargo;
    if (novaMatricula !== undefined) updates.matricula = novaMatricula;

    const oldRef = doc(db, 'treinamentos', treinamentoId, 'presencas', presencaId);
    
    // Se não for mover, apenas atualiza
    if (!novoTreinamentoId || novoTreinamentoId === treinamentoId) {
      if (Object.keys(updates).length > 0) {
        await updateDoc(oldRef, updates);
      }
    } else {
      // Se for mover de turma
      const snap = await getDoc(oldRef);
      if (!snap.exists()) {
        return NextResponse.json({ success: false, error: 'Presença original não encontrada' }, { status: 404 });
      }

      const data = { ...snap.data(), ...updates };
      const newRef = doc(db, 'treinamentos', novoTreinamentoId, 'presencas', presencaId);
      
      // Adiciona na nova
      await setDoc(newRef, data);
      // Remove da antiga
      await deleteDoc(oldRef);
    }

    // Sincroniza caches locais em background
    try {
      const targetTreinamentoId = novoTreinamentoId || treinamentoId;
      const syncFile = (fileName: string) => {
        const filePath = path.join(process.cwd(), fileName);
        if (fs.existsSync(filePath)) {
          const list = JSON.parse(fs.readFileSync(filePath, 'utf8'));
          if (Array.isArray(list)) {
            let changed = false;
            for (let i = 0; i < list.length; i++) {
              const item = list[i];
              if ((item.id === presencaId || item.identificador_lido === presencaId) && 
                  (!item.treinamentoId || item.treinamentoId === treinamentoId)) {
                list[i] = {
                  ...item,
                  ...updates,
                  treinamentoId: targetTreinamentoId
                };
                changed = true;
              }
            }
            if (changed) {
              fs.writeFileSync(filePath, JSON.stringify(list, null, 2), 'utf8');
            }
          }
        }
      };

      syncFile('dashboard_presencas_cache.json');
      syncFile('all_firestore_presencas.json');
    } catch (syncErr) {
      console.warn("Aviso ao sincronizar caches locais na edição:", syncErr);
    }

    return NextResponse.json({ success: true, message: 'Presença atualizada com sucesso' });
  } catch (error: any) {
    console.error("ERRO EDIT PRESENCA:", error);
    return NextResponse.json({ success: false, error: 'Erro ao editar presença.' }, { status: 500 });
  }
}
