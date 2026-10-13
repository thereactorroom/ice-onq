import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// Health item entities this endpoint is allowed to delete.
const ALLOWED_ENTITIES = ['Allergy', 'ChronicCondition', 'Medication'];

// Only the profile's own fusion identity, its guardian, a co-guardian, or the
// Base44 user who created the profile (admin included) may remove a health entry.
async function authorize(base44, profile, fusionUserId) {
  if (fusionUserId && String(fusionUserId) !== '0') {
    if (String(profile.fusion_id) === String(fusionUserId) ||
        String(profile.guardian_fid) === String(fusionUserId)) {
      return true;
    }
    const guardians = await base44.asServiceRole.entities.ProfileGuardian
      .filter({ dependent_profile_id: profile.id, guardian_fusion_id: String(fusionUserId) })
      .catch(() => []);
    if (guardians && guardians.length > 0) return true;
  }
  try {
    const user = await base44.auth.me();
    if (user && (user.role === 'admin' || profile.created_by_id === user.id || profile.created_by === user.email)) {
      return true;
    }
  } catch { /* unauthenticated — fusion-pending user */ }
  return false;
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { profileId, entityName, itemId, fusionUserId } = body;

    if (!profileId || !itemId || !ALLOWED_ENTITIES.includes(entityName)) {
      return Response.json({ error: 'profileId, entityName and itemId are required' }, { status: 400 });
    }

    const profile = await base44.asServiceRole.entities.ICEProfile.get(profileId).catch(() => null);
    if (!profile) return Response.json({ error: 'Profile not found' }, { status: 404 });

    if (!(await authorize(base44, profile, fusionUserId))) {
      return Response.json({ error: 'Not authorized to delete health entries for this profile' }, { status: 403 });
    }

    // Confirm the entry actually belongs to this profile before removing it.
    const record = await base44.asServiceRole.entities[entityName].get(itemId).catch(() => null);
    if (!record) return Response.json({ error: 'Entry not found' }, { status: 404 });
    if (String(record.profile_id) !== String(profileId)) {
      return Response.json({ error: 'Entry does not belong to this profile' }, { status: 403 });
    }

    await base44.asServiceRole.entities[entityName].delete(itemId);
    return Response.json({ success: true });
  } catch (error) {
    console.error('[deleteHealthItem]', error);
    return Response.json({ error: error.message || 'Unknown error', detail: String(error) }, { status: 500 });
  }
});