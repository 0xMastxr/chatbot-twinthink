const {
  createBot,
  createProvider,
  createFlow,
  addKeyword,
} = require("@bot-whatsapp/bot");

const axios = require("axios");
const QRPortalWeb = require("@bot-whatsapp/portal");
const BaileysProvider = require("@bot-whatsapp/provider/baileys");
const MongoAdapter = require("@bot-whatsapp/database/mongo");

/**
 * Conexiones MongoDB
 */
const MONGO_DB_URI =
  "mongodb+srv://mastxrdev:1234@atlascluster.lxlkmgi.mongodb.net/?retryWrites=true&w=majority&appName=AtlasCluster";
const MONGO_DB_NAME = "db_bot";

const SPREADSHEET_ID = "1l-choo_2txhCuSa7u4BdvZQKtTUzhlgg5rypiFKcysc"; // Cambia por tu ID de hoja pública

// URL base para acceder a una hoja pública
const GOOGLE_SHEETS_URL = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/tq?tqx=out:csv&sheet=`;

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
 * Flujo principal del bot.
 */
const flowBucle = addKeyword(["latorremakinacrackfiguramaricon"]).addAnswer(
  "Entrando en el bucle infinito... 🌀",
  null,
  async (_, { flowDynamic }) => {
    const sheetStates = {};

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
            const message = state.headers
              .map((header, index) => `${header}: ${row[index] || "N/A"}`)
              .join("\n");
            await flowDynamic(
              `Nueva fila detectada en la hoja "${sheetName}":\n\n${message}`
            );
          }

          state.previousRows = rows.map((row) => [...row]);
        }

        rows.forEach(async (row, rowIndex) => {
          if (rowIndex === 0) return;

          const previousRow = state.previousRows[rowIndex] || [];
          if (
            row.some((cell, colIndex) => cell !== previousRow[colIndex])
          ) {
            const message = state.headers
              .map((header, index) => `${header}: ${row[index] || "N/A"}`)
              .join("\n");
            await flowDynamic(
              `Actualización en la hoja "${sheetName}", fila ${rowIndex + 1}:\n\n${message}`
            );

            state.previousRows[rowIndex] = [...row];
          }
        });
      } catch (error) {
        console.error(`Error procesando la hoja "${sheetName}":`, error);
      }
    };

    while (true) {
      await processSheet("Form1");
      await processSheet("Enriquecido1");
      await new Promise((resolve) => setTimeout(resolve, 60000));
    }
  }
);

/**
 * Configuración principal
 */
const main = async () => {
  const adapterDB = new MongoAdapter({
    dbUri: MONGO_DB_URI,
    dbName: MONGO_DB_NAME,
  });
  const adapterProvider = createProvider(BaileysProvider);
  const adapterFlow = createFlow([flowBucle]);
  createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  });
  QRPortalWeb();
};

main().catch((err) => {
  console.error("Error ejecutando el bot:", err);
});
