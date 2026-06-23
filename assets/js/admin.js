/* CareMyTrip — Admin panel (AdminLTE-style, single-page).
 *
 * Architecture:
 *   - Hash-based router (#/dashboard, #/packages, #/blog, …)
 *   - LocalStorage persistence for both packages and blog posts
 *   - DataTables (jQuery) renders sortable / searchable / paginated tables
 *   - All data reads/writes go through a small async layer (`api.*`) so the
 *     UI is decoupled from storage — easy to swap for a real REST API.
 *
 * Security note: the password is a *client-side convenience lock*, not auth.
 */
(function () {
  "use strict";

  /* ---------- constants ---------- */
  var ADMIN_PASSWORD = "caremytrip@2026";
  var PKG_KEY  = "cmt_packages_v1";
  var BLOG_KEY = "cmt_blogs_v1";
  var AUTH_KEY = "cmt_admin_ok";
  var SITE_URL = "https://www.caremytrip.com/";

  /* ---------- helpers ---------- */
  function $(s, r) { return (r || document).querySelector(s); }
  function $$(s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); }

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function slugify(s) {
    return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  function money(n) { return n == null ? "On request" : "₹" + Number(n).toLocaleString("en-IN"); }
  function lines(v) { return String(v || "").split("\n").map(function (x) { return x.trim(); }).filter(Boolean); }
  function num(v) { if (v === "" || v == null) return null; var n = Number(v); return isNaN(n) ? null : n; }
  function today() { return new Date().toISOString().slice(0, 10); }
  function fmtDate(s) {
    if (!s) return "—";
    try { return new Date(s).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric" }); }
    catch (e) { return s; }
  }
  function defaultsPkg() { return JSON.parse(JSON.stringify((window.CMT && window.CMT.packages) || [])); }
  function defaultsBlog() { return JSON.parse(JSON.stringify((window.CMT && window.CMT.blogs) || [])); }
  function categories() { return (window.CMT && window.CMT.categories) || []; }
  function catName(id) { var c = categories().filter(function (x) { return x.id === id; })[0]; return c ? c.name : id; }
  function company() { return (window.CMT && window.CMT.company) || {}; }

  function loadStore(key, defaults) {
    try {
      var raw = localStorage.getItem(key);
      if (raw) { var p = JSON.parse(raw); if (Array.isArray(p)) return p; }
    } catch (e) {}
    return defaults();
  }
  function saveStore(key, list) { localStorage.setItem(key, JSON.stringify(list)); }

  /* ---------- async data layer ----------
     Simulates an AJAX endpoint. A future swap to a real REST API only
     touches these functions, not the UI code. */
  var api = {
    packages: {
      list:  function () { return new Promise(function (res) { setTimeout(function () { res(loadStore(PKG_KEY, defaultsPkg)); }, 10); }); },
      save:  function (list) { return new Promise(function (res) { saveStore(PKG_KEY, list); setTimeout(res, 0); }); },
      reset: function () { return new Promise(function (res) { localStorage.removeItem(PKG_KEY); res(defaultsPkg()); }); }
    },
    blogs: {
      list:  function () { return new Promise(function (res) { setTimeout(function () { res(loadStore(BLOG_KEY, defaultsBlog)); }, 10); }); },
      save:  function (list) { return new Promise(function (res) { saveStore(BLOG_KEY, list); setTimeout(res, 0); }); },
      reset: function () { return new Promise(function (res) { localStorage.removeItem(BLOG_KEY); res(defaultsBlog()); }); }
    }
  };

  /* ---------- state ---------- */
  var state = {
    packages: [],
    blogs: [],
    pkgTable: null,
    blogTable: null,
    catTable: null,
    editing: { pkg: null, blog: null }
  };

  /* ---------- auth ---------- */
  function isAuthed() { return sessionStorage.getItem(AUTH_KEY) === "1"; }
  function initAuth() {
    var gate = $("#gate"), app = $("#app");
    function show() {
      if (isAuthed()) {
        gate.style.display = "none";
        app.style.display = "flex";
        bootApp();
      } else {
        gate.style.display = "flex";
        app.style.display = "none";
      }
    }
    $("#login-form").addEventListener("submit", function (e) {
      e.preventDefault();
      if ($("#pw").value === ADMIN_PASSWORD) {
        sessionStorage.setItem(AUTH_KEY, "1"); show();
      } else { $("#login-err").style.display = "block"; }
    });
    show();
  }

  /* ---------- router ---------- */
  var ROUTES = {
    dashboard:    { title: "Dashboard",     view: "dashboard",  load: loadDashboard },
    packages:     { title: "Packages",      view: "packages",   load: loadPackages },
    "package-new":{ title: "New package",   view: "packages",   load: function () { return loadPackages().then(function () { openPkgForm(null); }); } },
    categories:   { title: "Categories",    view: "categories", load: loadCategories },
    blog:         { title: "Blog",          view: "blog",       load: loadBlog },
    "blog-new":   { title: "New blog post", view: "blog",       load: function () { return loadBlog().then(function () { openBlogForm(null); }); } },
    seo:          { title: "SEO & LLM",     view: "seo",        load: loadSeo },
    settings:     { title: "Settings",      view: "settings",   load: loadSettings }
  };

  function currentRoute() {
    var h = (location.hash || "").replace(/^#\/?/, "").split("?")[0];
    return ROUTES[h] ? h : "dashboard";
  }
  function navigate() {
    var r = currentRoute();
    var view = ROUTES[r];

    $$(".adm-view").forEach(function (v) {
      v.hidden = v.getAttribute("data-view") !== view.view;
    });

    $$(".adm-nav-link[data-route]").forEach(function (a) {
      a.classList.toggle("active", a.getAttribute("data-route") === r);
    });
    var crumb = $("#adm-crumbs");
    if (crumb) crumb.innerHTML = '<span><i class="bi bi-house-door"></i> Admin</span><span class="sep">/</span><span>' + esc(view.title) + '</span>';

    closeMobileSidebar();
    Promise.resolve(view.load()).catch(function (e) { console.error(e); toast("Error: " + e.message, "err"); });
  }

  /* ---------- sidebar ---------- */
  function bindSidebar() {
    $$(".adm-nav-tree").forEach(function (btn) {
      btn.addEventListener("click", function () {
        var expanded = btn.getAttribute("aria-expanded") === "true";
        btn.setAttribute("aria-expanded", expanded ? "false" : "true");
      });
    });
    var burger = $("#adm-burger"), side = $("#adm-side"), bd = $("#adm-backdrop"), closeBtn = $("#adm-side-close");
    function open()  { side.classList.add("open");    bd.hidden = false; burger.setAttribute("aria-expanded", "true"); }
    function close() { side.classList.remove("open"); bd.hidden = true;  burger.setAttribute("aria-expanded", "false"); }
    burger.addEventListener("click", function () { side.classList.contains("open") ? close() : open(); });
    closeBtn.addEventListener("click", close);
    bd.addEventListener("click", close);
    window.__cmtCloseSidebar = close;
  }
  function closeMobileSidebar() { if (window.__cmtCloseSidebar) window.__cmtCloseSidebar(); }

  /* ---------- dashboard ---------- */
  function loadDashboard() {
    return Promise.all([api.packages.list(), api.blogs.list()]).then(function (out) {
      var pkgs = out[0], blogs = out[1];
      state.packages = pkgs; state.blogs = blogs;

      $("#stat-packages").textContent = pkgs.length;
      $("#stat-featured").textContent = pkgs.filter(function (p) { return p.featured; }).length;
      $("#stat-blogs").textContent    = blogs.length;
      $("#stat-cats").textContent     = categories().length;

      var counts = {};
      pkgs.forEach(function (p) { counts[p.category] = (counts[p.category] || 0) + 1; });
      var values = Object.keys(counts).map(function (k) { return counts[k]; });
      var max = Math.max.apply(null, values.length ? values : [1]);
      var bars = categories().map(function (c) {
        var n = counts[c.id] || 0;
        var w = Math.round((n / max) * 100);
        return '<div class="b"><div class="lab" title="' + esc(c.name) + '">' + esc(c.name) + '</div>' +
               '<div class="bar"><i style="width:' + w + '%"></i></div>' +
               '<div class="n">' + n + '</div></div>';
      }).join("");
      $("#cat-chart").innerHTML = bars || '<p class="muted">No categories yet.</p>';

      var recent = pkgs.slice(-5).reverse();
      $("#recent-packages").innerHTML = recent.length ? recent.map(function (p) {
        return '<li><img src="../' + esc(p.image) + '" alt="" class="thumb" loading="lazy">' +
               '<div class="meta"><b>' + esc(p.title) + '</b><span>' + esc(catName(p.category)) + ' · ' + esc(p.duration || "") + '</span></div>' +
               '<div class="pr">' + esc(money(p.price)) + '</div></li>';
      }).join("") : '<li class="muted" style="padding:14px 0">No packages yet.</li>';

      var recentBlogs = blogs.slice().sort(function (a, b) { return (b.date || "").localeCompare(a.date || ""); }).slice(0, 5);
      $("#recent-blogs").innerHTML = recentBlogs.length ? recentBlogs.map(function (b) {
        return '<li><img src="../' + esc(b.image || "assets/img/logo.png") + '" alt="" class="thumb" loading="lazy">' +
               '<div class="meta"><b>' + esc(b.title) + '</b><span>' + esc(b.category || "Blog") + ' · ' + esc(fmtDate(b.date)) + '</span></div>' +
               '<div class="pr">' + esc((b.status || "draft").toUpperCase()) + '</div></li>';
      }).join("") : '<li class="muted" style="padding:14px 0">No blog posts yet.</li>';
    });
  }

  /* ---------- packages ---------- */
  function loadPackages() {
    return api.packages.list().then(function (list) {
      state.packages = list;
      renderPkgTable();
    });
  }
  function renderPkgTable() {
    var $tbl = window.jQuery("#pkg-table");
    if (state.pkgTable) { state.pkgTable.destroy(); $tbl.find("tbody").empty(); }

    var rows = state.packages.map(function (p, i) {
      return [
        '<img class="tbl-img" src="../' + esc(p.image) + '" alt="" loading="lazy">',
        '<div><b>' + esc(p.title) + '</b><div style="font-size:12.5px;color:var(--muted)">' + esc(p.destination || "") + '</div></div>',
        esc(catName(p.category)),
        esc(p.duration || ""),
        p.price == null ? '<span style="color:var(--muted)">On request</span>' : Number(p.price).toLocaleString("en-IN"),
        '<span title="' + esc((p.reviews || 0) + " reviews") + '"><i class="bi bi-star-fill" style="color:var(--gold)"></i> ' + esc(p.rating || 0) + '</span>',
        p.featured ? '<span class="tag-yes"><i class="bi bi-star-fill"></i> Yes</span>' : '<span class="tag-no">No</span>',
        '<div class="row-actions">' +
          '<a class="b-view" href="../package.html?id=' + encodeURIComponent(p.id) + '" target="_blank" rel="noopener" title="View"><i class="bi bi-eye"></i></a>' +
          '<button class="b-edit" data-edit="' + i + '" title="Edit"><i class="bi bi-pencil"></i></button>' +
          '<button class="b-del" data-del="' + i + '" title="Delete"><i class="bi bi-trash"></i></button>' +
        '</div>'
      ];
    });

    state.pkgTable = $tbl.DataTable({
      data: rows,
      responsive: true,
      pageLength: 10,
      lengthMenu: [[5, 10, 25, 50, -1], [5, 10, 25, 50, "All"]],
      order: [[1, "asc"]],
      columnDefs: [
        { targets: 0, orderable: false, searchable: false },
        { targets: 7, orderable: false, searchable: false }
      ],
      language: {
        search: "",
        searchPlaceholder: "Search packages…",
        lengthMenu: "Show _MENU_",
        info: "Showing _START_ to _END_ of _TOTAL_",
        infoEmpty: "0 packages",
        emptyTable: "No packages yet. Click \"Add package\" to create one.",
        paginate: { previous: "‹", next: "›" }
      }
    });

    window.jQuery("#pkg-table tbody")
      .off("click", "[data-edit], [data-del]")
      .on("click", "[data-edit]", function () { openPkgForm(+this.getAttribute("data-edit")); })
      .on("click", "[data-del]",  function () { deletePkg(+this.getAttribute("data-del")); });
  }

  /* ---------- categories ---------- */
  function loadCategories() {
    return api.packages.list().then(function (pkgs) {
      var counts = {};
      pkgs.forEach(function (p) { counts[p.category] = (counts[p.category] || 0) + 1; });

      var $tbl = window.jQuery("#cat-table");
      if (state.catTable) { state.catTable.destroy(); $tbl.find("tbody").empty(); }
      var rows = categories().map(function (c) {
        return [
          '<code>' + esc(c.id) + '</code>',
          '<b>' + esc(c.name) + '</b>',
          esc(c.blurb || ""),
          '<span class="tag-yes">' + (counts[c.id] || 0) + '</span>'
        ];
      });
      state.catTable = $tbl.DataTable({
        data: rows,
        responsive: true,
        pageLength: 10,
        order: [[1, "asc"]],
        language: { search: "", searchPlaceholder: "Filter categories…", paginate: { previous: "‹", next: "›" } }
      });
    });
  }

  /* ---------- packages form ---------- */
  function blankPkg() {
    return {
      category: (categories()[0] || { id: "" }).id,
      rating: 4.7, reviews: 0, featured: false,
      image: "wp-content/uploads/2025/09/tour-3-650x400.webp"
    };
  }
  function openPkgForm(index) {
    state.editing.pkg = (index == null) ? null : index;
    var p = (index == null) ? blankPkg() : state.packages[index];
    var f = $("#pkg-form");
    f.title.value = p.title || "";
    f.id.value = p.id || "";
    f.category.innerHTML = categories().map(function (c) {
      return '<option value="' + esc(c.id) + '"' + (c.id === p.category ? ' selected' : '') + '>' + esc(c.name) + '</option>';
    }).join("");
    f.destination.value = p.destination || "";
    f.duration.value = p.duration || "";
    f.nights.value = p.nights == null ? "" : p.nights;
    f.days.value = p.days == null ? "" : p.days;
    f.price.value = p.price == null ? "" : p.price;
    f.oldPrice.value = p.oldPrice == null ? "" : p.oldPrice;
    f.discount.value = p.discount || "";
    f.rating.value = p.rating == null ? "" : p.rating;
    f.reviews.value = p.reviews == null ? "" : p.reviews;
    f.image.value = p.image || "";
    f.featured.checked = !!p.featured;
    f.summary.value = p.summary || "";
    f.highlights.value = (p.highlights || []).join("\n");
    f.inclusions.value = (p.inclusions || []).join("\n");
    f.exclusions.value = (p.exclusions || []).join("\n");
    f.itinerary.value = (p.itinerary || []).map(function (d) { return (d.title || "") + " :: " + (d.desc || ""); }).join("\n");
    $("#pkg-modal-title").textContent = (index == null) ? "Add package" : "Edit package";
    openModal("pkg-modal");
    f.title.focus();
  }
  function collectPkg() {
    var f = $("#pkg-form");
    var title = f.title.value.trim();
    var id = (f.id.value.trim() || slugify(title));
    return {
      id: id, title: title, category: f.category.value,
      destination: f.destination.value.trim(),
      nights: num(f.nights.value), days: num(f.days.value),
      duration: f.duration.value.trim(),
      price: num(f.price.value), oldPrice: num(f.oldPrice.value),
      discount: f.discount.value.trim() || null,
      currency: "INR",
      rating: num(f.rating.value), reviews: num(f.reviews.value) || 0,
      featured: f.featured.checked, image: f.image.value.trim(),
      summary: f.summary.value.trim(),
      highlights: lines(f.highlights.value),
      inclusions: lines(f.inclusions.value),
      exclusions: lines(f.exclusions.value),
      itinerary: lines(f.itinerary.value).map(function (ln, i) {
        var parts = ln.split("::");
        return { day: i + 1, title: (parts[0] || "").trim(), desc: (parts[1] || "").trim() };
      })
    };
  }
  function submitPkg(e) {
    e.preventDefault();
    var p = collectPkg();
    if (!p.title) { toast("Title is required", "err"); return; }
    var dupIdx = state.packages.findIndex(function (x) { return x.id === p.id; });
    if (state.editing.pkg == null) {
      if (dupIdx !== -1) { toast('A package with id "' + p.id + '" already exists', "err"); return; }
      state.packages.push(p);
    } else {
      if (dupIdx !== -1 && dupIdx !== state.editing.pkg) {
        toast('Another package already uses id "' + p.id + '"', "err"); return;
      }
      state.packages[state.editing.pkg] = p;
    }
    api.packages.save(state.packages).then(function () {
      closeModal("pkg-modal");
      renderPkgTable();
      toast("Saved. Export from Settings to publish for everyone.", "ok");
    });
  }
  function deletePkg(index) {
    if (!confirm('Delete "' + state.packages[index].title + '"? Affects only this browser until you export.')) return;
    state.packages.splice(index, 1);
    api.packages.save(state.packages).then(function () { renderPkgTable(); toast("Deleted.", "ok"); });
  }

  /* ---------- blog ---------- */
  function loadBlog() {
    return api.blogs.list().then(function (list) {
      state.blogs = list;
      renderBlogTable();
    });
  }
  function renderBlogTable() {
    var $tbl = window.jQuery("#blog-table");
    if (state.blogTable) { state.blogTable.destroy(); $tbl.find("tbody").empty(); }

    var rows = state.blogs.map(function (b, i) {
      var status = (b.status || "draft").toLowerCase();
      return [
        '<img class="tbl-img" src="../' + esc(b.image || "assets/img/logo.png") + '" alt="" loading="lazy">',
        '<div><b>' + esc(b.title) + '</b><div style="font-size:12.5px;color:var(--muted)">' + esc((b.excerpt || "").slice(0, 80)) + '</div></div>',
        esc(b.category || ""),
        '<span class="tag-status ' + esc(status) + '">' + esc(status) + '</span>',
        esc(fmtDate(b.date)),
        b.featured ? '<span class="tag-yes"><i class="bi bi-star-fill"></i> Yes</span>' : '<span class="tag-no">No</span>',
        '<div class="row-actions">' +
          '<a class="b-view" href="../blog.html?id=' + encodeURIComponent(b.id) + '" target="_blank" rel="noopener" title="View"><i class="bi bi-eye"></i></a>' +
          '<button class="b-edit" data-edit="' + i + '" title="Edit"><i class="bi bi-pencil"></i></button>' +
          '<button class="b-del" data-del="' + i + '" title="Delete"><i class="bi bi-trash"></i></button>' +
        '</div>'
      ];
    });

    state.blogTable = $tbl.DataTable({
      data: rows,
      responsive: true,
      pageLength: 10,
      lengthMenu: [[5, 10, 25, 50, -1], [5, 10, 25, 50, "All"]],
      order: [[4, "desc"]],
      columnDefs: [
        { targets: 0, orderable: false, searchable: false },
        { targets: 6, orderable: false, searchable: false }
      ],
      language: {
        search: "",
        searchPlaceholder: "Search posts…",
        lengthMenu: "Show _MENU_",
        info: "Showing _START_ to _END_ of _TOTAL_",
        infoEmpty: "0 posts",
        emptyTable: "No blog posts yet. Click \"Add post\".",
        paginate: { previous: "‹", next: "›" }
      }
    });

    window.jQuery("#blog-table tbody")
      .off("click", "[data-edit], [data-del]")
      .on("click", "[data-edit]", function () { openBlogForm(+this.getAttribute("data-edit")); })
      .on("click", "[data-del]",  function () { deleteBlog(+this.getAttribute("data-del")); });
  }

  function blankBlog() {
    return {
      id: "", title: "", category: "", status: "draft", date: today(),
      image: "wp-content/uploads/2025/09/blog-image1-650x400.webp",
      excerpt: "", content: "", tags: [], featured: false,
      metaTitle: "", metaDescription: ""
    };
  }
  function openBlogForm(index) {
    state.editing.blog = (index == null) ? null : index;
    var b = (index == null) ? blankBlog() : state.blogs[index];
    var f = $("#blog-form");
    f.title.value = b.title || "";
    f.id.value = b.id || "";
    f.category.value = b.category || "";
    f.status.value = b.status || "draft";
    f.date.value = b.date || today();
    f.image.value = b.image || "";
    f.featured.checked = !!b.featured;
    f.excerpt.value = b.excerpt || "";
    f.content.value = b.content || "";
    f.tags.value = (b.tags || []).join(", ");
    f.metaTitle.value = b.metaTitle || "";
    f.metaDescription.value = b.metaDescription || "";
    $("#blog-modal-title").textContent = (index == null) ? "Add blog post" : "Edit blog post";
    openModal("blog-modal");
    f.title.focus();
  }
  function collectBlog() {
    var f = $("#blog-form");
    var title = f.title.value.trim();
    var id = (f.id.value.trim() || slugify(title));
    return {
      id: id, title: title,
      category: f.category.value.trim(),
      status: f.status.value, date: f.date.value || today(),
      image: f.image.value.trim(),
      excerpt: f.excerpt.value.trim(),
      content: f.content.value.trim(),
      tags: String(f.tags.value || "").split(",").map(function (x) { return x.trim(); }).filter(Boolean),
      featured: f.featured.checked,
      metaTitle: f.metaTitle.value.trim(),
      metaDescription: f.metaDescription.value.trim()
    };
  }
  function submitBlog(e) {
    e.preventDefault();
    var b = collectBlog();
    if (!b.title) { toast("Title is required", "err"); return; }
    var dupIdx = state.blogs.findIndex(function (x) { return x.id === b.id; });
    if (state.editing.blog == null) {
      if (dupIdx !== -1) { toast('A post with id "' + b.id + '" already exists', "err"); return; }
      state.blogs.push(b);
    } else {
      if (dupIdx !== -1 && dupIdx !== state.editing.blog) {
        toast('Another post already uses id "' + b.id + '"', "err"); return;
      }
      state.blogs[state.editing.blog] = b;
    }
    api.blogs.save(state.blogs).then(function () {
      closeModal("blog-modal");
      renderBlogTable();
      toast("Post saved.", "ok");
    });
  }
  function deleteBlog(index) {
    if (!confirm('Delete "' + state.blogs[index].title + '"?')) return;
    state.blogs.splice(index, 1);
    api.blogs.save(state.blogs).then(function () { renderBlogTable(); toast("Deleted.", "ok"); });
  }

  /* ---------- SEO / LLM generation ---------- */
  function genLlmsTxt() {
    var co = company();
    var addr = co.address || {};
    var pkgList = state.packages.length ? state.packages : (window.CMT && window.CMT.packages) || [];
    var blogList = state.blogs.length ? state.blogs : (window.CMT && window.CMT.blogs) || [];

    function pkgLine(p) {
      var price = p.price == null ? "On request" : "INR " + Number(p.price).toLocaleString("en-IN");
      var disc = p.discount ? " (" + p.discount + ")" : "";
      return "- [" + p.title + "](" + SITE_URL + "package.html?id=" + p.id + ") — " +
        (p.destination || "") + ", " + (p.duration || "") + ", " + price + disc + ". " +
        (p.summary || "").replace(/\s+/g, " ");
    }
    function blogLine(b) {
      return "- [" + b.title + "](" + SITE_URL + "blog.html?id=" + b.id + ") — " +
        (b.category || "Blog") + ", " + fmtDate(b.date) + ". " +
        (b.excerpt || "").replace(/\s+/g, " ");
    }

    var L = [];
    L.push("# " + (co.name || "CareMyTrip"));
    L.push("");
    L.push("> " + (co.tagline || "") + " " + (co.legalName || co.name) +
      " is a registered, Dehradun-based travel company (since 2013) specialising in Chardham Yatra, Himalayan and India tour packages.");
    L.push("");
    L.push("## Geo");
    L.push("- Country: India");
    L.push("- Region: " + (addr.region || "Uttarakhand"));
    L.push("- City: " + (addr.city || "Dehradun"));
    L.push("- Postal code: " + (addr.postalCode || "248003"));
    L.push("- Coordinates: 30.3165° N, 78.0322° E");
    L.push("- Service area: " + (co.countries || []).join(", "));
    L.push("");
    L.push("## SEO");
    L.push("- Site: " + (co.url || SITE_URL));
    L.push("- Sitemap: " + (co.url || SITE_URL) + "sitemap.xml");
    L.push("- Primary topics: Chardham Yatra, Kedarnath, Badrinath, Gangotri, Yamunotri, Auli, Harsil, Kerala, Nepal, Vietnam");
    L.push("- Language: en-IN");
    L.push("- License: Content (c) " + new Date().getFullYear() + " " + (co.name || "CareMyTrip") + ". Crawl-friendly for GPTBot, ClaudeBot, Google-Extended, PerplexityBot.");
    L.push("");
    L.push("## Contact");
    L.push("- Phone: " + (co.phones || []).join(", "));
    L.push("- WhatsApp: " + (co.whatsapp || ""));
    L.push("- Email: " + (co.emails || []).join(", "));
    L.push("- Address: " + (addr.street || "") + ", " + (addr.city || "") + ", " + (addr.region || "") + " " + (addr.postalCode || "") + ", India");
    L.push("- GSTIN: " + (co.gstin || "") + " | CIN: " + (co.cin || ""));
    L.push("");
    L.push("## Tour packages");
    pkgList.forEach(function (p) { L.push(pkgLine(p)); });
    L.push("");
    L.push("## Blog posts");
    blogList.filter(function (b) { return (b.status || "published") === "published"; }).forEach(function (b) { L.push(blogLine(b)); });
    L.push("");
    L.push("## Key pages");
    L.push("- [All tour packages](" + SITE_URL + "packages.html)");
    L.push("- [Blog](" + SITE_URL + "blogs.html)");
    L.push("- [About CareMyTrip](" + SITE_URL + "about.html)");
    L.push("- [Contact](" + SITE_URL + "contact.html)");
    return L.join("\n") + "\n";
  }
  function genSitemap() {
    var pkgList = state.packages.length ? state.packages : (window.CMT && window.CMT.packages) || [];
    var blogList = (state.blogs.length ? state.blogs : (window.CMT && window.CMT.blogs) || []).filter(function (b) { return (b.status || "published") === "published"; });
    var d = today();
    var urls = [
      { u: SITE_URL,                  p: 1.0 },
      { u: SITE_URL + "packages.html", p: 0.9 },
      { u: SITE_URL + "blogs.html",    p: 0.8 },
      { u: SITE_URL + "about.html",    p: 0.6 },
      { u: SITE_URL + "contact.html",  p: 0.6 }
    ];
    pkgList.forEach(function (p) { urls.push({ u: SITE_URL + "package.html?id=" + encodeURIComponent(p.id), p: 0.7 }); });
    blogList.forEach(function (b) { urls.push({ u: SITE_URL + "blog-post.html?id=" + encodeURIComponent(b.id), p: 0.7 }); });
    categories().forEach(function (c) { urls.push({ u: SITE_URL + "packages.html?cat=" + encodeURIComponent(c.id), p: 0.6 }); });

    var L = ['<?xml version="1.0" encoding="UTF-8"?>',
      '<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">'];
    urls.forEach(function (x) {
      L.push("  <url><loc>" + x.u + "</loc><lastmod>" + d + "</lastmod><priority>" + x.p + "</priority></url>");
    });
    L.push("</urlset>");
    return L.join("\n");
  }
  function genRobots() {
    return [
      "User-agent: *", "Allow: /", "Disallow: /admin/", "",
      "# AI / LLM crawlers",
      "User-agent: GPTBot", "Allow: /",
      "User-agent: ClaudeBot", "Allow: /",
      "User-agent: Google-Extended", "Allow: /",
      "User-agent: PerplexityBot", "Allow: /",
      "User-agent: anthropic-ai", "Allow: /",
      "User-agent: CCBot", "Allow: /",
      "",
      "Sitemap: " + SITE_URL + "sitemap.xml"
    ].join("\n") + "\n";
  }

  function loadSeo() {
    return Promise.all([api.packages.list(), api.blogs.list()]).then(function (out) {
      state.packages = out[0]; state.blogs = out[1];
      $("#llms-preview").textContent    = genLlmsTxt();
      $("#sitemap-preview").textContent = genSitemap();
      $("#robots-preview").textContent  = genRobots();
    });
  }

  /* ---------- settings ---------- */
  function loadSettings() {
    return Promise.all([api.packages.list(), api.blogs.list()]).then(function (out) {
      state.packages = out[0]; state.blogs = out[1];
    });
  }

  /* ---------- import / export ---------- */
  function download(filename, text, type) {
    var blob = new Blob([text], { type: type || "text/plain" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }
  function exportPkgJson()  { download("packages.json", JSON.stringify(state.packages, null, 2), "application/json"); }
  function exportBlogJson() { download("blog.json",     JSON.stringify(state.blogs,    null, 2), "application/json"); }
  function exportDataJs() {
    var co = company(); var cats = categories();
    var defs = (window.CMT && window.CMT.defaults) || {};
    var out = "/* CareMyTrip canonical site data (exported from admin). */\n" +
      "window.CMT = {\n" +
      '  "company": '    + JSON.stringify(co,             null, 2).replace(/\n/g, "\n  ") + ",\n" +
      '  "defaults": '   + JSON.stringify(defs,           null, 2).replace(/\n/g, "\n  ") + ",\n" +
      '  "categories": ' + JSON.stringify(cats,           null, 2).replace(/\n/g, "\n  ") + ",\n" +
      '  "packages": '   + JSON.stringify(state.packages, null, 2).replace(/\n/g, "\n  ") + ",\n" +
      '  "blogs": '      + JSON.stringify(state.blogs,    null, 2).replace(/\n/g, "\n  ") + "\n};\n";
    download("data.js", out, "application/javascript");
  }
  function importJson(file, target) {
    var r = new FileReader();
    r.onload = function () {
      try {
        var data = JSON.parse(r.result);
        var arr = Array.isArray(data) ? data : (data[target] || data.packages || data.blogs || null);
        if (!Array.isArray(arr)) throw new Error("Expected an array");
        if (target === "packages") { state.packages = arr; api.packages.save(arr).then(renderPkgTable); }
        if (target === "blogs")    { state.blogs    = arr; api.blogs.save(arr).then(renderBlogTable); }
        toast("Imported " + arr.length + " items.", "ok");
      } catch (e) { toast("Import failed: " + e.message, "err"); }
    };
    r.readAsText(file);
  }
  function resetPkg() {
    if (!confirm("Reset packages to built-in defaults? Local edits will be cleared.")) return;
    api.packages.reset().then(function (defaults) { state.packages = defaults; api.packages.save(defaults).then(renderPkgTable); toast("Packages reset.", "ok"); });
  }
  function resetBlog() {
    if (!confirm("Reset blog posts to built-in defaults?")) return;
    api.blogs.reset().then(function (defaults) { state.blogs = defaults; api.blogs.save(defaults).then(renderBlogTable); toast("Blog reset.", "ok"); });
  }
  function resetAll() {
    if (!confirm("Reset EVERYTHING (packages + blog + admin session)?")) return;
    localStorage.removeItem(PKG_KEY);
    localStorage.removeItem(BLOG_KEY);
    sessionStorage.removeItem(AUTH_KEY);
    location.reload();
  }

  /* ---------- modal + toast ---------- */
  function openModal(id)  { var m = document.getElementById(id); if (m) m.hidden = false; document.body.style.overflow = "hidden"; }
  function closeModal(id) { var m = document.getElementById(id); if (m) m.hidden = true;  document.body.style.overflow = ""; }
  var toastTimer;
  function toast(msg, type) {
    var t = $("#toast"); t.textContent = msg;
    t.className = "adm-toast" + (type ? " " + type : "");
    t.hidden = false;
    clearTimeout(toastTimer); toastTimer = setTimeout(function () { t.hidden = true; }, 3500);
  }

  /* ---------- boot ---------- */
  function bootApp() {
    if (window.__cmtAdminBooted) { navigate(); return; }
    window.__cmtAdminBooted = true;

    bindSidebar();

    $$("[data-close]").forEach(function (b) {
      b.addEventListener("click", function () { closeModal(b.getAttribute("data-close")); });
    });
    $$(".adm-modal").forEach(function (m) {
      m.addEventListener("click", function (e) { if (e.target === m) closeModal(m.id); });
    });

    $("#pkg-form").addEventListener("submit", submitPkg);
    $("#blog-form").addEventListener("submit", submitBlog);

    $("#pkg-add").addEventListener("click", function () { openPkgForm(null); });
    $("#pkg-export-js").addEventListener("click", exportDataJs);
    $("#pkg-export-json").addEventListener("click", exportPkgJson);
    $("#pkg-import").addEventListener("change", function () { if (this.files[0]) importJson(this.files[0], "packages"); this.value = ""; });
    $("#pkg-reset").addEventListener("click", resetPkg);

    $("#blog-add").addEventListener("click", function () { openBlogForm(null); });
    $("#blog-export").addEventListener("click", exportBlogJson);
    $("#blog-import").addEventListener("change", function () { if (this.files[0]) importJson(this.files[0], "blogs"); this.value = ""; });
    $("#blog-reset").addEventListener("click", resetBlog);

    $("#gen-llms").addEventListener("click",    function () { download("llms.txt",   genLlmsTxt(), "text/plain"); });
    $("#gen-sitemap").addEventListener("click", function () { download("sitemap.xml", genSitemap(), "application/xml"); });
    $("#gen-robots").addEventListener("click",  function () { download("robots.txt", genRobots(), "text/plain"); });

    $("#settings-export-js").addEventListener("click",  exportDataJs);
    $("#settings-export-pkg").addEventListener("click", exportPkgJson);
    $("#settings-export-blog").addEventListener("click", exportBlogJson);
    $("#settings-reset-all").addEventListener("click",  resetAll);

    $("#logout").addEventListener("click", function () {
      sessionStorage.removeItem(AUTH_KEY);
      location.reload();
    });

    window.addEventListener("hashchange", navigate);
    navigate();
  }

  /* ---------- entry ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    var tries = 0;
    var tryStart = function () {
      if (window.jQuery && window.jQuery.fn && window.jQuery.fn.DataTable) {
        initAuth();
      } else if (++tries < 200) {
        setTimeout(tryStart, 30);
      } else {
        console.error("DataTables / jQuery failed to load from CDN.");
        initAuth();
      }
    };
    tryStart();
  });
})();
