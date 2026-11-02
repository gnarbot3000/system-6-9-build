(function () {
  var LABEL = /^[a-z0-9](?:[a-z0-9-]{0,61}[a-z0-9])?$/;
  var IMAGE_FILE = /^[A-Za-z0-9][A-Za-z0-9._-]*\.(png|jpe?g|webp)$/;

  function isFourthwallHost(hostname) {
    var host = String(hostname || "").toLowerCase();
    if (host === "fourthwall.com") return true;
    var suffix = ".fourthwall.com";
    if (host.length <= suffix.length) return false;
    if (host.slice(host.length - suffix.length) !== suffix) return false;
    var labels = host.slice(0, host.length - suffix.length).split(".");
    if (!labels.length) return false;
    for (var i = 0; i < labels.length; i++) {
      if (!LABEL.test(labels[i])) return false;
    }
    return true;
  }

  function fourthwallBuyHref(value) {
    if (typeof value !== "string" || !value || value.length > 2048) return "";
    if (/[\u0000-\u0020\\<>"']/.test(value)) return "";
    var parsed;
    try {
      parsed = new URL(value);
    } catch (err) {
      return "";
    }
    if (parsed.protocol !== "https:") return "";
    if (parsed.username || parsed.password) return "";
    if (parsed.port) return "";
    if (!isFourthwallHost(parsed.hostname)) return "";
    if (parsed.href.slice(0, 8) !== "https://") return "";
    return parsed.href;
  }

  function buyHrefForSlug(slug) {
    if (window.MERCH_ENABLED !== true) return "";
    if (typeof slug !== "string" || !slug) return "";
    var map = window.FOURTHWALL_URLS;
    if (!map || typeof map !== "object") return "";
    if (!Object.prototype.hasOwnProperty.call(map, slug)) return "";
    return fourthwallBuyHref(map[slug]);
  }

  function imageFile(product) {
    var images = product && product.images;
    if (!images || !images.length || !images[0]) return "";
    var src = images[0].src;
    if (typeof src !== "string" || src.indexOf("..") !== -1) return "";
    if (!IMAGE_FILE.test(src)) return "";
    return src;
  }

  function imageAlt(product, file) {
    var images = product && product.images;
    if (file && images && images[0] && typeof images[0].alt === "string" && images[0].alt) {
      return images[0].alt;
    }
    return product && typeof product.name === "string" ? product.name : "";
  }

  function clearNode(node) {
    while (node.firstChild) node.removeChild(node.firstChild);
  }

  function cardFor(doc, product) {
    var card = doc.createElement("article");
    card.className = "card";

    var media = doc.createElement("div");
    media.className = "card-media";

    var href = buyHrefForSlug(product && product.slug);
    if (!href) {
      var badge = doc.createElement("span");
      badge.className = "sold-badge";
      badge.textContent = "Coming soon";
      media.appendChild(badge);
    }

    var file = imageFile(product);
    if (file) {
      var img = doc.createElement("img");
      var src = "/media/merch/" + file;
      var alt = imageAlt(product, file);
      img.setAttribute("src", src);
      img.setAttribute("alt", alt);
      img.setAttribute("width", "800");
      img.setAttribute("height", "800");
      img.setAttribute("loading", "lazy");
      img.src = src;
      img.alt = alt;
      media.appendChild(img);
    }
    card.appendChild(media);

    var body = doc.createElement("div");
    body.className = "card-body";
    var heading = doc.createElement("h2");
    heading.textContent = product && typeof product.name === "string" ? product.name : "";
    body.appendChild(heading);

    if (href) {
      var link = doc.createElement("a");
      link.className = "merch-buy";
      link.setAttribute("href", href);
      link.setAttribute("target", "_blank");
      link.setAttribute("rel", "noopener");
      link.textContent = "Buy on Fourthwall";
      body.appendChild(link);
    }

    card.appendChild(body);
    return card;
  }

  function render(doc) {
    var grid = doc.getElementById("merch-grid");
    if (!grid) return;
    clearNode(grid);
    var list = window.SYSTEM69_MERCH;
    if (!list || !list.length) return;
    for (var i = 0; i < list.length; i++) {
      grid.appendChild(cardFor(doc, list[i]));
    }
    if (typeof doc.querySelector !== "function") return;
    var badge = doc.querySelector(".hero .badge");
    if (!badge || typeof grid.querySelector !== "function") return;
    badge.textContent = grid.querySelector("a") ? "Merch" : "Merch · Coming soon";
  }

  window.system69FourthwallBuyHref = fourthwallBuyHref;
  window.system69InitMerch = function () {
    render(document);
  };

  if (typeof document !== "undefined" && document.getElementById && document.getElementById("merch-grid")) {
    window.system69InitMerch();
  }
})();
