/* 0n1x unified top nav — one consistent, auth-aware header on EVERY page.
 * Self-injects, removes legacy per-page <nav> bars, and reflects the shared
 * OnyxAuth session: signed-out → "Sign in"; signed-in → a profile chip with a
 * dropdown (Profile · Earn · AI News · Sign out). Depends on /auth.js (window.OnyxAuth).
 * Include on any page with:  <script type="module" src="/auth.js"></script>
 *                            <script src="/nav.js" defer></script>
 */
(function () {
  var LINKS = [
    { href: "/news.html", label: "AI News" },
    { href: "/learn.html", label: "Learn" },
    { href: "/earn.html", label: "Earn" },
    { href: "/matrix.html", label: "Matrix" },
    { href: "/metrics.html", label: "Metrics" },
    { href: "/rankings.html", label: "Rankings" },
    { href: "/forum.html", label: "Forum" },
    { href: "https://rhinogent.com/chat", label: "AI Chat" },
    { href: "/rank-spec.html", label: "Rank" }
  ];
  var esc = function (s) {
    return String(s == null ? "" : s).replace(/[&<>"]/g, function (c) {
      return { "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c];
    });
  };
  var path = (location.pathname || "/").replace(/index\.html$/, "").replace(/\/$/, "") || "/";
  var isCur = function (href) {
    var h = href.replace(/\/$/, "");
    return h === path || (href === "/news.html" && /story\.html/.test(location.pathname));
  };

  // --- styles (scoped with onx- prefix so it never collides with page CSS) ---
  var css = '\
  .onx-nav{position:sticky;top:0;z-index:9000;display:flex;align-items:center;gap:14px;justify-content:space-between;\
    padding:10px 18px;background:rgba(10,14,20,.92);backdrop-filter:blur(12px);border-bottom:1px solid #1c2430;\
    font-family:"JetBrains Mono",ui-monospace,monospace}\
  .onx-nav *{box-sizing:border-box}\
  .onx-brand{font-weight:800;letter-spacing:.16em;color:#fff;font-size:15px;text-decoration:none;white-space:nowrap}\
  .onx-brand b{color:#3FE0A0}\
  .onx-links{display:flex;align-items:center;gap:4px 18px;flex-wrap:wrap}\
  .onx-links a{color:#aeb7c4;text-decoration:none;font-size:13px;font-weight:500;padding:4px 2px}\
  .onx-links a:hover{color:#3FE0A0}\
  .onx-links a[aria-current="page"]{color:#3FE0A0}\
  .onx-right{display:flex;align-items:center;gap:10px;position:relative}\
  .onx-signin{display:inline-flex;align-items:center;gap:7px;font:600 12.5px "JetBrains Mono",monospace;color:#062b1e;\
    background:#3FE0A0;border:1px solid #3FE0A0;border-radius:99px;padding:7px 15px;text-decoration:none;cursor:pointer}\
  .onx-signin:hover{filter:brightness(1.06)}\
  .onx-chip{display:inline-flex;align-items:center;gap:9px;border:1px solid #262a37;background:#0f0f16;border-radius:99px;\
    padding:5px 11px 5px 5px;cursor:pointer;color:#e9ecf2;font:600 12.5px "JetBrains Mono",monospace}\
  .onx-chip:hover{border-color:#3FE0A0}\
  .onx-av{width:26px;height:26px;border-radius:50%;display:grid;place-items:center;color:#062b1e;font-weight:800;font-size:12px;\
    background:linear-gradient(135deg,#3FE0A0,#2D7CFF)}\
  .onx-chip .onx-name{max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}\
  .onx-chip .onx-caret{color:#5c6472;font-size:10px}\
  .onx-menu{position:absolute;top:calc(100% + 8px);right:0;min-width:220px;background:#0f0f16;border:1px solid #262a37;\
    border-radius:14px;padding:8px;box-shadow:0 18px 50px -12px rgba(0,0,0,.7);display:none;z-index:9100}\
  .onx-menu.open{display:block}\
  .onx-menu .onx-who{padding:9px 12px 11px;border-bottom:1px solid #1b1d27;margin-bottom:6px}\
  .onx-menu .onx-who .e{font:600 12.5px "JetBrains Mono",monospace;color:#e9ecf2;word-break:break-all}\
  .onx-menu .onx-who .s{font:500 11px "JetBrains Mono",monospace;color:#3FE0A0;margin-top:3px}\
  .onx-menu a,.onx-menu button{display:flex;align-items:center;gap:10px;width:100%;text-align:left;background:none;border:0;\
    color:#cdd3dd;text-decoration:none;font:600 13px "Inter",system-ui,sans-serif;padding:9px 12px;border-radius:9px;cursor:pointer}\
  .onx-menu a:hover,.onx-menu button:hover{background:#171a24;color:#fff}\
  .onx-menu .sep{height:1px;background:#1b1d27;margin:6px 4px}\
  .onx-menu .danger:hover{color:#f0616d}\
  .onx-burger{display:none;background:none;border:1px solid #262a37;border-radius:9px;color:#e9ecf2;font-size:16px;\
    padding:5px 10px;cursor:pointer}\
  @media(max-width:720px){\
    .onx-links{position:absolute;top:100%;left:0;right:0;flex-direction:column;align-items:flex-start;gap:2px;\
      background:#0a0e14;border-bottom:1px solid #1c2430;padding:8px 18px 14px;display:none}\
    .onx-links.open{display:flex}\
    .onx-links a{padding:9px 2px;font-size:14px;width:100%}\
    .onx-burger{display:inline-block}\
  }';

  function mount() {
    if (document.getElementById("onx-nav-root")) return;
    var st = document.createElement("style");
    st.textContent = css;
    document.head.appendChild(st);

    // remove legacy per-page navs so there's exactly one header
    var legacy = document.querySelectorAll("nav.ox-nav, nav.nav, header nav, body > nav");
    legacy.forEach(function (n) { if (!n.closest(".onx-nav")) n.remove(); });
    // also the bare learn.html <nav> (first nav that isn't ours)
    var stray = document.querySelector("nav:not(.onx-nav)");
    if (stray && !stray.closest(".onx-nav")) stray.remove();

    var nav = document.createElement("nav");
    nav.className = "onx-nav";
    nav.id = "onx-nav-root";
    nav.setAttribute("aria-label", "Primary");
    nav.innerHTML =
      '<a class="onx-brand" href="/">0n<b>1</b>x</a>' +
      '<button class="onx-burger" id="onx-burger" aria-label="Menu" aria-expanded="false">☰</button>' +
      '<div class="onx-links" id="onx-links">' +
        LINKS.map(function (l) {
          return '<a href="' + l.href + '"' + (isCur(l.href) ? ' aria-current="page"' : "") + ">" + esc(l.label) + "</a>";
        }).join("") +
      "</div>" +
      '<div class="onx-right" id="onx-right"></div>';
    document.body.insertBefore(nav, document.body.firstChild);

    var burger = document.getElementById("onx-burger");
    var links = document.getElementById("onx-links");
    burger.addEventListener("click", function () {
      var open = links.classList.toggle("open");
      burger.setAttribute("aria-expanded", open ? "true" : "false");
    });

    wireAuth();
  }

  function renderSignedOut() {
    var right = document.getElementById("onx-right");
    if (!right) return;
    right.innerHTML = '<a class="onx-signin" href="/profile.html">Sign in</a>';
  }

  function renderSignedIn(session) {
    var right = document.getElementById("onx-right");
    if (!right) return;
    var u = session.user || {};
    var email = u.email || u.id || "account";
    var initial = (email[0] || "0").toUpperCase();
    right.innerHTML =
      '<button class="onx-chip" id="onx-chip" aria-haspopup="true" aria-expanded="false">' +
        '<span class="onx-av">' + esc(initial) + "</span>" +
        '<span class="onx-name">' + esc(email) + "</span>" +
        '<span class="onx-caret">▾</span>' +
      "</button>" +
      '<div class="onx-menu" id="onx-menu" role="menu">' +
        '<div class="onx-who"><div class="e">' + esc(email) + '</div><div class="s">● signed in · forum + full AI News</div></div>' +
        '<a href="/profile.html" role="menuitem">Your profile</a>' +
        '<a href="/earn.html" role="menuitem">Earn dashboard</a>' +
        '<a href="/news.html" role="menuitem">AI News</a>' +
        '<a href="/matrix.html" role="menuitem">Network Matrix</a>' +
        '<div class="sep"></div>' +
        '<button type="button" class="danger" id="onx-signout" role="menuitem">Sign out</button>' +
      "</div>";

    var chip = document.getElementById("onx-chip");
    var menu = document.getElementById("onx-menu");
    function close() { menu.classList.remove("open"); chip.setAttribute("aria-expanded", "false"); }
    chip.addEventListener("click", function (e) {
      e.stopPropagation();
      var open = menu.classList.toggle("open");
      chip.setAttribute("aria-expanded", open ? "true" : "false");
    });
    document.addEventListener("click", function (e) { if (!menu.contains(e.target) && e.target !== chip) close(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape") close(); });
    document.getElementById("onx-signout").addEventListener("click", function () {
      close();
      window.OnyxAuth.signOut().then(function () { location.href = "/"; });
    });
  }

  function render(session) {
    if (session && session.user) renderSignedIn(session);
    else renderSignedOut();
  }

  function wireAuth() {
    if (!window.OnyxAuth) {
      renderSignedOut(); // show something immediately; upgrade when auth loads
      return setTimeout(wireAuth, 150);
    }
    window.OnyxAuth.onChange(render);
  }

  if (document.readyState === "loading") document.addEventListener("DOMContentLoaded", mount);
  else mount();
})();
