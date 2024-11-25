const {
  createBot,
  createProvider,
  createFlow,
  addKeyword,
} = require("@bot-whatsapp/bot");

const { google } = require("googleapis");
const fs = require("fs").promises;
const path = require("path");
const TOKEN_PATH = path.join(process.cwd(), "token.json");

const QRPortalWeb = require("@bot-whatsapp/portal");
const BaileysProvider = require("@bot-whatsapp/provider/baileys");
const MongoAdapter = require("@bot-whatsapp/database/mongo");

/**
 * Conexiones MongoDB
 */
const MONGO_DB_URI =
  "mongodb+srv://mastxrdev:1234@atlascluster.lxlkmgi.mongodb.net/?retryWrites=true&w=majority&appName=AtlasCluster";
const MONGO_DB_NAME = "db_bot";

// Credenciales de OAuth2
const SCOPES = ['https://www.googleapis.com/auth/spreadsheets.readonly'];
const CREDENTIALS_PATH = path.join(process.cwd(), 'credentials.json');
const SPREADSHEET_ID = "1l-choo_2txhCuSa7u4BdvZQKtTUzhlgg5rypiFKcysc";

let lastRowCount = 0; // Número de filas leídas previamente

/**
 * Carga o solicita autorización OAuth2.
 */
async function authorize() {
  const { authenticate } = require("@google-cloud/local-auth");
  async function loadSavedCredentialsIfExist() {
    try {
      const content = await fs.readFile(TOKEN_PATH);
      const credentials = JSON.parse(content);
      return google.auth.fromJSON(credentials);
    } catch (err) {
      return null;
    }
  }
  async function saveCredentials(client) {
    const content = await fs.readFile(CREDENTIALS_PATH);
    const keys = JSON.parse(content);
    const key = keys.installed || keys.web;
    const payload = JSON.stringify({
      type: 'authorized_user',
      client_id: key.client_id,
      client_secret: key.client_secret,
      refresh_token: client.credentials.refresh_token,
    });
    await fs.writeFile(TOKEN_PATH, payload);
  }
  let client = await loadSavedCredentialsIfExist();
  if (client) {
    return client;
  }
  client = await authenticate({
    scopes: SCOPES,
    keyfilePath: CREDENTIALS_PATH,
  });
  if (client.credentials) {
    await saveCredentials(client);
  }
  return client;
}

/**
 * Lee las filas de la hoja de cálculo.
 */
async function fetchSheetData(auth, range) {
  const sheets = google.sheets({ version: "v4", auth });
  const res = await sheets.spreadsheets.values.get({
    spreadsheetId: SPREADSHEET_ID,
    range: range, // Toda la hoja
  });

  const rows = res.data.values || [];
  return rows; // Devuelve todas las filas
}

/**
 * Flujo principal del bot.
 */
const flowBucle = addKeyword(["iniciar"]).addAnswer(
  "Entrando en el bucle infinito... 🌀",
  null,
  async (_, { flowDynamic }) => {
    const auth = await authorize();

    // Estado independiente para cada hoja
    const sheetStates = {};

    const processSheet = async (sheetName) => {
      // Inicializar estado de la hoja si no existe
      if (!sheetStates[sheetName]) {
        sheetStates[sheetName] = {
          headers: [],
          previousRows: [],
          lastRowCount: 0,
        };
      }
      const state = sheetStates[sheetName];
      const range = `${sheetName}!A:Z`; // Rango de celdas de la hoja

      try {
        // Obtener datos de la hoja
        const rows = await fetchSheetData(auth, range);

        // Verifica encabezados (primera fila de la hoja)
        if (rows.length > 0 && state.headers.length === 0) {
          state.headers = rows[0] || [];
          if (state.headers.length === 0) {
            console.error(`No se encontraron encabezados en la hoja: ${sheetName}`);
            return;
          }
        }

        // Si es la primera lectura, inicializa previousRows
        if (state.previousRows.length === 0) {
          state.previousRows = rows.map((row) => [...row]);
          state.lastRowCount = rows.length;
          return; // Salta la notificación inicial
        }

        // Detectar nuevas filas
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

          // Actualizar estado
          state.previousRows = rows.map((row) => [...row]);
        }

        // Detectar cambios en filas existentes
        rows.forEach(async (row, rowIndex) => {
          if (rowIndex === 0) return; // Saltar la fila de encabezados

          const previousRow = state.previousRows[rowIndex] || [];
          if (
            row.some((cell, colIndex) => cell !== previousRow[colIndex]) // Detectar cambios
          ) {
            const message = state.headers
              .map((header, index) => `${header}: ${row[index] || "N/A"}`)
              .join("\n");
            await flowDynamic(
              `Actualización en la hoja "${sheetName}", fila ${rowIndex + 1}:\n\n${message}`
            );

            // Actualizar fila en el estado
            state.previousRows[rowIndex] = [...row];
          }
        });
      } catch (error) {
        console.error(`Error procesando la hoja "${sheetName}":`, error);
      }
    };

    while (true) {
      await processSheet("Form1"); // Procesar primera hoja
      await processSheet("Enriquecido1"); // Procesar segunda hoja

      // Esperar un segundo antes de la siguiente iteración
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
