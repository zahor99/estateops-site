/* ===========================================================================
 * EstateOps — AI Intake "click to talk" widget
 * ---------------------------------------------------------------------------
 * A self-contained, no-build floating widget that connects a website visitor
 * to the EstateOps Vapi voice intake assistant ("Sample Estate Law", demo on
 * sample data). Drop one tag on any page:
 *
 *   <script src="/assets/intake-widget.js" defer></script>
 *
 * Optional overrides via data-attributes on the script tag:
 *   data-public-key="..."   data-assistant-id="..."   data-label="Talk to ..."
 *
 * The PUBLIC key is safe to embed (browser key). The server/private key is
 * NEVER referenced here — tool calls are signed server-side on :4015.
 *
 * Compliance (load-bearing — visitors are real prospects/attorneys):
 *   The on-screen copy discloses it is an AI assistant running on sample data,
 *   states it does NOT give legal advice, and makes no fee/outcome promises.
 *   Bar-safe by construction; the spoken disclosure lives in the assistant's
 *   first message.
 * ========================================================================= */
(function () {
  "use strict";

  if (window.__eopsIntakeWidgetLoaded) return;
  window.__eopsIntakeWidgetLoaded = true;

  var SELF = document.currentScript || (function () {
    var s = document.getElementsByTagName("script");
    return s[s.length - 1];
  })();

  var CONFIG = {
    publicKey:   (SELF && SELF.getAttribute("data-public-key"))   || "fe1cb697-8f07-4793-bab5-5a084dfde8ba",
    assistantId: (SELF && SELF.getAttribute("data-assistant-id")) || "ffbc0617-1fd0-4f1f-89cd-4f68332354fd",
    label:       (SELF && SELF.getAttribute("data-label"))        || "Talk to our AI intake coordinator",
    // Pinned for stability — Vapi's web SDK changes; bump deliberately.
    sdkUrl:      "https://cdn.jsdelivr.net/npm/@vapi-ai/web@2.5.2/+esm"
  };

  /* ---- styles (scoped under #eops-intake) -------------------------------- */
  var CSS = "" +
  "#eops-intake,#eops-intake *{box-sizing:border-box}" +
  "#eops-intake{position:fixed;right:20px;bottom:20px;z-index:2147483000;" +
    "font-family:'Schibsted Grotesk',system-ui,-apple-system,sans-serif;color:#25201E}" +
  "#eops-intake .eops-fab{display:inline-flex;align-items:center;gap:10px;cursor:pointer;border:0;" +
    "background:#5A1E2B;color:#F7F2EA;padding:13px 18px;border-radius:999px;font-size:15px;font-weight:600;" +
    "box-shadow:0 6px 22px rgba(37,32,30,.28);transition:transform .15s ease,background .15s ease}" +
  "#eops-intake .eops-fab:hover{background:#6E2738;transform:translateY(-1px)}" +
  "#eops-intake .eops-fab svg{width:20px;height:20px;flex:0 0 auto}" +
  "#eops-intake .eops-panel{position:absolute;right:0;bottom:64px;width:360px;max-width:calc(100vw - 40px);" +
    "max-height:calc(100vh - 96px);overflow:auto;" +
    "background:#F7F2EA;border:1px solid rgba(37,32,30,.13);border-radius:12px;" +
    "box-shadow:0 2px 4px rgba(37,32,30,.05),0 24px 56px rgba(37,32,30,.20);display:none}" +
  "#eops-intake.open .eops-panel{display:block}" +
  "#eops-intake .eops-hd{background:#5A1E2B;color:#F7F2EA;padding:14px 16px}" +
  "#eops-intake .eops-hd h3{margin:0;font-family:'Spectral',Georgia,serif;font-size:17px;font-weight:600;line-height:1.2}" +
  "#eops-intake .eops-hd p{margin:4px 0 0;font-size:12px;line-height:1.45;color:rgba(247,242,234,.78)}" +
  "#eops-intake .eops-close{position:absolute;top:8px;right:8px;background:transparent;border:0;color:rgba(247,242,234,.85);" +
    "font-size:20px;line-height:1;cursor:pointer;padding:10px;border-radius:6px}" +
  "#eops-intake .eops-close:hover{background:rgba(247,242,234,.12)}" +
  "#eops-intake .eops-body{padding:16px}" +
  "#eops-intake .eops-status{display:flex;align-items:center;gap:8px;font-size:13px;color:rgba(37,32,30,.72);margin-bottom:12px;min-height:18px}" +
  "#eops-intake .eops-dot{width:9px;height:9px;border-radius:50%;background:#8A7F76;flex:0 0 auto}" +
  "#eops-intake.is-live .eops-dot{background:#3C9669;animation:eops-pulse 1.4s ease-in-out infinite}" +
  "#eops-intake.is-connecting .eops-dot{background:#C2A05A;animation:eops-pulse 1s ease-in-out infinite}" +
  "#eops-intake.is-error .eops-dot{background:#b3402f}" +
  "@keyframes eops-pulse{0%,100%{opacity:1}50%{opacity:.35}}" +
  "#eops-intake .eops-act{width:100%;border:0;cursor:pointer;padding:13px;border-radius:8px;font-size:15px;font-weight:600;" +
    "font-family:inherit;transition:background .15s ease}" +
  "#eops-intake .eops-start{background:#C2A05A;color:#4A1623}" +
  "#eops-intake .eops-start:hover{background:#d3b06a}" +
  "#eops-intake .eops-end{background:#6E2738;color:#F7F2EA}" +
  "#eops-intake .eops-end:hover{background:#5A1E2B}" +
  "#eops-intake .eops-act[disabled]{opacity:.55;cursor:default}" +
  "#eops-intake .eops-transcript{margin-top:12px;max-height:180px;overflow-y:auto;font-size:13px;line-height:1.5;" +
    "border-top:1px solid rgba(37,32,30,.13);padding-top:10px;display:none}" +
  "#eops-intake.has-transcript .eops-transcript{display:block}" +
  "#eops-intake .eops-line{margin:0 0 7px}" +
  "#eops-intake .eops-line b{color:#5A1E2B}" +
  "#eops-intake .eops-line.user b{color:#2F7A55}" +
  "#eops-intake .eops-foot{font-size:11px;color:rgba(37,32,30,.72);line-height:1.45;margin:12px 0 0}" +
  "@media (prefers-reduced-motion:reduce){#eops-intake *{animation:none!important;transition:none!important}}";

  /* ---- DOM --------------------------------------------------------------- */
  var MIC_SVG = '<svg viewBox="0 0 24 24" fill="none" aria-hidden="true">' +
    '<path d="M12 15a3 3 0 0 0 3-3V6a3 3 0 1 0-6 0v6a3 3 0 0 0 3 3Z" stroke="currentColor" stroke-width="1.8"/>' +
    '<path d="M5 11a7 7 0 0 0 14 0M12 18v3" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/></svg>';

  var root, panel, statusEl, statusText, actBtn, transcriptEl;
  var vapi = null, sdkPromise = null, callActive = false, busy = false, connectTimer = null;

  function el(html) { var d = document.createElement("div"); d.innerHTML = html.trim(); return d.firstChild; }

  function build() {
    var style = document.createElement("style");
    style.textContent = CSS;
    document.head.appendChild(style);

    root = el(
      '<div id="eops-intake" role="region" aria-label="AI intake assistant">' +
        '<div class="eops-panel" role="dialog" aria-modal="true" aria-label="AI intake coordinator">' +
          '<div class="eops-hd">' +
            '<button class="eops-close" aria-label="Close">×</button>' +
            '<h3>AI intake coordinator</h3>' +
            '<p>A live demo for <b>Sample Estate Law</b>, running on sample data. It captures details and books a consult — it doesn’t give legal advice.</p>' +
          '</div>' +
          '<div class="eops-body">' +
            '<div class="eops-status" role="status" aria-live="polite"><span class="eops-dot"></span><span class="eops-status-text">Ready when you are.</span></div>' +
            '<button class="eops-act eops-start" type="button">Start the call</button>' +
            '<div class="eops-transcript" aria-live="polite"></div>' +
            '<p class="eops-foot">You’ll be asked to allow your microphone. This is a demonstration assistant; no real legal matter is created.</p>' +
          '</div>' +
        '</div>' +
        '<button class="eops-fab" type="button" aria-haspopup="dialog" aria-expanded="false">' + MIC_SVG +
          '<span class="eops-fab-label"></span></button>' +
      '</div>'
    );
    document.body.appendChild(root);

    panel        = root.querySelector(".eops-panel");
    statusEl     = root.querySelector(".eops-status");
    statusText   = root.querySelector(".eops-status-text");
    actBtn       = root.querySelector(".eops-act");
    transcriptEl = root.querySelector(".eops-transcript");
    root.querySelector(".eops-fab-label").textContent = CONFIG.label;

    var fab = root.querySelector(".eops-fab");
    fab.addEventListener("click", togglePanel);
    root.querySelector(".eops-close").addEventListener("click", function () { setOpen(false); });
    actBtn.addEventListener("click", onAct);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && root.classList.contains("open")) setOpen(false); });
  }

  function setOpen(open) {
    var fab = root.querySelector(".eops-fab");
    // Closing the panel must never leave a call (and the mic) running silently.
    if (!open && callActive) { try { vapi.stop(); } catch (e) {} }
    root.classList.toggle("open", open);
    fab.setAttribute("aria-expanded", open ? "true" : "false");
    if (open) {
      var close = root.querySelector(".eops-close");
      if (close) close.focus();
    } else {
      fab.focus();
    }
  }
  function togglePanel() { setOpen(!root.classList.contains("open")); }

  function setStatus(state, text) {
    root.classList.remove("is-live", "is-connecting", "is-error");
    if (state) root.classList.add("is-" + state);
    if (text != null) statusText.textContent = text;
  }

  function loadSdk() {
    if (sdkPromise) return sdkPromise;
    sdkPromise = import(CONFIG.sdkUrl).then(function (mod) {
      var Vapi = mod && (mod.default || mod.Vapi || mod);
      if (typeof Vapi !== "function") throw new Error("Vapi SDK failed to load");
      return Vapi;
    }).catch(function (e) {
      sdkPromise = null; // don't cache a rejection — allow retry on next click
      throw e;
    });
    return sdkPromise;
  }

  function wireEvents() {
    vapi.on("call-start", function () {
      if (connectTimer) { clearTimeout(connectTimer); connectTimer = null; }
      callActive = true; busy = false;
      setStatus("live", "Connected — go ahead and speak.");
      actBtn.disabled = false;
      actBtn.textContent = "End the call";
      actBtn.classList.remove("eops-start"); actBtn.classList.add("eops-end");
    });
    vapi.on("call-end", function () {
      callActive = false; busy = false;
      setStatus(null, "Call ended. Thanks for trying the demo.");
      actBtn.disabled = false;
      actBtn.textContent = "Start again";
      actBtn.classList.remove("eops-end"); actBtn.classList.add("eops-start");
    });
    vapi.on("speech-start", function () { if (callActive) setStatus("live", "Listening…"); });
    vapi.on("speech-end",   function () { if (callActive) setStatus("live", "Connected — go ahead and speak."); });
    vapi.on("error", function (e) {
      console.error("[eops-intake] vapi error", e);
      if (connectTimer) { clearTimeout(connectTimer); connectTimer = null; }
      callActive = false; busy = false;
      setStatus("error", "Sorry — the connection had a problem. Please try again.");
      actBtn.disabled = false;
      actBtn.textContent = "Try again";
      actBtn.classList.remove("eops-end"); actBtn.classList.add("eops-start");
    });
    vapi.on("message", function (m) {
      if (!m || m.type !== "transcript" || m.transcriptType !== "final") return;
      if (!m.transcript) return;
      addLine(m.role === "user" ? "You" : "Coordinator", m.transcript, m.role === "user");
    });
  }

  function addLine(who, text, isUser) {
    root.classList.add("has-transcript");
    var p = document.createElement("p");
    p.className = "eops-line" + (isUser ? " user" : "");
    var b = document.createElement("b"); b.textContent = who + ": ";
    p.appendChild(b);
    p.appendChild(document.createTextNode(text)); // textContent — never innerHTML (XSS-safe)
    transcriptEl.appendChild(p);
    transcriptEl.scrollTop = transcriptEl.scrollHeight;
  }

  function failStuck() {
    // Fired if call-start never arrives (hung start()/WebRTC stall) — recover the UI.
    if (callActive) return;
    try { if (vapi) vapi.stop(); } catch (e) {}
    busy = false; actBtn.disabled = false;
    actBtn.textContent = "Try again";
    actBtn.classList.remove("eops-end"); actBtn.classList.add("eops-start");
    setStatus("error", "Couldn’t connect. Please try again.");
  }

  async function onAct() {
    if (busy) return;
    if (callActive) { busy = true; actBtn.disabled = true; setStatus("live", "Ending…"); try { vapi.stop(); } catch (e) {} return; }

    busy = true;
    actBtn.disabled = true;
    setStatus("connecting", "Connecting… (allow your microphone)");
    // Arm the watchdog BEFORE awaiting — a hung start() must never strand the UI.
    if (connectTimer) clearTimeout(connectTimer);
    connectTimer = setTimeout(failStuck, 15000);
    try {
      var Vapi = await loadSdk();
      if (!vapi) { vapi = new Vapi(CONFIG.publicKey); wireEvents(); }
      await vapi.start(CONFIG.assistantId);
      // call-start handler flips UI to live and clears connectTimer.
    } catch (e) {
      console.error("[eops-intake] start failed", e);
      if (connectTimer) { clearTimeout(connectTimer); connectTimer = null; }
      busy = false; actBtn.disabled = false;
      actBtn.textContent = "Try again";
      actBtn.classList.remove("eops-end"); actBtn.classList.add("eops-start");
      setStatus("error", "Couldn’t start the call. Check mic permission and try again.");
    }
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", build);
  } else {
    build();
  }
})();
