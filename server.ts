import express from "express";
import path from "path";
import { createServer as createViteServer } from "vite";
import admin from "firebase-admin";

// Initialize Firebase Admin (Note: Needs specific env vars if connecting to real project)
// For now, we will create a mock setup or a basic placeholder since it's a webhook
try {
  // admin.initializeApp({
  //   credential: admin.credential.applicationDefault()
  // });
} catch (e) {}

async function startServer() {
  const app = express();
  const PORT = 3000;

  // Middleware to parse JSON bodies
  app.use(express.json());
  // Some fingerprint devices send form-urlencoded
  app.use(express.urlencoded({ extended: true }));

  // --- API Routes ---
  
  // Health check
  app.get("/api/health", (req, res) => {
    res.json({ status: "ok" });
  });

  // Biometric Webhook (ADMS/Push)
  app.post("/api/biometric-webhook", async (req, res) => {
    try {
      console.log("Received Biometric Webhook Data:", req.body);
      
      const payload = req.body;
      
      // Expected payload format could vary based on device (ZKTeco ADMS, iclock, etc.)
      // ZKTeco often pushes data using text or specific ADMS format.
      // We will parse it and typically we would update Firestore directly via Admin SDK:
      // const db = admin.firestore();
      
      // Example structure expected by our system for the bridge to send:
      // {
      //   "deviceId": "ZKT-12345",
      //   "records": [
      //     { "empId": "12", "timestamp": "2023-10-27T08:30:00Z", "type": "CheckIn" }
      //   ]
      // }
      
      // Here we would sync it to Firebase
      // For now, return OK to the device so it knows data was received
      
      res.status(200).send("OK");
    } catch (error) {
      console.error("Webhook processing error:", error);
      res.status(500).send("Internal Server Error");
    }
  });
  
  // ADMS Protocol requires specific handshake routes for ZKTeco usually (iclock/cdata)
  app.get("/iclock/cdata", (req, res) => {
    console.log("ADMS GET cdata (handshake):", req.query);
    res.status(200).send("OK");
  });
  app.post("/iclock/cdata", (req, res) => {
    console.log("ADMS POST cdata (records):", req.body);
    res.status(200).send("OK");
  });

  // --- End API Routes ---

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    // Production: serve static files
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
