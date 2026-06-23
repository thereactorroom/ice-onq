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

export function isInFusionIframe() {
  if (window.self === window.top) return false;
  let host = "";
  try {
    host = window.parent.location.hostname;
  } catch {
    try {
      host = new URL(document.referrer).hostname;
    } catch {
      return false;
    }
  }
  return host.endsWith("fusiononq.com");
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