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

app.get("/", (req, res) => res.send("StudioSpace server is running"));

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
    status: "Confirmed",
    startTime: { $lt: endTime },
    endTime: { $gt: startTime },
  });
  if (clash) {
    return res.status(409).json({
      message: `This slot overlaps a confirmed booking (${clash.startTime} - ${clash.endTime}). Please choose another time.`,
    });
  }

  const hours = (toMin(endTime) - toMin(startTime)) / 60;
  const doc = {
    studioId,
    studioTitle: studio.title,
    studioImage: studio.image,
    location: studio.location,
    date,
    startTime,
    endTime,
    hours,
    totalPrice: hours * studio.hourlyRate,
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
      status: "Confirmed",
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

// ---------- start ----------
const PORT = process.env.PORT || 5000;
client
  .connect()
  .then(() => {
    console.log("MongoDB connected");
    app.listen(PORT, () => console.log(`Server running on port ${PORT}`));
  })
  .catch((err) => console.error("MongoDB connection failed:", err));
