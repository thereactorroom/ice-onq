import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { token, acceptingFusionId, acceptingName, acceptingEmail } = await req.json();

    if (!token || !acceptingFusionId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Find the invite by token
    const invites = await base44.asServiceRole.entities.GuardianInvite.filter({ token, status: 'pending' });
    if (!invites || invites.length === 0) {
      return Response.json({ error: 'Invite not found or already used.' }, { status: 404 });
    }
    const invite = invites[0];

    // Get dependent profile
    const profile = await base44.asServiceRole.entities.ICEProfile.get(invite.dependent_profile_id);
    if (!profile) {
      return Response.json({ error: 'Dependent profile not found.' }, { status: 404 });
    }

    // Check not already a guardian (via ProfileGuardian record OR as the primary owner via guardian_fid)
    const isPrimaryOwner = String(profile.guardian_fid) === String(acceptingFusionId);
    const existing = await base44.asServiceRole.entities.ProfileGuardian.filter({
      dependent_profile_id: invite.dependent_profile_id,
      guardian_fusion_id: String(acceptingFusionId),
    });
    if (isPrimaryOwner || existing.length > 0) {
      // Already a guardian — just mark invite accepted
      await base44.asServiceRole.entities.GuardianInvite.update(invite.id, {
        status: 'accepted',
        invitee_fusion_id: String(acceptingFusionId),
      });
      return Response.json({ success: true, alreadyGuardian: true, profile });
    }

    // Create ProfileGuardian record
    await base44.asServiceRole.entities.ProfileGuardian.create({
      dependent_profile_id: invite.dependent_profile_id,
      guardian_fusion_id: String(acceptingFusionId),
      guardian_name: acceptingName || '',
      guardian_email: acceptingEmail || invite.invitee_email,
      relationship: 'Co-Guardian',
      is_primary: false,
    });

    // Mark invite as accepted
    await base44.asServiceRole.entities.GuardianInvite.update(invite.id, {
      status: 'accepted',
      invitee_fusion_id: String(acceptingFusionId),
    });

    return Response.json({ success: true, profile, dependentProfileId: invite.dependent_profile_id });
  } catch (error) {
    console.error('[acceptGuardianInvite]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});