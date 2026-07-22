const fs = require('fs');
const csv = require('csv-parser');

const CSV_PATH = 'C:\\\\Users\\\\ansantos\\\\OneDrive - CMPC\\\\Área de Trabalho\\\\APK\\\\cmpc_all_pt_digital_sat_contratista.csv';
const API_URL = 'http://localhost:3000/api/colaboradores/batch';

const uniqueUsers = new Map();

console.log('Iniciando leitura do NOVO CSV (SAT)...');

fs.createReadStream(CSV_PATH)
  .pipe(csv())
  .on('data', (row) => {
    const rut = row.trabrut_guion;
    const nome = `${row.trabnombres || ''} ${row.trabapellidos || ''}`.trim();
    const planta = row.planta || 'Outros';
    
    if (rut && !uniqueUsers.has(rut)) {
      uniqueUsers.set(rut, {
        identificador: rut,
        nome: nome,
        planta: planta
      });
    }
  })
  .on('end', async () => {
    const allUsers = Array.from(uniqueUsers.values());
    console.log(`Leitura concluída. Encontrados ${allUsers.length} usuários únicos.`);
    console.log('Iniciando envio em lote (batches de 500)...');
    
    const BATCH_SIZE = 500;
    for (let i = 0; i < allUsers.length; i += BATCH_SIZE) {
      const batch = allUsers.slice(i, i + BATCH_SIZE);
      
      try {
        const res = await fetch(API_URL, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ colaboradores: batch })
        });
        const json = await res.json();
        if (json.success) {
          console.log(`Batch ${Math.floor(i/BATCH_SIZE)+1} enviado: ${batch.length} registros.`);
        } else {
          console.error(`Erro no batch ${Math.floor(i/BATCH_SIZE)+1}:`, json.error);
        }
      } catch (e) {
        console.error(`Falha ao conectar no batch ${Math.floor(i/BATCH_SIZE)+1}:`, e.message);
      }
    }
    
    console.log('Finalizado!');
  });
