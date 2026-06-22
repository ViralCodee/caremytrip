/* CareMyTrip — front-end rendering & interactivity */
(function () {
  "use strict";

  var STORE_KEY = "cmt_packages_v1";

  /* ---- data access: localStorage (admin edits) overrides baked data ---- */
  function allPackages() {
    try {
      var raw = localStorage.getItem(STORE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch (e) { /* fall through to baked data */ }
    return (window.CMT && window.CMT.packages) || [];
  }
  function categories() { return (window.CMT && window.CMT.categories) || []; }
  function company() { return (window.CMT && window.CMT.company) || {}; }
  function catName(id) {
    var c = categories().filter(function (x) { return x.id === id; })[0];
    return c ? c.name : id;
  }
  function getPackage(id) {
    return allPackages().filter(function (p) { return p.id === id; })[0] || null;
  }
  window.CMTApi = { allPackages: allPackages, getPackage: getPackage, STORE_KEY: STORE_KEY };

  /* ---- helpers ---- */
  function money(n) {
    if (n == null) return null;
    return "₹" + Number(n).toLocaleString("en-IN");
  }
  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function priceBlock(p) {
    if (p.price == null) return '<span class="req">On Request</span>';
    var was = p.oldPrice ? '<span class="was">' + money(p.oldPrice) + "</span>" : "";
    return '<span class="from">From</span><span class="now">' + money(p.price) + "</span>" + was;
  }
  function whatsappLink(text) {
    var num = (company().whatsapp || "").replace(/[^0-9]/g, "");
    return "https://wa.me/" + num + "?text=" + encodeURIComponent(text);
  }

  /* ---- package card ---- */
  function cardHTML(p) {
    var badge = p.discount ? '<span class="badge">' + esc(p.discount) + "</span>" : "";
    return (
      '<article class="card">' +
        '<div class="thumb">' + badge +
          '<span class="badge cat">' + esc(catName(p.category)) + "</span>" +
          '<a href="package.html?id=' + encodeURIComponent(p.id) + '">' +
            '<img src="' + esc(p.image) + '" alt="' + esc(p.title) + '" loading="lazy" width="650" height="400"></a>' +
        "</div>" +
        '<div class="body">' +
          '<div class="meta"><span>📍 ' + esc(p.destination) + "</span><span>🗓 " + esc(p.duration) + "</span></div>" +
          "<h3><a href=\"package.html?id=" + encodeURIComponent(p.id) + '">' + esc(p.title) + "</a></h3>" +
          '<div class="rating">★ ' + esc(p.rating) + ' <span>(' + esc(p.reviews) + " reviews)</span></div>" +
          '<div class="foot">' +
            '<div class="price">' + priceBlock(p) + "</div>" +
            '<a class="btn btn-primary btn-sm" href="package.html?id=' + encodeURIComponent(p.id) + '">View</a>' +
          "</div>" +
        "</div>" +
      "</article>"
    );
  }

  /* ---- homepage featured ---- */
  function renderFeatured() {
    var el = document.getElementById("featured-grid");
    if (!el) return;
    var list = allPackages().filter(function (p) { return p.featured; });
    if (!list.length) list = allPackages().slice(0, 6);
    el.innerHTML = list.slice(0, 6).map(cardHTML).join("");
  }

  /* ---- listing page with filter ---- */
  function renderPackages() {
    var grid = document.getElementById("packages-grid");
    if (!grid) return;
    var chipsEl = document.getElementById("cat-chips");
    var params = new URLSearchParams(location.search);
    var state = { cat: params.get("cat") || "all", q: (params.get("q") || "").toLowerCase() };

    if (chipsEl) {
      var chips = ['<button class="chip" data-cat="all">All Packages</button>'];
      categories().forEach(function (c) {
        chips.push('<button class="chip" data-cat="' + c.id + '">' + esc(c.name) + "</button>");
      });
      chipsEl.innerHTML = chips.join("");
      chipsEl.addEventListener("click", function (e) {
        var b = e.target.closest(".chip");
        if (!b) return;
        state.cat = b.getAttribute("data-cat");
        draw();
      });
    }

    var searchInput = document.getElementById("list-search");
    if (searchInput) {
      searchInput.value = params.get("q") || "";
      searchInput.addEventListener("input", function () { state.q = this.value.toLowerCase(); draw(); });
    }

    function draw() {
      var list = allPackages().filter(function (p) {
        var okCat = state.cat === "all" || p.category === state.cat;
        var hay = (p.title + " " + p.destination + " " + catName(p.category)).toLowerCase();
        var okQ = !state.q || hay.indexOf(state.q) !== -1;
        return okCat && okQ;
      });
      grid.innerHTML = list.length
        ? list.map(cardHTML).join("")
        : '<div class="empty">No packages match your search. <a href="packages.html">View all packages</a>.</div>';
      var count = document.getElementById("result-count");
      if (count) count.textContent = list.length + " package" + (list.length === 1 ? "" : "s");
      if (chipsEl) Array.prototype.forEach.call(chipsEl.children, function (c) {
        c.classList.toggle("active", c.getAttribute("data-cat") === state.cat);
      });
    }
    draw();
  }

  /* ---- detail page ---- */
  function renderDetail() {
    var root = document.getElementById("detail-root");
    if (!root) return;
    var id = new URLSearchParams(location.search).get("id");
    var p = id && getPackage(id);
    if (!p) {
      root.innerHTML = '<div class="empty"><h2>Package not found</h2><p>It may have moved. <a href="packages.html">Browse all packages</a>.</p></div>';
      return;
    }
    document.title = p.title + " — CareMyTrip";
    var bc = document.getElementById("detail-breadcrumb");
    if (bc) bc.innerHTML = '<a href="index.html">Home</a> / <a href="packages.html">Packages</a> / ' + esc(p.title);

    var quoteText = "Hi CareMyTrip, I'm interested in the \"" + p.title + "\" package. Please share details.";
    var itin = (p.itinerary || []).map(function (d) {
      return '<li><span class="d">Day ' + esc(d.day) + '</span><h4>' + esc(d.title) + "</h4><p>" + esc(d.desc) + "</p></li>";
    }).join("");
    var inc = (p.inclusions || []).map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("");
    var exc = (p.exclusions || []).map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("");
    var hi = (p.highlights || []).map(function (h) { return "<li>" + esc(h) + "</li>"; }).join("");

    var priceBig = p.price == null
      ? '<div class="price-big" style="color:var(--accent)">On Request</div>'
      : '<div class="price-big">' + money(p.price) + ' <small>/ person</small></div>' +
        (p.oldPrice ? '<div class="was">' + money(p.oldPrice) + (p.discount ? "  ·  " + esc(p.discount) : "") + "</div>" : "");

    root.innerHTML =
      '<div class="detail-grid"><div class="detail">' +
        '<div class="detail-hero"><img src="' + esc(p.image) + '" alt="' + esc(p.title) + '" width="900" height="500"></div>' +
        "<h1>" + esc(p.title) + "</h1>" +
        '<div class="meta-row">' +
          "<span>📍 <b>" + esc(p.destination) + "</b></span>" +
          "<span>🗓 <b>" + esc(p.duration) + "</b></span>" +
          "<span>🏷 <b>" + esc(catName(p.category)) + "</b></span>" +
          '<span>★ <b>' + esc(p.rating) + "</b> (" + esc(p.reviews) + " reviews)</span>" +
        "</div>" +
        '<p class="pkg-summary">' + esc(p.summary) + "</p>" +
        (hi ? '<h2>Highlights</h2><ul class="inc-list yes">' + hi + "</ul>" : "") +
        (itin ? '<h2>Day-wise Itinerary</h2><ul class="itin">' + itin + "</ul>" : "") +
        (inc || exc ? '<h2>Inclusions &amp; Exclusions</h2><div class="inc-grid">' +
          '<div><h4>What\'s included</h4><ul class="inc-list yes">' + inc + "</ul></div>" +
          '<div><h4>Not included</h4><ul class="inc-list no">' + exc + "</ul></div></div>" : "") +
      "</div>" +
      '<aside><div class="booking-card">' + priceBig +
        '<form class="enquiry-form" data-package="' + esc(p.title) + '">' +
          '<div class="form-row"><label>Name</label><input name="name" required></div>' +
          '<div class="form-row"><label>Phone</label><input name="phone" required></div>' +
          '<div class="form-row"><label>Travel date</label><input name="date" type="date"></div>' +
          '<div class="form-row"><label>Travellers</label><input name="pax" type="number" min="1" value="2"></div>' +
          '<button type="submit" class="btn btn-primary btn-block">Send Enquiry</button>' +
        "</form>" +
        '<a class="btn btn-teal btn-block" style="margin-top:10px" href="' + whatsappLink(quoteText) + '" target="_blank" rel="noopener">💬 Enquire on WhatsApp</a>' +
        '<a class="btn btn-ghost btn-block" style="margin-top:10px" href="tel:' + esc((company().phones || [""])[0]) + '">📞 ' + esc((company().phones || [""])[0]) + "</a>" +
      "</div></aside></div>";

    bindEnquiry(root);
    injectDetailJsonLd(p);
  }

  /* ---- enquiry form -> WhatsApp ---- */
  function bindEnquiry(scope) {
    (scope || document).querySelectorAll(".enquiry-form").forEach(function (f) {
      if (f.dataset.bound) return;   // guard: never attach the submit handler twice
      f.dataset.bound = "1";
      f.addEventListener("submit", function (e) {
        e.preventDefault();
        var d = new FormData(f);
        var msg = "New enquiry for: " + (f.getAttribute("data-package") || "CareMyTrip") +
          "\nName: " + (d.get("name") || "") +
          "\nPhone: " + (d.get("phone") || "") +
          "\nTravel date: " + (d.get("date") || "-") +
          "\nTravellers: " + (d.get("pax") || "-");
        window.open(whatsappLink(msg), "_blank");
      });
    });
  }

  /* ---- per-package structured data for AEO/GEO ---- */
  function injectDetailJsonLd(p) {
    var co = company();
    var offer = p.price == null ? {} : {
      "offers": {
        "@type": "Offer",
        "price": p.price,
        "priceCurrency": "INR",
        "availability": "https://schema.org/InStock",
        "url": co.url
      }
    };
    var ld = Object.assign({
      "@context": "https://schema.org",
      "@type": "TouristTrip",
      "name": p.title,
      "description": p.summary,
      "image": co.url + p.image,
      "touristType": catName(p.category),
      "itinerary": (p.itinerary || []).map(function (d, i) {
        return { "@type": "ListItem", "position": i + 1, "item": { "@type": "TouristAttraction", "name": "Day " + d.day + ": " + d.title } };
      }),
      "aggregateRating": { "@type": "AggregateRating", "ratingValue": p.rating, "reviewCount": p.reviews },
      "provider": { "@type": "TravelAgency", "name": co.name, "url": co.url }
    }, offer);
    var s = document.createElement("script");
    s.type = "application/ld+json";
    s.text = JSON.stringify(ld);
    document.head.appendChild(s);
  }

  /* ---- homepage search -> listing ---- */
  function bindHomeSearch() {
    var form = document.getElementById("home-search");
    if (!form) return;
    var sel = form.querySelector('[name="cat"]');
    if (sel) {
      categories().forEach(function (c) {
        var o = document.createElement("option");
        o.value = c.id; o.textContent = c.name; sel.appendChild(o);
      });
    }
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      var d = new FormData(form);
      var qs = new URLSearchParams();
      if (d.get("cat") && d.get("cat") !== "all") qs.set("cat", d.get("cat"));
      if (d.get("q")) qs.set("q", d.get("q"));
      location.href = "packages.html" + (qs.toString() ? "?" + qs.toString() : "");
    });
  }

  /* ---- mobile nav ---- */
  function bindNav() {
    var t = document.querySelector(".nav-toggle");
    var n = document.querySelector(".nav");
    if (t && n) t.addEventListener("click", function () { n.classList.toggle("open"); });
  }

  /* ---- year stamp ---- */
  function stampYear() {
    document.querySelectorAll("[data-year]").forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    bindNav();
    stampYear();
    renderFeatured();
    renderPackages();
    renderDetail();
    bindHomeSearch();
    bindEnquiry(document);
  });
})();
