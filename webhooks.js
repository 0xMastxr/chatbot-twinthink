const axios = require("axios");

const SPREADSHEET_ID = "1l-choo_2txhCuSa7u4BdvZQKtTUzhlgg5rypiFKcysc"; // Cambia por tu ID de hoja pública
const GOOGLE_SHEETS_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=`;
const WEBHOOK_URL = "https://connect.pabbly.com/workflow/sendwebhookdata/IjU3NjYwNTZmMDYzNzA0Mzc1MjZiNTUzNTUxMzIi_pc";

/**
 * Obtiene datos de una hoja pública sin autenticación
 */
async function fetchPublicSheetData(sheetName) {
  const url = `${GOOGLE_SHEETS_URL}${encodeURIComponent(sheetName)}`;

  try {
    const response = await axios.get(url);
    const rows = response.data.split("\n").map((row) => row.split(","));
    return rows;
  } catch (error) {
    console.error(`Error al obtener datos de la hoja ${sheetName}:`, error.message);
    return [];
  }
}

/**
 * Envía un POST al webhook cuando se detectan cambios.
 */
async function sendWebhook(headers, row, sentMessages) {
  const payload = headers.reduce((acc, header, index) => {
    acc[header] = row[index] || "N/A";
    return acc;
  }, {});

  const data = Object.entries(payload)
    .map(([key, value]) => `${key}=${encodeURIComponent(value)}`)
    .join("&");

  const uniqueKey = JSON.stringify(payload); // Clave única basada en los datos
  if (sentMessages.has(uniqueKey)) {
    console.log("Webhook ya enviado previamente para esta fila.");
    return;
  }

  try {
    await axios.post(WEBHOOK_URL, data, {
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
    });
    console.log("Webhook enviado exitosamente.");
    sentMessages.add(uniqueKey);
  } catch (error) {
    console.error("Error enviando el webhook:", error.message);
  }
}

/**
 * Monitorea cambios en las hojas de cálculo.
 */
async function monitorSheets() {
  const sheetStates = {};
  const sentMessages = new Set();

  const processSheet = async (sheetName) => {
    if (!sheetStates[sheetName]) {
      sheetStates[sheetName] = {
        headers: [],
        previousRows: [],
        lastRowCount: 0,
      };
    }
    const state = sheetStates[sheetName];

    try {
      const rows = await fetchPublicSheetData(sheetName);

      if (rows.length > 0 && state.headers.length === 0) {
        state.headers = rows[0] || [];
        if (state.headers.length === 0) {
          console.error(`No se encontraron encabezados en la hoja: ${sheetName}`);
          return;
        }
      }

      if (state.previousRows.length === 0) {
        state.previousRows = rows.map((row) => [...row]);
        state.lastRowCount = rows.length;
        return;
      }

      if (rows.length > state.lastRowCount) {
        const newRows = rows.slice(state.lastRowCount);
        state.lastRowCount = rows.length;

        for (const row of newRows) {
          await sendWebhook(state.headers, row, sentMessages);
        }

        state.previousRows = rows.map((row) => [...row]);
      }

      rows.forEach(async (row, rowIndex) => {
        if (rowIndex === 0) return;

        const previousRow = state.previousRows[rowIndex] || [];
        const uniqueKey = JSON.stringify(row); // Clave única para identificar la fila

        if (row.some((cell, colIndex) => cell !== previousRow[colIndex])) {
          if (sentMessages.has(uniqueKey)) {
            console.log("Webhook ya enviado previamente para esta fila actualizada.");
            return;
          }

          await sendWebhook(state.headers, row, sentMessages);
          state.previousRows[rowIndex] = [...row];
        }
      });
    } catch (error) {
      console.error(`Error procesando la hoja ${sheetName}:`, error);
    }
  };

  while (true) {
    await processSheet("Form1");
    await processSheet("Enriquecido1");
    await new Promise((resolve) => setTimeout(resolve, 60000));
  }
}

monitorSheets().catch((err) => {
  console.error("Error monitoreando hojas:", err);
});
