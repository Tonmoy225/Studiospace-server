import "dotenv/config";
import express from "express";
import cors from "cors";
import cookieParser from "cookie-parser";
import jwt from "jsonwebtoken";
import { MongoClient, ObjectId } from "mongodb";

const app = express();
app.use(cors({ origin: process.env.CLIENT_URL, credentials: true }));
app.use(express.json());
app.use(cookieParser());

const client = new MongoClient(process.env.MONGODB_URI);
const db = client.db("studiospace");
const studios = db.collection("studios");
const bookings = db.collection("bookings");
const wishlist = db.collection("wishlist");

// ---------- Challenge 1: JWT (HTTPOnly cookie) middleware ----------
const verifyJWT = (req, res, next) => {
  const token = req.cookies.studio_token;
  if (!token) {
    return res.status(401).json({ message: "Unauthorized: please login first" });
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET); // { id, email, name }
    next();
  } catch (err) {
    return res.status(401).json({ message: "Unauthorized: invalid or expired token" });
  }
};

// helpers
const validId = (id) => ObjectId.isValid(id);
const toMin = (t) => Number(t.slice(0, 2)) * 60 + Number(t.slice(3, 5));

const pickStudio = (b) => ({
  title: b.title,
  category: b.category,
  hourlyRate: Number(b.hourlyRate),
  securityDeposit: Number(b.securityDeposit),
  capacity: Number(b.capacity),
  location: b.location,
  image: b.image,
  gallery: b.gallery || [],
  amenities: b.amenities || [],
  overview: b.overview,
});

// ================= HOME (status page) + HEALTH =================

// the same camera-lens logo as the client (iris rotates with CSS)
const LOGO_SVG = `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 48 48" fill="none">
  <circle cx="24" cy="24" r="22" stroke="#ff922b" stroke-width="2.5"/>
  <circle cx="24" cy="24" r="19.5" fill="#111827"/>
  <g class="iris" fill="#ff922b" stroke="#111827" stroke-width="1.2" stroke-linejoin="round">
    ${[0, 1, 2, 3, 4, 5]
      .map(
        (i) =>
          `<path d="M24 24 L24 8.5 A15.5 15.5 0 0 1 37.42 16.25 Z" transform="rotate(${i * 60} 24 24)" fill-opacity="${i % 2 === 0 ? 1 : 0.72}"/>`
      )
      .join("")}
  </g>
  <circle cx="24" cy="24" r="6.5" fill="#111827" stroke="#ff922b" stroke-width="1.2"/>
  <circle cx="24" cy="24" r="3.4" fill="#0b1220"/>
  <circle cx="21.9" cy="21.9" r="1.4" fill="#fff" fill-opacity="0.85"/>
</svg>`;

const FAVICON_SVG = LOGO_SVG.replace('class="iris" ', "");

const HOME_PAGE = `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1" />
  <title>StudioSpace API</title>
  <link rel="icon" type="image/svg+xml" href="/favicon.svg" />
  <style>
    *{box-sizing:border-box;margin:0;padding:0}
    body{min-height:100vh;display:flex;align-items:center;justify-content:center;padding:24px;
      font-family:system-ui,-apple-system,"Segoe UI",Roboto,sans-serif;color:#e5e7eb;
      background:linear-gradient(135deg,#0b0f19 0%,#141b2d 50%,#1f1410 100%)}
    .card{width:100%;max-width:520px;padding:36px 32px;border-radius:20px;text-align:center;
      background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.09);
      box-shadow:0 20px 60px rgba(0,0,0,.45)}
    .logo{width:84px;height:84px;margin:0 auto 14px}
    .logo svg{width:100%;height:100%}
    .iris{transform-box:view-box;transform-origin:24px 24px;animation:iris-spin 2.4s linear infinite}
    @keyframes iris-spin{to{transform:rotate(360deg)}}
    h1{font-size:28px;font-weight:800;letter-spacing:-.02em;color:#ff922b}
    h1 span{font-weight:600;color:#f3f4f6}
    .sub{margin-top:6px;font-size:14px;color:#9ca3af}
    .status{display:inline-flex;align-items:center;gap:8px;margin:22px 0 6px;padding:7px 16px;
      border-radius:999px;font-size:14px;font-weight:600;background:rgba(255,255,255,.06)}
    .dot{width:9px;height:9px;border-radius:50%;background:#9ca3af}
    .ok .dot{background:#22c55e;box-shadow:0 0 0 0 rgba(34,197,94,.6);animation:pulse 1.8s infinite}
    .down .dot{background:#ef4444}
    @keyframes pulse{70%{box-shadow:0 0 0 9px rgba(34,197,94,0)}100%{box-shadow:0 0 0 0 rgba(34,197,94,0)}}
    .meta{font-size:12px;color:#6b7280;min-height:16px}
    .grid{display:grid;grid-template-columns:1fr 1fr;gap:10px;margin-top:24px;text-align:left}
    .grid div{padding:12px 14px;border-radius:12px;background:rgba(255,255,255,.04);border:1px solid rgba(255,255,255,.07)}
    .grid small{display:block;font-size:11px;text-transform:uppercase;letter-spacing:.06em;color:#6b7280}
    .grid b{font-size:14px;font-weight:600}
    h2{margin:26px 0 10px;font-size:12px;text-transform:uppercase;letter-spacing:.08em;color:#6b7280;text-align:left}
    ul{list-style:none;text-align:left}
    li{display:flex;align-items:center;gap:10px;padding:8px 0;border-bottom:1px solid rgba(255,255,255,.06);font-size:13px}
    li:last-child{border-bottom:0}
    .m{min-width:52px;padding:2px 8px;border-radius:6px;font-size:11px;font-weight:700;text-align:center;font-family:ui-monospace,Menlo,monospace}
    .GET{background:rgba(34,197,94,.15);color:#4ade80}
    .POST{background:rgba(59,130,246,.15);color:#60a5fa}
    .PUT,.PATCH{background:rgba(245,158,11,.15);color:#fbbf24}
    .DELETE{background:rgba(239,68,68,.15);color:#f87171}
    code{font-family:ui-monospace,Menlo,monospace;color:#d1d5db}
    footer{margin-top:24px;font-size:12px;color:#6b7280}
    @media (prefers-reduced-motion:reduce){.iris,.ok .dot{animation:none}}
  </style>
</head>
<body>
  <main class="card">
    <div class="logo">${LOGO_SVG}</div>
    <h1>Studio<span>Space</span> API</h1>
    <p class="sub">REST backend for the StudioSpace booking marketplace</p>

    <div id="status" class="status"><i class="dot"></i><span id="label">Checking server...</span></div>
    <p id="meta" class="meta"></p>

    <div class="grid">
      <div><small>Version</small><b>v1.0.0</b></div>
      <div><small>Database</small><b id="db">...</b></div>
      <div><small>Auth</small><b>JWT (HTTPOnly)</b></div>
      <div><small>Runtime</small><b>Node.js + Express</b></div>
    </div>

    <h2>Public endpoints</h2>
    <ul>
      <li><span class="m GET">GET</span><code>/api/studios</code></li>
      <li><span class="m GET">GET</span><code>/api/studios/:id</code></li>
      <li><span class="m GET">GET</span><code>/api/studios/:id/booked</code></li>
      <li><span class="m GET">GET</span><code>/health</code></li>
    </ul>

    <h2>Protected endpoints (login required)</h2>
    <ul>
      <li><span class="m POST">POST</span><code>/api/studios</code></li>
      <li><span class="m PUT">PUT</span><code>/api/studios/:id</code></li>
      <li><span class="m DELETE">DELETE</span><code>/api/studios/:id</code></li>
      <li><span class="m POST">POST</span><code>/api/bookings</code></li>
      <li><span class="m GET">GET</span><code>/api/my-bookings</code></li>
      <li><span class="m PATCH">PATCH</span><code>/api/bookings/:id/status</code></li>
      <li><span class="m GET">GET</span><code>/api/wishlist</code></li>
    </ul>

    <footer>&copy; ${new Date().getFullYear()} StudioSpace</footer>
  </main>

  <script>
    (async () => {
      const box = document.getElementById("status");
      const label = document.getElementById("label");
      const meta = document.getElementById("meta");
      const db = document.getElementById("db");
      try {
        const r = await fetch("/health", { cache: "no-store" });
        const d = await r.json();
        const up = d.status === "ok";
        box.className = "status " + (up ? "ok" : "down");
        label.textContent = up ? "All systems operational" : "Degraded: database unreachable";
        db.textContent = d.database === "connected" ? "Connected" : "Unreachable";
        meta.textContent = "Last checked " + new Date(d.timestamp).toLocaleTimeString();
      } catch (e) {
        box.className = "status down";
        label.textContent = "Server unreachable";
        db.textContent = "Unknown";
      }
    })();
  </script>
</body>
</html>`;

app.get("/", (req, res) => res.type("html").send(HOME_PAGE));

app.get("/favicon.svg", (req, res) => res.type("image/svg+xml").send(FAVICON_SVG));
app.get("/favicon.ico", (req, res) => res.redirect(301, "/favicon.svg"));

// health check: also pings MongoDB so the status page is honest
app.get("/health", async (req, res) => {
  let database = "connected";
  try {
    await db.command({ ping: 1 });
  } catch (err) {
    database = "unreachable";
  }
  res.status(database === "connected" ? 200 : 503).json({
    status: database === "connected" ? "ok" : "degraded",
    service: "studiospace-server",
    database,
    timestamp: new Date().toISOString(),
  });
});

// ================= STUDIOS =================

// public: list + filter + search + sort + limit
app.get("/api/studios", async (req, res) => {
  const { category, search, sort, limit } = req.query;
  const filter = {};
  if (category && category !== "All") filter.category = category;
  if (search) {
    const s = search.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
    filter.$or = [
      { title: { $regex: s, $options: "i" } },
      { location: { $regex: s, $options: "i" } },
    ];
  }
  const sorts = {
    rating: { rating: -1 },
    "price-asc": { hourlyRate: 1 },
    "price-desc": { hourlyRate: -1 },
  };
  let cursor = studios.find(filter).sort(sorts[sort] || { createdAt: -1 });
  if (limit) cursor = cursor.limit(Number(limit));
  res.json(await cursor.toArray());
});

// private: logged in user's own listings (must be before /:id)
app.get("/api/my-studios", verifyJWT, async (req, res) => {
  const list = await studios
    .find({ ownerEmail: req.user.email })
    .sort({ createdAt: -1 })
    .toArray();
  res.json(list);
});

// public: single studio
app.get("/api/studios/:id", async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid studio id" });
  const studio = await studios.findOne({ _id: new ObjectId(req.params.id) });
  if (!studio) return res.status(404).json({ message: "Studio not found" });
  res.json(studio);
});

// private: create
app.post("/api/studios", verifyJWT, async (req, res) => {
  const data = pickStudio(req.body);
  if (!data.title || !data.category || !data.image || !data.hourlyRate || !data.location) {
    return res.status(400).json({ message: "Please fill all required fields" });
  }
  const doc = {
    ...data,
    ownerEmail: req.user.email, // from token, not from body
    ownerName: req.user.name,
    rating: 0,
    reviews: [],
    createdAt: new Date(),
  };
  const result = await studios.insertOne(doc);
  res.status(201).json(result);
});

// private: update (only owner)
app.put("/api/studios/:id", verifyJWT, async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid studio id" });
  const result = await studios.updateOne(
    { _id: new ObjectId(req.params.id), ownerEmail: req.user.email },
    { $set: pickStudio(req.body) }
  );
  if (!result.matchedCount) {
    return res.status(403).json({ message: "Studio not found or you are not the owner" });
  }
  res.json(result);
});

// private: delete (only owner)
app.delete("/api/studios/:id", verifyJWT, async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid studio id" });
  const result = await studios.deleteOne({
    _id: new ObjectId(req.params.id),
    ownerEmail: req.user.email,
  });
  if (!result.deletedCount) {
    return res.status(403).json({ message: "Studio not found or you are not the owner" });
  }
  res.json(result);
});

// ================= BOOKINGS =================

// private: create booking (Challenge 2: double booking check)
app.post("/api/bookings", verifyJWT, async (req, res) => {
  const { studioId, date, startTime, endTime } = req.body;
  if (!validId(studioId) || !date || !startTime || !endTime) {
    return res.status(400).json({ message: "Date, start time and end time are required" });
  }
  if (toMin(startTime) >= toMin(endTime)) {
    return res.status(400).json({ message: "End time must be after start time" });
  }
  const studio = await studios.findOne({ _id: new ObjectId(studioId) });
  if (!studio) return res.status(404).json({ message: "Studio not found" });
  if (studio.ownerEmail === req.user.email) {
    return res.status(400).json({ message: "You cannot book your own studio" });
  }

  // overlap rule: existing.start < new.end AND existing.end > new.start
  const clash = await bookings.findOne({
    studioId,
    date,
    status: { $in: ["Confirmed", "Completed"] },
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  });
  if (clash) {
    return res.status(409).json({
      message: `This slot overlaps a confirmed booking (${clash.startTime} - ${clash.endTime}). Please choose another time.`,
    });
  }

  // the same user cannot send a second request for an overlapping time while the first is still pending
  const myPending = await bookings.findOne({
    studioId,
    date,
    userEmail: req.user.email,
    status: "Pending",
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  });
  if (myPending) {
    return res.status(409).json({
      message: `You already have a pending request for this studio at an overlapping time (${myPending.startTime} - ${myPending.endTime}).`,
    });
  }

  const hours = Math.round(((toMin(endTime) - toMin(startTime)) / 60) * 100) / 100;
  const doc = {
    studioId,
    studioTitle: studio.title,
    studioImage: studio.image,
    location: studio.location,
    date,
    startTime,
    endTime,
    hours,
    totalPrice: Math.round(hours * studio.hourlyRate * 100) / 100,
    ownerEmail: studio.ownerEmail,
    userEmail: req.user.email,
    userName: req.user.name,
    status: "Pending",
    createdAt: new Date(),
  };
  const result = await bookings.insertOne(doc);
  res.status(201).json(result);
});

// private: bookings made by me
app.get("/api/my-bookings", verifyJWT, async (req, res) => {
  const list = await bookings
    .find({ userEmail: req.user.email })
    .sort({ createdAt: -1 })
    .toArray();
  res.json(list);
});

// private: booking requests received on my studios (host)
app.get("/api/host-bookings", verifyJWT, async (req, res) => {
  const list = await bookings
    .find({ ownerEmail: req.user.email })
    .sort({ createdAt: -1 })
    .toArray();
  res.json(list);
});

// private: guest cancels own pending booking
app.patch("/api/bookings/:id/cancel", verifyJWT, async (req, res) => {
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid booking id" });
  const result = await bookings.updateOne(
    { _id: new ObjectId(req.params.id), userEmail: req.user.email, status: "Pending" },
    { $set: { status: "Cancelled" } }
  );
  if (!result.matchedCount) {
    return res.status(400).json({ message: "Only your pending bookings can be cancelled" });
  }
  res.json(result);
});

// private: host changes status (Confirmed / Completed / Cancelled)
app.patch("/api/bookings/:id/status", verifyJWT, async (req, res) => {
  const { status } = req.body;
  if (!validId(req.params.id)) return res.status(400).json({ message: "Invalid booking id" });
  if (!["Confirmed", "Completed", "Cancelled"].includes(status)) {
    return res.status(400).json({ message: "Invalid status" });
  }
  const booking = await bookings.findOne({
    _id: new ObjectId(req.params.id),
    ownerEmail: req.user.email,
  });
  if (!booking) return res.status(404).json({ message: "Booking not found for your studios" });

  if (status === "Confirmed") {
    const clash = await bookings.findOne({
      _id: { $ne: booking._id },
      studioId: booking.studioId,
      date: booking.date,
      status: { $in: ["Confirmed", "Completed"] },
      startTime: { $lt: booking.endTime },
      endTime: { $gt: booking.startTime },
    });
    if (clash) {
      return res.status(409).json({
        message: `Cannot confirm: overlaps confirmed booking ${clash.startTime} - ${clash.endTime}`,
      });
    }
  }
  await bookings.updateOne({ _id: booking._id }, { $set: { status } });
  res.json({ success: true });
});

// ================= CHALLENGE 2 helper: confirmed slots of a studio on a date =================
app.get("/api/studios/:id/booked", async (req, res) => {
  const { date } = req.query;
  if (!validId(req.params.id) || !date) return res.json([]);
  const list = await bookings
    .find({ studioId: req.params.id, date, status: { $in: ["Confirmed", "Completed"] } })
    .project({ _id: 0, startTime: 1, endTime: 1 })
    .sort({ startTime: 1 })
    .toArray();
  res.json(list);
});

// ================= OPTIONAL: SAVED STUDIOS WISHLIST =================

// ids only (used to colour the heart icons)
app.get("/api/wishlist/ids", verifyJWT, async (req, res) => {
  const list = await wishlist.find({ userEmail: req.user.email }).toArray();
  res.json(list.map((w) => w.studioId));
});

// full studios (used by the Saved Studios page)
app.get("/api/wishlist", verifyJWT, async (req, res) => {
  const list = await wishlist.find({ userEmail: req.user.email }).sort({ createdAt: -1 }).toArray();
  const ids = list.filter((w) => validId(w.studioId)).map((w) => new ObjectId(w.studioId));
  res.json(await studios.find({ _id: { $in: ids } }).toArray());
});

// save a studio (no duplicates because of upsert)
app.post("/api/wishlist/:studioId", verifyJWT, async (req, res) => {
  if (!validId(req.params.studioId)) return res.status(400).json({ message: "Invalid studio id" });
  await wishlist.updateOne(
    { userEmail: req.user.email, studioId: req.params.studioId },
    { $setOnInsert: { createdAt: new Date() } },
    { upsert: true }
  );
  res.status(201).json({ saved: true });
});

// remove from saved
app.delete("/api/wishlist/:studioId", verifyJWT, async (req, res) => {
  await wishlist.deleteOne({ userEmail: req.user.email, studioId: req.params.studioId });
  res.json({ saved: false });
});

// ---------- unknown route -> JSON 404 ----------
app.use((req, res) => {
  res.status(404).json({ message: `Route not found: ${req.method} ${req.originalUrl}` });
});

// ---------- error handler (always send JSON) ----------
app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ message: "Internal server error" });
});

// ---------- start ----------
// MongoDB connects automatically on the first query (works on Vercel serverless too).
// Locally we listen on a port; on Vercel the exported app is used instead.
const PORT = process.env.PORT || 5000;
if (!process.env.VERCEL) {
  app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
}

export default app;