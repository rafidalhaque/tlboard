import "dotenv/config";
import http from "node:http";
import path from "node:path";
import express from "express";
import cors from "cors";
import rateLimit from "express-rate-limit";
import { ExpressAuth } from "@auth/express";
import { authConfig } from "./auth.js";
import { loadUser } from "./middleware.js";
import { boardsRouter } from "./routes/boards.js";
import { adminRouter } from "./routes/admin.js";
import { searchRouter } from "./routes/search.js";
import { assetsRouter, ASSET_DIR } from "./routes/assets.js";
import { handleUpgrade } from "./sync.js";
import { ensureBoardIndex } from "./meilisearch.js";
import { db, schema } from "./db/index.js";
import { requireApproved } from "./middleware.js";

const app = express();
const APP_ORIGINS = (process.env.APP_ORIGIN || "http://localhost:5173").split(",").map((o) => o.trim());

// two hops in front: host Nginx/Cloudflare, then the container nginx in docker-compose —
// trust both so req.protocol/secure cookies read the real client's X-Forwarded-* correctly
app.set("trust proxy", 2);
app.use(cors({ origin: APP_ORIGINS, credentials: true }));
app.use(express.json());

const authLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20 });
const adminLimiter = rateLimit({ windowMs: 15 * 60 * 1000, limit: 100 });

app.use("/api/auth", authLimiter, ExpressAuth(authConfig));
app.use(loadUser);

app.get("/api/me", (req, res) => {
  if (!req.user) return res.status(401).json({ error: "not_authenticated" });
  res.json(req.user);
});

app.use("/api/boards", boardsRouter);
app.use("/api/admin", adminLimiter, adminRouter);
app.use("/api/search", searchRouter);
// nosniff + a locked-down CSP on every served asset: extension is allowlisted server-side
// (see routes/assets.ts) so this Content-Type is trustworthy, but nosniff+CSP is cheap
// defense in depth against a same-origin stored-XSS via a mislabeled upload.
app.use(
  "/api/assets",
  requireApproved,
  express.static(ASSET_DIR, {
    setHeaders: (res) => {
      res.setHeader("X-Content-Type-Options", "nosniff");
      res.setHeader("Content-Security-Policy", "default-src 'none'; sandbox");
    },
  }),
  assetsRouter
);

// serve the built React app in production (single combined container)
const webDist = path.resolve(process.cwd(), "../web/dist");
app.use(express.static(webDist));
app.get(/^(?!\/api).*/, (_req, res) => res.sendFile(path.join(webDist, "index.html")));

const server = http.createServer(app);
server.on("upgrade", (req, socket, head) => {
  if (new URL(req.url ?? "", "http://internal").pathname.startsWith("/api/sync/")) {
    handleUpgrade(req, socket, head);
  } else {
    socket.destroy();
  }
});

async function bootstrap() {
  await db
    .insert(schema.appSettings)
    .values({ id: 1, signupMode: "approval_required" })
    .onConflictDoNothing();
  await ensureBoardIndex();

  const port = Number(process.env.PORT) || 3000;
  server.listen(port, () => console.log(`tlboard listening on :${port}`));
}

bootstrap();
