import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { profileId, userName, fusionUser, fusionHost } = body;

    if (!profileId) {
      return Response.json({ error: 'profileId (fID) is required' }, { status: 400 });
    }

    // Use service role — no user auth needed for this public endpoint
    const profiles = await base44.asServiceRole.entities.ICEProfile.filter({ fusion_id: profileId });
    let profile = profiles[0] || null;

    // Auto-create profile if none found
    if (!profile) {
      const seedData = { fusion_id: profileId, pre_login_enabled: true };

      if (fusionUser) {
        const displayName = [fusionUser.name, fusionUser.surname].filter(Boolean).join(' ');
        if (displayName) seedData.display_name = displayName;
        if (fusionUser.dob) seedData.date_of_birth = fusionUser.dob;
        if (fusionUser.picture && fusionHost) {
          seedData.profile_photo = `${fusionHost}/${fusionUser.picture}`;
        }
      }

      if (!seedData.display_name) {
        seedData.display_name = userName || '';
      }

      profile = await base44.asServiceRole.entities.ICEProfile.create(seedData);
    } else if (userName && !profile.display_name) {
      // Only set display_name from URL if not already saved — never overwrite a saved medical name
      profile = await base44.asServiceRole.entities.ICEProfile.update(profile.id, {
        display_name: userName,
      });
    }

    const profileDbId = profile.id;
    const ownerEmail = profile.created_by;

    // Fetch related records by profile_id
    const [contacts, allergies, conditions, medications] = await Promise.all([
      base44.asServiceRole.entities.ICEContact.filter({ profile_id: profileDbId }),
      base44.asServiceRole.entities.Allergy.filter({ profile_id: profileDbId }),
      base44.asServiceRole.entities.ChronicCondition.filter({ profile_id: profileDbId }),
      base44.asServiceRole.entities.Medication.filter({ profile_id: profileDbId }),
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