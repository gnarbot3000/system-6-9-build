/**
 * Google Analytics 4 loader for system6point9.com / systemsixpointnine.com
 *
 * Measurement ID: G-W5QTNBLM6Q (shared with hibala/lake.world/KOF for now).
 * Only fires on production System 6.9 hosts — not localhost, file://, or pages.dev.
 */
(function () {
  var MEASUREMENT_ID = "G-W5QTNBLM6Q";

  var host = window.location.hostname;
  var onLiveSite =
    host === "system6point9.com" ||
    host === "www.system6point9.com" ||
    host === "systemsixpointnine.com" ||
    host === "www.systemsixpointnine.com";
  var idReady = MEASUREMENT_ID && MEASUREMENT_ID !== "REPLACE_ME";

  if (!onLiveSite || !idReady) {
    // Skip gtag on localhost, file://, preview hosts, or when ID is not set
    return;
  }

  // Load gtag.js
  var s = document.createElement("script");
  s.async = true;
  s.src = "https://www.googletagmanager.com/gtag/js?id=" + MEASUREMENT_ID;
  document.head.appendChild(s);

  window.dataLayer = window.dataLayer || [];
  function gtag() {
    window.dataLayer.push(arguments);
  }
  window.gtag = gtag;

  gtag("js", new Date());
  gtag("config", MEASUREMENT_ID);
})();
