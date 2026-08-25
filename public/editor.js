// Dider Editor — vanilla JS
// Susun halaman & blok, lalu serialisasi ke hidden input (form POST).
(function () {
  var form = document.getElementById("editor-form");
  if (!form) return;

  var ukuranInput = document.getElementById("ukuran-input");
  var halamanInput = document.getElementById("halaman-input");
  var canvas = document.getElementById("editor-canvas");
  var addPageBtn = document.getElementById("add-page");
  var addTextBtn = document.getElementById("add-text");

  var ukuran = JSON.parse(ukuranInput.value || "{}");
  var halaman = JSON.parse(halamanInput.value || "[]");
  var activePage = 0;
  var scale = 1;

  function uid() {
    return "b" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  function computeScale() {
    var avail = (canvas.clientWidth || 700) - 32;
    scale = Math.min(1, avail / (ukuran.lebar || 794));
    return scale;
  }

  function render() {
    canvas.innerHTML = "";
    if (halaman.length === 0) halaman.push({ id: uid(), blok: [] });
    if (activePage >= halaman.length) activePage = halaman.length - 1;

    var pw = (ukuran.lebar || 794) * scale;
    var ph = (ukuran.tinggi || 1123) * scale;

    halaman.forEach(function (page, pi) {
      var pageEl = document.createElement("div");
      pageEl.className = "page relative border border-slate-300 bg-white rounded shadow mx-auto mb-8";
      pageEl.style.width = pw + "px";
      pageEl.style.height = ph + "px";
      if (pi === activePage) pageEl.classList.add("ring-2", "ring-indigo-500");

      var header = document.createElement("div");
      header.className = "absolute -top-6 left-0 right-0 flex items-center justify-between text-xs";
      var title = document.createElement("span");
      title.textContent = "Halaman " + (pi + 1);
      title.className = pi === activePage ? "text-indigo-600 font-semibold" : "text-slate-400";
      var del = document.createElement("button");
      del.type = "button";
      del.textContent = "hapus halaman";
      del.className = "text-red-500 hover:underline";
      del.addEventListener("click", function () {
        if (halaman.length <= 1) return;
        halaman.splice(pi, 1);
        if (activePage >= halaman.length) activePage = halaman.length - 1;
        render();
      });
      header.appendChild(title);
      header.appendChild(del);
      pageEl.appendChild(header);

      page.blok.forEach(function (blk) {
        var el = document.createElement("div");
        el.className = "absolute border border-indigo-300 bg-indigo-50 rounded px-2 py-1 cursor-move overflow-hidden";
        el.setAttribute("data-bid", blk.id);
        el.style.left = blk.x * scale + "px";
        el.style.top = blk.y * scale + "px";
        el.style.width = blk.w * scale + "px";
        el.style.height = blk.h * scale + "px";
        if (blk.type === "text") {
          el.contentEditable = "true";
          el.textContent = blk.text || "";
          el.className += " focus:outline-none";
        }

        var x = document.createElement("button");
        x.type = "button";
        x.textContent = "×";
        x.className =
          "absolute -top-2 -right-2 bg-red-500 text-white rounded-full w-5 h-5 text-xs leading-none";
        x.addEventListener("click", function (e) {
          e.stopPropagation();
          page.blok = page.blok.filter(function (b) { return b.id !== blk.id; });
          render();
        });
        el.appendChild(x);

        var dragging = false, dx = 0, dy = 0, orig = { x: blk.x, y: blk.y };
        el.addEventListener("pointerdown", function (e) {
          if (e.target === x) return;
          dragging = true;
          dx = e.clientX;
          dy = e.clientY;
          orig = { x: blk.x, y: blk.y };
          el.setPointerCapture(e.pointerId);
        });
        el.addEventListener("pointermove", function (e) {
          if (!dragging) return;
          blk.x = Math.max(0, Math.round(orig.x + (e.clientX - dx) / scale));
          blk.y = Math.max(0, Math.round(orig.y + (e.clientY - dy) / scale));
          el.style.left = blk.x * scale + "px";
          el.style.top = blk.y * scale + "px";
        });
        el.addEventListener("pointerup", function () {
          dragging = false;
        });

        pageEl.appendChild(el);
      });

      pageEl.addEventListener("pointerdown", function () {
        if (activePage !== pi) {
          activePage = pi;
          render();
        }
      });

      canvas.appendChild(pageEl);
    });
  }

  addPageBtn.addEventListener("click", function () {
    halaman.push({ id: uid(), blok: [] });
    activePage = halaman.length - 1;
    render();
  });

  addTextBtn.addEventListener("click", function () {
    if (halaman.length === 0) halaman.push({ id: uid(), blok: [] });
    var page = halaman[activePage] || halaman[0];
    page.blok.push({ id: uid(), type: "text", x: 20, y: 20, w: 200, h: 60, text: "Ketik teks di sini" });
    render();
  });

  form.addEventListener("submit", function () {
    var pages = canvas.querySelectorAll(".page");
    pages.forEach(function (pg, pi) {
      var page = halaman[pi];
      if (!page) return;
      pg.querySelectorAll("[data-bid]").forEach(function (blkEl) {
        var blk = page.blok.find(function (b) { return b.id === blkEl.getAttribute("data-bid"); });
        if (blk && blk.type === "text") blk.text = blkEl.textContent;
      });
    });
    ukuranInput.value = JSON.stringify(ukuran);
    halamanInput.value = JSON.stringify(halaman);
  });

  window.addEventListener("resize", function () {
    computeScale();
    render();
  });

  computeScale();
  render();
})();