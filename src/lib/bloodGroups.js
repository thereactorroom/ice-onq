// Blood group options shared by every ICE profile form.
// "Unknown" is the default: unless the user deliberately picks a blood type,
// a profile must never imply one it hasn't confirmed.
export const BLOOD_GROUPS = ["A+", "A-", "B+", "B-", "AB+", "AB-", "O+", "O-", "Unknown"];

export const UNKNOWN_BLOOD_GROUP = "Unknown";

// Resolves any empty/undefined blood group to "Unknown".
export function bloodGroupOrDefault(value) {
  return value || UNKNOWN_BLOOD_GROUP;
}