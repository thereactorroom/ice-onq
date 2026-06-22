import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { profileId: rawProfileId, userName, fusionUser, fusionHost, isDbId } = body;

    // fID=0, empty, or missing → serve the demo profile (fusion_id "0")
    const isDemoRequest = !rawProfileId || String(rawProfileId) === "0";
    const profileId = isDemoRequest ? "0" : rawProfileId;

    // Use service role — no user auth needed for this public endpoint
    // Support lookup by DB id (for newly created dependents without a fusion_id yet)
    let profile = null;
    if (isDbId && !isDemoRequest) {
      profile = await base44.asServiceRole.entities.ICEProfile.get(profileId).catch(() => null);
    } else {
      const profiles = await base44.asServiceRole.entities.ICEProfile.filter({ fusion_id: profileId });
      profile = profiles[0] || null;
      // Fallback: if not found by fusion_id, try as a DB id (handles cases where isDbId flag is missing)
      if (!profile && !isDemoRequest) {
        profile = await base44.asServiceRole.entities.ICEProfile.get(profileId).catch(() => null);
      }
    }

    // Auto-create profile if none found — but only when the Fusion user
    // is the owner (fID === userId) or no Fusion user is present.
    // Never auto-create for demo requests.
    if (!profile) {
      if (isDemoRequest) {
        return Response.json({ notFound: true, profile: null, contacts: [], allergies: [], conditions: [], medications: [] });
      }
      // Never auto-create without a verified Fusion user session
      const isOwner = fusionUser && String(fusionUser.userId) === String(profileId);

      if (!isOwner) {
        // Another Fusion user is viewing a non-existent profile — don't create
        return Response.json({
          profile: null,
          profileDbId: null,
          contacts: [],
          allergies: [],
          conditions: [],
          medications: [],
          user: { full_name: userName || 'Unknown' },
          notFound: true,
        });
      }

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

    // Soft-delete check — return a specific flag so QR scans show "Profile Deleted"
    if (profile.is_deleted) {
      return Response.json({ isDeleted: true, profile: null, contacts: [], allergies: [], conditions: [], medications: [], user: { full_name: profile.display_name || 'Unknown' } });
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