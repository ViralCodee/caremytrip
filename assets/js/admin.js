/* CareMyTrip static admin.
 * This is a browser-only panel: edits are saved to localStorage first, then
 * exported as files for deployment.
 */
(function () {
  "use strict";

  var ADMIN_PASSWORD = "caremytrip@2026";
  var AUTH_KEY = "cmt_admin_ok";
  var PACKAGE_KEY = "cmt_packages_v1";
  var BLOG_KEY = "cmt_blogs_v1";
  var SITE_URL = "https://www.caremytrip.com/";

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  var state = {
    packages: [],
    blogs: [],
    packageTable: { q: "", category: "", page: 1, size: 25, sort: "title", dir: 1 },
    blogTable: { q: "", status: "", page: 1, size: 10, sort: "date", dir: -1 },
    editingPackage: null,
    editingBlog: null
  };

  function esc(s) {
    return String(s == null ? "" : s).replace(/[&<>"']/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c];
    });
  }
  function slugify(s) {
    return String(s || "").toLowerCase().trim().replace(/&/g, " and ").replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "");
  }
  function lines(v) { return String(v || "").split("\n").map(function (x) { return x.trim(); }).filter(Boolean); }
  function num(v) { if (v === "" || v == null) return null; var n = Number(v); return isNaN(n) ? null : n; }
  function money(n) { return n == null ? "On request" : "₹" + Number(n).toLocaleString("en-IN"); }
  function clone(x) { return JSON.parse(JSON.stringify(x || [])); }
  function company() { return (window.CMT && window.CMT.company) || {}; }
  function categories() { return (window.CMT && window.CMT.categories) || []; }
  function catName(id) {
    var c = categories().filter(function (x) { return x.id === id; })[0];
    return c ? c.name : id;
  }
  function toast(msg) {
    var t = $("#toast");
    t.textContent = msg;
    t.style.display = "block";
    clearTimeout(toast.timer);
    toast.timer = setTimeout(function () { t.style.display = "none"; }, 3200);
  }

  function getStored(key) {
    try {
      var raw = localStorage.getItem(key);
      if (raw) {
        var parsed = JSON.parse(raw);
        if (Array.isArray(parsed)) return parsed;
      }
    } catch (e) {}
    return null;
  }
  function savePackages() { localStorage.setItem(PACKAGE_KEY, JSON.stringify(state.packages)); }
  function saveBlogs() { localStorage.setItem(BLOG_KEY, JSON.stringify(state.blogs)); }

  async function fetchJson(url, fallback) {
    try {
      var res = await fetch(url, { cache: "no-store" });
      if (!res.ok) throw new Error(res.status);
      return await res.json();
    } catch (e) {
      return fallback;
    }
  }

  async function loadData() {
    var storedPackages = getStored(PACKAGE_KEY);
    var storedBlogs = getStored(BLOG_KEY);
    state.packages = storedPackages || await fetchJson("../data/packages.json", clone(window.CMT && window.CMT.packages));
    state.blogs = storedBlogs || await fetchJson("../data/blogs.json", clone(window.CMT && window.CMT.blogs));
    if (!Array.isArray(state.packages)) state.packages = [];
    if (!Array.isArray(state.blogs)) state.blogs = [];
  }

  function setAuthed(v) {
    if (v) sessionStorage.setItem(AUTH_KEY, "1");
    else sessionStorage.removeItem(AUTH_KEY);
  }
  function initAuth() {
    var gate = $("#gate");
    var app = $("#app");
    function show() {
      if (sessionStorage.getItem(AUTH_KEY) === "1") {
        gate.style.display = "none";
        app.style.display = "block";
        refreshAll();
      } else {
        gate.style.display = "grid";
        app.style.display = "none";
      }
    }
    $("#login-form").addEventListener("submit", async function (e) {
      e.preventDefault();
      if ($("#pw").value === ADMIN_PASSWORD) {
        setAuthed(true);
        await loadData();
        show();
      } else {
        $("#login-err").style.display = "block";
      }
    });
    $("#logout").addEventListener("click", function () { setAuthed(false); location.reload(); });
    loadData().then(show);
  }

  function switchPanel(name) {
    $$(".admin-nav button").forEach(function (b) { b.classList.toggle("active", b.dataset.panel === name); });
    $$(".panel").forEach(function (p) { p.classList.toggle("active", p.id === "panel-" + name); });
    $("#page-title").textContent = name.replace(/^\w/, function (c) { return c.toUpperCase(); }).replace("Seo", "SEO / GEO");
    $("#sidebar").classList.remove("open");
    if (name === "seo") renderSeo();
  }

  function updateStats() {
    $("#stat-packages").textContent = state.packages.length;
    $("#stat-featured").textContent = state.packages.filter(function (p) { return p.featured; }).length;
    $("#stat-blogs").textContent = state.blogs.length;
    $("#stat-images").textContent = new Set(state.packages.map(function (p) { return p.image; }).filter(Boolean)).size;
    $("#package-count").textContent = state.packages.length;
    $("#blog-count").textContent = state.blogs.length;
  }

  function sortRows(list, table) {
    return list.slice().sort(function (a, b) {
      var av = a[table.sort], bv = b[table.sort];
      if (av == null) av = "";
      if (bv == null) bv = "";
      if (typeof av === "number" && typeof bv === "number") return (av - bv) * table.dir;
      return String(av).localeCompare(String(bv), undefined, { numeric: true }) * table.dir;
    });
  }

  function paginate(list, table) {
    var pages = Math.max(1, Math.ceil(list.length / table.size));
    if (table.page > pages) table.page = pages;
    var start = (table.page - 1) * table.size;
    return { rows: list.slice(start, start + table.size), total: list.length, pages: pages, start: start };
  }

  function pagerHTML(info, tableName) {
    var html = '<span class="row-sub">Showing ' + (info.total ? info.start + 1 : 0) + "-" + Math.min(info.start + info.rows.length, info.total) + " of " + info.total + "</span><div class=\"pages\">";
    var from = Math.max(1, info.pages <= 7 ? 1 : state[tableName].page - 3);
    var to = Math.min(info.pages, from + 6);
    if (to - from < 6) from = Math.max(1, to - 6);
    html += '<button data-page="' + Math.max(1, state[tableName].page - 1) + '">Prev</button>';
    for (var i = from; i <= to; i++) html += '<button class="' + (i === state[tableName].page ? "active" : "") + '" data-page="' + i + '">' + i + "</button>";
    html += '<button data-page="' + Math.min(info.pages, state[tableName].page + 1) + '">Next</button></div>';
    return html;
  }

  function renderPackageTable() {
    var tableState = state.packageTable;
    var q = tableState.q.toLowerCase();
    var filtered = state.packages.filter(function (p) {
      var hay = [p.title, p.destination, p.duration, catName(p.category)].join(" ").toLowerCase();
      return (!q || hay.indexOf(q) !== -1) && (!tableState.category || p.category === tableState.category);
    });
    var info = paginate(sortRows(filtered, tableState), tableState);
    $("#package-table").innerHTML =
      '<thead><tr><th data-sort="image">Image</th><th data-sort="title">Package</th><th data-sort="category">Category</th><th data-sort="duration">Duration</th><th data-sort="price">Price</th><th>Actions</th></tr></thead>' +
      '<tbody>' + (info.rows.length ? info.rows.map(function (p) {
        var idx = state.packages.indexOf(p);
        return '<tr><td><img src="../' + esc(p.image || "assets/img/logo.png") + '" alt=""></td>' +
          '<td><div class="row-title">' + esc(p.title) + '</div><div class="row-sub">' + esc(p.destination || "") + '</div></td>' +
          '<td>' + esc(catName(p.category)) + '</td><td>' + esc(p.duration || "") + '</td><td>' + money(p.price) + (p.featured ? ' <span class="pill orange"><i class="bi bi-star-fill"></i> Featured</span>' : '') + '</td>' +
          '<td><div class="row-actions"><button class="icon-btn" data-edit-package="' + idx + '" title="Edit"><i class="bi bi-pencil"></i></button><button class="icon-btn" data-copy-package="' + idx + '" title="Duplicate"><i class="bi bi-copy"></i></button><button class="icon-btn" data-delete-package="' + idx + '" title="Delete"><i class="bi bi-trash"></i></button></div></td></tr>';
      }).join("") : '<tr><td colspan="6" class="center muted" style="padding:30px">No packages found.</td></tr>') + '</tbody>';
    $("#package-pager").innerHTML = pagerHTML(info, "packageTable");
  }

  function renderBlogTable() {
    var tableState = state.blogTable;
    var q = tableState.q.toLowerCase();
    var filtered = state.blogs.filter(function (b) {
      var hay = [b.title, b.category, b.excerpt, (b.tags || []).join(" ")].join(" ").toLowerCase();
      return (!q || hay.indexOf(q) !== -1) && (!tableState.status || b.status === tableState.status);
    });
    var info = paginate(sortRows(filtered, tableState), tableState);
    $("#blog-table").innerHTML =
      '<thead><tr><th data-sort="image">Image</th><th data-sort="title">Blog</th><th data-sort="category">Category</th><th data-sort="date">Date</th><th data-sort="status">Status</th><th>Actions</th></tr></thead>' +
      '<tbody>' + (info.rows.length ? info.rows.map(function (b) {
        var idx = state.blogs.indexOf(b);
        return '<tr><td><img src="../' + esc(b.image || "assets/img/logo.png") + '" alt=""></td>' +
          '<td><div class="row-title">' + esc(b.title) + '</div><div class="row-sub">' + esc(b.excerpt || "") + '</div></td>' +
          '<td>' + esc(b.category || "") + '</td><td>' + esc(b.date || "") + '</td><td><span class="pill ' + (b.status === "published" ? "" : "gray") + '">' + esc(b.status || "draft") + '</span></td>' +
          '<td><div class="row-actions"><button class="icon-btn" data-edit-blog="' + idx + '" title="Edit"><i class="bi bi-pencil"></i></button><button class="icon-btn" data-copy-blog="' + idx + '" title="Duplicate"><i class="bi bi-copy"></i></button><button class="icon-btn" data-delete-blog="' + idx + '" title="Delete"><i class="bi bi-trash"></i></button></div></td></tr>';
      }).join("") : '<tr><td colspan="6" class="center muted" style="padding:30px">No blogs found.</td></tr>') + '</tbody>';
    $("#blog-pager").innerHTML = pagerHTML(info, "blogTable");
  }

  function refreshAll() {
    populateFilters();
    updateStats();
    renderPackageTable();
    renderBlogTable();
    renderSeo();
  }

  function populateFilters() {
    var sel = $("#package-category");
    if (sel.dataset.done) return;
    categories().forEach(function (c) {
      var opt = document.createElement("option");
      opt.value = c.id;
      opt.textContent = c.name;
      sel.appendChild(opt);
    });
    sel.dataset.done = "1";
  }

  function packageFormHTML(p) {
    return [
      field("title", "Title *", p.title, "full", "required"),
      field("id", "ID / slug", p.id),
      '<div class="field"><label>Category</label><select name="category">' + categories().map(function (c) { return '<option value="' + c.id + '"' + (c.id === p.category ? " selected" : "") + ">" + esc(c.name) + "</option>"; }).join("") + '</select></div>',
      field("destination", "Destination", p.destination),
      field("duration", "Duration", p.duration),
      field("nights", "Nights", p.nights, "", 'type="number" min="0"'),
      field("days", "Days", p.days, "", 'type="number" min="0"'),
      field("price", "Price (₹)", p.price, "", 'type="number" min="0"'),
      field("oldPrice", "Old price (₹)", p.oldPrice, "", 'type="number" min="0"'),
      field("discount", "Discount label", p.discount),
      field("rating", "Rating", p.rating, "", 'type="number" step="0.1" min="0" max="5"'),
      field("reviews", "Reviews", p.reviews, "", 'type="number" min="0"'),
      field("image", "Image path", p.image, "full"),
      '<div class="field full check"><input type="checkbox" name="featured" id="pkg-featured"' + (p.featured ? " checked" : "") + '><label for="pkg-featured">Show as featured</label></div>',
      area("summary", "Summary", p.summary, 3),
      area("highlights", "Highlights (one per line)", (p.highlights || []).join("\n"), 3),
      area("inclusions", "Inclusions (one per line)", (p.inclusions || []).join("\n"), 3),
      area("exclusions", "Exclusions (one per line)", (p.exclusions || []).join("\n"), 3),
      area("itinerary", "Itinerary (Title :: Description per line)", (p.itinerary || []).map(function (d) { return (d.title || "") + " :: " + (d.desc || ""); }).join("\n"), 5),
      actions()
    ].join("");
  }

  function blogFormHTML(b) {
    return [
      field("title", "Title *", b.title, "full", "required"),
      field("id", "ID / slug", b.id),
      field("category", "Category", b.category),
      '<div class="field"><label>Status</label><select name="status"><option value="published"' + (b.status === "published" ? " selected" : "") + '>Published</option><option value="draft"' + (b.status === "draft" ? " selected" : "") + '>Draft</option></select></div>',
      field("date", "Publish date", b.date, "", 'type="date"'),
      field("image", "Image path", b.image, "full"),
      area("excerpt", "Excerpt", b.excerpt, 3),
      area("content", "Content", b.content, 8),
      field("metaTitle", "Meta title", b.metaTitle, "full"),
      area("metaDescription", "Meta description", b.metaDescription, 3),
      area("tags", "Tags (one per line)", (b.tags || []).join("\n"), 3),
      '<div class="field full check"><input type="checkbox" name="featured" id="blog-featured"' + (b.featured ? " checked" : "") + '><label for="blog-featured">Show as featured</label></div>',
      actions()
    ].join("");
  }

  function field(name, label, value, cls, attrs) {
    return '<div class="field ' + (cls || "") + '"><label>' + esc(label) + '</label><input name="' + name + '" value="' + esc(value == null ? "" : value) + '" ' + (attrs || "") + '></div>';
  }
  function area(name, label, value, rows) {
    return '<div class="field full"><label>' + esc(label) + '</label><textarea name="' + name + '" rows="' + rows + '">' + esc(value || "") + '</textarea></div>';
  }
  function actions() {
    return '<div class="modal-actions field full"><button class="btn btn-ghost" type="button" data-close>Cancel</button><button class="btn btn-primary" type="submit">Save</button></div>';
  }

  function openPackageForm(index) {
    state.editingPackage = index == null ? null : index;
    var p = index == null ? { category: categories()[0] && categories()[0].id, rating: 4.7, reviews: 0, image: "wp-content/uploads/2025/09/tour-3-650x400.webp" } : state.packages[index];
    $("#package-form-title").textContent = index == null ? "Add package" : "Edit package";
    $("#package-form").innerHTML = packageFormHTML(p);
    $("#package-modal").style.display = "flex";
    $("#package-form [name=title]").focus();
  }

  function openBlogForm(index) {
    state.editingBlog = index == null ? null : index;
    var b = index == null ? { status: "published", date: new Date().toISOString().slice(0, 10), image: "wp-content/uploads/2025/09/blog-image4-650x400.webp", tags: [] } : state.blogs[index];
    $("#blog-form-title").textContent = index == null ? "Add blog" : "Edit blog";
    $("#blog-form").innerHTML = blogFormHTML(b);
    $("#blog-modal").style.display = "flex";
    $("#blog-form [name=title]").focus();
  }

  function closeModals() { $$(".modal").forEach(function (m) { m.style.display = "none"; }); }

  function collectPackage(form) {
    var f = form.elements;
    var title = f.title.value.trim();
    return {
      id: (f.id.value.trim() || slugify(title)),
      title: title,
      category: f.category.value,
      destination: f.destination.value.trim(),
      nights: num(f.nights.value),
      days: num(f.days.value),
      duration: f.duration.value.trim(),
      price: num(f.price.value),
      oldPrice: num(f.oldPrice.value),
      discount: f.discount.value.trim() || null,
      currency: "INR",
      rating: num(f.rating.value) || 4.7,
      reviews: num(f.reviews.value) || 0,
      featured: f.featured.checked,
      image: f.image.value.trim(),
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

  function collectBlog(form) {
    var f = form.elements;
    var title = f.title.value.trim();
    return {
      id: (f.id.value.trim() || slugify(title)),
      title: title,
      category: f.category.value.trim(),
      status: f.status.value,
      date: f.date.value,
      image: f.image.value.trim(),
      excerpt: f.excerpt.value.trim(),
      content: f.content.value.trim(),
      metaTitle: f.metaTitle.value.trim(),
      metaDescription: f.metaDescription.value.trim(),
      tags: lines(f.tags.value),
      featured: f.featured.checked
    };
  }

  function upsert(list, item, index, label) {
    if (!item.title) { alert("Title is required."); return false; }
    var dup = list.findIndex(function (x) { return x.id === item.id; });
    if (dup !== -1 && dup !== index) { alert("Another " + label + " already uses this slug."); return false; }
    if (index == null) list.push(item);
    else list[index] = item;
    return true;
  }

  function download(filename, text, type) {
    var blob = new Blob([text], { type: type || "text/plain" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    setTimeout(function () { URL.revokeObjectURL(a.href); }, 1000);
  }

  function dataJsText() {
    return "/* CareMyTrip canonical site data. */\nwindow.CMT = {\n" +
      "  company: " + JSON.stringify(company(), null, 2).replace(/\n/g, "\n  ") + ",\n" +
      "  defaults: " + JSON.stringify((window.CMT && window.CMT.defaults) || {}, null, 2).replace(/\n/g, "\n  ") + ",\n" +
      "  categories: " + JSON.stringify(categories(), null, 2).replace(/\n/g, "\n  ") + ",\n" +
      "  packages: " + JSON.stringify(state.packages, null, 2).replace(/\n/g, "\n  ") + ",\n" +
      "  blogs: " + JSON.stringify(state.blogs, null, 2).replace(/\n/g, "\n  ") + "\n};\n";
  }

  function generateLlms() {
    var co = company();
    var out = [];
    out.push("# CareMyTrip");
    out.push("");
    out.push("> " + (co.tagline || "Travel packages across India and beyond."));
    out.push("");
    out.push("CareMyTrip is a Dehradun-based travel company offering Chardham Yatra, Himalayan tours, India holiday packages, Nepal, Vietnam and custom itineraries.");
    out.push("");
    out.push("## Important URLs");
    out.push("- Home: " + SITE_URL);
    out.push("- Tour packages: " + SITE_URL + "packages.html");
    out.push("- Blogs: " + SITE_URL + "blogs.html");
    out.push("- Contact: " + SITE_URL + "contact.html");
    out.push("");
    out.push("## Contact");
    out.push("- Phone: " + (co.phones || []).join(", "));
    out.push("- Email: " + (co.emails || []).join(", "));
    out.push("- Address: " + [co.address && co.address.street, co.address && co.address.city, co.address && co.address.region, co.address && co.address.postalCode].filter(Boolean).join(", "));
    out.push("");
    out.push("## Package Categories");
    categories().forEach(function (c) { out.push("- " + c.name + ": " + c.blurb); });
    out.push("");
    out.push("## Featured Packages");
    state.packages.filter(function (p) { return p.featured; }).slice(0, 40).forEach(function (p) {
      out.push("- " + p.title + " | " + (p.destination || catName(p.category)) + " | " + (p.duration || "Flexible") + " | " + (p.price == null ? "On request" : "From INR " + p.price) + " | " + SITE_URL + "package.html?id=" + encodeURIComponent(p.id));
    });
    out.push("");
    out.push("## Blog Posts");
    state.blogs.filter(function (b) { return b.status !== "draft"; }).forEach(function (b) {
      out.push("- " + b.title + " | " + (b.excerpt || "") + " | " + SITE_URL + "blog.html?id=" + encodeURIComponent(b.id));
    });
    return out.join("\n") + "\n";
  }

  function generateSitemap() {
    var urls = [SITE_URL, SITE_URL + "packages.html", SITE_URL + "blogs.html", SITE_URL + "about.html", SITE_URL + "contact.html"];
    state.packages.forEach(function (p) { urls.push(SITE_URL + "package.html?id=" + encodeURIComponent(p.id)); });
    state.blogs.filter(function (b) { return b.status !== "draft"; }).forEach(function (b) { urls.push(SITE_URL + "blog.html?id=" + encodeURIComponent(b.id)); });
    return '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
      urls.map(function (u) { return '  <url><loc>' + esc(u) + '</loc></url>'; }).join("\n") +
      "\n</urlset>\n";
  }

  function renderSeo() {
    var llms = $("#llms-output");
    var sitemap = $("#sitemap-output");
    if (llms) llms.value = generateLlms();
    if (sitemap) sitemap.value = generateSitemap();
  }

  function readImport(file, kind) {
    var reader = new FileReader();
    reader.onload = function () {
      try {
        var data = JSON.parse(reader.result);
        var arr = Array.isArray(data) ? data : data[kind];
        if (!Array.isArray(arr)) throw new Error("Expected JSON array.");
        if (kind === "packages") { state.packages = arr; savePackages(); }
        else { state.blogs = arr; saveBlogs(); }
        refreshAll();
        toast("Imported " + arr.length + " " + kind + ".");
      } catch (e) {
        alert("Import failed: " + e.message);
      }
    };
    reader.readAsText(file);
  }

  function bindEvents() {
    $$(".admin-nav button").forEach(function (b) { b.addEventListener("click", function () { switchPanel(b.dataset.panel); }); });
    $("#sidebar-toggle").addEventListener("click", function () { $("#sidebar").classList.toggle("open"); });
    $("#add-package").addEventListener("click", function () { openPackageForm(null); });
    $("#add-blog").addEventListener("click", function () { openBlogForm(null); });
    $$("[data-close]").forEach(function (b) { b.addEventListener("click", closeModals); });
    $$(".modal").forEach(function (m) { m.addEventListener("click", function (e) { if (e.target === m) closeModals(); }); });

    $("#package-search").addEventListener("input", function () { state.packageTable.q = this.value; state.packageTable.page = 1; renderPackageTable(); });
    $("#package-category").addEventListener("change", function () { state.packageTable.category = this.value; state.packageTable.page = 1; renderPackageTable(); });
    $("#package-page-size").addEventListener("change", function () { state.packageTable.size = Number(this.value); state.packageTable.page = 1; renderPackageTable(); });
    $("#blog-search").addEventListener("input", function () { state.blogTable.q = this.value; state.blogTable.page = 1; renderBlogTable(); });
    $("#blog-status").addEventListener("change", function () { state.blogTable.status = this.value; state.blogTable.page = 1; renderBlogTable(); });
    $("#blog-page-size").addEventListener("change", function () { state.blogTable.size = Number(this.value); state.blogTable.page = 1; renderBlogTable(); });

    document.addEventListener("click", function (e) {
      var b;
      if (e.target.closest("[data-close]")) closeModals();
      if ((b = e.target.closest("[data-edit-package]"))) openPackageForm(+b.dataset.editPackage);
      if ((b = e.target.closest("[data-copy-package]"))) {
        var copy = clone([state.packages[+b.dataset.copyPackage]])[0];
        copy.id += "-copy"; copy.title += " Copy"; state.packages.push(copy); savePackages(); refreshAll(); toast("Package duplicated.");
      }
      if ((b = e.target.closest("[data-delete-package]")) && confirm("Delete this package?")) {
        state.packages.splice(+b.dataset.deletePackage, 1); savePackages(); refreshAll(); toast("Package deleted.");
      }
      if ((b = e.target.closest("[data-edit-blog]"))) openBlogForm(+b.dataset.editBlog);
      if ((b = e.target.closest("[data-copy-blog]"))) {
        var bcopy = clone([state.blogs[+b.dataset.copyBlog]])[0];
        bcopy.id += "-copy"; bcopy.title += " Copy"; state.blogs.push(bcopy); saveBlogs(); refreshAll(); toast("Blog duplicated.");
      }
      if ((b = e.target.closest("[data-delete-blog]")) && confirm("Delete this blog?")) {
        state.blogs.splice(+b.dataset.deleteBlog, 1); saveBlogs(); refreshAll(); toast("Blog deleted.");
      }
      if ((b = e.target.closest("#package-pager [data-page]"))) { state.packageTable.page = +b.dataset.page; renderPackageTable(); }
      if ((b = e.target.closest("#blog-pager [data-page]"))) { state.blogTable.page = +b.dataset.page; renderBlogTable(); }
      if ((b = e.target.closest("#package-table th[data-sort]"))) {
        var ps = state.packageTable; ps.dir = ps.sort === b.dataset.sort ? ps.dir * -1 : 1; ps.sort = b.dataset.sort; renderPackageTable();
      }
      if ((b = e.target.closest("#blog-table th[data-sort]"))) {
        var bs = state.blogTable; bs.dir = bs.sort === b.dataset.sort ? bs.dir * -1 : 1; bs.sort = b.dataset.sort; renderBlogTable();
      }
    });

    $("#package-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var p = collectPackage(e.currentTarget);
      if (!upsert(state.packages, p, state.editingPackage, "package")) return;
      savePackages(); closeModals(); refreshAll(); toast("Package saved.");
    });
    $("#blog-form").addEventListener("submit", function (e) {
      e.preventDefault();
      var b = collectBlog(e.currentTarget);
      if (!upsert(state.blogs, b, state.editingBlog, "blog")) return;
      saveBlogs(); closeModals(); refreshAll(); toast("Blog saved.");
    });

    $("#export-packages").addEventListener("click", function () { download("packages.json", JSON.stringify(state.packages, null, 2), "application/json"); });
    $("#export-blogs").addEventListener("click", function () { download("blogs.json", JSON.stringify(state.blogs, null, 2), "application/json"); });
    $("#export-data-js").addEventListener("click", function () { download("data.js", dataJsText(), "application/javascript"); });
    $("#download-llms").addEventListener("click", function () { download("llms.txt", generateLlms(), "text/plain"); });
    $("#import-packages").addEventListener("change", function () { if (this.files[0]) readImport(this.files[0], "packages"); this.value = ""; });
    $("#import-blogs").addEventListener("change", function () { if (this.files[0]) readImport(this.files[0], "blogs"); this.value = ""; });
    $("#reset-all").addEventListener("click", function () {
      if (!confirm("Clear local admin edits and reload built-in data?")) return;
      localStorage.removeItem(PACKAGE_KEY);
      localStorage.removeItem(BLOG_KEY);
      loadData().then(function () { refreshAll(); toast("Local edits reset."); });
    });
  }

  document.addEventListener("DOMContentLoaded", function () {
    bindEvents();
    initAuth();
  });
})();
