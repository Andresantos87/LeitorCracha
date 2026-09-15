const fs = require('fs');
let code = fs.readFileSync('C:\Users\ansantos\OneDrive - CMPC\Área de Trabalho\APK\LeitorCrachaKotlin\app\src\main\kotlin\com\empresa\leitorcracha\MainActivity.kt', 'utf8');

const regex = /private fun extrairRutOuIdentificador[\s\S]*?return texto\r?\n    }/;

const replacement = \private fun extrairRutOuIdentificador(raw: String): String {
        var texto = raw.trim()
        
        val matchRun = Regex("(?i)run=([^&]+)").find(texto)
        if (matchRun != null) return matchRun.groupValues[1].replace("/", "_").replace("#", "").trim()
        
        val matchRut = Regex("(?i)rut=([^&]+)").find(texto)
        if (matchRut != null) return matchRut.groupValues[1].replace("/", "_").replace("#", "").trim()
        
        val matchId = Regex("(?i)id=([^&]+)").find(texto)
        if (matchId != null && texto.contains("http", ignoreCase = true)) {
            return matchId.groupValues[1].replace("/", "_").replace("#", "").trim()
        }
        
        if (texto.startsWith("http", ignoreCase = true) || texto.contains("/")) {
            texto = texto.substringAfterLast("/").substringBefore("?").trim()
        }
        texto = texto.replace("/", "_").replace("#", "").replace("\\$", "").replace("[", "").replace("]", "").trim()
        
        return if (texto.isBlank()) raw.take(20) else texto
    }\;

code = code.replace(regex, replacement);
fs.writeFileSync('C:\Users\ansantos\OneDrive - CMPC\Área de Trabalho\APK\LeitorCrachaKotlin\app\src\main\kotlin\com\empresa\leitorcracha\MainActivity.kt', code, 'utf8');
