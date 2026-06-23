// Detects if the app is running inside a fusiononq.com iframe
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
  if (isInFusionIframe() && window.NativeBridge && typeof window.NativeBridge.openPhone === "function") {
    window.NativeBridge.openPhone({ tel });
  } else {
    window.location.href = `tel:${tel}`;
  }
}

// Send SMS — uses NativeBridge inside fusion iframe, else sms: link
export function fusionSMS(to, body) {
  if (isInFusionIframe() && window.NativeBridge && typeof window.NativeBridge.openSMS === "function") {
    window.NativeBridge.openSMS({ to, body });
  } else {
    window.location.href = `sms:${to}?body=${encodeURIComponent(body)}`;
  }
}

// Open WhatsApp — uses NativeBridge inside fusion iframe, else opens wa.me in a new tab
export function fusionWhatsApp(phone, text) {
  if (isInFusionIframe() && window.NativeBridge && typeof window.NativeBridge.openWhatsApp === "function") {
    const uri = `https://api.whatsapp.com/send/?phone=${phone}&text=${encodeURIComponent(text)}`;
    window.NativeBridge.openWhatsApp({ uri });
  } else {
    window.open(`https://wa.me/${phone}?text=${encodeURIComponent(text)}`, "_blank", "noopener,noreferrer");
  }
}