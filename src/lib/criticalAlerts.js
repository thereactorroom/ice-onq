// Critical Medical Alerts come from two places: the legacy free-text list stored
// on the profile, and the structured health records flagged as critical alerts.
// Both are merged here so the red banner always matches what the Health sections
// list, and an alert recorded in both places is shown only once.
const normalize = (value) =>
  (value || "")
    .toLowerCase()
    .replace(/\ballergy\b/g, "")
    .replace(/[^a-z0-9]/g, "");

export function buildCriticalAlerts(profile, allergies = [], conditions = [], medications = []) {
  const alerts = new Map();

  const add = (key, label) => {
    const k = normalize(key);
    if (k && !alerts.has(k)) alerts.set(k, label);
  };

  (profile?.critical_alerts || []).forEach((alert) => add(alert, alert));

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