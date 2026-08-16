export type Language = 'pt' | 'es';

export interface Translations {
  // Navigation & General
  dashboard: string;
  treinamentos: string;
  checklists: string;
  publicosAlvo: string;
  colaboradores: string;
  relatorios: string;
  usuarios: string;
  logout: string;
  user: string;

  // Dashboard Page
  dashSubtitle: string;
  activeTrainings: string;
  roomsCreated: string;
  totalColabs: string;
  baseImported: string;
  presenceRead: string;
  signaturesCaptured: string;
  adhesionRate: string;
  avgTrainings: string;
  recentTrainings: string;
  latestRooms: string;
  quickActions: string;
  shortcuts: string;
  createNew: string;
  importExcel: string;
  testBq: string;
  readStatus: string;
  loading: string;
  noRecent: string;

  // Registrar Page
  regTitle: string;
  regSubtitle: string;
  searchLabel: string;
  searchPlaceholder: string;
  btnSearch: string;
  btnSearching: string;
  notFound: string;
  confirmTitle: string;
  colaboradorLabel: string;
  empresaLabel: string;
  cargoLabel: string;
  drawSignLabel: string;
  btnClear: string;
  btnConfirm: string;
  btnSaving: string;
  errEmptySign: string;
  successTitle: string;
  successMsg: string;
  btnNewRegister: string;
  notInformed: string;
}

export const translations: Record<Language, Translations> = {
  pt: {
    dashboard: "Dashboard",
    treinamentos: "Treinamentos",
    checklists: "Modelos de Checklist",
    publicosAlvo: "Públicos-Alvo",
    colaboradores: "Colaboradores (Excel)",
    relatorios: "Relatórios",
    usuarios: "Usuários",
    logout: "Sair",
    user: "Usuário",

    dashSubtitle: "Visão geral do sistema de treinamentos CMPC.",
    activeTrainings: "Treinamentos Ativos",
    roomsCreated: "Salas criadas no sistema",
    totalColabs: "Total Colaboradores",
    baseImported: "Base importada",
    presenceRead: "Presenças Lidas",
    signaturesCaptured: "Assinaturas capturadas",
    adhesionRate: "Taxa de Adesão",
    avgTrainings: "Média dos treinamentos",
    recentTrainings: "Treinamentos Recentes",
    latestRooms: "Últimas salas abertas no sistema.",
    quickActions: "Ações Rápidas",
    shortcuts: "Atalhos para funções principais.",
    createNew: "Criar Novo Treinamento",
    importExcel: "Importar Planilha Excel",
    testBq: "Testar Conexão BigQuery",
    readStatus: "Lidos",
    loading: "Carregando...",
    noRecent: "Nenhum treinamento recente encontrado.",

    regTitle: "REGISTRO DE PRESENÇA EM TREINAMENTO",
    regSubtitle: "Controle na Nuvem (NFC / QR / Manual)",
    searchLabel: "Digite seu NOME, DOCUMENTO ou MATRÍCULA:",
    searchPlaceholder: "Ex: 19802051 ou João Silva...",
    btnSearch: "BUSCAR",
    btnSearching: "BUSCANDO...",
    notFound: "Colaborador não encontrado! Tente outro nome ou documento.",
    confirmTitle: "CONFIRMAR DADOS PARA REGISTRO",
    colaboradorLabel: "Colaborador(a):",
    empresaLabel: "Empresa / Planta:",
    cargoLabel: "Cargo / Função:",
    drawSignLabel: "DESENHE SUA ASSINATURA NO QUADRO ABAIXO:",
    btnClear: "Limpar Assinatura",
    btnConfirm: "CONFIRMAR E ASSINAR",
    btnSaving: "SALVANDO...",
    errEmptySign: "Por favor, desenhe sua assinatura para confirmar a presença.",
    successTitle: "Presença Confirmada!",
    successMsg: "Sua assinatura e presença foram registradas com sucesso no sistema da CMPC.",
    btnNewRegister: "Novo Registro",
    notInformed: "Não Informado"
  },
  es: {
    dashboard: "Panel",
    treinamentos: "Capacitaciones",
    checklists: "Modelos de Checklist",
    publicosAlvo: "Públicos Objetivo",
    colaboradores: "Colaboradores (Excel)",
    relatorios: "Reportes",
    usuarios: "Usuarios",
    logout: "Salir",
    user: "Usuario",

    dashSubtitle: "Visión general del sistema de capacitaciones CMPC.",
    activeTrainings: "Capacitaciones Activas",
    roomsCreated: "Salas creadas en el sistema",
    totalColabs: "Total Colaboradores",
    baseImported: "Base importada",
    presenceRead: "Asistencias Leídas",
    signaturesCaptured: "Firmas capturadas",
    adhesionRate: "Tasa de Adhesión",
    avgTrainings: "Promedio de las capacitaciones",
    recentTrainings: "Capacitaciones Recientes",
    latestRooms: "Últimas salas abiertas en el sistema.",
    quickActions: "Acciones Rápidas",
    shortcuts: "Atajos para funciones principales.",
    createNew: "Crear Nueva Capacitación",
    importExcel: "Importar Planilla Excel",
    testBq: "Probar Conexión BigQuery",
    readStatus: "Leídos",
    loading: "Cargando...",
    noRecent: "No se encontró ninguna capacitación reciente.",

    regTitle: "REGISTRO DE ASISTENCIA EN CAPACITACIÓN",
    regSubtitle: "Control en la Nube (NFC / QR / Manual)",
    searchLabel: "Ingrese su NOMBRE, DOCUMENTO o MATRÍCULA:",
    searchPlaceholder: "Ej: 19802051-6 o Juan Silva...",
    btnSearch: "BUSCAR",
    btnSearching: "BUSCANDO...",
    notFound: "¡Colaborador no encontrado! Intente con otro nombre o documento.",
    confirmTitle: "CONFIRMAR DATOS PARA ASISTENCIA",
    colaboradorLabel: "Colaborador(a):",
    empresaLabel: "Empresa / Planta:",
    cargoLabel: "Cargo / Función:",
    drawSignLabel: "DIBUJE SU FIRMA EN EL RECUADRO ABAJO:",
    btnClear: "Limpiar Firma",
    btnConfirm: "CONFIRMAR Y FIRMAR",
    btnSaving: "GUARDANDO...",
    errEmptySign: "Por favor, dibuje su firma para confirmar la asistencia.",
    successTitle: "¡Asistencia Confirmada!",
    successMsg: "Su firma y asistencia fueron registradas con éxito en el sistema de CMPC.",
    btnNewRegister: "Nuevo Registro",
    notInformed: "No Informado"
  }
};

export const DEFAULT_LANG: Language = 'pt';
