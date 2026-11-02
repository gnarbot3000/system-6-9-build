(function () {
  function mediaBase() {
    // From /store/ → ../media/merch/ ; from /store/<slug>/ → ../../media/merch/
    var path = location.pathname.replace(/\/+$/, "");
    if (/\/store\/[^/]+$/.test(path) || /\/store\/[^/]+\/index\.html$/.test(path)) {
      return "../../media/merch/";
    }
    return "../media/merch/";
  }

  function money(n) {
    return "$" + Number(n).toFixed(0);
  }

  function bindWaitlist(form, slug) {
    if (!form) return;
    var email = form.querySelector('input[type="email"]');
    var btn = form.querySelector('button[type="submit"]');
    var msg = form.querySelector(".msg");
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (!email || !btn || !msg) return;
      msg.className = "msg";
      msg.textContent = "";
      var value = (email.value || "").trim();
      if (!value || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value)) {
        msg.className = "msg err";
        msg.textContent = "Enter a valid email.";
        email.focus();
        return;
      }
      btn.disabled = true;
      msg.textContent = "Sending…";
      fetch("/api/signup", {
        method: "POST",
        headers: { "Content-Type": "application/json", Accept: "application/json" },
        body: JSON.stringify({ email: value, source: "merch:" + slug })
      })
        .then(function (r) {
          return r.json().then(function (data) {
            return { ok: r.ok, data: data };
          });
        })
        .then(function (res) {
          if (!res.ok) throw new Error((res.data && res.data.error) || "Signup failed");
          msg.className = "msg ok";
          msg.textContent =
            (res.data && res.data.message) ||
            "You’re on the list for when this merch drops.";
          form.reset();
        })
        .catch(function (err) {
          msg.className = "msg err";
          msg.textContent = err.message || "Something went wrong. Try again.";
        })
        .finally(function () {
          btn.disabled = false;
        });
    });
  }

  function initCarousel(root, images, base) {
    if (!root || !images || !images.length) return;
    var imgEl = root.querySelector("[data-carousel-img]");
    var dots = root.querySelector("[data-carousel-dots]");
    var prev = root.querySelector("[data-carousel-prev]");
    var next = root.querySelector("[data-carousel-next]");
    var i = 0;

    function show(n) {
      i = (n + images.length) % images.length;
      var item = images[i];
      imgEl.src = base + item.src;
      imgEl.alt = item.alt || "";
      if (dots) {
        var buttons = dots.querySelectorAll("button");
        for (var d = 0; d < buttons.length; d++) {
          buttons[d].setAttribute("aria-current", d === i ? "true" : "false");
        }
      }
    }

    if (dots) {
      dots.innerHTML = "";
      for (var d = 0; d < images.length; d++) {
        (function (idx) {
          var b = document.createElement("button");
          b.type = "button";
          b.setAttribute("aria-label", "Show image " + (idx + 1));
          b.addEventListener("click", function () { show(idx); });
          dots.appendChild(b);
        })(d);
      }
    }
    if (prev) prev.addEventListener("click", function () { show(i - 1); });
    if (next) next.addEventListener("click", function () { show(i + 1); });

    // Swipe
    var startX = null;
    root.addEventListener(
      "touchstart",
      function (ev) {
        if (!ev.touches || !ev.touches.length) return;
        startX = ev.touches[0].clientX;
      },
      { passive: true }
    );
    root.addEventListener(
      "touchend",
      function (ev) {
        if (startX == null || !ev.changedTouches || !ev.changedTouches.length) return;
        var dx = ev.changedTouches[0].clientX - startX;
        startX = null;
        if (Math.abs(dx) < 40) return;
        if (dx < 0) show(i + 1);
        else show(i - 1);
      },
      { passive: true }
    );

    show(0);
  }

  function renderGrid() {
    var grid = document.getElementById("merch-grid");
    if (!grid || !window.SYSTEM69_MERCH) return;
    var base = mediaBase();
    grid.innerHTML = "";
    window.SYSTEM69_MERCH.forEach(function (p) {
      var a = document.createElement("a");
      a.className = "card";
      a.href = p.slug + "/";
      a.innerHTML =
        '<div class="card-media">' +
        '<span class="sold-badge">Sold out</span>' +
        '<img src="' +
        base +
        p.images[0].src +
        '" alt="' +
        p.name +
        '" width="800" height="800" loading="lazy" />' +
        "</div>" +
        '<div class="card-body">' +
        "<h2>" +
        p.name +
        "</h2>" +
        '<p class="price">' +
        money(p.price) +
        "</p>" +
        "</div>";
      grid.appendChild(a);
    });
  }

  function renderProduct(slug) {
    var p = window.system69MerchBySlug(slug);
    var root = document.getElementById("product-root");
    if (!root) return;
    if (!p) {
      root.innerHTML =
        '<p class="desc">Product not found. <a href="/store/">Back to store</a></p>';
      return;
    }
    document.title = p.name + " — System 6.9 Merch";
    var desc = document.querySelector('meta[name="description"]');
    if (desc) desc.setAttribute("content", p.description.slice(0, 155));

    var base = mediaBase();
    root.innerHTML =
      '<a class="back" href="/store/">← Back to store</a>' +
      '<div class="product">' +
      '<div class="carousel" id="carousel">' +
      '<div class="carousel-stage">' +
      '<span class="sold-badge">Sold out</span>' +
      '<img data-carousel-img alt="" width="1000" height="1000" />' +
      '<div class="carousel-nav">' +
      '<button type="button" data-carousel-prev aria-label="Previous image">‹</button>' +
      '<button type="button" data-carousel-next aria-label="Next image">›</button>' +
      "</div></div>" +
      '<div class="dots" data-carousel-dots></div>' +
      "</div>" +
      '<div class="detail">' +
      '<span class="sold-inline">Sold out</span>' +
      "<h1>" +
      p.name +
      "</h1>" +
      '<p class="price-lg">' +
      money(p.price) +
      "</p>" +
      '<p class="desc">' +
      p.description +
      "</p>" +
      '<p class="sizes">' +
      p.sizes +
      "</p>" +
      '<form class="waitlist" id="waitlist" novalidate>' +
      "<h2>When it’s available</h2>" +
      "<p>Leave your email and we’ll let you know when this drops. No checkout — this drop is sold out.</p>" +
      '<div class="row">' +
      '<input type="email" name="email" autocomplete="email" required placeholder="you@email.com" />' +
      '<button type="submit">Notify me</button>' +
      "</div>" +
      '<p class="msg" role="status" aria-live="polite"></p>' +
      "</form>" +
      "</div></div>";

    initCarousel(document.getElementById("carousel"), p.images, base);
    bindWaitlist(document.getElementById("waitlist"), p.slug);
  }

  window.system69InitStoreGrid = renderGrid;
  window.system69InitProduct = renderProduct;
})();
