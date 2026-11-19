import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import tenantAuthHandler from "./api/tenant-auth";
import tenantErpHandler from "./api/tenant-erp";
import uploadHandler from "./api/upload";

async function startServer() {
  const app = express();
  const PORT = Number(process.env.PORT) || 3000;

  // Middleware to parse JSON & large product payloads safely
  app.use(express.json({ limit: "15mb" }));
  app.use(express.urlencoded({ extended: true, limit: "15mb" }));

  // Health check
  app.get("/api/health", (_req, res) => {
    res.json({ status: "ok" });
  });

  // Sovereign Vercel-compatible Tenant Auth & ERP routes
  app.all("/api/tenant-auth", (req, res) => tenantAuthHandler(req as any, res as any));
  app.all("/api/tenant-erp", (req, res) => tenantErpHandler(req as any, res as any));
  app.all("/api/upload", (req, res) => uploadHandler(req as any, res as any));

  // Biometric Webhook (ADMS/Push)
  app.post("/api/biometric-webhook", async (req, res) => {
    try {
      console.log("Received Biometric Webhook Data:", req.body);
      res.status(200).send("OK");
    } catch (error) {
      console.error("Webhook processing error:", error);
      res.status(500).send("Internal Server Error");
    }
  });

  // ADMS Protocol handshake routes for ZKTeco
  app.get("/iclock/cdata", (req, res) => {
    console.log("ADMS GET cdata (handshake):", req.query);
    res.status(200).send("OK");
  });
  app.post("/iclock/cdata", (req, res) => {
    console.log("ADMS POST cdata (records):", req.body);
    res.status(200).send("OK");
  });

  // Vite middleware for development vs static SPA fallback in production
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), "dist");
    app.use(express.static(distPath));
    app.use((_req, res) => {
      res.sendFile(path.join(distPath, "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
