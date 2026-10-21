import { NextResponse } from 'next/server';
import { db } from '@/lib/firebase';
import { doc, getDoc } from 'firebase/firestore';

let cachedStats: any = null;
let lastCacheTime = 0;
const CACHE_TTL_MS = 60000;

function getLocalStats() {
  try {
    const fs = require('fs');
    const path = require('path');
    const colabPath = path.join(process.cwd(), 'colaboradores.json');
    if (fs.existsSync(colabPath)) {
      const data = JSON.parse(fs.readFileSync(colabPath, 'utf8'));
      const porPlanta: Record<string, number> = {};
      let total = 0;
      for (const u of Object.values(data) as any[]) {
        total++;
        const p = u.planta || 'Outros';
        porPlanta[p] = (porPlanta[p] || 0) + 1;
      }
      return { total, porPlanta };
    }
  } catch (e) {}
  return { total: 51499, porPlanta: { 'Guaíba': 15000, 'Chile': 36499 } };
}

export async function GET() {
  const now = Date.now();
  if (cachedStats && (now - lastCacheTime < CACHE_TTL_MS)) {
    return NextResponse.json({ success: true, data: cachedStats });
  }

  try {
    // Tenta Firestore com timeout de 1.5s para não travar o app
    const fetchWithTimeout = (promise: Promise<any>, ms: number) =>
      Promise.race([
        promise,
        new Promise((_, reject) => setTimeout(() => reject(new Error("Timeout")), ms))
      ]);

    const statsRef = doc(db, 'sistema', 'estatisticas');
    const snapshot: any = await fetchWithTimeout(getDoc(statsRef), 1500);
    
    if (snapshot && snapshot.exists()) {
      cachedStats = snapshot.data();
      lastCacheTime = now;
      return NextResponse.json({ success: true, data: cachedStats });
    }
  } catch (error: any) {
    // Silently fallback to fast local stats
  }

  const localStats = getLocalStats();
  cachedStats = localStats;
  lastCacheTime = now;
  return NextResponse.json({ success: true, data: localStats });
}

