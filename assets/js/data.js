/*
 * CareMyTrip — canonical site data
 * This is the single source of truth for packages, categories and company info.
 * Public pages render from window.CMT (admin edits are layered on top via localStorage).
 * To publish admin changes permanently: open /admin, edit, then "Export data.js"
 * and replace this file (and data/packages.json) with the download.
 */
window.CMT = {
  company: {
    name: "CareMyTrip",
    legalName: "CareMyTrip.com",
    tagline: "Travel is the only thing you buy that makes you richer",
    subTagline: "Never miss an opportunity to travel",
    countries: ["India", "Nepal", "Thailand", "Malaysia", "Canada", "Kuwait"],
    phones: ["+91-8527456666", "+91-8527458888", "+91-9389186101"],
    whatsapp: "+918527456666",
    emails: ["info@caremytrip.com", "caremytrip@gmail.com"],
    address: {
      street: "CMTC House, Khasra No-123KA, Kuthalwali, Near Gorya Homes, Johrigoan",
      city: "Dehradun",
      region: "Uttarakhand",
      postalCode: "248003",
      country: "IN"
    },
    gstin: "05AAFCC4083R1Z7",
    cin: "U63030DL2013PTC257344",
    url: "https://www.caremytrip.com/",
    sameAs: [
      "https://www.facebook.com/caremytrip",
      "https://www.instagram.com/caremytrip",
      "https://www.linkedin.com/company/caremytrip",
      "https://www.youtube.com/@caremytrip"
    ]
  },

  categories: [
    { id: "chardham-yatra", name: "Chardham Yatra", blurb: "Kedarnath, Badrinath, Gangotri & Yamunotri pilgrimages." },
    { id: "uttarakhand", name: "Uttarakhand", blurb: "Himalayan getaways — Auli, Harsil, Valley of Flowers." },
    { id: "kerala", name: "Kerala", blurb: "Backwaters, beaches and hill stations of God's Own Country." },
    { id: "kumbh-mela", name: "Kumbh Mela", blurb: "Spiritual mega-gatherings on India's holy rivers." },
    { id: "nepal", name: "Nepal", blurb: "Kathmandu, Pokhara and the Himalayan kingdom." },
    { id: "vietnam", name: "Vietnam", blurb: "Hanoi, Halong Bay and Southeast Asian wonders." }
  ],

  packages: [
    {
      id: "ek-dham-kedarnath-haridwar",
      title: "Ek Dham Yatra — Kedarnath Ji from Haridwar",
      category: "chardham-yatra",
      destination: "Kedarnath, Uttarakhand",
      nights: 3, days: 4, duration: "3N / 4D",
      price: 12900, oldPrice: 19900, discount: "35% OFF",
      currency: "INR",
      rating: 4.8, reviews: 214, featured: true,
      image: "wp-content/uploads/2025/09/tour-3-650x400.webp",
      summary: "A focused 4-day pilgrimage to the revered Kedarnath shrine, starting and ending at Haridwar with comfortable stays and assisted darshan.",
      highlights: ["Kedarnath Ji darshan", "Stay at Sonprayag/Guptkashi", "Haridwar Ganga Aarti", "Trek/pony assistance to temple"],
      inclusions: ["Accommodation on twin-sharing", "Daily breakfast & dinner", "AC vehicle from Haridwar", "Driver allowance, tolls & parking"],
      exclusions: ["Helicopter / pony / palki charges", "Lunch & personal expenses", "Anything not in inclusions"],
      itinerary: [
        { day: 1, title: "Haridwar → Guptkashi", desc: "Drive through the scenic Garhwal Himalayas to Guptkashi. Overnight stay." },
        { day: 2, title: "Guptkashi → Kedarnath", desc: "Drive to Sonprayag, trek (or pony/heli) to Kedarnath for darshan & evening aarti." },
        { day: 3, title: "Kedarnath → Guptkashi", desc: "Morning darshan, return trek to Sonprayag and drive back to Guptkashi." },
        { day: 4, title: "Guptkashi → Haridwar", desc: "Drive back to Haridwar with a stop at Devprayag. Tour ends." }
      ]
    },
    {
      id: "do-dham-haridwar",
      title: "Do Dham Yatra from Haridwar 2026 — Kedarnath & Badrinath",
      category: "chardham-yatra",
      destination: "Kedarnath & Badrinath, Uttarakhand",
      nights: 5, days: 6, duration: "5N / 6D",
      price: 19000, oldPrice: 25000, discount: "24% OFF",
      currency: "INR",
      rating: 4.7, reviews: 168, featured: true,
      image: "wp-content/uploads/2025/09/tour-4-650x400.webp",
      summary: "Visit two of the four sacred dhams — Kedarnath and Badrinath — on a well-paced 6-day circuit from Haridwar.",
      highlights: ["Kedarnath & Badrinath darshan", "Mana Village visit", "Ganga Aarti at Haridwar", "Comfortable Himalayan stays"],
      inclusions: ["5 nights accommodation (twin-sharing)", "Breakfast & dinner", "AC vehicle ex-Haridwar", "Toll, parking & driver allowance"],
      exclusions: ["Pony/palki/heli charges", "Lunches", "Personal expenses & tips"],
      itinerary: [
        { day: 1, title: "Haridwar → Guptkashi", desc: "Scenic drive along the Alaknanda & Mandakini rivers." },
        { day: 2, title: "Kedarnath darshan", desc: "Trek to Kedarnath, darshan and overnight." },
        { day: 3, title: "Return to Guptkashi", desc: "Descend and drive towards Pipalkoti/Joshimath." },
        { day: 4, title: "Badrinath darshan", desc: "Visit Badrinath temple, Mana — the last Indian village." },
        { day: 5, title: "Badrinath → Rudraprayag", desc: "Return journey with confluence stops." },
        { day: 6, title: "Drive to Haridwar", desc: "Tour concludes at Haridwar." }
      ]
    },
    {
      id: "do-dham-delhi",
      title: "Do Dham Yatra from Delhi 2026 — Kedarnath & Badrinath",
      category: "chardham-yatra",
      destination: "Kedarnath & Badrinath (ex-Delhi)",
      nights: 7, days: 8, duration: "7N / 8D",
      price: 26900, oldPrice: 29900, discount: "10% OFF",
      currency: "INR",
      rating: 4.7, reviews: 121, featured: false,
      image: "wp-content/uploads/2025/09/tour-5-650x400.webp",
      summary: "Door-to-door Do Dham pilgrimage starting from Delhi, covering Kedarnath and Badrinath with all transfers handled.",
      highlights: ["Pickup from Delhi", "Kedarnath & Badrinath", "Haridwar & Rishikesh halts", "Hassle-free transfers"],
      inclusions: ["7 nights accommodation", "Breakfast & dinner", "AC vehicle ex-Delhi", "All tolls, parking, driver allowance"],
      exclusions: ["Heli/pony/palki", "Lunches & personal costs"],
      itinerary: [
        { day: 1, title: "Delhi → Haridwar", desc: "Drive to Haridwar, evening Ganga Aarti." },
        { day: 2, title: "Haridwar → Guptkashi", desc: "Himalayan drive to Guptkashi." },
        { day: 3, title: "Kedarnath darshan", desc: "Trek and darshan at Kedarnath." },
        { day: 4, title: "To Joshimath", desc: "Descend and continue towards Badrinath region." },
        { day: 5, title: "Badrinath darshan", desc: "Temple darshan and Mana village." },
        { day: 6, title: "To Rudraprayag", desc: "Return with river-confluence stops." },
        { day: 7, title: "To Haridwar/Rishikesh", desc: "Leisure evening by the Ganga." },
        { day: 8, title: "Back to Delhi", desc: "Drive back; tour ends." }
      ]
    },
    {
      id: "chardham-haridwar-2026",
      title: "Chardham Yatra from Haridwar 2026 — 9N/10D",
      category: "chardham-yatra",
      destination: "Yamunotri, Gangotri, Kedarnath & Badrinath",
      nights: 9, days: 10, duration: "9N / 10D",
      price: 25900, oldPrice: 31900, discount: "19% OFF",
      currency: "INR",
      rating: 4.9, reviews: 342, featured: true,
      image: "wp-content/uploads/2025/09/tour-6-650x400.webp",
      summary: "The complete Char Dham circuit — Yamunotri, Gangotri, Kedarnath and Badrinath — over a comfortable 10-day journey from Haridwar.",
      highlights: ["All four dhams", "Yamunotri & Gangotri treks", "Kedarnath & Badrinath", "Experienced Himalayan drivers"],
      inclusions: ["9 nights accommodation", "Breakfast & dinner", "AC vehicle ex-Haridwar", "Tolls, parking & driver allowance"],
      exclusions: ["Pony/palki/heli", "Lunches", "Personal expenses"],
      itinerary: [
        { day: 1, title: "Haridwar → Barkot", desc: "Drive towards Yamunotri base." },
        { day: 2, title: "Yamunotri darshan", desc: "Trek to Yamunotri and back to Barkot." },
        { day: 3, title: "Barkot → Uttarkashi", desc: "Drive to Gangotri base town." },
        { day: 4, title: "Gangotri darshan", desc: "Visit Gangotri temple, return to Uttarkashi." },
        { day: 5, title: "Uttarkashi → Guptkashi", desc: "Long scenic Himalayan drive." },
        { day: 6, title: "Kedarnath darshan", desc: "Trek and darshan at Kedarnath." },
        { day: 7, title: "Return to Guptkashi", desc: "Descend and rest." },
        { day: 8, title: "Towards Badrinath", desc: "Drive to Joshimath/Pipalkoti." },
        { day: 9, title: "Badrinath darshan", desc: "Temple darshan and Mana village." },
        { day: 10, title: "Back to Haridwar", desc: "Return drive; tour ends." }
      ]
    },
    {
      id: "chardham-helicopter-2026",
      title: "Chardham Yatra by Helicopter 2026",
      category: "chardham-yatra",
      destination: "All Four Dhams by Helicopter",
      nights: 5, days: 6, duration: "6 Days",
      price: 235000, oldPrice: 244800, discount: "4% OFF",
      currency: "INR",
      rating: 4.9, reviews: 87, featured: true,
      image: "wp-content/uploads/2025/09/tour-7-650x400.webp",
      summary: "Cover all four dhams in just 6 days by helicopter — VIP darshan, premium stays and breathtaking Himalayan aerial views.",
      highlights: ["Helicopter to all dhams", "VIP/priority darshan", "Premium accommodation", "Minimal trekking"],
      inclusions: ["Helicopter charter", "Luxury accommodation", "All meals", "VIP darshan assistance", "Ground transfers"],
      exclusions: ["Air/train to Dehradun", "Personal expenses", "Anything not specified"],
      itinerary: [
        { day: 1, title: "Arrive Dehradun", desc: "Reporting and briefing for the heli yatra." },
        { day: 2, title: "Yamunotri & Gangotri", desc: "Aerial darshan of the first two dhams." },
        { day: 3, title: "Kedarnath", desc: "Helicopter to Kedarnath, VIP darshan." },
        { day: 4, title: "Badrinath", desc: "Fly to Badrinath, temple darshan & Mana." },
        { day: 5, title: "Buffer / sightseeing", desc: "Weather buffer day, local sightseeing." },
        { day: 6, title: "Departure", desc: "Return to Dehradun; tour ends." }
      ]
    },
    {
      id: "luxury-chardham-10-days",
      title: "10 Days Luxury Char Dham Yatra from Haridwar",
      category: "chardham-yatra",
      destination: "All Four Dhams — Luxury",
      nights: 9, days: 10, duration: "9N / 10D",
      price: 99000, oldPrice: null, discount: null,
      currency: "INR",
      rating: 4.8, reviews: 64, featured: false,
      image: "wp-content/uploads/2025/09/tour-8-650x400.webp",
      summary: "The Char Dham circuit elevated — handpicked premium hotels, curated meals and dedicated assistance across all four shrines.",
      highlights: ["Premium/boutique stays", "Curated dining", "Dedicated tour manager", "Priority darshan assistance"],
      inclusions: ["9 nights luxury accommodation", "All meals", "Premium AC vehicle", "Tour manager"],
      exclusions: ["Heli/pony/palki", "Personal expenses", "Air/train fare"],
      itinerary: [
        { day: 1, title: "Haridwar → Barkot", desc: "Luxury transfer towards Yamunotri." },
        { day: 2, title: "Yamunotri", desc: "Darshan and return." },
        { day: 3, title: "Gangotri base", desc: "Drive to Uttarkashi." },
        { day: 4, title: "Gangotri", desc: "Temple darshan." },
        { day: 5, title: "To Guptkashi", desc: "Scenic Himalayan drive." },
        { day: 6, title: "Kedarnath", desc: "Darshan with assistance." },
        { day: 7, title: "Rest day", desc: "Leisure at premium stay." },
        { day: 8, title: "Towards Badrinath", desc: "Drive to Joshimath." },
        { day: 9, title: "Badrinath", desc: "Darshan and Mana village." },
        { day: 10, title: "Return Haridwar", desc: "Tour concludes." }
      ]
    },
    {
      id: "harsil-village-luxury",
      title: "5 Nights Harsil Village Luxury Tour",
      category: "uttarakhand",
      destination: "Harsil, Uttarakhand",
      nights: 5, days: 6, duration: "5N / 6D",
      price: 26900, oldPrice: 29900, discount: "10% OFF",
      currency: "INR",
      rating: 4.7, reviews: 53, featured: false,
      image: "wp-content/uploads/2025/09/tour-9-650x400.webp",
      summary: "Unwind in the apple-orchard hamlet of Harsil near Gangotri — pristine Himalayan landscapes, riverside walks and luxury stays.",
      highlights: ["Harsil & Bagori village", "Gangotri day trip", "Apple orchards & deodar forests", "Riverside luxury stay"],
      inclusions: ["5 nights accommodation", "Breakfast & dinner", "AC vehicle", "Sightseeing as per itinerary"],
      exclusions: ["Lunches", "Entry fees", "Personal expenses"],
      itinerary: [
        { day: 1, title: "Haridwar → Uttarkashi", desc: "Drive along the Bhagirathi river." },
        { day: 2, title: "Uttarkashi → Harsil", desc: "Continue to the serene Harsil valley." },
        { day: 3, title: "Gangotri excursion", desc: "Day trip to Gangotri temple." },
        { day: 4, title: "Harsil leisure", desc: "Bagori village, orchards & local walks." },
        { day: 5, title: "Harsil → Uttarkashi", desc: "Return drive, evening at leisure." },
        { day: 6, title: "Back to Haridwar", desc: "Tour ends." }
      ]
    },
    {
      id: "amazing-kerala",
      title: "Amazing Kerala — 05 Nights / 06 Days",
      category: "kerala",
      destination: "Munnar, Thekkady, Alleppey & Kovalam",
      nights: 4, days: 5, duration: "4N / 5D",
      price: 14200, oldPrice: 18900, discount: "25% OFF",
      currency: "INR",
      rating: 4.8, reviews: 196, featured: true,
      image: "wp-content/uploads/2025/09/tour-10-650x400.webp",
      summary: "God's Own Country in one trip — tea-carpeted Munnar hills, Thekkady spice country and a houseboat night on the Alleppey backwaters.",
      highlights: ["Munnar tea gardens", "Thekkady wildlife", "Alleppey houseboat night", "Cochin city tour"],
      inclusions: ["Accommodation on twin-sharing", "Daily breakfast", "Private AC vehicle", "Houseboat with full board"],
      exclusions: ["Airfare", "Lunches & dinners (except houseboat)", "Entry fees & activities"],
      itinerary: [
        { day: 1, title: "Cochin → Munnar", desc: "Drive to Munnar via waterfalls & spice plantations." },
        { day: 2, title: "Munnar sightseeing", desc: "Tea museum, Mattupetty dam, Echo Point." },
        { day: 3, title: "Munnar → Thekkady", desc: "Periyar wildlife sanctuary & spice garden." },
        { day: 4, title: "Thekkady → Alleppey", desc: "Board the houseboat, cruise the backwaters." },
        { day: 5, title: "Alleppey → Cochin", desc: "Disembark and transfer for departure." }
      ]
    },
    {
      id: "basant-panchami-kumbh-mela",
      title: "Basant Panchami Kumbh Mela Tour",
      category: "kumbh-mela",
      destination: "Prayagraj / Holy Sangam",
      nights: 4, days: 5, duration: "4N / 5D",
      price: 75000, oldPrice: 89300, discount: "16% OFF",
      currency: "INR",
      rating: 4.6, reviews: 41, featured: false,
      image: "wp-content/uploads/2025/09/tour-11-650x400.webp",
      summary: "Experience the world's largest spiritual gathering on the auspicious Basant Panchami Shahi Snan, with curated tented stays and guided rituals.",
      highlights: ["Basant Panchami Shahi Snan", "Sangam holy dip", "Premium tented accommodation", "Guided spiritual tour"],
      inclusions: ["Tented accommodation", "All meals", "Local transfers", "Guide & ritual assistance"],
      exclusions: ["Travel to/from Prayagraj", "Personal expenses", "Donations"],
      itinerary: [
        { day: 1, title: "Arrive Prayagraj", desc: "Check in to the Kumbh tented camp." },
        { day: 2, title: "Sangam darshan", desc: "Guided visit to the Triveni Sangam." },
        { day: 3, title: "Basant Panchami Snan", desc: "Auspicious holy dip and rituals." },
        { day: 4, title: "Local pilgrimage", desc: "Temples and akhada visits." },
        { day: 5, title: "Departure", desc: "Tour concludes." }
      ]
    },
    {
      id: "auli-by-heli",
      title: "Auli by Helicopter",
      category: "uttarakhand",
      destination: "Auli, Uttarakhand",
      nights: 2, days: 3, duration: "2N / 3D",
      price: 35500, oldPrice: null, discount: null,
      currency: "INR",
      rating: 4.7, reviews: 38, featured: false,
      image: "wp-content/uploads/2025/09/banner-img1.webp",
      summary: "Skip the long drive — fly to Auli for snow-clad slopes, Asia's highest ropeway and panoramic views of Nanda Devi.",
      highlights: ["Helicopter to Auli", "Cable car / ropeway ride", "Nanda Devi views", "Snow activities (seasonal)"],
      inclusions: ["Helicopter transfers", "2 nights accommodation", "Breakfast & dinner", "Local sightseeing"],
      exclusions: ["Ropeway tickets", "Personal expenses", "Air/train to Dehradun"],
      itinerary: [
        { day: 1, title: "Dehradun → Auli (heli)", desc: "Scenic helicopter flight to Auli, check in." },
        { day: 2, title: "Auli sightseeing", desc: "Ropeway, Gurso Bugyal & artificial lake." },
        { day: 3, title: "Auli → Dehradun", desc: "Return flight; tour ends." }
      ]
    },
    {
      id: "nepal-kathmandu-pokhara",
      title: "Nepal — Kathmandu & Pokhara",
      category: "nepal",
      destination: "Kathmandu & Pokhara, Nepal",
      nights: 5, days: 6, duration: "5N / 6D",
      price: null, oldPrice: null, discount: null,
      currency: "INR",
      rating: 4.7, reviews: 29, featured: false,
      image: "wp-content/uploads/2025/09/beautiful-tourist-greece-with-meteora-monasteries-background-650x400.webp",
      summary: "Temples, stupas and the serene lakes of Pokhara with Himalayan panoramas — a classic Nepal circuit. Pricing on request.",
      highlights: ["Pashupatinath & Boudhanath", "Pokhara lakeside", "Sarangkot sunrise", "Himalayan views"],
      inclusions: ["Accommodation", "Daily breakfast", "Private transfers", "City sightseeing"],
      exclusions: ["International airfare", "Visa/permit fees", "Lunches & dinners"],
      itinerary: [
        { day: 1, title: "Arrive Kathmandu", desc: "Transfer and welcome." },
        { day: 2, title: "Kathmandu temples", desc: "Pashupatinath, Boudhanath & Durbar Square." },
        { day: 3, title: "Kathmandu → Pokhara", desc: "Scenic drive to Pokhara." },
        { day: 4, title: "Pokhara", desc: "Sarangkot sunrise, Phewa Lake & caves." },
        { day: 5, title: "Back to Kathmandu", desc: "Return and free time." },
        { day: 6, title: "Departure", desc: "Tour ends." }
      ]
    },
    {
      id: "vietnam-hanoi-halong",
      title: "Vietnam — Hanoi & Halong Bay",
      category: "vietnam",
      destination: "Hanoi & Halong Bay, Vietnam",
      nights: 6, days: 7, duration: "6N / 7D",
      price: null, oldPrice: null, discount: null,
      currency: "INR",
      rating: 4.8, reviews: 22, featured: false,
      image: "wp-content/uploads/2025/09/banner-img2.webp",
      summary: "Vietnam's north — the buzzing old quarter of Hanoi and an overnight cruise through the limestone karsts of Halong Bay. Pricing on request.",
      highlights: ["Hanoi old quarter", "Halong Bay overnight cruise", "Ninh Binh day trip", "Vietnamese cuisine"],
      inclusions: ["Accommodation", "Daily breakfast", "Halong cruise with meals", "Transfers & guide"],
      exclusions: ["International airfare", "Visa fees", "Personal expenses"],
      itinerary: [
        { day: 1, title: "Arrive Hanoi", desc: "Transfer and old-quarter walk." },
        { day: 2, title: "Hanoi city tour", desc: "Ho Chi Minh complex, Temple of Literature." },
        { day: 3, title: "Halong Bay cruise", desc: "Overnight cruise among limestone karsts." },
        { day: 4, title: "Halong → Hanoi", desc: "Disembark and return to Hanoi." },
        { day: 5, title: "Ninh Binh day trip", desc: "Trang An boat ride & caves." },
        { day: 6, title: "Hanoi leisure", desc: "Shopping and free time." },
        { day: 7, title: "Departure", desc: "Tour concludes." }
      ]
    }
  ]
};
