import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { fusionId, email, dependentProfileId } = await req.json();

    // Pending invites addressed to this user's email
    const pendingByEmail = email
      ? await base44.asServiceRole.entities.GuardianInvite.filter({ invitee_email: email.toLowerCase(), status: 'pending' })
      : [];

    // Co-guardianships this user already has (via ProfileGuardian)
    const guardianships = fusionId
      ? await base44.asServiceRole.entities.ProfileGuardian.filter({ guardian_fusion_id: String(fusionId) })
      : [];

    // Existing guardians for a specific dependent (for manage panel)
    let dependentGuardians = [];
    let dependentInvites = [];
    if (dependentProfileId) {
      [dependentGuardians, dependentInvites] = await Promise.all([
        base44.asServiceRole.entities.ProfileGuardian.filter({ dependent_profile_id: dependentProfileId }),
        base44.asServiceRole.entities.GuardianInvite.filter({ dependent_profile_id: dependentProfileId }),
      ]);
    }

    // For each co-guardianship, fetch the profile details
    const sharedProfiles = await Promise.all(
      guardianships.map(async (g) => {
        const profile = await base44.asServiceRole.entities.ICEProfile.get(g.dependent_profile_id).catch(() => null);
        return profile ? { ...profile, _guardianship: g } : null;
      })
    );

    return Response.json({
      pendingInvites: pendingByEmail,
      sharedProfiles: sharedProfiles.filter(Boolean),
      dependentGuardians,
      dependentInvites,
    });
  } catch (error) {
    console.error('[getGuardianInvites]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});