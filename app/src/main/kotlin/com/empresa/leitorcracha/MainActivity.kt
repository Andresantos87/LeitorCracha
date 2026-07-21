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
import retrofit2.Retrofit
import retrofit2.converter.gson.GsonConverterFactory
import retrofit2.http.Body
import retrofit2.http.POST

// --- RETROFIT API INTERFACE ---
data class PresencaRequest(
    val id_treinamento: String,
    val identificador_lido: String,
    val modo_registro: String
)
data class PresencaResponse(val success: Boolean, val data: Any?, val error: String?)

interface ApiService {
    @POST("api/registrar")
    suspend fun registrarPresenca(@Body request: PresencaRequest): PresencaResponse
}
// -----------------------------

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
    private lateinit var etTreinamentoId: EditText

    private var isWaitingForTag = false

    // Configuração da API (Troque o IP pelo IP local do seu computador na rede Wi-Fi)
    private val api = Retrofit.Builder()
        .baseUrl("http://192.168.0.100:3000/") // IMPORTANTE: Mudar para o IP do seu PC
        .addConverterFactory(GsonConverterFactory.create())
        .build()
        .create(ApiService::class.java)

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        tvStatus    = findViewById(R.id.tvStatus)
        tvResult    = findViewById(R.id.tvResult)
        progressBar = findViewById(R.id.progressBar)
        btnScanNfc  = findViewById(R.id.btnScan)
        btnScanQr   = findViewById(R.id.btnScanQr)
        etTreinamentoId = findViewById(R.id.etTreinamentoId)

        val adapter = NfcAdapter.getDefaultAdapter(this)
        if (adapter != null && adapter.isEnabled) {
            nfcAdapter = adapter
            btnScanNfc.isEnabled = true
        } else {
            btnScanNfc.text = "NFC INDISPONÍVEL"
        }

        btnScanNfc.setOnClickListener {
            if (etTreinamentoId.text.isBlank()) {
                Toast.makeText(this, "Preencha o ID do Treinamento", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            isWaitingForTag = true
            tvStatus.text  = "Aproxime o crachá..."
            tvResult.visibility = View.GONE
            progressBar.visibility = View.VISIBLE
            btnScanNfc.isEnabled = false
        }

        btnScanQr.setOnClickListener {
            if (etTreinamentoId.text.isBlank()) {
                Toast.makeText(this, "Preencha o ID do Treinamento", Toast.LENGTH_SHORT).show()
                return@setOnClickListener
            }
            // Inicia o leitor de QR Code
            val integrator = IntentIntegrator(this)
            integrator.setDesiredBarcodeFormats(IntentIntegrator.QR_CODE)
            integrator.setPrompt("Aponte para o QR Code (RUT)")
            integrator.setCameraId(0) // Câmera traseira
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
                mostrarErro("Leitura de QR cancelada")
            } else {
                val rut = result.contents
                CoroutineScope(Dispatchers.IO).launch {
                    enviarParaServidor(rut, "QR_CODE")
                }
            }
        } else {
            super.onActivityResult(requestCode, resultCode, data)
        }
    }

    // --- COMUNICAÇÃO COM A API ---
    private suspend fun enviarParaServidor(identificador: String, modo: String) {
        withContext(Dispatchers.Main) {
            isWaitingForTag = false
            progressBar.visibility = View.VISIBLE
            tvStatus.text = "Enviando dados..."
            tvResult.text = identificador
            tvResult.visibility = View.VISIBLE
        }

        try {
            val req = PresencaRequest(
                id_treinamento = etTreinamentoId.text.toString(),
                identificador_lido = identificador,
                modo_registro = modo
            )
            val res = api.registrarPresenca(req)

            withContext(Dispatchers.Main) {
                progressBar.visibility = View.GONE
                btnScanNfc.isEnabled = true
                if (res.success) {
                    tvStatus.text = "✅ Presença Registrada!"
                    tvStatus.setTextColor(getColor(R.color.colorSuccess))
                } else {
                    tvStatus.text = "❌ Erro: ${res.error}"
                    tvStatus.setTextColor(getColor(R.color.colorError))
                }
            }
        } catch (e: Exception) {
            withContext(Dispatchers.Main) {
                progressBar.visibility = View.GONE
                btnScanNfc.isEnabled = true
                tvStatus.text = "❌ Falha de Conexão: O Painel Web está rodando?"
                tvStatus.setTextColor(getColor(R.color.colorError))
            }
        }
    }

    private suspend fun mostrarErro(msg: String) {
        withContext(Dispatchers.Main) {
            isWaitingForTag = false
            progressBar.visibility = View.GONE
            btnScanNfc.isEnabled = true
            tvStatus.text = msg
            tvStatus.setTextColor(getColor(R.color.colorError))
        }
    }
}
