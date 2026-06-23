/* One-off: enrich every package in assets/js/data.js with demo content
   (summary, highlights, inclusions, exclusions, day-wise itinerary) so the
   package detail pages render fully. Idempotent — only fills missing fields. */
const fs = require("fs");
const path = require("path");

const DATA = path.join(__dirname, "..", "assets", "js", "data.js");
const src = fs.readFileSync(DATA, "utf8");
const CMT = new Function("window", src + "\n;return window.CMT;")({});

function catName(id) { const c = CMT.categories.find(x => x.id === id); return c ? c.name : id; }

const FLAVOR = {
  "chardham-yatra": { line: "Seek blessings at the sacred Himalayan shrines with smooth darshan, serene mountain drives and caring on-ground support.", hi: ["Darshan assistance at the dhams", "Comfortable hotels close to the temples"], inc: "Darshan assistance & local coordination", exc: "Helicopter, pony & palki charges and VIP darshan (unless specified)", dayWord: "Darshan & sightseeing at" },
  "kumbh-mela": { line: "Be part of the world's largest spiritual gathering with curated stays near the Sangam, guidance for the holy dip and smooth transfers.", hi: ["Curated tented / hotel stay near the Sangam", "Guidance for the holy dip & key rituals"], inc: "Tented accommodation & ghat transfers as per plan", exc: "Special pooja, donations & personal ritual expenses", dayWord: "Explore" },
  "uttarakhand": { line: "Soak in Himalayan views, charming hill towns and pine-scented valleys at a relaxed, family-friendly pace.", hi: ["Scenic Himalayan drives & viewpoints", "Well-located hill-station stays"], inc: "Sightseeing as per the itinerary", exc: "Ropeway, adventure activities & monument entry tickets", dayWord: "Explore" },
  "kerala": { line: "Glide through emerald backwaters, tea-clad hills and palm-fringed coasts in God's Own Country.", hi: ["Backwater experience in Alleppey/Kumarakom", "Tea gardens & spice plantations of the hills"], inc: "Houseboat / backwater experience as per the itinerary", exc: "Ayurveda spa, activities & entry tickets", dayWord: "Explore" },
  "nepal": { line: "Discover ancient temples, serene stupas and sweeping Himalayan panoramas across Nepal.", hi: ["Heritage temples & stupas of Kathmandu", "Lakeside calm & mountain views in Pokhara"], inc: "Sightseeing as per the itinerary", exc: "Nepal visa (if applicable), flights & monument fees", dayWord: "Explore" },
  "vietnam": { line: "Explore vibrant cities, emerald limestone bays and rich culture across Vietnam.", hi: ["Overnight cruise through a limestone bay", "Old-quarter walks & local street food"], inc: "Cruise & intercity transfers as per the itinerary", exc: "Vietnam visa, international airfare & optional tours", dayWord: "Explore" },
  "himachal": { line: "Wind through Himalayan hill stations, apple orchards, pine forests and snow points.", hi: ["Snow point & valley excursions", "Mall-road evenings in the hill towns"], inc: "Sightseeing as per the itinerary", exc: "Snow activities, ropeway & adventure charges", dayWord: "Explore" },
  "kashmir-ladakh": { line: "Take in alpine meadows, mirror-like lakes, shikara rides and dramatic high-altitude landscapes.", hi: ["Shikara ride & a night on a Dal Lake houseboat", "Gondola / high-altitude valley excursions"], inc: "Shikara ride & sightseeing as per the itinerary", exc: "Gondola, ponies, union taxis & activity charges", dayWord: "Explore" },
  "darjeeling-sikkim": { line: "Ride heritage toy trains, sip Himalayan tea and watch sunrise light up the snow peaks.", hi: ["Sunrise viewpoint over the Himalayas", "Monasteries, tea gardens & valley drives"], inc: "Sightseeing & permits as per the itinerary", exc: "Special permits, ropeway & monument fees", dayWord: "Explore" },
  "andaman": { line: "Unwind on coral beaches with island-hopping, glass-bottom rides and gentle water sports.", hi: ["Island ferries to Havelock & Neil", "Beach time, snorkelling & sunsets"], inc: "Island ferry transfers as per the itinerary", exc: "Water sports, ferry upgrades & island entry fees", dayWord: "Explore" },
  "karnataka": { line: "Journey through coastal temples, royal heritage and the green Western Ghats of Karnataka.", hi: ["Heritage temples & palaces", "Coastal & Western Ghats scenery"], inc: "Sightseeing as per the itinerary", exc: "Monument entry, activities & personal expenses", dayWord: "Explore" },
  "tamilnadu": { line: "Trace grand Dravidian temples, colonial towns and cool hill stations across Tamil Nadu.", hi: ["Iconic Dravidian temple towns", "Heritage & hill-station highlights"], inc: "Sightseeing as per the itinerary", exc: "Temple special darshan, entry fees & activities", dayWord: "Explore" },
  "golden-triangle": { line: "See the icons of North India — Delhi's monuments, the Taj Mahal and royal Jaipur.", hi: ["Sunrise / classic view of the Taj Mahal", "Forts, palaces & bazaars of Jaipur"], inc: "Monument-circuit sightseeing as per the itinerary", exc: "Monument entry tickets, guides & activities", dayWord: "Explore" },
  "ayodhya": { line: "Walk the Ramayana trail through Ayodhya and the heritage of Awadh with devotion and comfort.", hi: ["Key Ramayana-circuit temples & ghats", "Awadhi heritage, cuisine & culture"], inc: "Temple-circuit sightseeing as per the itinerary", exc: "Special darshan, donations & personal expenses", dayWord: "Darshan & sightseeing at" }
};
const DEFAULT_FLAVOR = { line: "Travel in comfort with handpicked stays, smooth private transfers and the full support of the CareMyTrip team.", hi: ["Handpicked sightseeing highlights", "Comfortable, well-located stays"], inc: "Sightseeing as per the itinerary", exc: "Entry fees, activities & personal expenses", dayWord: "Explore" };

function flavor(p) { return FLAVOR[p.category] || DEFAULT_FLAVOR; }

function daysFromDuration(p) {
  const d = p.duration || "";
  let m = d.match(/(\d+)\s*D/i); if (m) return +m[1];
  m = d.match(/(\d+)\s*Days?/i); if (m) return +m[1];
  m = d.match(/(\d+)\s*N/i); if (m) return +m[1] + 1;
  return 4;
}
function placeTokens(p) {
  let d = (p.destination || p.title || "").replace(/\(.*?\)/g, " ");
  let parts = d.split(/[·,&]|\sand\s|\//i).map(s => s.trim()).filter(Boolean);
  parts = parts.filter(s => !/^ex[-\s]/i.test(s) && s.length > 1);
  if (!parts.length) parts = [p.destination || catName(p.category)];
  return parts;
}

function genSummary(p) {
  const f = flavor(p), cat = catName(p.category);
  const priceBit = p.price == null
    ? "Pricing is shared on request and tailored to your dates and group size."
    : "All-inclusive pricing starts at ₹" + Number(p.price).toLocaleString("en-IN") + " per person" + (p.discount ? " (currently " + p.discount + ")" : "") + ".";
  return "Experience " + p.destination + " on this " + p.duration + " " + cat + " package by CareMyTrip. " + f.line +
    " Your trip includes well-located stays, comfortable private transfers and round-the-clock on-trip assistance. " + priceBit +
    " The day-wise plan below is a sample itinerary and can be fully customised — adjust the number of days, upgrade hotels or change the start city to suit you.";
}
function genHighlights(p) {
  const f = flavor(p), cat = catName(p.category);
  const hi = [p.duration + " " + cat + " journey covering " + p.destination].concat(f.hi);
  if (/helicopter|heli\b/i.test(p.title)) hi.push("Scenic helicopter sectors with breathtaking aerial views");
  if (/luxury/i.test(p.title)) hi.push("Premium, handpicked luxury hotels & resorts");
  hi.push("Daily breakfast & comfortable twin-sharing rooms");
  hi.push("Private air-conditioned vehicle for all transfers & sightseeing");
  hi.push("24x7 on-trip support from the CareMyTrip team");
  return hi;
}
function genInclusions(p) {
  const f = flavor(p);
  const base = CMT.defaults.inclusions.slice();
  if (f.inc) base.push(f.inc);
  if (/helicopter|heli\b/i.test(p.title)) base.push("Helicopter charges for the selected sectors");
  return base;
}
function genExclusions(p) {
  const f = flavor(p);
  const base = CMT.defaults.exclusions.slice();
  if (f.exc) base.push(f.exc);
  return base;
}
function genItinerary(p) {
  const f = flavor(p), cat = catName(p.category);
  let n = Math.max(2, Math.min(daysFromDuration(p), 12));
  const places = placeTokens(p);
  const first = places[0];
  const out = [];
  for (let i = 1; i <= n; i++) {
    if (i === 1) {
      out.push({ day: 1, title: "Arrival in " + first, desc: "Arrive and meet your CareMyTrip representative, transfer to your hotel and check in. Spend the rest of the day at leisure or take a short orientation walk around " + first + "." });
    } else if (i === n) {
      out.push({ day: n, title: "Departure", desc: "After breakfast, check out and transfer for your onward journey, carrying happy memories of your " + cat + " trip with CareMyTrip." });
    } else {
      const place = places[(i - 1) % places.length];
      const descPool = [
        "Enjoy a full day exploring " + place + " at a comfortable pace, covering the main highlights with time to relax. Overnight stay included.",
        "Continue your " + cat + " experience around " + place + " — local sights, scenery and culture, with free time in the evening. Overnight stay included.",
        "Spend the day discovering " + place + " and nearby attractions; your driver/guide helps you make the most of it. Overnight stay included."
      ];
      out.push({ day: i, title: f.dayWord + " " + place, desc: descPool[(i - 2) % descPool.length] });
    }
  }
  return out;
}

let updated = 0, totalDays = 0;
CMT.packages.forEach(function (p) {
  if (!p.summary) p.summary = genSummary(p);
  if (!p.highlights || !p.highlights.length) p.highlights = genHighlights(p);
  if (!p.inclusions || !p.inclusions.length) p.inclusions = genInclusions(p);
  if (!p.exclusions || !p.exclusions.length) p.exclusions = genExclusions(p);
  if (!p.itinerary || !p.itinerary.length) p.itinerary = genItinerary(p);
  totalDays += p.itinerary.length;
  updated++;
});

const out = "/* CareMyTrip canonical site data. */\nwindow.CMT = " + JSON.stringify(CMT, null, 2) + ";\n";
fs.writeFileSync(DATA, out, "utf8");

const sample = CMT.packages[0];
console.log("Packages enriched:", updated);
console.log("Total itinerary days generated:", totalDays);
console.log("New file size:", out.length, "bytes");
console.log("\nSample (" + sample.id + "):");
console.log("  summary:", sample.summary.slice(0, 120) + "...");
console.log("  highlights:", sample.highlights.length, "| inclusions:", sample.inclusions.length, "| exclusions:", sample.exclusions.length, "| itinerary days:", sample.itinerary.length);
console.log("  day 1:", sample.itinerary[0].title, "=>", sample.itinerary[0].desc.slice(0, 60) + "...");
