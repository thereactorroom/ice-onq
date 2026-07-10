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

// Download a file by URL — tries NativeBridge.download / FusionBridge.download,
// then postMessage, then browser download as last resort
export function fusionDownload(url, filename) {
  const nativeBridge = getGlobalBridge("NativeBridge");
  const fusionBridge = getGlobalBridge("FusionBridge");

  console.log("[fusionDownload] url:", url);
  console.log("[fusionDownload] NativeBridge:", !!nativeBridge, "download:", typeof nativeBridge?.download);
  console.log("[fusionDownload] FusionBridge:", !!fusionBridge, "download:", typeof fusionBridge?.download);

  if (nativeBridge && typeof nativeBridge.download === "function") {
    nativeBridge.download({ url });
    return true;
  }
  if (fusionBridge && typeof fusionBridge.download === "function") {
    fusionBridge.download({ url });
    return true;
  }

  const inIframe = window.self !== window.top;
  if (inIframe) {
    console.log("[fusionDownload] No bridge found, posting message to parent");
    window.top.postMessage({ request: "download", payload: { url } }, "*");
    return true;
  }

  // Fallback: browser download
  const link = document.createElement("a");
  link.href = url;
  if (filename) link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  return true;
}

// Open WhatsApp — inside fusion iframe, uses FusionBridge if available, else postMessage to parent;
// else wa.me link
export function fusionWhatsApp(phone, text) {
  const uri = `https://wa.me/${phone}?text=${encodeURIComponent(text)}`;
  if (isInFusionIframe()) {
    const bridge = getGlobalBridge("FusionBridge");
    if (bridge && typeof bridge.openWhatsApp === "function") {
      bridge.openWhatsApp(uri);
    } else {
      window.top.postMessage({ request: "openWhatsApp", payload: { uri } }, "*");
    }
  } else {
    window.location.href = uri;
  }
}