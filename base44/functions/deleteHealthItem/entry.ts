import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { authorizeProfileAccess } from '../../shared/profileAccess.ts';

// Health item entities this endpoint is allowed to delete.
const ALLOWED_ENTITIES = ['Allergy', 'ChronicCondition', 'Medication'];

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

    // The primary owner and every verified guardian of the profile may delete
    // health entries.
    const access = await authorizeProfileAccess(base44, profile, fusionUserId);
    if (!access.authorized) {
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