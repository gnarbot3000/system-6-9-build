// /builds: show approved builds and send new ones to the review queue.
(function () {
  var PARTS = {
    pca1100: "PCA-1100 capstan drum", hucp205: "HUCP205 pillow blocks", petg: "PETG filament",
    flipsky80100: "Flipsky 80100 motor", amsteel50: "AmSteel-Blue 50 ft", amsteel600: "AmSteel-Blue 600 ft spool",
    weisen: "WeiSen roller fairlead", lovejoy: "Lovejoy L100 jaw hub", housing: "Plywood, bolts, glue"
  };

  function el(tag, cls, text) {
    var n = document.createElement(tag);
    if (cls) n.className = cls;
    if (text) n.textContent = text;
    return n;
  }

  function card(b) {
    var li = el("li", "build");
    li.appendChild(el("h2", "", b.name));
    li.appendChild(el("p", "build-by", "by " + b.by));
    if (b.image && /^https:\/\/(i\.imgur\.com|i\.postimg\.cc|live\.staticflickr\.com)\//.test(b.image)) {
      var img = el("img", "build-img");
      img.src = b.image;
      img.alt = "Photo of " + b.name;
      img.loading = "lazy";
      img.referrerPolicy = "no-referrer";
      img.addEventListener("error", function () { img.remove(); });
      li.appendChild(img);
    }
    String(b.notes || "").split(/\n{2,}/).forEach(function (para) {
      if (para.trim()) li.appendChild(el("p", "", para.trim()));
    });
    var ids = (b.parts || []).filter(function (id) { return PARTS[id]; });
    if (ids.length || b.other) {
      li.appendChild(el("h3", "", "Parts"));
      var ul = el("ul", "chips");
      ids.forEach(function (id) {
        var a = el("a", "", PARTS[id]);
        a.href = "/parts#" + id;
        var c = el("li");
        c.appendChild(a);
        ul.appendChild(c);
      });
      if (b.other) ul.appendChild(el("li", "other", b.other));
      li.appendChild(ul);
    }
    return li;
  }

  var list = document.getElementById("builds-list");
  fetch("/api/builds", { headers: { Accept: "application/json" } })
    .then(function (r) { return r.ok ? r.json() : { builds: [] }; })
    .then(function (d) {
      (d.builds || []).forEach(function (b) {
        list.insertBefore(card(b), document.getElementById("build-1"));
      });
    })
    .catch(function () {});

  var pick = document.getElementById("parts-pick");
  Object.keys(PARTS).forEach(function (id) {
    var lab = el("label", "chip");
    var box = el("input");
    box.type = "checkbox";
    box.name = "parts";
    box.value = id;
    lab.appendChild(box);
    lab.appendChild(document.createTextNode(" " + PARTS[id]));
    pick.appendChild(lab);
  });

  var form = document.getElementById("build-form");
  var msg = document.getElementById("build-msg");
  form.addEventListener("submit", function (e) {
    e.preventDefault();
    var f = form.elements;
    var body = {
      name: f.name.value, by: f.by.value, image: f.image.value, other: f.other.value,
      notes: f.notes.value, company: f.company.value,
      parts: Array.prototype.filter.call(form.querySelectorAll('input[name="parts"]'), function (x) { return x.checked; }).map(function (x) { return x.value; })
    };
    var btn = form.querySelector("button");
    btn.disabled = true;
    msg.textContent = "Sending...";
    fetch("/api/builds", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(body) })
      .then(function (r) { return r.json().then(function (d) { return { ok: r.ok, d: d }; }); })
      .then(function (x) {
        msg.textContent = x.d.message || x.d.error || "Something went wrong.";
        if (x.ok) {
          form.reset();
          try { if (window.gtag) window.gtag("event", "build_submit", { parts: body.parts.length }); } catch (_) {}
        }
      })
      .catch(function () { msg.textContent = "Couldn't send. Try again in a minute."; })
      .then(function () { btn.disabled = false; });
  });
})();
