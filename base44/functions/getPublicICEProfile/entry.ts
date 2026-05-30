import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { profileId, userName } = body;

    if (!profileId) {
      return Response.json({ error: 'profileId (fID) is required' }, { status: 400 });
    }

    // Use service role — no user auth needed for this public endpoint
    const profiles = await base44.asServiceRole.entities.ICEProfile.filter({ fusion_id: profileId });
    let profile = profiles[0] || null;

    // Auto-create profile if none found
    if (!profile) {
      profile = await base44.asServiceRole.entities.ICEProfile.create({
        fusion_id: profileId,
        display_name: userName || '',
        pre_login_enabled: true,
      });
    } else if (userName && !profile.display_name) {
      // Only set display_name from URL if not already saved — never overwrite a saved medical name
      profile = await base44.asServiceRole.entities.ICEProfile.update(profile.id, {
        display_name: userName,
      });
    }

    const profileDbId = profile.id;
    const ownerEmail = profile.created_by;

    // Fetch related records by owner
    const [contacts, allergies, conditions, medications] = await Promise.all([
      ownerEmail ? base44.asServiceRole.entities.ICEContact.filter({ created_by: ownerEmail }) : [],
      ownerEmail ? base44.asServiceRole.entities.Allergy.filter({ created_by: ownerEmail }) : [],
      ownerEmail ? base44.asServiceRole.entities.ChronicCondition.filter({ created_by: ownerEmail }) : [],
      ownerEmail ? base44.asServiceRole.entities.Medication.filter({ created_by: ownerEmail }) : [],
    ]);

    return Response.json({
      profile,
      profileDbId,
      contacts: contacts || [],
      allergies: allergies || [],
      conditions: conditions || [],
      medications: medications || [],
      user: { full_name: profile.display_name || userName || 'Unknown' },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});