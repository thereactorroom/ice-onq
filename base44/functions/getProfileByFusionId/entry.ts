import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const url = new URL(req.url);
    const fusionId = url.searchParams.get("id");

    if (!fusionId) {
      return Response.json({ error: 'Query parameter "id" (fusion_id) is required' }, { status: 400 });
    }

    const profiles = await base44.asServiceRole.entities.ICEProfile.filter({ fusion_id: fusionId });
    const profile = profiles[0] || null;

    if (!profile) {
      return Response.json({
        profile: null,
        contacts: [],
        allergies: [],
        conditions: [],
        medications: [],
        notFound: true,
      });
    }

    const profileDbId = profile.id;

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
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});