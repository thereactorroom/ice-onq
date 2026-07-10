// Detects if the app is running inside a fusiononq.com iframe

// Bridge scripts (fusion.bridge.js, native.bridge.js) declare their objects with
// `const` at the top level, which creates a global lexical binding that does NOT
// attach to `window`. We use `new Function` to evaluate in the global scope so we
// can access them, while keeping the name in a string to avoid lint errors.
export function getGlobalBridge(name) {
  try {
    // eslint-disable-next-line no-new-func
    return new Function(`return typeof ${name} !== 'undefined' ? ${name} : undefined`)();
  } catch {
    return undefined;
  }
}

const FUSION_IFRAME_KEY = "__ice_onq_fusion_iframe";

export function isInFusionIframe() {
  // sessionStorage survives same-tab navigations — after the first internal
  // navigation, document.referrer becomes the previous base44 page URL (not
  // the fusion parent), so re-detecting from scratch would return false.
  try {
    const cached = sessionStorage.getItem(FUSION_IFRAME_KEY);
    if (cached !== null) return cached === "true";
  } catch {}

  if (window.self === window.top) {
    try { sessionStorage.setItem(FUSION_IFRAME_KEY, "false"); } catch {}
    return false;
  }

  let host = "";
  try {
    host = window.parent.location.hostname;
  } catch {
    try {
      host = new URL(document.referrer).hostname;
    } catch {
      // Cross-origin iframe with no usable referrer — fall back to bridge globals
      const hasBridge = !!window.__fusiononqBridge || !!getGlobalBridge("FusionBridge");
      try { sessionStorage.setItem(FUSION_IFRAME_KEY, String(hasBridge)); } catch {}
      return hasBridge;
    }
  }

  const result = host.endsWith("fusiononq.com");
  try { sessionStorage.setItem(FUSION_IFRAME_KEY, String(result)); } catch {}
  return result;
}

// Call a phone number — uses NativeBridge inside fusion iframe, else tel: link
export function fusionCall(tel) {
  const bridge = getGlobalBridge("NativeBridge");
  if (isInFusionIframe() && bridge && typeof bridge.openPhone === "function") {
    bridge.openPhone({ tel });
  } else {
    window.location.href = `tel:${tel}`;
  }
}

// Send SMS — uses NativeBridge inside fusion iframe, else sms: link
export function fusionSMS(to, body) {
  const bridge = getGlobalBridge("NativeBridge");
  if (isInFusionIframe() && bridge && typeof bridge.openSMS === "function") {
    bridge.openSMS({ to, body });
  } else {
    window.location.href = `sms:${to}?body=${encodeURIComponent(body)}`;
  }
}

// Download a file by URL — tries NativeBridge.download (native app + browser fallback),
// then FusionBridge.send (postMessage to parent), then direct postMessage, then browser download
export function fusionDownload(url, filename) {
  const nativeBridge = getGlobalBridge("NativeBridge");
  const fusionBridge = getGlobalBridge("FusionBridge");

  // NativeBridge.download handles native (window.CommunicationBridge) with browser fallback
  if (nativeBridge && typeof nativeBridge.download === "function") {
    nativeBridge.download({ url });
    return true;
  }

  // FusionBridge has no download() — use send() to post a download request to the parent
  if (fusionBridge && typeof fusionBridge.send === "function") {
    fusionBridge.send({ request: "download", payload: { url } });
    return true;
  }

  // Direct postMessage fallback (same shape FusionBridge.send uses)
  if (window.self !== window.top) {
    window.top.postMessage({ request: "download", payload: { url } }, "*");
    return true;
  }

  // Browser download fallback
  const link = document.createElement("a");
  link.href = url;
  if (filename) link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return true;
}

// Open WhatsApp — tries NativeBridge.openWhatsApp (routes through openBrowser) first,
// then FusionBridge.openWhatsApp, then direct postMessage, else wa.me link
export function fusionWhatsApp(phone, text) {
  const uri = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;

  const nativeBridge = getGlobalBridge("NativeBridge");
  if (nativeBridge && typeof nativeBridge.openWhatsApp === "function") {
    nativeBridge.openWhatsApp({ uri });
    return;
  }

  const fusionBridge = getGlobalBridge("FusionBridge");
  if (fusionBridge && typeof fusionBridge.openWhatsApp === "function") {
    fusionBridge.openWhatsApp(uri);
    return;
  }

  if (window.self !== window.top) {
    window.top.postMessage({ request: "openWhatsApp", payload: { uri } }, "*");
    return;
  }

  window.location.href = uri;
}