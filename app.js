// BOT ---------------------------------------------------------------------------------------------------------------------------------------------------------
const {
  createBot,
  createProvider,
  createFlow,
  addKeyword,
} = require("@bot-whatsapp/bot");

const QRPortalWeb = require("@bot-whatsapp/portal");
const BaileysProvider = require("@bot-whatsapp/provider/baileys");
const MongoAdapter = require("@bot-whatsapp/database/mongo");

const path = require("path");

/**
 * Conexiones MongoDB
 */
const MONGO_DB_URI =
  "mongodb+srv://mastxrdev:1234@atlascluster.lxlkmgi.mongodb.net/?retryWrites=true&w=majority&appName=AtlasCluster";
const MONGO_DB_NAME = "db_bot";

/**
 * Flujos personalizados
 */

// Flujo de agradecimiento tras montar el producto
const flowGraciasCompra = addKeyword(["sí", "si", "claro", "so"])
  .addAnswer([
    "🎉 ¡Nos alegra que lo hayas logrado! 🙌",
    "Gracias por confiar en *URADIS*. Espero que disfrutes mucho de tu compra 😊.",
  ])
  .addAnswer(
    [
      "Antes de despedirme, ¿podrías dejarnos una *review*? Somos una marca pequeña y tus comentarios nos ayudan muchísimo a crecer. 🙏",
      "👉 [Dejar review](https://www.uradis.com/review)",
    ],
    { delay: 15000 }
  );

// Flujo para pedir más tiempo
const flowNecesitoMasTiempo = addKeyword([
  "necesito más tiempo",
  "mas tiempo",
  "espera",
])
  .addAnswer("No te preocupes, te doy más tiempo ⏳.")
  .addAnswer(
    [
      "Volveré a preguntarte en 30 minutos. ¡Recuerda, estoy aquí para ayudarte si lo necesitas! 😊",
    ],
    { delay: 1800000 }
  );

// Flujo cuando necesita soporte humano
const flowSoporteHumano = addKeyword([
  "no",
  "ni",
  "nada",
  "ayuda",
  "soporte",
  "humano",
  "agente",
]).addAnswer([
  "💬 Siento no haberte podido ayudar. Enseguida te atenderá un agente para guiarte mejor 🧑‍💻.",
  "Un momento por favor...",
]);

// Flujo principal activado por "montaje" o "instrucciones"
// Flujo principal activado por "montaje" o "instrucciones"
const flowMontaje = addKeyword([
  "montaje",
  "montar",
  "instruccion",
  "instrucciones",
  "instru",
  "armar",
  "montar",
])
  .addAnswer("🔧 Aquí tienes el vídeo de montaje que necesitas:")
  .addAnswer("Vídeo", {
    media: path.join(__dirname, "montaje.mp4"),
  })
  .addAnswer(
    "¿Has conseguido montarlo correctamente?",
    { delay: 1800000 },
    null,
    [flowNecesitoMasTiempo, flowSoporteHumano, flowGraciasCompra]
  );

// Flujo de soporte accesible desde cualquier punto
const flowContacto = addKeyword([
  "contacto",
  "soporte",
  "humano",
  "ayuda",
]).addAnswer([
  "Siento no poderte ayudar con eso directamente. 🧑‍💻 Enseguida te atenderá un agente.",
  "Gracias por tu paciencia. 😊",
]);

/**
 * Configuración principal
 */
const main = async () => {
  const adapterDB = new MongoAdapter({
    dbUri: MONGO_DB_URI,
    dbName: MONGO_DB_NAME,
  });
  const adapterFlow = createFlow([flowMontaje, flowContacto]);
  const adapterProvider = createProvider(BaileysProvider);
  createBot({
    flow: adapterFlow,
    provider: adapterProvider,
    database: adapterDB,
  });
  QRPortalWeb();
};

main();
