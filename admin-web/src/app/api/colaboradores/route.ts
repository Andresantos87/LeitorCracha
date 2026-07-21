import { NextResponse } from "next/server";
import { BigQuery } from "@google-cloud/bigquery";

// Inicializa o cliente do BigQuery.
// Ele usará automaticamente as Application Default Credentials (ADC) do sistema local
// ou a variável de ambiente GOOGLE_APPLICATION_CREDENTIALS, se definida.
const bigquery = new BigQuery();

export async function GET() {
  try {
    // A query fornecida pelo usuário
    const query = `
      SELECT *
      FROM \`cmpc-all-mof-prod.cmpc_all_data_integration_pt_digital.cmpc_all_pt_digital_sat_contratista\`
      WHERE
        insert_tm >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR) AND
        insert_tm = (
            SELECT MAX(insert_tm)
            FROM \`cmpc-all-mof-prod.cmpc_all_data_integration_pt_digital.cmpc_all_pt_digital_sat_contratista\`
            WHERE insert_tm >= TIMESTAMP_SUB(CURRENT_TIMESTAMP(), INTERVAL 24 HOUR)
        )
      LIMIT 100
    `;

    const options = {
      query: query,
      // Location must match that of the dataset(s) referenced in the query.
      location: 'US', // Ajuste conforme a localização do seu dataset se não for US
    };

    // Run the query as a job
    const [job] = await bigquery.createQueryJob(options);
    
    // Wait for the query to finish
    const [rows] = await job.getQueryResults();

    return NextResponse.json({ success: true, data: rows });
  } catch (error: any) {
    console.error("Erro ao consultar BigQuery:", error);
    return NextResponse.json(
      { success: false, error: error.message || "Erro desconhecido ao consultar o BigQuery" },
      { status: 500 }
    );
  }
}
