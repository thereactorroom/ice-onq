import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Generate a cryptographically random slug (12 URL-safe chars)
function generateSlug() {
  const chars = 'abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789';
  const arr = new Uint8Array(12);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => chars[b % chars.length]).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { profileId: rawProfileId, userName, fusionUser, fusionHost, isDbId, slug } = body;

    // fID=0, empty, or missing → serve the demo profile (fusion_id "0")
    const isDemoRequest = !rawProfileId || String(rawProfileId) === "0";
    const profileId = isDemoRequest ? "0" : rawProfileId;

    // Use service role — no user auth needed for this public endpoint
    let profile = null;

    // Lookup by public_slug (used for shared links: /profile?s=...)
    // Slug takes priority — even when no fID is present (isDemoRequest would be true otherwise)
    if (slug) {
      const slugResults = await base44.asServiceRole.entities.ICEProfile.filter({ public_slug: slug });
      profile = slugResults[0] || null;
      if (!profile) {
        return Response.json({ notFound: true, profile: null, contacts: [], allergies: [], conditions: [], medications: [] });
      }
    } else if (isDbId && !isDemoRequest) {
      profile = await base44.asServiceRole.entities.ICEProfile.get(profileId).catch(() => null);
    } else {
      const profiles = await base44.asServiceRole.entities.ICEProfile.filter({ fusion_id: profileId });
      profile = profiles[0] || null;

      // Deduplicate: if multiple profiles exist for the same fusion_id,
      // keep the one with the most data and delete the rest
      if (profiles.length > 1) {
        const hasData = (p) => !!(p.display_name?.trim() || p.date_of_birth || p.medical_aid_name || p.doctor_name || p.hospital_name);
        profiles.sort((a, b) => {
          // Prefer profiles with data, then oldest (first created)
          const aHas = hasData(a) ? 1 : 0;
          const bHas = hasData(b) ? 1 : 0;
          if (aHas !== bHas) return bHas - aHas;
          return new Date(a.created_date) - new Date(b.created_date);
        });
        profile = profiles[0]; // best one
        // Delete the duplicates (all except the first/best)
        const dupes = profiles.slice(1);
        for (const dup of dupes) {
          await base44.asServiceRole.entities.ICEProfile.delete(dup.id).catch(() => {});
        }
      }

      // Fallback: try as a DB id if fusion_id lookup fails
      if (!profile && !isDemoRequest) {
        profile = await base44.asServiceRole.entities.ICEProfile.get(profileId).catch(() => null);
      }
    }

    // Auto-create profile if none found
    if (!profile) {
      if (isDemoRequest) {
        return Response.json({ notFound: true, profile: null, contacts: [], allergies: [], conditions: [], medications: [] });
      }
      if (isDbId) {
        return Response.json({ notFound: true, profile: null, profileDbId: null, contacts: [], allergies: [], conditions: [], medications: [], user: { full_name: userName || 'Unknown' } });
      }
      const isOwner = fusionUser && String(fusionUser.userId) === String(profileId);
      // Also allow co-guardians to trigger auto-create for profiles they manage
      const isCoGuardian = fusionUser
        ? (await base44.asServiceRole.entities.ProfileGuardian.filter({ guardian_fusion_id: String(fusionUser.userId) })).length > 0
        : false;
      if (!isOwner && !isCoGuardian) {
        return Response.json({ profile: null, profileDbId: null, contacts: [], allergies: [], conditions: [], medications: [], user: { full_name: userName || 'Unknown' }, notFound: true });
      }

      const seedData = {
        fusion_id: profileId,
        pre_login_enabled: true,
        public_slug: generateSlug(),
      };

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
    } else {
      // Lazy updates: set display_name if missing; generate slug if missing
      const updates = {};
      if (userName && !profile.display_name) updates.display_name = userName;
      if (!profile.public_slug) updates.public_slug = generateSlug();

      if (Object.keys(updates).length > 0) {
        profile = await base44.asServiceRole.entities.ICEProfile.update(profile.id, updates);
      }
    }

    // Soft-delete check
    if (profile.is_deleted) {
      return Response.json({ isDeleted: true, profile: null, contacts: [], allergies: [], conditions: [], medications: [], user: { full_name: profile.display_name || 'Unknown' } });
    }

    const profileDbId = profile.id;

    // Determine if the requesting authenticated user is the owner of this profile
    let isOwner = false;
    try {
      const authUser = await base44.auth.me();
      if (authUser && profile.created_by && profile.created_by === authUser.email) {
        isOwner = true;
      }
    } catch { /* unauthenticated — isOwner stays false */ }

    // Also count as owner if the fusion session user matches the profile's fusion_id
    if (!isOwner && fusionUser && profile.fusion_id && String(fusionUser.userId) === String(profile.fusion_id)) {
      isOwner = true;
    }

    const [contacts, allergies, conditions, medications] = await Promise.all([
      base44.asServiceRole.entities.ICEContact.filter({ profile_id: profileDbId }),
      base44.asServiceRole.entities.Allergy.filter({ profile_id: profileDbId }),
      base44.asServiceRole.entities.ChronicCondition.filter({ profile_id: profileDbId }),
      base44.asServiceRole.entities.Medication.filter({ profile_id: profileDbId }),
    ]);

    return Response.json({
      profile,
      profileDbId,
      isOwner,
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