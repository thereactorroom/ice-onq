import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { normalizeMobile } from "../../shared/mobileNormalize.ts";

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { fusionId, email, mobile, dependentProfileId } = await req.json();

    const normalizedMobile = mobile ? normalizeMobile(mobile) : "";

    // Pending invites addressed to this user's email OR mobile number
    const pendingByEmail = email
      ? await base44.asServiceRole.entities.GuardianInvite.filter({ invitee_email: email.toLowerCase(), status: 'pending' })
      : [];
    const pendingByMobile = normalizedMobile
      ? await base44.asServiceRole.entities.GuardianInvite.filter({ invitee_mobile: normalizedMobile, status: 'pending' })
      : [];

    // Merge + dedupe by id
    const seen = new Set();
    const pendingInvites = [];
    for (const inv of [...pendingByEmail, ...pendingByMobile]) {
      if (!seen.has(inv.id)) { seen.add(inv.id); pendingInvites.push(inv); }
    }

    // Dependent profiles this user created (guardian_fid match)
    const dependentProfiles = fusionId
      ? await base44.asServiceRole.entities.ICEProfile.filter({ guardian_fid: String(fusionId), is_deleted: false })
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
      pendingInvites,
      dependentProfiles,
      sharedProfiles: sharedProfiles.filter(Boolean),
      dependentGuardians,
      dependentInvites,
    });
  } catch (error) {
    console.error('[getGuardianInvites]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});