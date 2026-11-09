import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import { GoogleGenAI } from "@google/genai";

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json({ limit: '100mb' }));

  // API routes FIRST
  app.post("/api/improve-description", async (req, res) => {
    try {
      const { title, currentDescription, sizes, colors } = req.body;
      
      if (!process.env.GEMINI_API_KEY) {
        return res.status(500).json({ 
          error: "La clave GEMINI_API_KEY no está configurada. Por favor, agrégala en la sección de Secretos." 
        });
      }

      const ai = new GoogleGenAI({
        apiKey: process.env.GEMINI_API_KEY,
        httpOptions: {
          headers: {
            'User-Agent': 'aistudio-build',
          }
        }
      });

      const systemPrompt = `Eres un redactor experto de e-commerce y catálogos de venta mayorista y minorista. 
Tu tarea es tomar la información de un producto (Título, Descripción actual, Talles y Colores) y redactar una descripción sumamente profesional, atractiva y persuasiva para convencer al cliente. 
Resalta los beneficios principales, la calidad y versatilidad del producto de manera amigable.
Debe ser clara y bien estructurada, con viñetas limpias si es necesario.
Sé conciso y directo (entre 2 y 4 oraciones o viñetas breves), optimizado para lectura rápida en celulares.
NO agregues notas personales, saludos, introducciones ni explicaciones de lo que hiciste. Devuelve ÚNICAMENTE la descripción optimizada lista para usar.`;

      const contents = `Mejora, detalla y optimiza esta descripción para mi catálogo:
Título: ${title || "Producto"}
Descripción original: ${currentDescription || "No provista"}
Talles: ${sizes || "No provisto"}
Colores: ${colors || "No provisto"}`;

      const modelsToTry = ["gemini-2.5-flash", "gemini-2.5-flash-lite", "gemini-3.1-flash-lite", "gemini-3.5-flash", "gemini-flash-latest"];
      let response = null;
      let lastError = null;

      for (const modelName of modelsToTry) {
        try {
          console.log(`Intentando optimizar descripción con el modelo: ${modelName}`);
          response = await ai.models.generateContent({
            model: modelName,
            contents,
            config: {
              systemInstruction: systemPrompt,
            }
          });
          if (response) {
            console.log(`Éxito con el modelo: ${modelName}`);
            break;
          }
        } catch (err: any) {
          console.warn(`Error al usar el modelo ${modelName}:`, err.message || err);
          lastError = err;
        }
      }

      if (!response) {
        throw lastError || new Error("No se pudo conectar con ningún modelo de IA disponible.");
      }

      let improvedText = response.text?.trim() || "";
      // Strip accidental markdown code fences
      improvedText = improvedText.replace(/^```[a-z]*\n?/i, "").replace(/\n?```$/i, "").trim();

      if (!improvedText || improvedText.length < 5) {
        return res.status(400).json({
          error: "La Inteligencia Artificial devolvió un resultado insuficiente. Se ha mantenido la descripción original para no perder datos."
        });
      }

      res.json({ success: true, improvedText });
    } catch (error: any) {
      console.error("Error generating improved description:", error);
      
      let friendlyMessage = "Error al procesar la optimización de la descripción con IA.";
      let rawMessage = error.message || "";
      
      try {
        if (typeof rawMessage === "string" && rawMessage.trim().startsWith("{")) {
          const parsed = JSON.parse(rawMessage);
          if (parsed.error) {
            const code = parsed.error.code;
            const msg = parsed.error.message;
            if (code === 503 || msg?.includes("high demand") || msg?.includes("temporary") || msg?.includes("UNAVAILABLE")) {
              friendlyMessage = "Los servidores de Inteligencia Artificial están experimentando una alta demanda temporal. Por favor, vuelve a intentarlo en unos segundos.";
            } else if (code === 403 || msg?.includes("API key") || msg?.includes("API_KEY_INVALID")) {
              friendlyMessage = "La clave de API de Gemini no parece válida o no está configurada. Por favor, verifícala en la sección de Configuración > Secretos.";
            } else {
              friendlyMessage = msg || friendlyMessage;
            }
          }
        } else {
          const msgLower = rawMessage.toLowerCase();
          if (rawMessage.includes("503") || msgLower.includes("unavailable") || msgLower.includes("high demand") || msgLower.includes("temporary")) {
            friendlyMessage = "Los servidores de Inteligencia Artificial están experimentando una alta demanda temporal. Por favor, vuelve a intentarlo en unos segundos.";
          } else if (rawMessage.includes("403") || msgLower.includes("api key") || msgLower.includes("api_key_invalid")) {
            friendlyMessage = "La clave de API de Gemini no parece válida o no está configurada. Por favor, verifícala en la sección de Configuración > Secretos.";
          } else {
            friendlyMessage = rawMessage || friendlyMessage;
          }
        }
      } catch (parseErr) {
        friendlyMessage = rawMessage || friendlyMessage;
      }

      res.status(500).json({ 
        error: friendlyMessage 
      });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
