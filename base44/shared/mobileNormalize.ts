// Normalizes a mobile number to E.164-style digits (no leading +).
// ZA-focused heuristic: a leading 0 is replaced with the 27 country code.
// Examples: "072 785 2417" -> "27727852417", "+27 72 785 2417" -> "27727852417"
export function normalizeMobile(input) {
  if (!input) return "";
  let digits = String(input).replace(/\D/g, "");
  if (digits.startsWith("0")) digits = "27" + digits.slice(1);
  return digits;
}