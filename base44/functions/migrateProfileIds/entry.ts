import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const user = await base44.auth.me();

    if (user?.role !== 'admin') {
      return Response.json({ error: 'Forbidden: Admin access required' }, { status: 403 });
    }

    // Fetch all ICEProfiles to build a map of created_by -> profile.id
    const profiles = await base44.asServiceRole.entities.ICEProfile.list();
    // Map: created_by email -> profile id
    const profileMap = {};
    for (const p of profiles) {
      if (p.created_by) {
        profileMap[p.created_by] = p.id;
      }
    }

    const entityNames = ['ICEContact', 'Allergy', 'ChronicCondition', 'Medication'];
    const results = {};

    for (const entityName of entityNames) {
      const records = await base44.asServiceRole.entities[entityName].list();
      let updated = 0;
      let skipped = 0;

      for (const record of records) {
        if (record.profile_id) {
          skipped++;
          continue;
        }
        const profileId = profileMap[record.created_by];
        if (profileId) {
          await base44.asServiceRole.entities[entityName].update(record.id, { profile_id: profileId });
          updated++;
        } else {
          skipped++;
        }
      }

      results[entityName] = { updated, skipped };
    }

    return Response.json({ success: true, results });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});