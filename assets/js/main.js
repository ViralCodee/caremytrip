/* CareMyTrip — front-end rendering & interactivity */
(function () {
  "use strict";

  var STORE_KEY = "cmt_packages_v1";
  var BLOG_STORE_KEY = "cmt_blogs_v1";

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
  function allBlogs() {
    try {
      var raw = localStorage.getItem(BLOG_STORE_KEY);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed) && parsed.length) return parsed;
      }
    } catch (e) { /* fall through to baked data */ }
    return (window.CMT && window.CMT.blogs) || [];
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
  function getBlog(id) {
    return allBlogs().filter(function (b) { return b.id === id; })[0] || null;
  }
  window.CMTApi = { allPackages: allPackages, allBlogs: allBlogs, getPackage: getPackage, getBlog: getBlog, STORE_KEY: STORE_KEY, BLOG_STORE_KEY: BLOG_STORE_KEY };

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
  function packageSummary(p) {
    return p.summary || (
      "Explore " + (p.destination || p.title) + " with CareMyTrip's " + (p.duration || "custom") +
      " tour package, including planned transfers, stays and on-trip assistance. Contact the team for the complete day-wise itinerary."
    );
  }
  function defaultList(kind) {
    var d = (window.CMT && window.CMT.defaults) || {};
    return d[kind] || [];
  }
  function whatsappLink(text) {
    var num = (company().whatsapp || "").replace(/[^0-9]/g, "");
    return "https://wa.me/" + num + "?text=" + encodeURIComponent(text);
  }

  function blogCardHTML(b) {
    return (
      '<article class="card blog-card">' +
        '<div class="thumb"><span class="badge cat">' + esc(b.category || "Travel Guide") + '</span>' +
          '<a href="blog.html?id=' + encodeURIComponent(b.id) + '">' +
            '<img src="' + esc(b.image) + '" alt="' + esc(b.title) + '" loading="lazy" width="650" height="400"></a>' +
        '</div>' +
        '<div class="body">' +
          '<div class="meta"><span><i class="bi bi-calendar3" aria-hidden="true"></i> ' + esc(b.date || "") + '</span></div>' +
          '<h3><a href="blog.html?id=' + encodeURIComponent(b.id) + '">' + esc(b.title) + '</a></h3>' +
          '<p class="muted">' + esc(b.excerpt || "") + '</p>' +
          '<div class="foot"><span class="row-sub">' + esc((b.tags || []).slice(0, 3).join(", ")) + '</span><a class="btn btn-primary btn-sm" href="blog.html?id=' + encodeURIComponent(b.id) + '">Read</a></div>' +
        '</div>' +
      '</article>'
    );
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
          '<div class="meta"><span><i class="bi bi-geo-alt" aria-hidden="true"></i> ' + esc(p.destination) + '</span><span><i class="bi bi-calendar3" aria-hidden="true"></i> ' + esc(p.duration) + "</span></div>" +
          "<h3><a href=\"package.html?id=" + encodeURIComponent(p.id) + '">' + esc(p.title) + "</a></h3>" +
          '<div class="rating"><i class="bi bi-star-fill" aria-hidden="true"></i> ' + esc(p.rating) + ' <span>(' + esc(p.reviews) + " reviews)</span></div>" +
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

  /* ---- listing page with filter & pagination ---- */
  function renderPackages() {
    var grid = document.getElementById("packages-grid");
    if (!grid) return;
    var chipsEl = document.getElementById("cat-chips");
    var params = new URLSearchParams(location.search);
    var state = {
      cat: params.get("cat") || "all",
      q: (params.get("q") || "").toLowerCase(),
      minPrice: null,
      maxPrice: null,
      itemsPerPage: 24,
      currentPage: 1
    };

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
        state.currentPage = 1;
        draw();
      });
    }

    var searchInput = document.getElementById("list-search");
    if (searchInput) {
      searchInput.value = params.get("q") || "";
      searchInput.addEventListener("input", function () { state.q = this.value.toLowerCase(); state.currentPage = 1; draw(); });
    }

    var minPriceInput = document.getElementById("price-min");
    var maxPriceInput = document.getElementById("price-max");
    var priceClearBtn = document.getElementById("price-clear");
    if (minPriceInput && maxPriceInput) {
      minPriceInput.addEventListener("input", function () {
        state.minPrice = this.value ? parseFloat(this.value) : null;
        state.currentPage = 1;
        draw();
      });
      maxPriceInput.addEventListener("input", function () {
        state.maxPrice = this.value ? parseFloat(this.value) : null;
        state.currentPage = 1;
        draw();
      });
      if (priceClearBtn) {
        priceClearBtn.addEventListener("click", function () {
          minPriceInput.value = "";
          maxPriceInput.value = "";
          state.minPrice = null;
          state.maxPrice = null;
          state.currentPage = 1;
          draw();
        });
      }
    }

    var itemsPerPageSelect = document.getElementById("items-per-page");
    if (itemsPerPageSelect) {
      itemsPerPageSelect.addEventListener("change", function () {
        state.itemsPerPage = parseInt(this.value);
        state.currentPage = 1;
        draw();
      });
    }

    function draw() {
      var allFiltered = allPackages().filter(function (p) {
        var okCat = state.cat === "all" || p.category === state.cat;
        var hay = (p.title + " " + p.destination + " " + catName(p.category)).toLowerCase();
        var okQ = !state.q || hay.indexOf(state.q) !== -1;
        var okPrice = true;
        if (p.price !== null) {
          if (state.minPrice !== null && p.price < state.minPrice) okPrice = false;
          if (state.maxPrice !== null && p.price > state.maxPrice) okPrice = false;
        }
        return okCat && okQ && okPrice;
      });

      var totalPages = Math.ceil(allFiltered.length / state.itemsPerPage);
      if (state.currentPage > totalPages) state.currentPage = Math.max(1, totalPages);

      var start = (state.currentPage - 1) * state.itemsPerPage;
      var paginatedList = allFiltered.slice(start, start + state.itemsPerPage);

      grid.innerHTML = paginatedList.length
        ? paginatedList.map(cardHTML).join("")
        : '<div class="empty">No packages match your filters. <a href="packages.html">View all packages</a>.</div>';

      var count = document.getElementById("result-count");
      if (count) count.textContent = allFiltered.length + " package" + (allFiltered.length === 1 ? "" : "s");

      if (chipsEl) Array.prototype.forEach.call(chipsEl.children, function (c) {
        c.classList.toggle("active", c.getAttribute("data-cat") === state.cat);
      });

      drawPagination(totalPages);
    }

    function drawPagination(totalPages) {
      var paginationEl = document.getElementById("pagination");
      var pageNumbersEl = document.getElementById("page-numbers");
      var pageInfoEl = document.getElementById("page-info");
      var pagePrevBtn = document.getElementById("page-prev");
      var pageNextBtn = document.getElementById("page-next");

      if (!paginationEl) return;

      if (totalPages <= 1) {
        paginationEl.classList.remove("show");
        return;
      }

      paginationEl.classList.add("show");

      var pageNumbers = [];
      var start = Math.max(1, state.currentPage - 2);
      var end = Math.min(totalPages, state.currentPage + 2);

      if (start > 1) {
        pageNumbers.push('<button class="page-num" data-page="1">1</button>');
        if (start > 2) pageNumbers.push('<span style="padding:0 4px;color:var(--text-muted)">...</span>');
      }

      for (var i = start; i <= end; i++) {
        var isActive = i === state.currentPage;
        pageNumbers.push('<button class="page-num' + (isActive ? ' active' : '') + '" data-page="' + i + '">' + i + '</button>');
      }

      if (end < totalPages) {
        if (end < totalPages - 1) pageNumbers.push('<span style="padding:0 4px;color:var(--text-muted)">...</span>');
        pageNumbers.push('<button class="page-num" data-page="' + totalPages + '">' + totalPages + '</button>');
      }

      if (pageNumbersEl) pageNumbersEl.innerHTML = pageNumbers.join("");

      if (pageInfoEl) {
        var showing = (state.currentPage - 1) * state.itemsPerPage + 1;
        var to = Math.min(state.currentPage * state.itemsPerPage, document.querySelectorAll("#packages-grid article").length + ((state.currentPage - 1) * state.itemsPerPage));
        pageInfoEl.textContent = "Page " + state.currentPage + " of " + totalPages;
      }

      if (pagePrevBtn) {
        pagePrevBtn.disabled = state.currentPage === 1;
        pagePrevBtn.style.opacity = state.currentPage === 1 ? "0.5" : "1";
        pagePrevBtn.onclick = function () { if (state.currentPage > 1) { state.currentPage--; draw(); window.scrollTo(0, 0); } };
      }

      if (pageNextBtn) {
        pageNextBtn.disabled = state.currentPage === totalPages;
        pageNextBtn.style.opacity = state.currentPage === totalPages ? "0.5" : "1";
        pageNextBtn.onclick = function () { if (state.currentPage < totalPages) { state.currentPage++; draw(); window.scrollTo(0, 0); } };
      }

      if (pageNumbersEl) {
        Array.prototype.forEach.call(pageNumbersEl.querySelectorAll(".page-num"), function (btn) {
          btn.onclick = function () { state.currentPage = parseInt(this.getAttribute("data-page")); draw(); window.scrollTo(0, 0); };
        });
      }
    }

    draw();
  }

  function renderBlogs() {
    var grid = document.getElementById("blogs-grid");
    if (!grid) return;
    var input = document.getElementById("blog-search");
    var state = { q: "" };
    if (input) input.addEventListener("input", function () { state.q = this.value.toLowerCase(); draw(); });
    function draw() {
      var list = allBlogs().filter(function (b) {
        if (b.status === "draft") return false;
        var hay = [b.title, b.category, b.excerpt, (b.tags || []).join(" ")].join(" ").toLowerCase();
        return !state.q || hay.indexOf(state.q) !== -1;
      });
      grid.innerHTML = list.length ? list.map(blogCardHTML).join("") : '<div class="empty">No blog posts found.</div>';
      var count = document.getElementById("blog-result-count");
      if (count) count.textContent = list.length + " article" + (list.length === 1 ? "" : "s");
    }
    draw();
  }

  function renderBlogDetail() {
    var root = document.getElementById("blog-detail-root");
    if (!root) return;
    var id = new URLSearchParams(location.search).get("id");
    var b = id && getBlog(id);
    if (!b || b.status === "draft") {
      root.innerHTML = '<div class="empty"><h2>Blog not found</h2><p>It may have moved. <a href="blogs.html">Browse all blogs</a>.</p></div>';
      return;
    }
    document.title = (b.metaTitle || b.title) + " | CareMyTrip";
    var meta = document.querySelector('meta[name="description"]');
    if (meta && b.metaDescription) meta.setAttribute("content", b.metaDescription);
    var bc = document.getElementById("blog-breadcrumb");
    if (bc) bc.innerHTML = '<a href="index.html">Home</a> / <a href="blogs.html">Blogs</a> / ' + esc(b.title);
    root.innerHTML =
      '<article class="detail blog-detail">' +
        '<div class="detail-hero"><img src="' + esc(b.image) + '" alt="' + esc(b.title) + '" width="900" height="500"></div>' +
        '<div class="meta-row"><span><i class="bi bi-calendar3" aria-hidden="true"></i> <b>' + esc(b.date || "") + '</b></span><span><i class="bi bi-tag" aria-hidden="true"></i> <b>' + esc(b.category || "Travel Guide") + '</b></span></div>' +
        '<h1>' + esc(b.title) + '</h1>' +
        '<p class="pkg-summary">' + esc(b.excerpt || "") + '</p>' +
        '<div class="blog-content">' + (b.content || "").split(/\n+/).map(function (p) { return '<p>' + esc(p) + '</p>'; }).join("") + '</div>' +
        ((b.tags || []).length ? '<p class="muted"><b>Tags:</b> ' + esc((b.tags || []).join(", ")) + '</p>' : '') +
      '</article>';
    injectBlogJsonLd(b);
  }

  function injectBlogJsonLd(b) {
    var co = company();
    var s = document.createElement("script");
    s.type = "application/ld+json";
    s.text = JSON.stringify({
      "@context": "https://schema.org",
      "@type": "BlogPosting",
      "headline": b.title,
      "description": b.metaDescription || b.excerpt,
      "image": co.url + b.image,
      "datePublished": b.date,
      "author": { "@type": "Organization", "name": co.name || "CareMyTrip" },
      "publisher": { "@type": "Organization", "name": co.name || "CareMyTrip", "url": co.url }
    });
    document.head.appendChild(s);
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
    var incList = (p.inclusions && p.inclusions.length) ? p.inclusions : defaultList("inclusions");
    var excList = (p.exclusions && p.exclusions.length) ? p.exclusions : defaultList("exclusions");
    var highlightList = (p.highlights && p.highlights.length) ? p.highlights : [
      p.destination || catName(p.category),
      p.duration || "Flexible itinerary",
      p.price == null ? "Price on request" : "Transparent package pricing",
      "CareMyTrip travel support"
    ];
    var inc = incList.map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("");
    var exc = excList.map(function (i) { return "<li>" + esc(i) + "</li>"; }).join("");
    var hi = highlightList.map(function (h) { return "<li>" + esc(h) + "</li>"; }).join("");

    var priceBig = p.price == null
      ? '<div class="price-big" style="color:var(--accent)">On Request</div>'
      : '<div class="price-big">' + money(p.price) + ' <small>/ person</small></div>' +
        (p.oldPrice ? '<div class="was">' + money(p.oldPrice) + (p.discount ? "  ·  " + esc(p.discount) : "") + "</div>" : "");

    root.innerHTML =
      '<div class="detail-grid"><div class="detail">' +
        '<div class="detail-hero"><img src="' + esc(p.image) + '" alt="' + esc(p.title) + '" width="900" height="500"></div>' +
        "<h1>" + esc(p.title) + "</h1>" +
        '<div class="meta-row">' +
          '<span><i class="bi bi-geo-alt" aria-hidden="true"></i> <b>' + esc(p.destination) + "</b></span>" +
          '<span><i class="bi bi-calendar3" aria-hidden="true"></i> <b>' + esc(p.duration) + "</b></span>" +
          '<span><i class="bi bi-tag" aria-hidden="true"></i> <b>' + esc(catName(p.category)) + "</b></span>" +
          '<span><i class="bi bi-star-fill" aria-hidden="true"></i> <b>' + esc(p.rating) + "</b> (" + esc(p.reviews) + " reviews)</span>" +
        "</div>" +
        '<p class="pkg-summary">' + esc(packageSummary(p)) + "</p>" +
        (hi ? '<h2>Highlights</h2><ul class="inc-list yes">' + hi + "</ul>" : "") +
        (itin ? '<h2>Day-wise Itinerary</h2><ul class="itin">' + itin + "</ul>" : "") +
        '<div id="route-map-container" class="route-map-section"><h2>Journey Route</h2><div id="route-map" class="route-map"></div></div>' +
        '<div class="detail-sections">' +
          '<div class="detail-section"><h2>What to Expect</h2><p>This exclusive helicopter tour combines adventure with luxury. Experience world-class skiing at Auli with certified instructors, luxury mountain resort accommodations, and stunning Himalayan views. Perfect for both beginners and experienced skiers.</p></div>' +
          '<div class="detail-section"><h2>Best Time to Visit</h2><p><b>November to March:</b> Peak skiing season with fresh snow and ideal weather conditions. Temperature ranges from -5°C to 5°C. Excellent visibility for helicopter rides and sightseeing.</p></div>' +
          '<div class="detail-section"><h2>What to Pack</h2><ul class="inc-list yes"><li>Warm winter clothing (thermal wear, insulated jacket, wool sweaters)</li><li>Waterproof gloves and mittens</li><li>Winter boots and warm socks</li><li>Sunscreen and lip balm (UV protection at high altitude)</li><li>Ski goggles and helmet (provided but bring if preferred)</li><li>Camera for photography</li><li>Travel documents and insurance</li></ul></div>' +
          '<div class="detail-section"><h2>Altitude & Acclimatization</h2><p><b>Auli Elevation:</b> 3,000-3,050 meters (9,843-10,007 feet). The area sits at a high altitude with crisp, fresh mountain air. Most travelers acclimatize quickly, but we recommend drinking plenty of water and taking it easy on day 1.</p></div>' +
        '</div>' +
        (inc || exc ? '<h2>Inclusions &amp; Exclusions</h2><div class="inc-grid">' +
          '<div><h4>What\'s included</h4><ul class="inc-list yes">' + inc + "</ul></div>" +
          '<div><h4>Not included</h4><ul class="inc-list no">' + exc + "</ul></div></div>" : "") +
      "</div>" +
      '<aside><div class="booking-card" id="booking-card">' + priceBig +
        '<form class="enquiry-form" data-package="' + esc(p.title) + '">' +
          '<div class="form-row"><label>Name</label><input name="name" required></div>' +
          '<div class="form-row"><label>Phone</label><input name="phone" required></div>' +
          '<div class="form-row"><label>Travel date</label><input name="date" type="date"></div>' +
          '<div class="form-row"><label>Travellers</label><input name="pax" type="number" min="1" value="2"></div>' +
          '<button type="submit" class="btn btn-primary btn-block">Send Enquiry</button>' +
        "</form>" +
        '<a class="btn btn-teal btn-block" style="margin-top:10px" href="' + whatsappLink(quoteText) + '" target="_blank" rel="noopener"><i class="bi bi-whatsapp" aria-hidden="true"></i> Enquire on WhatsApp</a>' +
        '<a class="btn btn-ghost btn-block" style="margin-top:10px" href="tel:' + esc((company().phones || [""])[0]) + '"><i class="bi bi-telephone" aria-hidden="true"></i> ' + esc((company().phones || [""])[0]) + "</a>" +
        '<button type="button" class="btn-close" id="booking-close" aria-label="Close form">✕</button>' +
      "</div></aside>" +
      '<button class="mobile-enquiry-btn" id="mobile-enquiry-btn">Enquiry</button>' +
      "</div>";

    bindMobileEnquiry();
    bindEnquiry(root);
    renderRouteMap(p);
    injectDetailJsonLd(p);
  }

  /* ---- route map rendering with Leaflet ---- */
  function renderRouteMap(p) {
    var mapContainer = document.getElementById("route-map");
    if (!mapContainer) return;

    // Define detailed routes based on itinerary
    var routeData = {
      "auli-by-heli": {
        center: [30.35, 79.0],
        zoom: 8,
        title: "Auli Helicopter Journey",
        points: [
          {name: "Dehradun", lat: 30.1947, lng: 78.1462, day: 1, title: "Arrival & Helicopter Transfer", desc: "Meet at helipad and fly to Auli"},
          {name: "Auli Resort", lat: 30.5135, lng: 79.6147, day: "2-3", title: "Skiing & Mountain Activities", desc: "Skiing lessons & cable car rides"},
          {name: "Dehradun", lat: 30.1947, lng: 78.1462, day: 4, title: "Departure", desc: "Return helicopter flight"}
        ]
      },
      "chardham-by-heli": {
        center: [30.5, 79.5],
        zoom: 7,
        title: "Chardham Yatra Route",
        points: [
          {name: "Yamunotri", lat: 30.88, lng: 78.50, day: 1, title: "Yamunotri", desc: "First sacred shrine"},
          {name: "Gangotri", lat: 30.98, lng: 79.08, day: 2, title: "Gangotri", desc: "Source of Ganges"},
          {name: "Kedarnath", lat: 30.73, lng: 79.57, day: 3, title: "Kedarnath", desc: "Lord Shiva shrine"},
          {name: "Badrinath", lat: 30.745, lng: 79.49, day: "4-5", title: "Badrinath", desc: "Final sacred site"}
        ]
      },
      "nepal-triangle-tour": {
        center: [27.7, 85.0],
        zoom: 7,
        title: "Nepal Triangle Tour",
        points: [
          {name: "Kathmandu", lat: 27.7172, lng: 85.3240, day: "1-2", title: "Kathmandu", desc: "Cultural heritage"},
          {name: "Pokhara", lat: 28.2096, lng: 83.9856, day: "3-4", title: "Pokhara", desc: "Lakes & mountains"},
          {name: "Bhaktapur", lat: 27.6720, lng: 85.8318, day: 5, title: "Bhaktapur", desc: "Ancient city"}
        ]
      },
      "chardham-yatra-by-land": {
        center: [30.5, 79.5],
        zoom: 7,
        title: "Chardham Yatra (Land Route)",
        points: [
          {name: "Haridwar", lat: 29.9457, lng: 78.1642, day: 1, title: "Haridwar", desc: "Journey begins"},
          {name: "Chopta", lat: 30.3333, lng: 79.5667, day: 2, title: "Chopta", desc: "Yamunotri access"},
          {name: "Uttarkashi", lat: 30.7333, lng: 78.8, day: "4-5", title: "Uttarkashi", desc: "Gangotri gateway"},
          {name: "Guptkashi", lat: 30.1, lng: 79.1833, day: "6-7", title: "Guptkashi", desc: "Kedarnath access"},
          {name: "Auli", lat: 30.5135, lng: 79.6147, day: "8-9", title: "Auli region", desc: "Mountain views"}
        ]
      },
      "helicopter-to-harsil": {
        center: [30.35, 79.0],
        zoom: 8,
        title: "Harsil Helicopter Tour",
        points: [
          {name: "Delhi/Dehradun", lat: 30.1947, lng: 78.1462, day: 1, title: "Arrival", desc: "Meet & greet"},
          {name: "Harsil", lat: 30.44, lng: 78.82, day: "2-3", title: "Harsil", desc: "Apple orchards & luxury lodge"},
          {name: "Dehradun", lat: 30.1947, lng: 78.1462, day: 4, title: "Departure", desc: "Return flight"}
        ]
      },
      "nepal-triangle-tour": {
        center: [27.7, 85.0],
        zoom: 7,
        title: "Nepal Triangle",
        points: [
          {name: "Kathmandu", lat: 27.7172, lng: 85.3240, day: "1-2", title: "Kathmandu", desc: "Capital city"},
          {name: "Pokhara", lat: 28.2096, lng: 83.9856, day: "3-4", title: "Pokhara", desc: "Lakeside town"},
          {name: "Bhaktapur", lat: 27.6720, lng: 85.8318, day: 5, title: "Bhaktapur", desc: "Ancient capital"}
        ]
      },
      "kailash-mansarovar": {
        center: [31.5, 81.5],
        zoom: 6,
        title: "Kailash Mansarovar Yatra",
        points: [
          {name: "Delhi", lat: 28.6139, lng: 77.2090, day: 1, title: "Delhi", desc: "Start point"},
          {name: "Kathmandu", lat: 27.7172, lng: 85.3240, day: "2-3", title: "Kathmandu", desc: "Nepal transit"},
          {name: "Lhasa", lat: 29.6470, lng: 91.1130, day: "4-6", title: "Lhasa", desc: "Tibet entry"},
          {name: "Mount Kailash", lat: 31.5000, lng: 81.5000, day: "7-12", title: "Kailash", desc: "Sacred mountain"}
        ]
      },
      "golden-triangle-with-kashmir": {
        center: [28.5, 78.5],
        zoom: 6,
        title: "Golden Triangle + Kashmir",
        points: [
          {name: "Delhi", lat: 28.6139, lng: 77.2090, day: "1-2", title: "Delhi", desc: "Start"},
          {name: "Agra", lat: 27.1767, lng: 78.0081, day: "3-4", title: "Agra", desc: "Taj Mahal"},
          {name: "Jaipur", lat: 26.9124, lng: 75.7873, day: "5-6", title: "Jaipur", desc: "Pink city"},
          {name: "Srinagar", lat: 34.0837, lng: 74.7973, day: "7-8", title: "Srinagar", desc: "Kashmir"}
        ]
      },
      "ramayana-yatra": {
        center: [25.5, 80.0],
        zoom: 6,
        title: "Ramayana Yatra",
        points: [
          {name: "Ayodhya", lat: 26.8124, lng: 82.0065, day: "1-2", title: "Ayodhya", desc: "Ram Janmabhoomi"},
          {name: "Lucknow", lat: 26.8467, lng: 80.9462, day: 3, title: "Lucknow", desc: "Awadh capital"},
          {name: "Varanasi", lat: 25.3176, lng: 82.9739, day: "4-5", title: "Varanasi", desc: "Sacred Ganges"},
          {name: "Chitrakoot", lat: 25.1395, lng: 80.8714, day: 6, title: "Chitrakoot", desc: "Ram vanvas"}
        ]
      },
      "valley-of-flowers": {
        center: [30.6, 79.5],
        zoom: 8,
        title: "Valley of Flowers Trek",
        points: [
          {name: "Rishikesh", lat: 30.0869, lng: 78.2676, day: 1, title: "Rishikesh", desc: "Yoga capital"},
          {name: "Auli", lat: 30.5135, lng: 79.6147, day: 2, title: "Auli", desc: "Hill station"},
          {name: "Valley of Flowers", lat: 30.7167, lng: 79.6, day: "3-4", title: "Valley", desc: "Flower trek"},
          {name: "Hemkund Sahib", lat: 30.7833, lng: 79.6167, day: 5, title: "Hemkund", desc: "Sacred lake"}
        ]
      },
      "awadh-triangle-tour": {
        center: [27.0, 80.5],
        zoom: 7,
        title: "Awadh Triangle Tour",
        points: [
          {name: "Ayodhya", lat: 26.8124, lng: 82.0065, day: 1, title: "Ayodhya", desc: "Ram city"},
          {name: "Lucknow", lat: 26.8467, lng: 80.9462, day: "2-3", title: "Lucknow", desc: "Awadh legacy"},
          {name: "Varanasi", lat: 25.3176, lng: 82.9739, day: 4, title: "Varanasi", desc: "Holy city"}
        ]
      }
    };

    var data = routeData[p.id] || routeData["auli-by-heli"];

    // Initialize Leaflet map
    var map = L.map(mapContainer, {scrollWheelZoom: true}).setView(data.center, data.zoom);

    // Add OpenStreetMap tiles (hide attribution)
    L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
      attribution: false,
      maxZoom: 19
    }).addTo(map);

    // Hide leaflet attribution
    map.attributionControl.remove();

    // Draw route line
    var coords = data.points.map(function(pt) { return [pt.lat, pt.lng]; });
    var polyline = L.polyline(coords, {
      color: '#0e8c7a',
      weight: 3,
      opacity: 0.7
    }).addTo(map);

    // Add day markers
    var bounds = L.latLngBounds();
    data.points.forEach(function(pt, idx) {
      var dayNum = typeof pt.day === 'number' ? pt.day : pt.day.split('-')[0];
      var icon = L.divIcon({
        html: '<div style="background:#0e8c7a;color:#fff;width:40px;height:40px;border-radius:50%;display:flex;align-items:center;justify-content:center;font-weight:bold;font-size:16px;border:3px solid #fff;box-shadow:0 3px 8px rgba(0,0,0,.35);font-family:Poppins,sans-serif">' + dayNum + '</div>',
        iconSize: [46, 46],
        className: 'day-marker'
      });

      var marker = L.marker([pt.lat, pt.lng], {icon: icon}).addTo(map);
      marker.bindPopup(
        '<div style="font-size:13px;min-width:180px">' +
        '<strong style="color:#0e8c7a;font-size:14px">' + esc(pt.name) + '</strong><br>' +
        '<em style="color:#666">Day ' + pt.day + '</em><br><br>' +
        '<strong>' + esc(pt.title) + '</strong><br>' +
        '<p style="margin:8px 0 0;color:#666;font-size:12px">' + esc(pt.desc) + '</p>' +
        '</div>'
      );

      bounds.extend([pt.lat, pt.lng]);
    });

    // Fit all points in view
    if (bounds.isValid()) {
      map.fitBounds(bounds, {padding: [40, 40], maxZoom: data.zoom});
    }
  }

  /* ---- mobile enquiry button toggle ---- */
  function bindMobileEnquiry() {
    var bookingCard = document.getElementById("booking-card");
    var mobileBtn = document.getElementById("mobile-enquiry-btn");
    var closeBtn = document.getElementById("booking-close");
    if (!bookingCard || !mobileBtn) return;

    var isFirstVisit = !localStorage.getItem("cmt_enquiry_opened");
    var isMobile = window.innerWidth < 760;

    if (isMobile && isFirstVisit) {
      setTimeout(function () {
        bookingCard.classList.add("visible");
        localStorage.setItem("cmt_enquiry_opened", "true");
      }, 5000);
    }

    mobileBtn.addEventListener("click", function () {
      bookingCard.classList.toggle("visible");
    });

    if (closeBtn) {
      closeBtn.addEventListener("click", function () {
        bookingCard.classList.remove("visible");
      });
    }

    window.addEventListener("resize", function () {
      if (window.innerWidth >= 760) {
        bookingCard.classList.remove("visible");
      }
    });
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
      "description": packageSummary(p),
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

  /* ---- google reviews carousel (seamless marquee, same speed as affiliations) ---- */
  function renderReviews() {
    var track = document.getElementById("reviews-track");
    if (!track) return;

    fetch("assets/data/reviews.json")
      .then(function(r) { return r.json(); })
      .catch(function() { return {reviews: []}; })
      .then(function(data) {
        var reviews = (data.reviews || []).slice(0, 50);

        var html = reviews.map(function(r) {
          var stars = '<div class="review-stars">';
          for (var i = 0; i < 5; i++) {
            stars += '<i class="bi bi-star-fill" style="color:var(--gold)"></i>';
          }
          stars += '<span class="rating-text">' + r.rating + '</span></div>';

          return '<div class="review-card">' +
            '<div class="review-header">' +
              '<img src="' + esc(r.image) + '" alt="' + esc(r.name) + '" class="review-avatar" width="48" height="48" loading="lazy">' +
              '<div class="review-info">' +
                '<h4>' + esc(r.name) + '</h4>' +
                stars +
              '</div>' +
            '</div>' +
            '<p class="review-text">' + esc(r.text) + '</p>' +
          '</div>';
        }).join("");

        track.innerHTML = html;

        // Same seamless-marquee logic as bindAffiliations: clone the unit
        // until it overflows ~2x the container, then run at constant 55px/s.
        setTimeout(function() {
          if (track.dataset.ready) return;
          var carousel = track.parentElement;
          var unit = Array.prototype.slice.call(track.children);
          var unitWidth = track.scrollWidth;
          if (!unitWidth || !unit.length) return;
          var target = Math.max(carousel.offsetWidth || 0, window.innerWidth || 0, 1280);
          var copies = Math.max(2, Math.ceil((target * 2) / unitWidth) + 1);
          if (copies % 2) copies++;
          for (var c = 1; c < copies; c++) {
            unit.forEach(function (n) {
              var clone = n.cloneNode(true);
              clone.setAttribute("aria-hidden", "true");
              track.appendChild(clone);
            });
          }
          track.style.animationDuration = Math.max(20, Math.round((track.scrollWidth / 2) / 55)) + "s";
          track.dataset.ready = "1";
        }, 100);
      });
  }

  /* ---- affiliations marquee: clone the logo set for a seamless infinite loop ---- */
  function bindAffiliations() {
    Array.prototype.forEach.call(document.querySelectorAll(".marquee-track"), function (track) {
      if (track.dataset.ready) return;
      var marquee = track.parentElement;
      var unit = Array.prototype.slice.call(track.children);
      var unitWidth = track.scrollWidth;
      if (!unitWidth || !unit.length) return;
      // target width with fallbacks (some engines report 0 for offscreen layout)
      var target = Math.max(marquee.offsetWidth || 0, window.innerWidth || 0, 1280);
      // enough copies to overflow ~2x the target; keep even so the -50% loop is seamless
      var copies = Math.max(2, Math.ceil((target * 2) / unitWidth) + 1);
      if (copies % 2) copies++;
      for (var c = 1; c < copies; c++) {
        unit.forEach(function (n) {
          var clone = n.cloneNode(true);
          clone.setAttribute("aria-hidden", "true");
          track.appendChild(clone);
        });
      }
      // constant speed (~55px/s) regardless of how many logos
      track.style.animationDuration = Math.max(20, Math.round((track.scrollWidth / 2) / 55)) + "s";
      track.dataset.ready = "1";
    });
  }

  /* ---- year stamp ---- */
  function stampYear() {
    document.querySelectorAll("[data-year]").forEach(function (el) {
      el.textContent = new Date().getFullYear();
    });
  }

  /* ---- hero carousel ---- */
  function bindHeroCarousel() {
    var root = document.getElementById("hero-carousel");
    if (!root) return;
    var slides = root.querySelectorAll(".hero-slide");
    var dots   = root.querySelectorAll("[data-hero-dot]");
    if (!slides.length) return;

    var current = 0;
    var timer;
    var INTERVAL = 5500;

    function ensureLoaded(idx) {
      var s = slides[idx];
      if (!s) return;
      var ds = s.getAttribute("data-src");
      if (ds) { s.setAttribute("src", ds); s.removeAttribute("data-src"); }
    }
    function go(i) {
      current = (i + slides.length) % slides.length;
      ensureLoaded(current);
      ensureLoaded((current + 1) % slides.length); // prefetch next
      slides.forEach(function (s, idx) { s.classList.toggle("active", idx === current); });
      dots.forEach(function (d, idx) { d.classList.toggle("active", idx === current); });
    }
    function next() { go(current + 1); }
    function prev() { go(current - 1); }
    function play() { clearInterval(timer); timer = setInterval(next, INTERVAL); }

    root.addEventListener("click", function (e) {
      var nav = e.target.closest("[data-hero]");
      if (nav) {
        if (nav.getAttribute("data-hero") === "next") next(); else prev();
        play();
        return;
      }
      var dot = e.target.closest("[data-hero-dot]");
      if (dot) { go(+dot.getAttribute("data-hero-dot")); play(); }
    });

    root.addEventListener("mouseenter", function () { clearInterval(timer); });
    root.addEventListener("mouseleave", play);

    // touch swipe
    var sx = null;
    root.addEventListener("touchstart", function (e) { sx = e.touches[0].clientX; }, { passive: true });
    root.addEventListener("touchend", function (e) {
      if (sx == null) return;
      var dx = e.changedTouches[0].clientX - sx;
      if (Math.abs(dx) > 40) { if (dx < 0) next(); else prev(); play(); }
      sx = null;
    });

    play();
  }

  /* ---- video reviews (about.html) ---- */
  function renderVideoReviews() {
    var grid = document.getElementById("vr-grid");
    if (!grid) return;
    var videos = (window.CMT && window.CMT.reviewVideos) || [];
    if (!videos.length) {
      grid.innerHTML = '<div class="vr-empty">' +
        'Review videos coming soon. ' +
        '<a href="https://www.youtube.com/@caremytripindia" target="_blank" rel="noopener" style="color:var(--primary);font-weight:700">' +
        'Watch our travellers on YouTube →</a></div>';
      return;
    }
    grid.innerHTML = videos.map(function (v, i) {
      var src = "https://www.youtube.com/embed/" + esc(v.id) +
        "?autoplay=1&mute=1&loop=1&playlist=" + esc(v.id) +
        "&controls=0&modestbranding=1&rel=0&playsinline=1&enablejsapi=1";
      return '<article class="vr-card" data-vid="' + esc(v.id) + '" data-idx="' + i + '">' +
        '<span class="vr-badge"><i class="bi bi-record-circle-fill"></i> Live</span>' +
        '<button class="vr-sound" type="button" aria-label="Toggle sound"><i class="bi bi-volume-mute-fill"></i></button>' +
        '<iframe src="' + src + '" title="' + esc(v.title || "Traveller review") + '" ' +
        'allow="autoplay; encrypted-media; picture-in-picture" allowfullscreen loading="lazy"></iframe>' +
        '<div class="vr-meta"><h3>' + esc(v.title || "Traveller review") + '</h3>' +
        (v.traveller ? '<span>' + esc(v.traveller) + '</span>' : '') +
        '</div></article>';
    }).join("");

    grid.addEventListener("click", function (e) {
      var card = e.target.closest(".vr-card");
      if (!card) return;
      var iframe = card.querySelector("iframe");
      var soundBtn = card.querySelector(".vr-sound");
      var icon = soundBtn ? soundBtn.querySelector("i") : null;
      var muted = !card.classList.contains("unmuted");
      var cmd = muted ? "unMute" : "mute";
      try {
        iframe.contentWindow.postMessage(
          JSON.stringify({ event: "command", func: cmd, args: [] }),
          "https://www.youtube.com"
        );
      } catch (_) { /* ignore */ }
      card.classList.toggle("unmuted", muted);
      card.classList.add("playing");
      if (icon) icon.className = muted ? "bi bi-volume-up-fill" : "bi bi-volume-mute-fill";
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    bindNav();
    stampYear();
    renderFeatured();
    renderPackages();
    renderDetail();
    renderBlogs();
    renderBlogDetail();
    bindHomeSearch();
    bindEnquiry(document);
    bindHeroCarousel();
    renderReviews();
    renderVideoReviews();
    bindAffiliations();
  });
})();
