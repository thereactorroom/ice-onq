import { base44 } from "@/api/base44Client";

// Shared post-verification routing used by the sign-in and onboarding flows:
// sends a verified fusion user to their ICE profile — creating the profile
// shell when none exists yet, then dropping them into profile setup.
export async function routeAfterFusionAuth(user) {
  const fid = String(user.userId);

  // Does this fusion user already have an ICE profile?
  try {
    const check = await base44.functions.invoke("checkProfileExists", { id: fid });
    if (check.data?.exists) {
      window.location.href = `/profile?fID=${fid}&Launch=Profile&Owner=True`;
      return;
    }
  } catch { /* check failed — fall through to creation */ }

  // No ICE profile yet — create the fusion relationship (profile shell
  // seeded from the fusion account), then drop into profile creation
  try {
    await base44.functions.invoke("getPublicICEProfile", {
      profileId: fid,
      fusionUser: { userId: user.userId, name: user.name, surname: user.surname, dob: user.dob, picture: user.picture },
      fusionHost: window.location.origin,
    });
  } catch { /* shell creation failed — still route to their profile area */ }

  // New fusion account — take the user to "Your ICE Profiles" (selector),
  // where their freshly created profile shell is listed.
  window.location.href = `/profile?fID=${fid}&Launch=Profile&Owner=true`;
}