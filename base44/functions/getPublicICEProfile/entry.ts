import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json();
    const { profileId, userName } = body; // profileId = fID from Fusion, userName = UserName from Fusion

    if (!profileId) {
      return Response.json({ error: 'profileId (fID) is required' }, { status: 400 });
    }

    // Look up profile by fusion_id
    let profiles = await base44.asServiceRole.entities.ICEProfile.filter({ fusion_id: profileId });
    let profile = profiles[0] || null;

    // Auto-create profile if none found
    if (!profile) {
      profile = await base44.asServiceRole.entities.ICEProfile.create({
        fusion_id: profileId,
        display_name: userName || '',
        pre_login_enabled: true,
      });
    } else if (userName && profile.display_name !== userName) {
      // Keep display_name in sync with what Fusion sends
      profile = await base44.asServiceRole.entities.ICEProfile.update(profile.id, {
        display_name: userName,
      });
    }

    const profileDbId = profile.id;

    // Fetch all related records
    const [contacts, allergies, conditions, medications] = await Promise.all([
      base44.asServiceRole.entities.ICEContact.filter({ created_by: profile.created_by }),
      base44.asServiceRole.entities.Allergy.filter({ created_by: profile.created_by }),
      base44.asServiceRole.entities.ChronicCondition.filter({ created_by: profile.created_by }),
      base44.asServiceRole.entities.Medication.filter({ created_by: profile.created_by }),
    ]);

    return Response.json({
      profile,
      profileDbId,
      contacts: contacts || [],
      allergies: allergies || [],
      conditions: conditions || [],
      medications: medications || [],
      user: { full_name: userName || profile.display_name || 'Unknown' },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});