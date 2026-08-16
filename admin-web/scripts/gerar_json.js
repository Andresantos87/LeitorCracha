const fs = require('fs');
const csv = require('csv-parser');
const path = require('path');

const BASE_DIR = 'C:\\\\Users\\\\ansantos\\\\OneDrive - CMPC\\\\Área de Trabalho\\\\APK';
const JSON_PATH = path.join(__dirname, '..', 'colaboradores.json');

// Lê dinamicamente todos os arquivos CSV da pasta
const FILES = fs.readdirSync(BASE_DIR).filter(file => file.toLowerCase().endsWith('.csv'));

console.log(`Encontrados ${FILES.length} arquivos CSV.`);
console.log(`Criando banco de dados JSON em: ${JSON_PATH}`);

const uniqueUsers = {};
const inactiveMetadata = {};
const bannedIds = new Set();

function stripZeros(id) {
  if (typeof id === 'string' && /^\d+$/.test(id)) {
    return id.replace(/^0+/, '') || '0';
  }
  return id;
}

function normalizePlanta(p) {
  if (!p) return 'Outros';
  const up = String(p).toUpperCase();
  if (up.includes('PACIFICO') || up.includes('PACÍFICO')) return 'Pacífico';
  if (up.includes('SANTA FE') || up.includes('SANTA FÉ')) return 'Santa Fe';
  if (up.includes('LAJA')) return 'Laja';
  if (up.includes('GUAIBA') || up.includes('GUAÍBA')) return 'Guaíba';
  if (up.includes('LOS ANGELES') || up.includes('LOS ÁNGELES')) return 'Los Angeles';
  return p;
}

function parseRainbowRow(row) {
  const identificadorOriginal = row.cpf || row.rg || row.email || row.cod_cracha;
  if (!identificadorOriginal) return null;
  const identificador = stripZeros(identificadorOriginal);
  
  const isInactive = !row.status || row.status.toUpperCase() !== 'ATIVO';

  return {
    identificador,
    nome: row.funcionario || 'Sem Nome',
    planta: normalizePlanta('Guaíba'),
    empresa: row.empresa || row.local_prestacao || 'Outros',
    cargo: (row.cargo || row.cbo || 'Não Informado').replace(/^\d+\s*-\s*/, ''),
    matricula: row.cod_funcionario || '',
    cod_cracha: row.cod_cracha || '',
    pais: 'BRASIL',
    gestor: row.gestor || '',
    turno: '',
    email: row.email || '',
    area: row.secao || row.desc_contrato || '',
    isTerceiro: true,
    isInactive
  };
}

function parseMifibraRow(row) {
  const email = row.user_email || row.user_login || row.user_id;
  if (!email) return null;

  // FILTRO: Se não for ativo (1), banimos todos os IDs associados a ele
  if (row.user_status_id !== '1') {
    if (row.user_email) bannedIds.add(row.user_email.toLowerCase());
    if (row.user_login) {
      bannedIds.add(row.user_login.toLowerCase());
      if (row.user_login.toUpperCase().startsWith('CPF:')) {
        bannedIds.add(row.user_login.substring(4).trim());
      }
      const match = row.user_login.match(/\d{11}/);
      if (match) bannedIds.add(match[0]);
    }
    return null;
  }

  if (!email.includes('@') && !email.toUpperCase().startsWith('CPF:')) return null;

  const nome = `${row.user_name_first || ''} ${row.user_name_last || ''}`.trim() || 'Sem Nome';
  let domain = email.includes('@') ? email.split('@')[1] : '';
  let planta = 'Outros';
  let pais = 'BRASIL';
  if (domain === 'cmpc.com' || domain === 'cmpc.cl') {
    planta = normalizePlanta('Guaíba');
    if (domain === 'cmpc.cl') pais = 'CHILE';
  } else if (domain === 'dialectosur.cl') {
    planta = normalizePlanta('Los Angeles');
    pais = 'CHILE';
  }
  let gestor = `${row.user_mgr_name_first || ''} ${row.user_mgr_name_last || ''}`.trim();
  
  let idFinal = email.toUpperCase().startsWith('CPF:') ? email.substring(4).trim() : email;
  idFinal = stripZeros(idFinal);

  return {
    identificador: idFinal,
    nome,
    planta,
    empresa: planta,
    cargo: 'Não Informado',
    matricula: row.user_ref || '',
    cod_cracha: '',
    pais,
    gestor,
    turno: '',
    email: email,
    area: '',
    isTerceiro: false
  };
}

function parseSatRow(row) {
  const rut = row.trabrut_guion;
  if (!rut) return null;
  
  if (!row.trabestadonombre_actual || row.trabestadonombre_actual.toUpperCase() !== 'HABILITADO') {
    return null;
  }

  const nome = `${row.trabnombres || ''} ${row.trabapellidos || ''}`.trim() || 'Sem Nome';
  return {
    identificador: stripZeros(rut),
    nome,
    planta: normalizePlanta(row.planta || 'Outros'),
    empresa: row.trabempresanombre || row.empr_mandante || row.planta || 'Outros',
    cargo: (row.trabocupacion || row.trabprofesion || 'Não Informado').replace(/^\d+\s*-\s*/, ''),
    matricula: row.trabid || '',
    cod_cracha: '',
    pais: 'CHILE',
    gestor: row.trabjefe || row.jefe || '',
    turno: '',
    email: row.email || row.trabemail || '',
    area: row.departamento || row.secao || '',
    isTerceiro: true
  };
}

function parseEcDadosRow(row) {
  const identificadorOriginal = row.ECP_MATRICULA || row.ECP_CPF || row.ECP_RG || row.ECP_EMAIL;
  if (!identificadorOriginal) return null;
  const identificador = stripZeros(identificadorOriginal);
  
  const nome = row.ECP_NOME || 'Sem Nome';
  const cargo = (row.ECP_DESCOCUP || row.ECP_CARGO || row.ECP_OCUPACAO || 'Não Informado').replace(/^\d+\s*-\s*/, '');
  const matricula = row.ECP_MATRICULA || '';
  const pais = row.ECP_PAIS || '';
  const gestor = row.ECP_SUPNOM || row.ECP_GESTNOM || '';
  
  let local = 'Outros';
  if (pais === 'CHILE') local = 'Chile';
  if (pais === 'BRASIL') local = 'Guaíba';
  
  const werks = String(row.ECP_WERKS || '').trim();
  const searchStr = String((row.ECP_DCRCC || '') + ' ' + (row.ECP_ORGAO || '') + ' ' + (row.ECP_CCUSTONOM || '')).toUpperCase();
  
  if (werks === '1043' || searchStr.includes('SANTA FE')) local = 'Santa Fe';
  else if (werks === '1042' || searchStr.includes('LAJA')) local = 'Laja';
  else if (werks === '1044' || searchStr.includes('PACIFICO') || searchStr.includes('PACÍFICO')) local = 'Pacífico';
  else if (werks === '504' || werks === '20' || searchStr.includes('GUAIBA') || searchStr.includes('GUAÍBA')) local = 'Guaíba';
  
  const planta = normalizePlanta(local);
  const empresa = row.ECP_CCUSTONOM || row.ECP_EMPRESA || 'CMPC';
  const turno = row.ECP_CODTURNO || '';
  const email = row.ECP_EMAIL || '';
  const area = row.ECP_DCRCC || row.ECP_ORGAO || '';
  
  const isInactive = row.ECP_DATADEMISSAO && String(row.ECP_DATADEMISSAO).trim() !== '';

  return {
    identificador,
    nome,
    planta,
    empresa,
    cargo,
    matricula,
    cod_cracha: '',
    pais,
    gestor,
    turno,
    email,
    area,
    isTerceiro: false,
    isInactive
  };
}

function processFile(fileIndex) {
  if (fileIndex >= FILES.length) {
    console.log(`\nFase 1 Concluída. Aplicando Regra de Ouro: Exclui do objeto final qualquer ID que esteja na lista de banidos
    // EXCEÇÃO: O banimento do Mifibra só se aplica a funcionários próprios (CMPC). 
    // Para terceiros (ex: Mastermec), o status 'Ativo' do Rainbow/SAT prevalece.`);
        let excluidos = 0;
      for (const key of Object.keys(uniqueUsers)) {
        const u = uniqueUsers[key];
        const mClean = u.matricula ? stripZeros(u.matricula).toLowerCase() : '';
        const eClean = u.email ? String(u.email).toLowerCase() : '';
        
        if (
          bannedIds.has(key.toLowerCase()) || 
          (mClean && bannedIds.has(mClean)) || 
          (eClean && bannedIds.has(eClean))
        ) {
          const isProprio = !u.isTerceiro || 
                            u.empresa.toUpperCase().includes('CMPC') || 
                            u.empresa.toUpperCase().includes('SOFTYS');
          
          if (isProprio) {
            delete uniqueUsers[key];
            excluidos++;
          }
        }
      }

    console.log(`Foram removidos ${excluidos} cadastros por conflito de inatividade.`);
    
    // RESGATE DE METADADOS: Preencher buracos dos ativos usando o histórico inativo
    let resgatados = 0;
    let resgatadosPorNome = 0;
    
    // Criar índice de inativos por nome
    const inativosPorNome = {};
    for (const key of Object.keys(inactiveMetadata)) {
      for (const inactive of inactiveMetadata[key]) {
        const nomeClean = inactive.nome.trim().toUpperCase();
        if (nomeClean && nomeClean !== 'SEM NOME') {
          if (!inativosPorNome[nomeClean]) inativosPorNome[nomeClean] = [];
          inativosPorNome[nomeClean].push(inactive);
        }
      }
    }

    for (const key of Object.keys(uniqueUsers)) {
      const u = uniqueUsers[key];
      let inactives = inactiveMetadata[key] || [];
      let resgatouPorNome = false;
      
      // Fallback: se não encontrou histórico pelo ID, tenta pelo NOME EXATO!
      if (inactives.length === 0) {
         const nomeClean = u.nome.trim().toUpperCase();
         if (inativosPorNome[nomeClean]) {
             inactives = inativosPorNome[nomeClean];
             resgatouPorNome = true;
         }
      }

      for (const inactive of inactives) {
        if (u.cargo === 'Não Informado' && inactive.cargo !== 'Não Informado') { u.cargo = inactive.cargo.replace(/^\d+\s*-\s*/, ''); resgatados++; if(resgatouPorNome) resgatadosPorNome++; }
        if (u.planta === 'Outros' && inactive.planta !== 'Outros') u.planta = inactive.planta;
        if (u.empresa === 'Outros' && inactive.empresa !== 'Outros') u.empresa = inactive.empresa;
        if (!u.gestor && inactive.gestor) u.gestor = inactive.gestor;
        if (!u.matricula && inactive.matricula) u.matricula = inactive.matricula;
      }
    }
    console.log(`Foram resgatados metadados (como cargos) de registros inativos para ${resgatados} campos (dos quais ${resgatadosPorNome} foram recuperados via cruzamento de Nome).`);

    // -----------------------------------------------------------------
    // MASSIVE ACTIVE-TO-ACTIVE MERGE BY NAME
    // Para resolver casos onde o colaborador está no Rainbow com uma matrícula
    // e no Mifibra com outra, resultando em dois cadastros ativos separados.
    // -----------------------------------------------------------------
    const ativosPorNome = {};
    for (const key of Object.keys(uniqueUsers)) {
      const u = uniqueUsers[key];
      const nClean = u.nome.trim().toUpperCase();
      if (!ativosPorNome[nClean]) ativosPorNome[nClean] = [];
      ativosPorNome[nClean].push(u);
    }
    
    let mescladosMassivos = 0;
    for (const nClean in ativosPorNome) {
      if (ativosPorNome[nClean].length > 1) {
         const group = ativosPorNome[nClean];
         
         let bestCargo = 'Não Informado';
         let bestPlanta = 'Outros';
         let bestEmpresa = 'Outros';
         let bestGestor = '';
         let bestIsTerceiro = true; // Assumes third-party until proven otherwise
         
         for (const u of group) {
            if (u.cargo && u.cargo !== 'Não Informado') bestCargo = u.cargo;
            if (u.planta && u.planta !== 'Outros' && u.planta !== 'CMPC Centralizada') bestPlanta = u.planta;
            if (u.empresa && u.empresa !== 'Outros' && u.empresa !== 'CMPC Centralizada') bestEmpresa = u.empresa;
            if (u.gestor) bestGestor = u.gestor;
            if (u.isTerceiro === false) bestIsTerceiro = false; // If any is direct employee, they are direct
         }
         
         for (const u of group) {
            if (u.cargo === 'Não Informado' && bestCargo !== 'Não Informado') { u.cargo = bestCargo; mescladosMassivos++; }
            if ((u.planta === 'Outros' || u.planta === 'CMPC Centralizada') && bestPlanta !== 'Outros') u.planta = bestPlanta;
            if ((u.empresa === 'Outros' || u.empresa === 'CMPC Centralizada') && bestEmpresa !== 'Outros') u.empresa = bestEmpresa;
            if (!u.gestor && bestGestor) u.gestor = bestGestor;
            u.isTerceiro = bestIsTerceiro;
         }
      }
    }
    console.log(`Foram consolidados os dados de ${mescladosMassivos} registros ativos duplos (com o mesmo nome).`);

    console.log(`Importação Finalizada! Total de cadastros puramente ATIVOS: ${Object.keys(uniqueUsers).length}`);
    fs.writeFileSync(JSON_PATH, JSON.stringify(uniqueUsers));
    console.log(`Arquivo salvo em: ${JSON_PATH}`);
    return;
  }

  const fileName = FILES[fileIndex];
  console.log(`\nIniciando leitura de: ${fileName}`);

  let parseFn;
  if (fileName.includes('rainbow')) parseFn = parseRainbowRow;
  else if (fileName.includes('mifibra')) parseFn = parseMifibraRow;
  else if (fileName.includes('ec_dados')) parseFn = parseEcDadosRow;
  else parseFn = parseSatRow;

  fs.createReadStream(path.join(BASE_DIR, fileName))
    .pipe(csv())
    .on('data', (row) => {
      const parsed = parseFn(row);
      if (parsed && parsed.identificador) {
        if (parsed.isInactive) {
          if (!inactiveMetadata[parsed.identificador]) {
            inactiveMetadata[parsed.identificador] = [];
          }
          inactiveMetadata[parsed.identificador].push(parsed);
          
          // Adiciona à lista de banidos para garantir que não será ressuscitado por outro sistema
          bannedIds.add(String(parsed.identificador).toLowerCase());
          if (parsed.email) bannedIds.add(parsed.email.toLowerCase());
          if (parsed.matricula) bannedIds.add(String(parsed.matricula).toLowerCase());
          if (row.ECP_CPF) bannedIds.add(stripZeros(row.ECP_CPF).toLowerCase());
          
          return;
        }

        if (!uniqueUsers[parsed.identificador]) {
          uniqueUsers[parsed.identificador] = {
            nome: parsed.nome,
            planta: parsed.planta,
            empresa: parsed.empresa || '',
            cargo: parsed.cargo,
            matricula: parsed.matricula,
            cod_cracha: parsed.cod_cracha || '',
            pais: parsed.pais || '',
            gestor: parsed.gestor || '',
            turno: parsed.turno || '',
            email: parsed.email || '',
            area: parsed.area || '',
            isTerceiro: parsed.isTerceiro
          };
        } else {
          // Atualiza com dados mais recentes se forem válidos (o arquivo pode ter registros mais novos no final)
          if (parsed.cargo && parsed.cargo !== 'Não Informado' && !parsed.cargo.startsWith('00000000')) {
            uniqueUsers[parsed.identificador].cargo = parsed.cargo;
          }
          if (parsed.planta && parsed.planta !== 'Outros') {
            uniqueUsers[parsed.identificador].planta = parsed.planta;
          }
          if (parsed.empresa && parsed.empresa !== 'Outros' && parsed.empresa !== '') {
            uniqueUsers[parsed.identificador].empresa = parsed.empresa;
          }
          if (parsed.matricula && !uniqueUsers[parsed.identificador].matricula) {
            uniqueUsers[parsed.identificador].matricula = parsed.matricula;
          }
          if (parsed.cod_cracha && !uniqueUsers[parsed.identificador].cod_cracha) {
            uniqueUsers[parsed.identificador].cod_cracha = parsed.cod_cracha;
          }
          if (parsed.pais && !uniqueUsers[parsed.identificador].pais) {
            uniqueUsers[parsed.identificador].pais = parsed.pais;
          }
          if (parsed.gestor && !uniqueUsers[parsed.identificador].gestor) {
            uniqueUsers[parsed.identificador].gestor = parsed.gestor;
          }
          if (parsed.turno && !uniqueUsers[parsed.identificador].turno) {
            uniqueUsers[parsed.identificador].turno = parsed.turno;
          }
          if (parsed.email && !uniqueUsers[parsed.identificador].email) {
            uniqueUsers[parsed.identificador].email = parsed.email;
          }
          if (parsed.area && !uniqueUsers[parsed.identificador].area) {
            uniqueUsers[parsed.identificador].area = parsed.area;
          }
          if (parsed.isTerceiro === false) {
            uniqueUsers[parsed.identificador].isTerceiro = false; // Direct employment overwrites third-party status
          }
        }
      }
    })
    .on('end', () => {
      console.log(`-> Concluído: ${fileName}`);
      processFile(fileIndex + 1);
    });
}

processFile(0);
