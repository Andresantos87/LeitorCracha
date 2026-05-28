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
import androidx.appcompat.app.AppCompatActivity
import kotlinx.coroutines.CoroutineScope
import kotlinx.coroutines.Dispatchers
import kotlinx.coroutines.launch
import kotlinx.coroutines.withContext

class MainActivity : AppCompatActivity() {

    // Chave de acesso do Setor 0 do crachá da empresa: B5B3E365A73B
    private val COMPANY_KEY = byteArrayOf(
        0xB5.toByte(), 0xB3.toByte(), 0xE3.toByte(),
        0x65.toByte(), 0xA7.toByte(), 0x3B.toByte()
    )

    private lateinit var nfcAdapter: NfcAdapter
    private lateinit var tvTitle: TextView
    private lateinit var tvSubtitle: TextView
    private lateinit var tvStatus: TextView
    private lateinit var tvResult: TextView
    private lateinit var progressBar: ProgressBar
    private lateinit var btnScan: Button

    private var isWaitingForTag = false

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)

        tvTitle     = findViewById(R.id.tvTitle)
        tvSubtitle  = findViewById(R.id.tvSubtitle)
        tvStatus    = findViewById(R.id.tvStatus)
        tvResult    = findViewById(R.id.tvResult)
        progressBar = findViewById(R.id.progressBar)
        btnScan     = findViewById(R.id.btnScan)

        val adapter = NfcAdapter.getDefaultAdapter(this)
        if (adapter == null) {
            showError("NFC não é suportado neste dispositivo.")
            btnScan.isEnabled = false
            return
        }
        nfcAdapter = adapter

        if (!nfcAdapter.isEnabled) {
            showError("NFC está desabilitado. Ative nas Configurações do celular.")
            btnScan.isEnabled = false
            return
        }

        btnScan.setOnClickListener {
            isWaitingForTag = true
            tvStatus.text  = "Aproxime o crachá na traseira do celular..."
            tvStatus.setTextColor(getColor(R.color.colorSubtitle))
            tvResult.visibility = View.GONE
            progressBar.visibility = View.VISIBLE
            btnScan.isEnabled = false
        }
    }

    override fun onResume() {
        super.onResume()
        if (!::nfcAdapter.isInitialized) return
        val intent = Intent(this, javaClass).addFlags(Intent.FLAG_ACTIVITY_SINGLE_TOP)
        val pending = PendingIntent.getActivity(
            this, 0, intent, PendingIntent.FLAG_MUTABLE
        )
        val techLists = arrayOf(arrayOf(MifareClassic::class.java.name))
        nfcAdapter.enableForegroundDispatch(this, pending, null, techLists)
    }

    override fun onPause() {
        super.onPause()
        if (::nfcAdapter.isInitialized) {
            nfcAdapter.disableForegroundDispatch(this)
        }
    }

    override fun onNewIntent(intent: Intent) {
        super.onNewIntent(intent)
        if (!isWaitingForTag) return
        val tag = intent.getParcelableExtra<Tag>(NfcAdapter.EXTRA_TAG) ?: return
        processTag(tag)
    }

    private fun processTag(tag: Tag) {
        CoroutineScope(Dispatchers.IO).launch {
            val outcome = try {
                val mifare = MifareClassic.get(tag)
                    ?: throw Exception("Cartão não é compatível com Mifare Classic.")

                mifare.connect()

                // Tenta Chave A, depois Chave B — ambas com a senha da empresa
                val authOk = mifare.authenticateSectorWithKeyA(0, COMPANY_KEY)
                    || mifare.authenticateSectorWithKeyB(0, COMPANY_KEY)

                if (!authOk) {
                    mifare.close()
                    throw Exception(
                        "Autenticação negada.\n" +
                        "Setor 0 não aceitou a senha B5B3E365A73B\n" +
                        "com Chave A nem Chave B.\n\n" +
                        "Verifique com o TI se a chave é a correta."
                    )
                }

                // Lê o Bloco 1 (índice absoluto = 1, dentro do Setor 0)
                val raw = mifare.readBlock(1)
                mifare.close()

                if (raw == null || raw.size < 6) {
                    throw Exception("Autenticação OK, mas bloco 1 sem dados.")
                }

                // Converte os 6 primeiros bytes de unsigned byte para decimal (2 dígitos cada)
                val matricula = buildString {
                    for (i in 0 until 6) {
                        val unsigned = raw[i].toInt() and 0xFF   // converte para 0-255
                        append(unsigned.toString().padStart(2, '0'))
                    }
                }

                Result.success(matricula)

            } catch (e: Exception) {
                Result.failure(e)
            }

            withContext(Dispatchers.Main) {
                isWaitingForTag   = false
                progressBar.visibility = View.GONE
                btnScan.isEnabled = true
                tvResult.visibility = View.VISIBLE

                if (outcome.isSuccess) {
                    val matricula = outcome.getOrNull()!!
                    tvStatus.text = "✅  Leitura concluída!"
                    tvStatus.setTextColor(getColor(R.color.colorSuccess))
                    tvResult.text = matricula
                    tvResult.setTextColor(getColor(R.color.colorSuccess))
                } else {
                    val msg = outcome.exceptionOrNull()?.message ?: "Erro desconhecido"
                    tvStatus.text = "❌  Falha na leitura"
                    tvStatus.setTextColor(getColor(R.color.colorError))
                    tvResult.text = msg
                    tvResult.setTextColor(getColor(R.color.colorError))
                }
            }
        }
    }

    private fun showError(msg: String) {
        tvStatus.text = msg
        tvStatus.setTextColor(getColor(R.color.colorError))
    }
}
