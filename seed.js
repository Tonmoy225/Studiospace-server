// Run once: npm run seed   (adds 8 sample studios so your site is not empty)
import "dotenv/config";
import { MongoClient } from "mongodb";

const comments = [
  "Clean space, great natural light and the host was very helpful.",
  "Everything was ready when we arrived. Easy booking and fair price.",
  "Perfect for our shoot. Equipment was in good condition.",
  "Quiet location and comfortable setup. Will book again.",
];

// [title, category, rate, deposit, capacity, location, rating, amenities, overview]
const base = [
  ["Aperture Cyc Wall Studio", "Photo Studio", 45, 100, 8, "Banani, Dhaka", 4.9,
    ["Wi-Fi", "Air Conditioning", "Lighting Kit", "Backdrops", "Changing Room"],
    "A bright white cyc wall studio with strobe lights and paper backdrops, ideal for product, fashion and portrait shoots."],
  ["Golden Hour Film Stage", "Film Stage", 120, 300, 25, "Uttara, Dhaka", 4.8,
    ["Wi-Fi", "Air Conditioning", "Lighting Kit", "Green Screen", "Parking"],
    "A large sound-treated stage with a green screen wall and a lighting grid, built for short films and music videos."],
  ["Echo Podcast Lounge", "Podcast Lounge", 30, 50, 4, "Dhanmondi, Dhaka", 4.7,
    ["Wi-Fi", "Air Conditioning", "Sound Proofing", "Microphones"],
    "A cozy soundproof lounge with four broadcast microphones and a mixer, ready for interviews and weekly shows."],
  ["Midnight Music Suite", "Music Suite", 60, 150, 6, "Gulshan, Dhaka", 4.8,
    ["Wi-Fi", "Air Conditioning", "Sound Proofing", "Microphones", "Instruments"],
    "A recording suite with a vocal booth, studio monitors and a small set of instruments for demos and full tracks."],
  ["Clay & Color Art Workshop", "Workshop", 25, 40, 12, "Agrabad, Chattogram", 4.6,
    ["Wi-Fi", "Air Conditioning", "Backdrops", "Parking"],
    "A spacious workshop with large tables and natural light for painting, pottery and small group art classes."],
  ["Studio Nine Photo Loft", "Photo Studio", 55, 120, 10, "Zindabazar, Sylhet", 4.7,
    ["Wi-Fi", "Lighting Kit", "Backdrops", "Changing Room", "Parking"],
    "A loft studio with big windows, vintage props and a makeup corner, great for lifestyle and wedding shoots."],
  ["Reel House Sound Stage", "Film Stage", 150, 400, 30, "Bashundhara, Dhaka", 4.9,
    ["Wi-Fi", "Air Conditioning", "Lighting Kit", "Green Screen", "Sound Proofing", "Parking"],
    "Our biggest stage with a full lighting grid, sound isolation and a loading bay for large productions."],
  ["Mic Drop Podcast Room", "Podcast Lounge", 28, 40, 3, "Sonadanga, Khulna", 4.5,
    ["Wi-Fi", "Air Conditioning", "Sound Proofing", "Microphones"],
    "A compact podcast room for solo or duo recordings with acoustic panels and two microphones."],
];

const docs = base.map(([title, category, hourlyRate, securityDeposit, capacity, location, rating, amenities, overview], i) => ({
  title, category, hourlyRate, securityDeposit, capacity, location, rating, amenities, overview,
  image: `https://picsum.photos/seed/studio${i + 1}/800/600`,
  gallery: [
    `https://picsum.photos/seed/studio${i + 1}a/800/600`,
    `https://picsum.photos/seed/studio${i + 1}b/800/600`,
  ],
  reviews: [
    { name: "Rafi Ahmed", rating: 5, comment: comments[i % 4] },
    { name: "Nusrat Jahan", rating: 4, comment: comments[(i + 1) % 4] },
  ],
  ownerEmail: "host@studiospace.com",
  ownerName: "StudioSpace Host",
  createdAt: new Date(Date.now() - i * 86400000),
}));

const client = new MongoClient(process.env.MONGODB_URI);
await client.connect();
const col = client.db("studiospace").collection("studios");
await col.deleteMany({ ownerEmail: "host@studiospace.com" });
await col.insertMany(docs);
console.log(`Seeded ${docs.length} studios`);
await client.close();
