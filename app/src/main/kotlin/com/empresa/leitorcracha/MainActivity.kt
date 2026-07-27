package com.empresa.leitorcracha

import android.app.PendingIntent
import android.content.Intent
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.tech.MifareClassic
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import android.app.Dialog
import android.graphics.Color
import android.graphics.drawable.ColorDrawable
import android.view.LayoutInflater
import android.view.ViewGroup
import android.widget.LinearLayout
import androidx.appcompat.app.AppCompatActivity
import com.google.zxing.integration.android.IntentIntegrator
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.tasks.await
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.Query
import com.google.firebase.firestore.ktx.firestore
import com.google.firebase.ktx.Firebase
import java.net.HttpURLConnection
import java.net.URL
import java.io.InputStreamReader
import org.json.JSONObject
import org.json.JSONArray
import android.widget.ArrayAdapter
import android.widget.AutoCompleteTextView
import android.widget.EditText
import android.widget.FrameLayout

data class ColaboradorAPI(
    val nome: String,
    val empresa: String,
    val cargo: String,
    val matricula: String
)

class MainActivity : AppCompatActivity() {

    // Chave de acesso do Setor 0 do Mifare Classic
    private val COMPANY_KEY = byteArrayOf(
        0xB5.toByte(), 0xB3.toByte(), 0xE3.toByte(),
        0x65.toByte(), 0xA7.toByte(), 0x3B.toByte()
    )

    private lateinit var nfcAdapter: NfcAdapter
    private lateinit var tvStatus: TextView
    private lateinit var tvResult: TextView
    private lateinit var progressBar: ProgressBar
    private lateinit var btnScanNfc: Button
    private lateinit var btnScanQr: Button
    private lateinit var btnManualRegister: Button
    private lateinit var tvSessionId: TextView
    private lateinit var tvSessionCount: TextView
    private lateinit var btnSelectSession: Button

    private var isWaitingForTag = false
    private var currentScanMode = ""
    private var treinamentoIdStr = ""

    private var listaEmpresasBrasil = mutableListOf<String>()
    private var listaEmpresasChile = mutableListOf<String>()
    private var listaEmpresasTodas = mutableListOf<String>()
    private var paisTreinamentoAtivo = "BRASIL"

    private var presencaListener: com.google.firebase.firestore.ListenerRegistration? = null

    // Instância do Firebase Firestore
    private val db = Firebase.firestore

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        tvStatus         = findViewById(R.id.tvStatus)
        tvResult         = findViewById(R.id.tvResult)
        progressBar      = findViewById(R.id.progressBar)
        btnScanNfc       = findViewById(R.id.btnScan)
        btnScanQr        = findViewById(R.id.btnScanQr)
        btnManualRegister = findViewById(R.id.btnManualRegister)
        tvSessionId      = findViewById(R.id.tvSessionId)
        tvSessionCount   = findViewById(R.id.tvSessionCount)
        btnSelectSession = findViewById(R.id.btnSelectSession)

        val adapter = NfcAdapter.getDefaultAdapter(this)
        if (adapter != null && adapter.isEnabled) {
            nfcAdapter = adapter
            btnScanNfc.isEnabled = true
        } else {
            btnScanNfc.text = "NFC INDISPONÍVEL"
        }

        // Seletor de sessões na nuvem
        btnSelectSession.setOnClickListener {
            abrirSeletorDeSessao()
        }

        // Botão principal de leitura NFC
        btnScanNfc.setOnClickListener {
            if (treinamentoIdStr.isBlank()) {
                Toast.makeText(this, "Selecione uma turma primeiro!", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            isWaitingForTag = true
            tvStatus.text  = "Aproxime o crachá..."
            tvResult.visibility = View.GONE
            progressBar.visibility = View.VISIBLE
            btnScanNfc.isEnabled = false
        }

        // Botão de leitura de QR Code avulso (RUT)
        btnScanQr.setOnClickListener {
            if (treinamentoIdStr.isBlank()) {
                Toast.makeText(this, "Selecione uma turma primeiro!", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            currentScanMode = "RUT"
            val integrator = IntentIntegrator(this)
            integrator.setDesiredBarcodeFormats(IntentIntegrator.QR_CODE)
            integrator.setPrompt("Aponte para o QR Code (RUT)")
            integrator.setCameraId(0)
            integrator.setBeepEnabled(true)
            integrator.initiateScan()
        }

        // Botão de registro manual na tela
        btnManualRegister.setOnClickListener {
            if (treinamentoIdStr.isBlank()) {
                Toast.makeText(this, "Selecione uma turma primeiro!", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            abrirDialogoRegistroManual()
        }
    }

    // --- DIÁLOGO DE REGISTRO MANUAL COM ASSINATURA NA TELA ---
    private fun abrirDialogoRegistroManual() {
        val dialog = Dialog(this)
        val view = LayoutInflater.from(this).inflate(R.layout.dialog_manual_register, null)
        dialog.setContentView(view)
        dialog.window?.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
        dialog.window?.setLayout(ViewGroup.LayoutParams.MATCH_PARENT, ViewGroup.LayoutParams.WRAP_CONTENT)

        val etSearchQuery = view.findViewById<EditText>(R.id.etSearchQuery)
        val btnSearchColab = view.findViewById<Button>(R.id.btnSearchColab)
        val tvSearchStatus = view.findViewById<TextView>(R.id.tvSearchStatus)
        val etNomeColaborador = view.findViewById<EditText>(R.id.etNomeColaborador)
        val actvEmpresa = view.findViewById<AutoCompleteTextView>(R.id.actvEmpresa)
        val etIdColaborador = view.findViewById<EditText>(R.id.etIdColaborador)
        val llSignatureContainer = view.findViewById<FrameLayout>(R.id.llSignatureContainer)
        val btnClearSig = view.findViewById<Button>(R.id.btnClearSig)
        val btnCancelManual = view.findViewById<Button>(R.id.btnCancelManual)
        val btnConfirmManual = view.findViewById<Button>(R.id.btnConfirmManual)

        // Adicionar o quadro de assinatura customizado programaticamente
        val signatureView = SignatureView(this)
        llSignatureContainer.addView(signatureView, FrameLayout.LayoutParams(
            ViewGroup.LayoutParams.MATCH_PARENT,
            ViewGroup.LayoutParams.MATCH_PARENT
        ))

        // Lista padrão de empresas no banco
        val defaultEmpresas = mutableListOf(
            "CMPC", "CMPC - GUAÍBA", "CMPC - SAPUCAIA", "TERCEIRO / PRESTADOR", "VISITANTE",
            "METSA", "VALMET", "POYRY", "ANDRITZ", "SIEMENS", "ABB", "WEG", "KONEKRANES"
        )
        val adapterEmpresas = ArrayAdapter(this, android.R.layout.simple_dropdown_item_1line, defaultEmpresas)
        actvEmpresa.setAdapter(adapterEmpresas)
        actvEmpresa.setOnClickListener { actvEmpresa.showDropDown() }

        // Carregar empresas e verificar país da turma em background
        CoroutineScope(Dispatchers.IO).launch {
            try {
                if (treinamentoIdStr.isNotBlank()) {
                    try {
                        val snap = db.collection("treinamentos").document(treinamentoIdStr).get().await()
                        if (snap.exists()) {
                            val nome = snap.getString("nome") ?: ""
                            paisTreinamentoAtivo = snap.getString("pais") ?: if (nome.contains("laja", true) || nome.contains("santa fe", true) || nome.contains("pacifico", true) || nome.contains("chile", true) || nome.contains("talca", true) || nome.contains("nacimiento", true) || nome.contains("valdivia", true)) "CHILE" else "BRASIL"
                        }
                    } catch (e: Exception) {}
                }

                val url = URL("https://treinamentocmpc.netlify.app/api/empresas")
                val conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = "GET"
                conn.connectTimeout = 4000
                if (conn.responseCode == 200) {
                    val reader = InputStreamReader(conn.inputStream)
                    val response = reader.readText()
                    reader.close()
                    val json = JSONObject(response)
                    if (json.optBoolean("success", false)) {
                        val arrTodas = json.optJSONArray("data")
                        val arrBrasil = json.optJSONArray("brasil") ?: arrTodas
                        val arrChile = json.optJSONArray("chile") ?: arrTodas

                        fun fillList(arr: org.json.JSONArray?, dest: MutableList<String>) {
                            if (arr != null) {
                                dest.clear()
                                for (i in 0 until arr.length()) dest.add(arr.getString(i))
                            }
                        }
                        fillList(arrTodas, listaEmpresasTodas)
                        fillList(arrBrasil, listaEmpresasBrasil)
                        fillList(arrChile, listaEmpresasChile)

                        val listaParaUsar = if (paisTreinamentoAtivo == "CHILE") (if (listaEmpresasChile.isNotEmpty()) listaEmpresasChile else listaEmpresasTodas) else (if (listaEmpresasBrasil.isNotEmpty()) listaEmpresasBrasil else listaEmpresasTodas)
                        if (listaParaUsar.isNotEmpty()) {
                            withContext(Dispatchers.Main) {
                                val novoAdapter = ArrayAdapter(this@MainActivity, android.R.layout.simple_dropdown_item_1line, listaParaUsar)
                                actvEmpresa.setAdapter(novoAdapter)
                            }
                        }
                    }
                }
            } catch (e: Exception) {
                // Mantém a lista padrão
            }
        }

        // Buscar colaborador por nome ou ID
        btnSearchColab.setOnClickListener {
            val query = etSearchQuery.text.toString().trim()
            if (query.length < 3) {
                Toast.makeText(this, "Digite ao menos 3 caracteres para buscar!", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            tvSearchStatus.text = "⏳ Buscando no banco de dados..."
            tvSearchStatus.setTextColor(Color.parseColor("#38BDF8"))
            btnSearchColab.isEnabled = false

            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val urlString = "https://treinamentocmpc.netlify.app/api/buscar-colaborador?id=${java.net.URLEncoder.encode(query, "UTF-8")}"
                    val url = URL(urlString)
                    val conn = url.openConnection() as HttpURLConnection
                    conn.requestMethod = "GET"
                    conn.connectTimeout = 5000
                    
                    if (conn.responseCode == 200) {
                        val reader = InputStreamReader(conn.inputStream)
                        val resp = reader.readText()
                        reader.close()
                        val json = JSONObject(resp)
                        if (json.optBoolean("success", false)) {
                            val array = json.optJSONArray("data")
                            if (array != null && array.length() > 0) {
                                val obj = array.getJSONObject(0)
                                val nomeEnc = obj.optString("nome", "")
                                val plantaEnc = obj.optString("planta", obj.optString("empresa", ""))
                                val idEnc = obj.optString("identificador", "")
                                
                                withContext(Dispatchers.Main) {
                                    etNomeColaborador.setText(nomeEnc)
                                    if (plantaEnc.isNotBlank() && plantaEnc != "Outros") actvEmpresa.setText(plantaEnc)
                                    etIdColaborador.setText(idEnc)
                                    tvSearchStatus.text = "✅ Colaborador encontrado e preenchido!"
                                    tvSearchStatus.setTextColor(Color.parseColor("#4ADE80"))
                                    btnSearchColab.isEnabled = true
                                }
                                return@launch
                            }
                        }
                    }
                    withContext(Dispatchers.Main) {
                        tvSearchStatus.text = "ℹ️ Não encontrado. Preencha os campos manualmente e assine."
                        tvSearchStatus.setTextColor(Color.parseColor("#FACC15"))
                        btnSearchColab.isEnabled = true
                    }
                } catch (e: Exception) {
                    withContext(Dispatchers.Main) {
                        tvSearchStatus.text = "⚠️ Erro na busca. Preencha manualmente e assine."
                        tvSearchStatus.setTextColor(Color.parseColor("#F87171"))
                        btnSearchColab.isEnabled = true
                    }
                }
            }
        }

        btnClearSig.setOnClickListener {
            signatureView.clear()
        }

        btnCancelManual.setOnClickListener {
            dialog.dismiss()
        }

        btnConfirmManual.setOnClickListener {
            val nome = etNomeColaborador.text.toString().trim()
            val empresa = actvEmpresa.text.toString().trim()
            val idInformado = etIdColaborador.text.toString().trim()

            if (nome.isBlank()) {
                Toast.makeText(this, "Por favor, informe o Nome Completo!", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            if (empresa.isBlank()) {
                Toast.makeText(this, "Por favor, informe ou selecione a Empresa/Planta!", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            if (signatureView.isSignatureEmpty()) {
                Toast.makeText(this, "⚠️ A ASSINATURA NA TELA É OBRIGATÓRIA!", Toast.LENGTH_LONG).show()
                return@setOnClickListener
            }

            val sigBase64 = signatureView.getBase64Signature()
            if (sigBase64 == null) {
                Toast.makeText(this, "Erro ao gerar imagem da assinatura.", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }

            val idParaSalvar = if (idInformado.isNotBlank()) idInformado else "MAN_APK_" + System.currentTimeMillis()

            btnConfirmManual.isEnabled = false
            btnConfirmManual.text = "SALVANDO..."
            tvStatus.text = "Salvando presença e assinatura..."
            progressBar.visibility = View.VISIBLE

            CoroutineScope(Dispatchers.IO).launch {
                try {
                    val docRef = db.collection("treinamentos")
                        .document(treinamentoIdStr)
                        .collection("presencas")
                        .document(idParaSalvar)

                    val snap = docRef.get().await()
                    if (snap.exists()) {
                        withContext(Dispatchers.Main) {
                            progressBar.visibility = View.GONE
                            btnConfirmManual.isEnabled = true
                            btnConfirmManual.text = "CONFIRMAR E ASSINAR"
                            Toast.makeText(this@MainActivity, "❌ Este colaborador já foi registrado nesta turma!", Toast.LENGTH_LONG).show()
                        }
                        return@launch
                    }

                    val dados = hashMapOf(
                        "identificador_lido" to idParaSalvar,
                        "nome" to nome,
                        "planta" to empresa,
                        "empresa" to empresa,
                        "modo_registro" to "MANUAL_APK",
                        "assinaturaBase64" to sigBase64,
                        "data_registro" to FieldValue.serverTimestamp()
                    )

                    docRef.set(dados).await()

                    withContext(Dispatchers.Main) {
                        progressBar.visibility = View.GONE
                        Toast.makeText(this@MainActivity, "✅ Presença com Assinatura registrada!", Toast.LENGTH_LONG).show()
                        tvStatus.text = "✅ Registro Manual efetuado com sucesso!"
                        tvStatus.setTextColor(getColor(R.color.colorSuccess))
                        tvResult.text = "$nome ($empresa)"
                        tvResult.visibility = View.VISIBLE
                        dialog.dismiss()
                    }
                } catch (e: Exception) {
                    withContext(Dispatchers.Main) {
                        progressBar.visibility = View.GONE
                        btnConfirmManual.isEnabled = true
                        btnConfirmManual.text = "CONFIRMAR E ASSINAR"
                        Toast.makeText(this@MainActivity, "❌ Erro ao salvar na nuvem: ${e.message}", Toast.LENGTH_LONG).show()
                    }
                }
            }
        }

        dialog.show()
    }

    // --- SELETOR DE SESSÕES EM 2 ETAPAS (PASTAS / CURSOS ➔ TURMAS) ---
    private fun abrirSeletorDeSessao() {
        tvStatus.text = "Buscando cursos na nuvem..."
        progressBar.visibility = View.VISIBLE
        
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val snapshot = db.collection("treinamentos")
                    .orderBy("data", Query.Direction.DESCENDING)
                    .limit(50)
                    .get()
                    .await()
                
                if (snapshot.isEmpty) {
                    mostrarErro("Nenhum treinamento encontrado na nuvem.")
                    return@launch
                }
                
                // Agrupa os documentos de turmas pelo Nome do Curso
                val cursosMap = mutableMapOf<String, MutableList<com.google.firebase.firestore.DocumentSnapshot>>()
                for (doc in snapshot.documents) {
                    val nomeCurso = doc.getString("nome") ?: "Treinamento Sem Nome"
                    if (!cursosMap.containsKey(nomeCurso)) {
                        cursosMap[nomeCurso] = mutableListOf()
                    }
                    cursosMap[nomeCurso]?.add(doc)
                }
                
                withContext(Dispatchers.Main) {
                    progressBar.visibility = View.GONE
                    tvStatus.text = "Selecione a pasta do curso"
                    
                    val dialog = Dialog(this@MainActivity)
                    val view = LayoutInflater.from(this@MainActivity).inflate(R.layout.dialog_select_session, null)
                    dialog.setContentView(view)
                    dialog.window?.setBackgroundDrawable(ColorDrawable(Color.TRANSPARENT))
                    val displayMetrics = resources.displayMetrics
                    val dialogWidth = (displayMetrics.widthPixels * 0.92).toInt()
                    dialog.window?.setLayout(dialogWidth, ViewGroup.LayoutParams.WRAP_CONTENT)
                    
                    val tvIcon = view.findViewById<TextView>(R.id.tvDialogIcon)
                    val tvTitle = view.findViewById<TextView>(R.id.tvDialogTitle)
                    val tvSub = view.findViewById<TextView>(R.id.tvDialogSubtitle)
                    val container = view.findViewById<LinearLayout>(R.id.llSessionsContainer)
                    val btnBack = view.findViewById<Button>(R.id.btnBackDialog)
                    val btnCancel = view.findViewById<Button>(R.id.btnCancelDialog)

                    fun renderizarPastas() {
                        container.removeAllViews()
                        tvIcon.text = "📁"
                        tvTitle.text = "SELECIONE O TREINAMENTO"
                        tvSub.text = "Toque em uma pasta para ver as turmas"
                        btnBack.visibility = View.GONE

                        for ((cursoNome, docsList) in cursosMap) {
                            val itemView = LayoutInflater.from(this@MainActivity).inflate(R.layout.item_session_option, container, false)
                            val tvName = itemView.findViewById<TextView>(R.id.tvOptionName)
                            val tvSubtitle = itemView.findViewById<TextView>(R.id.tvOptionSubtitle)
                            
                            tvName.text = cursoNome
                            tvSubtitle.text = "${docsList.size} turma(s) disponível(is)"
                            tvSubtitle.visibility = View.VISIBLE
                            tvSubtitle.setTextColor(Color.parseColor("#38BDF8"))
                            
                            itemView.setOnClickListener {
                                // Passo 2: Mostrar turmas deste curso
                                container.removeAllViews()
                                tvIcon.text = "🎯"
                                tvTitle.text = cursoNome.uppercase()
                                tvSub.text = "Selecione a turma ativa para vincular ao leitor:"
                                btnBack.visibility = View.VISIBLE
                                
                                for (doc in docsList) {
                                    val turmaItemView = LayoutInflater.from(this@MainActivity).inflate(R.layout.item_session_option, container, false)
                                    val tvTurmaName = turmaItemView.findViewById<TextView>(R.id.tvOptionName)
                                    val tvTurmaSub = turmaItemView.findViewById<TextView>(R.id.tvOptionSubtitle)
                                    
                                    val nomeTurma = doc.getString("turma") ?: ""
                                    tvTurmaName.text = if (nomeTurma.isNotBlank()) nomeTurma else "Turma Principal"
                                    tvTurmaSub.text = "ID: ${doc.id.take(8)}..."
                                    tvTurmaSub.visibility = View.VISIBLE
                                    tvTurmaSub.setTextColor(Color.parseColor("#94A3B8"))
                                    
                                    turmaItemView.setOnClickListener {
                                        val pais = doc.getString("pais") ?: if (cursoNome.contains("laja", true) || cursoNome.contains("santa fe", true) || cursoNome.contains("pacifico", true) || cursoNome.contains("chile", true) || cursoNome.contains("talca", true) || cursoNome.contains("nacimiento", true) || cursoNome.contains("valdivia", true)) "CHILE" else "BRASIL"
                                        val display = if (nomeTurma.isNotBlank()) "$cursoNome ($nomeTurma)" else cursoNome
                                        atualizarSessaoAtiva(doc.id, display, pais)
                                        dialog.dismiss()
                                    }
                                    container.addView(turmaItemView)
                                }
                            }
                            container.addView(itemView)
                        }
                    }

                    btnBack.setOnClickListener { renderizarPastas() }
                    btnCancel.setOnClickListener { dialog.dismiss() }

                    renderizarPastas()
                    dialog.show()
                }
            } catch (e: Exception) {
                mostrarErro("Erro ao buscar turmas: ${e.message}")
            }
        }
    }

    // --- LEITURA NFC ---
    override fun onResume() {
        super.onResume()
        if (!::nfcAdapter.isInitialized) return
        val intent = Intent(this, javaClass).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
        val pending = PendingIntent.getActivity(this, 0, intent, PendingIntent.FLAG_MUTABLE)
        val techLists = arrayOf(arrayOf(MifareClassic::class.java.name))
        nfcAdapter.enableForegroundDispatch(this, pending, null, techLists)
    }

    override fun onPause() {
        super.onPause()
        if (::nfcAdapter.isInitialized) nfcAdapter.disableForegroundDispatch(this)
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        if (!isWaitingForTag) return
        val tag = intent.getParcelableExtra<Tag>(NfcAdapter.EXTRA_TAG) ?: return
        processNfcTag(tag)
    }

    private fun processNfcTag(tag: Tag) {
        CoroutineScope(Dispatchers.IO).launch {
            try {
                val mifare = MifareClassic.get(tag) ?: throw Exception("Cartão incompatível.")
                mifare.connect()
                val authOk = mifare.authenticateSectorWithKeyA(0, COMPANY_KEY) || mifare.authenticateSectorWithKeyB(0, COMPANY_KEY)
                if (!authOk) {
                    mifare.close()
                    throw Exception("Autenticação NFC negada.")
                }
                val raw = mifare.readBlock(1)
                mifare.close()
                if (raw == null || raw.size < 6) throw Exception("Sem dados no crachá.")

                val matricula = buildString {
                    for (i in 0 until 6) {
                        append((raw[i].toInt() and 0xFF).toString().padStart(2, '0'))
                    }
                }
                
                enviarParaServidor(matricula, "NFC")
                
            } catch (e: Exception) {
                mostrarErro(e.message ?: "Erro NFC")
            }
        }
    }

    // --- LEITURA QR CODE ---
    override fun onActivityResult(requestCode: Int, resultCode: Int, data: Intent?) {
        val result = IntentIntegrator.parseActivityResult(requestCode, resultCode, data)
        if (result != null) {
            if (result.contents == null) {
                mostrarErro("Leitura cancelada")
            } else {
                val scannedData = result.contents
                val isRutQr = scannedData.contains("RUN=", true) || scannedData.contains("RUT=", true) || scannedData.contains("registrocivil", true) || scannedData.contains("docstatus", true) || scannedData.contains("cedula", true)

                if (currentScanMode == "SESSION" && !isRutQr) {
                    val idSessao = scannedData.substringAfterLast("/").replace("/", "_").trim()
                    CoroutineScope(Dispatchers.IO).launch {
                        try {
                            val snap = db.collection("treinamentos").document(idSessao).get().await()
                            if (snap.exists()) {
                                val nome = snap.getString("nome") ?: "Turma QR"
                                val pais = snap.getString("pais") ?: if (nome.contains("laja", true) || nome.contains("santa fe", true) || nome.contains("pacifico", true) || nome.contains("chile", true) || nome.contains("talca", true) || nome.contains("nacimiento", true) || nome.contains("valdivia", true)) "CHILE" else "BRASIL"
                                withContext(Dispatchers.Main) {
                                    atualizarSessaoAtiva(idSessao, nome, pais)
                                }
                            } else {
                                withContext(Dispatchers.Main) {
                                    atualizarSessaoAtiva(idSessao, "Turma ID: $idSessao", "BRASIL")
                                }
                            }
                        } catch (e: Exception) {
                            withContext(Dispatchers.Main) {
                                atualizarSessaoAtiva(idSessao, "Turma ID: $idSessao", "BRASIL")
                            }
                        }
                    }
                } else {
                    // É leitura de QR de Colaborador / RUT chileno (seja no botão RUT ou se bipou o RUT no botão da turma)
                    val rutLimpo = extrairRutOuIdentificador(scannedData)
                    CoroutineScope(Dispatchers.IO).launch {
                        enviarParaServidor(rutLimpo, "QR_CODE")
                    }
                }
            }
        } else {
            super.onActivityResult(requestCode, resultCode, data)
        }
    }

    private fun extrairRutOuIdentificador(raw: String): String {
        var texto = raw.trim()
        if (texto.contains("RUN=", ignoreCase = true)) {
            texto = texto.substringAfter("RUN=", "").substringAfter("run=", "").substringBefore("&").trim()
        } else if (texto.contains("RUT=", ignoreCase = true)) {
            texto = texto.substringAfter("RUT=", "").substringAfter("rut=", "").substringBefore("&").trim()
        } else if (texto.contains("id=", ignoreCase = true) && texto.contains("http", ignoreCase = true)) {
            texto = texto.substringAfter("id=", "").substringAfter("ID=", "").substringBefore("&").trim()
        } else if (texto.startsWith("http", ignoreCase = true) || texto.contains("/")) {
            texto = texto.substringAfterLast("/").substringBefore("?").trim()
        }
        texto = texto.replace("/", "_").replace("#", "").replace("$", "").replace("[", "").replace("]", "").trim()
        return texto
    }

    private fun atualizarSessaoAtiva(id: String, display: String, pais: String) {
        treinamentoIdStr = id
        paisTreinamentoAtivo = pais
        tvSessionId.text = display
        tvStatus.text = "✅ Turma ativa selecionada!"
        tvStatus.setTextColor(getColor(R.color.colorSuccess))

        presencaListener?.remove()
        presencaListener = db.collection("treinamentos").document(treinamentoIdStr).collection("presencas")
            .addSnapshotListener { snapshot, error ->
                if (error == null && snapshot != null) {
                    val count = snapshot.size()
                    runOnUiThread {
                        tvSessionCount.text = "👥 $count pessoa(s) registrada(s) nesta turma"
                        tvSessionCount.visibility = View.VISIBLE
                    }
                }
            }
    }

    // --- BUSCA NA API OFICIAL DA NETLIFY ---
    private suspend fun buscarNomeNaAPI(identificadorRaw: String): ColaboradorAPI? {
        val identificador = extrairRutOuIdentificador(identificadorRaw)
        return withContext(Dispatchers.IO) {
            try {
                val urlString = "https://treinamentocmpc.netlify.app/api/buscar-colaborador?id=$identificador"
                val url = URL(urlString)
                val conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = "GET"
                conn.connectTimeout = 4000
                conn.readTimeout = 4000

                if (conn.responseCode == 200) {
                    val reader = InputStreamReader(conn.inputStream)
                    val response = reader.readText()
                    reader.close()
                    
                    val jsonObject = JSONObject(response)
                    if (jsonObject.optBoolean("success", false)) {
                        val dataArray = jsonObject.optJSONArray("data")
                        if (dataArray != null && dataArray.length() > 0) {
                            val obj = dataArray.getJSONObject(0)
                            val nome = obj.optString("nome", "").trim()
                            val emp = obj.optString("empresa", "").ifEmpty { obj.optString("planta", "") }.trim()
                            val cargo = obj.optString("cargo", "").trim()
                            val mat = obj.optString("matricula", "").trim()
                            if (nome.isNotEmpty()) {
                                return@withContext ColaboradorAPI(nome, emp, cargo, mat)
                            }
                        }
                    }
                }
                null
            } catch (e: Exception) {
                null
            }
        }
    }

    // --- COMUNICAÇÃO COM O FIREBASE CLOUD ---
    private suspend fun enviarParaServidor(identificadorRaw: String, modo: String) {
        val identificador = extrairRutOuIdentificador(identificadorRaw)
        val colab = buscarNomeNaAPI(identificador)
        
        val isProprio = identificador.startsWith("31")
        val isTerceiro = identificador.startsWith("32")
        val tipoCracha = when {
            isProprio -> "PRÓPRIO CMPC"
            isTerceiro -> "TERCEIRO"
            else -> "AVULSO"
        }

        val textoExibicao = if (colab != null) {
            val badgeIcon = when {
                isProprio -> "🟢 Próprio CMPC"
                isTerceiro -> "🟠 Terceiro"
                else -> ""
            }
            buildString {
                append("👤 ${colab.nome}")
                if (colab.empresa.isNotEmpty() && colab.empresa != "Outros") {
                    append("\n🏢 ${colab.empresa}")
                }
                if (badgeIcon.isNotEmpty()) {
                    append("\n$badgeIcon")
                }
            }
        } else {
            "ID: $identificador\n(Não encontrado no cadastro)"
        }

        withContext(Dispatchers.Main) {
            isWaitingForTag = false
            progressBar.visibility = View.VISIBLE
            tvStatus.text = "Enviando dados..."
            tvResult.text = textoExibicao
            tvResult.visibility = View.VISIBLE
        }

        try {
            val docRef = db.collection("treinamentos")
                           .document(treinamentoIdStr)
                           .collection("presencas")
                           .document(identificador)
            
            val snapshot = docRef.get().await()
            if (snapshot.exists()) {
                withContext(Dispatchers.Main) {
                    progressBar.visibility = View.GONE
                    btnScanNfc.isEnabled = true
                    tvStatus.text = "❌ Já Registrado!"
                    tvStatus.setTextColor(getColor(R.color.colorError))
                }
                return
            }
            
            val data = hashMapOf(
                "identificador_lido" to identificador,
                "nome" to (colab?.nome ?: ""),
                "empresa" to (colab?.empresa ?: ""),
                "cargo" to (colab?.cargo ?: ""),
                "matricula" to (colab?.matricula ?: ""),
                "tipo_colaborador" to tipoCracha,
                "modo_registro" to modo,
                "data_registro" to FieldValue.serverTimestamp()
            )
            
            docRef.set(data).await()

            withContext(Dispatchers.Main) {
                progressBar.visibility = View.GONE
                btnScanNfc.isEnabled = true
                tvStatus.text = "✅ Presença Registrada na Nuvem!"
                tvStatus.setTextColor(getColor(R.color.colorSuccess))
            }
        } catch (e: Exception) {
            withContext(Dispatchers.Main) {
                progressBar.visibility = View.GONE
                btnScanNfc.isEnabled = true
                tvStatus.text = "❌ Erro ao Salvar: ${e.message}"
                tvStatus.setTextColor(getColor(R.color.colorError))
            }
        }
    }

    private fun mostrarErro(msg: String) {
        runOnUiThread {
            isWaitingForTag = false
            progressBar.visibility = View.GONE
            btnScanNfc.isEnabled = true
            tvStatus.text = msg
            tvStatus.setTextColor(getColor(R.color.colorError))
        }
    }

    override fun onDestroy() {
        super.onDestroy()
        presencaListener?.remove()
    }
}
