// Verified access checks for a profile's emergency records.
//
// A profile may be managed by:
//   • its own fusion identity or its primary guardian (guardian_fid),
//   • a co-guardian verified through a ProfileGuardian record,
//   • a co-guardian verified through an accepted GuardianInvite,
//   • the Base44 user who created the profile, or an admin.
//
// The fusion identity is claimed by the host (fusion onQ) and the Base44
// identity comes from the signed-in session, so every guardian is verified
// against a stored relationship before the request is allowed through.

export function matchesFusionIdentity(profile, fusionUserId) {
  if (!fusionUserId || String(fusionUserId) === '0') return false;
  return String(profile.fusion_id) === String(fusionUserId) ||
         String(profile.guardian_fid) === String(fusionUserId);
}

// Returns { authorized, actorUserId }. actorUserId is the signed-in Base44
// user's id when there is one, so callers can stamp created records.
export async function authorizeProfileAccess(base44, profile, fusionUserId) {
  let actorUserId = null;

  // 1) The profile's own fusion identity, or its primary guardian
  if (matchesFusionIdentity(profile, fusionUserId)) {
    return { authorized: true, actorUserId };
  }

  const claimedFid = fusionUserId && String(fusionUserId) !== '0' ? String(fusionUserId) : null;

  // 2) A verified guardian (co-guardian) of this dependent profile
  if (claimedFid) {
    const guardians = await base44.asServiceRole.entities.ProfileGuardian
      .filter({ dependent_profile_id: profile.id, guardian_fusion_id: claimedFid })
      .catch(() => []);
    if (guardians && guardians.length > 0) return { authorized: true, actorUserId };

    // Guardianship verified by the invitation they accepted, for guardians
    // recorded before a ProfileGuardian record existed
    const invites = await base44.asServiceRole.entities.GuardianInvite
      .filter({ dependent_profile_id: profile.id, invitee_fusion_id: claimedFid, status: 'accepted' })
      .catch(() => []);
    if (invites && invites.length > 0) return { authorized: true, actorUserId };
  }

  // 3) The signed-in Base44 user: creator, admin, or guardian by account email
  try {
    const user = await base44.auth.me();
    if (user) {
      actorUserId = user.id;
      if (user.role === 'admin' || profile.created_by_id === user.id || profile.created_by === user.email) {
        return { authorized: true, actorUserId };
      }
      if (user.email) {
        const guardians = await base44.asServiceRole.entities.ProfileGuardian
          .filter({ dependent_profile_id: profile.id, guardian_email: user.email })
          .catch(() => []);
        if (guardians && guardians.length > 0) return { authorized: true, actorUserId };

        const invites = await base44.asServiceRole.entities.GuardianInvite
          .filter({ dependent_profile_id: profile.id, invitee_email: user.email, status: 'accepted' })
          .catch(() => []);
        if (invites && invites.length > 0) return { authorized: true, actorUserId };
      }
    }
  } catch { /* unauthenticated — fusion-hosted session */ }

  return { authorized: false, actorUserId };
}