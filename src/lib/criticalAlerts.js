// Critical Medical Alerts are derived only from the health records themselves
// (allergies, conditions and medications flagged as critical), so the red banner
// can never list an alert that the Health sections no longer hold.
const normalize = (value) =>
  (value || "")
    .toLowerCase()
    .replace(/\ballergy\b/g, "")
    .replace(/[^a-z0-9]/g, "");

export function buildCriticalAlerts(allergies = [], conditions = [], medications = []) {
  const alerts = new Map();

  const add = (key, label) => {
    const k = normalize(key);
    if (k && !alerts.has(k)) alerts.set(k, label);
  };

  allergies
    .filter((a) => a.is_critical_alert)
    .forEach((a) => add(a.name, `${a.name} Allergy${a.severity ? ` · ${a.severity}` : ""}`));

  conditions
    .filter((c) => c.is_critical_alert)
    .forEach((c) => add(c.name, c.name));

  medications
    .filter((m) => m.is_critical_alert)
    .forEach((m) => add(m.name, `${m.name}${m.dosage ? ` ${m.dosage}` : ""}`));

  return [...alerts.values()];
}