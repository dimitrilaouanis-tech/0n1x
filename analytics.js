// 0n1x cookieless page-view beacon → your own Supabase (no third party, no cookies, no PII).
// Records path + referrer + best-effort country/city + coarse UA, so you can finally SEE who
// visits and from where — instead of discovering strangers in the auth table weeks later.
(function () {
  var URL = "https://ikduwkmlnswyrjqjllxa.supabase.co";
  var KEY = "sb_publishable_x1Jvj5y_rLpx-A9ffpqYkQ_mlAI-SnL"; // publishable, insert-only by RLS
  function send(country, city) {
    try {
      fetch(URL + "/rest/v1/pageviews", {
        method: "POST",
        headers: { apikey: KEY, "content-type": "application/json", Prefer: "return=minimal" },
        keepalive: true,
        body: JSON.stringify({
          path: location.pathname,
          referrer: document.referrer || null,
          country: country || null,
          city: city || null,
          ua: (navigator.userAgent || "").slice(0, 120),
        }),
      }).catch(function () {});
    } catch (e) {}
  }
  // best-effort cookieless geo; degrade to no-country if the lookup is blocked/offline
  fetch("https://ipapi.co/json/")
    .then(function (r) { return r.json(); })
    .then(function (d) { send(d && d.country_name, d && d.city); })
    .catch(function () { send(null, null); });
})();
