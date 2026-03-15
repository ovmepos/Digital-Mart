import express from "express";
import { createServer as createViteServer } from "vite";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));

  // Yoyomedia API Proxy
  app.post("/api/yoyo/proxy", async (req, res) => {
    const { key, action, ...params } = req.body;

    if (!key) {
      return res.status(400).json({ error: "API Key is required" });
    }

    try {
      const body = new URLSearchParams({
        key,
        action,
        ...params,
      });

      const response = await fetch("https://yoyomedia.in/api/v2", {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: body.toString(),
      });

      const data = await response.json();
      res.json(data);
    } catch (error) {
      console.error("Yoyo API Error:", error);
      res.status(500).json({ error: "Failed to call Yoyomedia API" });
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
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.get("*", (req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
