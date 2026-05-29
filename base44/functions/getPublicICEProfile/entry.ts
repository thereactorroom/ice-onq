import { createClient } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    // Use createClient instead of createClientFromRequest to avoid auth requirement
    const base44 = createClient({
      serviceRoleKey: Deno.env.get('BASE44_SERVICE_ROLE_KEY'),
      serverUrl: Deno.env.get('BASE44_SERVER_URL') || 'https://api.base44.com',
    });
    
    const body = await req.json().catch(() => ({}));
    const { profileId, userName } = body;

    if (!profileId) {
      return Response.json({ error: 'profileId (fID) is required' }, { status: 400 });
    }

    // Look up profile by fusion_id
    let profiles = await base44.entities.ICEProfile.filter({ fusion_id: profileId });
    let profile = profiles[0] || null;

    // Auto-create profile if none found
    if (!profile) {
      profile = await base44.entities.ICEProfile.create({
        fusion_id: profileId,
        display_name: userName || '',
        pre_login_enabled: true,
      });
    } else if (userName && profile.display_name !== userName) {
      profile = await base44.entities.ICEProfile.update(profile.id, {
        display_name: userName,
      });
    }

    const profileDbId = profile.id;

    // Fetch related records
    const [contacts, allergies, conditions, medications] = await Promise.all([
      base44.entities.ICEContact.filter({ created_by: profile.created_by }),
      base44.entities.Allergy.filter({ created_by: profile.created_by }),
      base44.entities.ChronicCondition.filter({ created_by: profile.created_by }),
      base44.entities.Medication.filter({ created_by: profile.created_by }),
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