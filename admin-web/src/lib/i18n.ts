export type Language = 'pt' | 'es';

export interface Translations {
  // Navigation & General
  dashboard: string;
  onepage: string;
  calendario: string;
  treinamentos: string;
  checklists: string;
  publicosAlvo: string;
  colaboradores: string;
  relatorios: string;
  usuarios: string;
  facilitadores: string;
  agenda: string;
  logout: string;
  user: string;

  // OnePage Dashboard
  allCourses: string;
  allCountries: string;
  brazil: string;
  chile: string;
  totalExpected: string;
  colabsInTarget: string;
  totalTrained: string;
  registeredPresences: string;
  globalProgress: string;
  activeClasses: string;
  inProgressOrScheduled: string;
  uploadLignia: string;
  lastUpdate: string;
  filteredCourse: string;
  progressByArea: string;
  progressSep: string;
  scanQrCode: string;
  statusAndComments: string;

  // Extras
  genPdf: string;
  accessLignia: string;
  placeholderComments: string;

  // PT Charts
  perfMonthVsGoal: string;
  noData: string;
  weeklyBaseline: string;
  expectedVsGoal: string;
  noDataDisplay: string;
  areasVsAcc: string;
  monthlyEvol: string;
  perfVsGoal: string;
  ptsDone: string;
  monthlyGoal: string;
  monthAdhesion: string;
  allAreas: string;
  monthFilter: string;
  allMonths: string;

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
    onepage: "Visão Geral (OnePage)",
    calendario: "Calendário",
    treinamentos: "Treinamentos",
    checklists: "Modelos de Checklist",
    publicosAlvo: "Públicos-Alvo",
    colaboradores: "Colaboradores (Excel)",
    relatorios: "Relatórios",
    usuarios: "Usuários",
    facilitadores: "Facilitadores",
    agenda: "Agenda",
    logout: "Sair",
    user: "Usuário",

    allCourses: "Todos os Cursos",
    allCountries: "Todos os Países",
    brazil: "Brasil",
    chile: "Chile",
    totalExpected: "Total Esperado",
    colabsInTarget: "Colaboradores em públicos-alvo",
    totalTrained: "Total Capacitados",
    registeredPresences: "Presenças registradas",
    globalProgress: "Avanço Global",
    activeClasses: "Turmas Ativas",
    inProgressOrScheduled: "Em andamento ou agendadas",
    uploadLignia: "Faça o upload da planilha para visualizar os dados.",
    lastUpdate: "Última atualização:",
    filteredCourse: "Curso Filtrado",
    progressByArea: "Avanço de Treinamentos por Área",
    progressSep: "Progresso separado por Operação e Manutenção",
    scanQrCode: "Escaneie o QR Code com a câmera do celular ou clique no link abaixo para acessar a Plataforma.",
    statusAndComments: "Status e Comentários Gerais",
    perfMonthVsGoal: "Desempenho no mês vs Meta Mensal da área",
    noData: "Sem dados suficientes.",
    weeklyBaseline: "Linha Base Semanal",
    expectedVsGoal: "Distribuição Esperada vs Meta (50%)",
    noDataDisplay: "Sem dados para exibir.",
    areasVsAcc: "Principais áreas vs Acumulado",
    monthlyEvol: "Evolução Mensal & Adoção",
    perfVsGoal: "Desempenho Realizado vs Meta Mensal",
    ptsDone: "PTs Realizadas",
    monthlyGoal: "Meta Mensal",
    monthAdhesion: "Adoção do Mês",
    allAreas: "Todas as Áreas",
    monthFilter: "Mês",
    allMonths: "Todos os Meses",
    genPdf: "Gerar PDF (Resumo)",
    accessLignia: "Acesso Lignia",
    placeholderComments: "Digite aqui as informações gerais, status de RCs, etc...",
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
    onepage: "Resumen (OnePage)",
    calendario: "Calendario",
    treinamentos: "Capacitaciones",
    checklists: "Modelos de Checklist",
    publicosAlvo: "Públicos Objetivo",
    colaboradores: "Colaboradores (Excel)",
    relatorios: "Reportes",
    usuarios: "Usuarios",
    facilitadores: "Facilitadores",
    agenda: "Agenda",
    logout: "Salir",
    user: "Usuario",

    allCourses: "Todos los Cursos",
    allCountries: "Todos los Países",
    brazil: "Brasil",
    chile: "Chile",
    totalExpected: "Total Esperado",
    colabsInTarget: "Colaboradores en públicos objetivo",
    totalTrained: "Total Capacitados",
    registeredPresences: "Asistencias registradas",
    globalProgress: "Avance Global",
    activeClasses: "Clases Activas",
    inProgressOrScheduled: "En curso o programadas",
    uploadLignia: "Cargue la planilla Excel para generar los gráficos.",
    lastUpdate: "Última actualización:",
    filteredCourse: "Curso Filtrado",
    progressByArea: "Avance de Capacitaciones por Área",
    progressSep: "Progreso separado por Operación y Mantenimiento",
    scanQrCode: "Escanee el código QR con la cámara de su celular o haga clic en el enlace para acceder a la Plataforma.",
    statusAndComments: "Estado y Comentarios Generales",
    perfMonthVsGoal: "Desempeño en el mes vs Meta Mensual del área",
    noData: "Sin datos suficientes.",
    weeklyBaseline: "Línea Base Semanal",
    expectedVsGoal: "Distribución Esperada vs Meta (50%)",
    noDataDisplay: "Sin datos para mostrar.",
    areasVsAcc: "Áreas Principales vs Acumulado",
    monthlyEvol: "Evolución Mensual y Adhesión",
    perfVsGoal: "Desempeño Realizado vs Meta Mensual",
    ptsDone: "PTs Realizadas",
    monthlyGoal: "Meta Mensual",
    monthAdhesion: "Adhesión del Mes",
    allAreas: "Todas las Áreas",
    monthFilter: "Mes",
    allMonths: "Todos los Meses",
    genPdf: "Generar PDF (Resumen)",
    accessLignia: "Acceso Lignia",
    placeholderComments: "Escriba aquí la información general, estado de las RCs, etc...",
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

    regTitle: "REGISTRO DE ASISTENCIA EN CAPACITACION",
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
