/* CareMyTrip — static admin panel (no backend).
 * Packages are stored in localStorage under the same key the public site reads,
 * so edits show up immediately on this browser. Use "Export" to download an
 * updated data.js / packages.json and commit it to publish for everyone.
 *
 * NOTE: the password below is a *convenience lock only* — it runs in the browser
 * and is NOT real security. Anyone can view the source. Do not rely on it to
 * protect sensitive data. For real protection, host behind server auth.
 */
(function () {
  "use strict";
  var ADMIN_PASSWORD = "caremytrip@2026";       // change me
  var STORE_KEY = "cmt_packages_v1";
  var AUTH_KEY = "cmt_admin_ok";

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };

  function defaults() { return JSON.parse(JSON.stringify((window.CMT && window.CMT.packages) || [])); }
  function load() {
    try { var raw = localStorage.getItem(STORE_KEY); if (raw) { var p = JSON.parse(raw); if (Array.isArray(p)) return p; } }
    catch (e) {}
    return defaults();
  }
  function save(list) { localStorage.setItem(STORE_KEY, JSON.stringify(list)); }
  function money(n) { return n == null ? "On request" : "₹" + Number(n).toLocaleString("en-IN"); }
  function esc(s){return String(s==null?"":s).replace(/[&<>"']/g,function(c){return{"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[c];});}
  function slugify(s){return String(s).toLowerCase().trim().replace(/[^a-z0-9]+/g,"-").replace(/^-+|-+$/g,"");}
  function lines(v){return String(v||"").split("\n").map(function(x){return x.trim();}).filter(Boolean);}
  function num(v){ if(v===""||v==null) return null; var n=Number(v); return isNaN(n)?null:n; }

  var state = { list: load(), editing: null };

  /* ---------- auth ---------- */
  function isAuthed(){ return sessionStorage.getItem(AUTH_KEY) === "1"; }
  function initAuth() {
    var gate = $("#gate"), app = $("#app");
    function show(){ if(isAuthed()){gate.style.display="none";app.style.display="block";renderTable();} else {gate.style.display="flex";app.style.display="none";} }
    $("#login-form").addEventListener("submit", function (e) {
      e.preventDefault();
      if ($("#pw").value === ADMIN_PASSWORD) { sessionStorage.setItem(AUTH_KEY, "1"); show(); }
      else { $("#login-err").style.display = "block"; }
    });
    $("#logout").addEventListener("click", function(){ sessionStorage.removeItem(AUTH_KEY); location.reload(); });
    show();
  }

  /* ---------- table ---------- */
  function renderTable() {
    var tb = $("#rows");
    if (!state.list.length) { tb.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:30px">No packages yet. Click "Add package".</td></tr>'; updateCount(); return; }
    tb.innerHTML = state.list.map(function (p, i) {
      return '<tr>' +
        '<td><img src="../' + esc(p.image) + '" alt="" style="width:64px;height:42px;object-fit:cover;border-radius:6px"></td>' +
        '<td><b>' + esc(p.title) + '</b><br><small style="color:#5b6b80">' + esc(p.destination) + '</small></td>' +
        '<td>' + esc(catName(p.category)) + '</td>' +
        '<td>' + esc(p.duration) + '</td>' +
        '<td>' + money(p.price) + (p.featured ? ' <span class="tag">★ featured</span>' : '') + '</td>' +
        '<td style="white-space:nowrap">' +
          '<button class="btn btn-ghost btn-sm" data-edit="' + i + '">Edit</button> ' +
          '<button class="btn btn-sm" style="background:#fdecec;color:#c0392b" data-del="' + i + '">Delete</button>' +
        '</td></tr>';
    }).join("");
    $$("[data-edit]", tb).forEach(function (b) { b.onclick = function () { openForm(+b.getAttribute("data-edit")); }; });
    $$("[data-del]", tb).forEach(function (b) { b.onclick = function () { del(+b.getAttribute("data-del")); }; });
    updateCount();
  }
  function updateCount(){ $("#count").textContent = state.list.length + " package" + (state.list.length===1?"":"s"); }
  function catName(id){ var c=((window.CMT&&window.CMT.categories)||[]).filter(function(x){return x.id===id;})[0]; return c?c.name:id; }

  function catOptions(sel){
    return ((window.CMT&&window.CMT.categories)||[]).map(function(c){
      return '<option value="'+c.id+'"'+(c.id===sel?' selected':'')+'>'+esc(c.name)+'</option>';
    }).join("");
  }

  /* ---------- form ---------- */
  function openForm(index) {
    state.editing = (index == null) ? null : index;
    var p = (index == null) ? blank() : state.list[index];
    var f = $("#form");
    f.title.value = p.title || "";
    f.id.value = p.id || "";
    f.category.innerHTML = catOptions(p.category);
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
    $("#form-title").textContent = (index == null) ? "Add package" : "Edit package";
    $("#modal").style.display = "flex";
    f.title.focus();
  }
  function closeForm(){ $("#modal").style.display = "none"; }
  function blank(){ return { category: ((window.CMT&&window.CMT.categories)||[{id:""}])[0].id, rating:4.7, reviews:0, featured:false,
    image:"wp-content/uploads/2025/09/tour-3-650x400.webp" }; }

  function collect() {
    var f = $("#form");
    var title = f.title.value.trim();
    var id = (f.id.value.trim() || slugify(title));
    return {
      id: id, title: title, category: f.category.value, destination: f.destination.value.trim(),
      nights: num(f.nights.value), days: num(f.days.value), duration: f.duration.value.trim(),
      price: num(f.price.value), oldPrice: num(f.oldPrice.value), discount: f.discount.value.trim() || null,
      currency: "INR", rating: num(f.rating.value), reviews: num(f.reviews.value) || 0,
      featured: f.featured.checked, image: f.image.value.trim(),
      summary: f.summary.value.trim(),
      highlights: lines(f.highlights.value),
      inclusions: lines(f.inclusions.value),
      exclusions: lines(f.exclusions.value),
      itinerary: lines(f.itinerary.value).map(function (ln, i) {
        var parts = ln.split("::"); return { day: i + 1, title: (parts[0] || "").trim(), desc: (parts[1] || "").trim() };
      })
    };
  }

  function submitForm(e) {
    e.preventDefault();
    var p = collect();
    if (!p.title) { alert("Title is required."); return; }
    // unique id check
    var dupIdx = state.list.findIndex(function (x) { return x.id === p.id; });
    if (state.editing == null) {
      if (dupIdx !== -1) { alert("A package with id \"" + p.id + "\" already exists. Use a different title/id."); return; }
      state.list.push(p);
    } else {
      if (dupIdx !== -1 && dupIdx !== state.editing) { alert("Another package already uses id \"" + p.id + "\"."); return; }
      state.list[state.editing] = p;
    }
    save(state.list);
    closeForm();
    renderTable();
    toast("Saved. Changes are live on this browser — Export to publish for everyone.");
  }

  function del(index) {
    if (!confirm('Delete "' + state.list[index].title + '"? This only affects this browser until you export.')) return;
    state.list.splice(index, 1);
    save(state.list);
    renderTable();
  }

  /* ---------- import / export / reset ---------- */
  function download(filename, text, type) {
    var blob = new Blob([text], { type: type || "text/plain" });
    var a = document.createElement("a");
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(function(){ URL.revokeObjectURL(a.href); }, 1000);
  }
  function exportJson(){ download("packages.json", JSON.stringify(state.list, null, 2), "application/json"); }
  function exportDataJs() {
    var co = (window.CMT && window.CMT.company) || {};
    var cats = (window.CMT && window.CMT.categories) || [];
    var out = "/* CareMyTrip — canonical site data (exported from admin). */\n" +
      "window.CMT = {\n" +
      "  company: " + JSON.stringify(co, null, 2).replace(/\n/g, "\n  ") + ",\n" +
      "  categories: " + JSON.stringify(cats, null, 2).replace(/\n/g, "\n  ") + ",\n" +
      "  packages: " + JSON.stringify(state.list, null, 2).replace(/\n/g, "\n  ") + "\n};\n";
    download("data.js", out, "application/javascript");
  }
  function importJson(file) {
    var r = new FileReader();
    r.onload = function () {
      try {
        var data = JSON.parse(r.result);
        var arr = Array.isArray(data) ? data : (data.packages || null);
        if (!Array.isArray(arr)) throw new Error("Expected an array of packages or a {packages:[...]} object.");
        state.list = arr; save(state.list); renderTable();
        toast("Imported " + arr.length + " packages.");
      } catch (e) { alert("Import failed: " + e.message); }
    };
    r.readAsText(file);
  }
  function resetAll() {
    if (!confirm("Reset to the original built-in packages? This clears your local edits on this browser.")) return;
    localStorage.removeItem(STORE_KEY);
    state.list = defaults();
    renderTable();
    toast("Reset to built-in packages.");
  }

  var toastTimer;
  function toast(msg) {
    var t = $("#toast"); t.textContent = msg; t.style.display = "block";
    clearTimeout(toastTimer); toastTimer = setTimeout(function(){ t.style.display = "none"; }, 4000);
  }

  document.addEventListener("DOMContentLoaded", function () {
    initAuth();
    $("#add-btn").onclick = function () { openForm(null); };
    $("#form").addEventListener("submit", submitForm);
    $("#cancel-btn").onclick = closeForm;
    $("#modal").addEventListener("click", function (e) { if (e.target.id === "modal") closeForm(); });
    $("#export-json").onclick = exportJson;
    $("#export-js").onclick = exportDataJs;
    $("#reset-btn").onclick = resetAll;
    $("#import-file").addEventListener("change", function () { if (this.files[0]) importJson(this.files[0]); this.value = ""; });
  });
})();
