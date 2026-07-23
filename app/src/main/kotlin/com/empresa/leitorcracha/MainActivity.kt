package com.empresa.leitorcracha

import android.app.PendingIntent
import android.content.Intent
import android.nfc.NfcAdapter
import android.nfc.Tag
import android.nfc.tech.MifareClassic
import android.os.Bundle
import android.view.View
import android.widget.Button
import android.widget.EditText
import android.widget.ProgressBar
import android.widget.TextView
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.google.zxing.integration.android.IntentIntegrator
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext
import kotlinx.coroutines.tasks.await
import com.google.firebase.firestore.FieldValue
import com.google.firebase.firestore.ktx.firestore
import com.google.firebase.ktx.Firebase
import java.net.HttpURLConnection
import java.net.URL
import java.io.InputStreamReader
import org.json.JSONArray
import org.json.JSONObject
import android.content.Context
import android.content.SharedPreferences

class MainActivity : AppCompatActivity() {

    // Chave de acesso do Setor 0
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
    private lateinit var tvSessionId: TextView
    private lateinit var btnScanSession: Button
    
    // Novas variáveis
    private lateinit var etServerIp: EditText
    private lateinit var btnSaveIp: Button
    private lateinit var sharedPrefs: SharedPreferences

    private var isWaitingForTag = false
    private var currentScanMode = ""
    private var treinamentoIdStr = ""

    // Instância do Firebase Firestore
    private val db = Firebase.firestore

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        
        sharedPrefs = getSharedPreferences("CrachaPrefs", Context.MODE_PRIVATE)

        tvStatus    = findViewById(R.id.tvStatus)
        tvResult    = findViewById(R.id.tvResult)
        progressBar = findViewById(R.id.progressBar)
        btnScanNfc  = findViewById(R.id.btnScan)
        btnScanQr   = findViewById(R.id.btnScanQr)
        tvSessionId = findViewById(R.id.tvSessionId)
        btnScanSession = findViewById(R.id.btnScanSession)
        
        etServerIp = findViewById(R.id.etServerIp)
        btnSaveIp = findViewById(R.id.btnSaveIp)
        
        // Carregar IP salvo
        val savedIp = sharedPrefs.getString("SERVER_IP", "")
        if (!savedIp.isNullOrEmpty()) {
            etServerIp.setText(savedIp)
        }
        
        btnSaveIp.setOnClickListener {
            val ip = etServerIp.text.toString().trim()
            sharedPrefs.edit().putString("SERVER_IP", ip).apply()
            Toast.makeText(this, "IP Salvo: $ip", Toast.LENGTH_SHORT).show()
        }

        val adapter = NfcAdapter.getDefaultAdapter(this)
        if (adapter != null && adapter.isEnabled) {
            nfcAdapter = adapter
            btnScanNfc.isEnabled = true
        } else {
            btnScanNfc.text = "NFC INDISPONÍVEL"
        }

        btnScanSession.setOnClickListener {
            currentScanMode = "SESSION"
            val integrator = IntentIntegrator(this)
            integrator.setDesiredBarcodeFormats(IntentIntegrator.QR_CODE)
            integrator.setPrompt("Escaneie o QR Code no Painel Web")
            integrator.setCameraId(0)
            integrator.setBeepEnabled(true)
            integrator.initiateScan()
        }

        btnScanNfc.setOnClickListener {
            if (treinamentoIdStr.isBlank()) {
                Toast.makeText(this, "Vincule a uma sessão primeiro!", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            isWaitingForTag = true
            tvStatus.text  = "Aproxime o crachá..."
            tvResult.visibility = View.GONE
            progressBar.visibility = View.VISIBLE
            btnScanNfc.isEnabled = false
        }

        btnScanQr.setOnClickListener {
            if (treinamentoIdStr.isBlank()) {
                Toast.makeText(this, "Vincule a uma sessão primeiro!", Toast.LENGTH_SHORT).show()
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
                if (currentScanMode == "SESSION") {
                    // Se o QR for uma URL (ex: https://.../registrar/ABC), pegamos apenas o ID final
                    treinamentoIdStr = scannedData.substringAfterLast("/")
                    tvSessionId.text = "Sessão: $treinamentoIdStr"
                    tvStatus.text = "✅ Sessão vinculada"
                    tvStatus.setTextColor(getColor(R.color.colorSuccess))
                } else if (currentScanMode == "RUT") {
                    CoroutineScope(Dispatchers.IO).launch {
                        enviarParaServidor(scannedData, "QR_CODE")
                    }
                }
            }
        } else {
            super.onActivityResult(requestCode, resultCode, data)
        }
    }

    // --- BUSCA NA API LOCAL ---
    private suspend fun buscarNomeNaAPI(identificador: String): String? {
        return withContext(Dispatchers.IO) {
            try {
                val ip = sharedPrefs.getString("SERVER_IP", "")
                if (ip.isNullOrEmpty()) return@withContext null
                
                val urlString = "http://$ip:3000/api/buscar-colaborador?cpf=$identificador"
                val url = URL(urlString)
                val conn = url.openConnection() as HttpURLConnection
                conn.requestMethod = "GET"
                conn.connectTimeout = 3000
                conn.readTimeout = 3000

                if (conn.responseCode == 200) {
                    val reader = InputStreamReader(conn.inputStream)
                    val response = reader.readText()
                    reader.close()
                    
                    val jsonArray = JSONArray(response)
                    if (jsonArray.length() > 0) {
                        val obj = jsonArray.getJSONObject(0)
                        return@withContext obj.optString("nome", null)
                    }
                }
                null
            } catch (e: Exception) {
                null
            }
        }
    }

    // --- COMUNICAÇÃO COM O FIREBASE CLOUD ---
    private suspend fun enviarParaServidor(identificador: String, modo: String) {
        val nomeEncontrado = buscarNomeNaAPI(identificador)
        val textoExibicao = nomeEncontrado ?: identificador

        withContext(Dispatchers.Main) {
            isWaitingForTag = false
            progressBar.visibility = View.VISIBLE
            tvStatus.text = "Enviando dados..."
            tvResult.text = textoExibicao
            tvResult.visibility = View.VISIBLE
        }

        try {
            // Referência ao documento de presença no Firebase
            val docRef = db.collection("treinamentos")
                           .document(treinamentoIdStr)
                           .collection("presencas")
                           .document(identificador)
            
            // Verifica se já existe para evitar duplicação local
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
            
            // Salva na nuvem
            val data = hashMapOf(
                "identificador_lido" to identificador,
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
}
