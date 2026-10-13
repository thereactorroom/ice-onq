import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { authorizeProfileAccess } from '../../shared/profileAccess.ts';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { action, profileId, contactId, contactData, fusionUserId } = await req.json();

    if (!profileId || !action) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch the profile (service role) to verify authorization
    let profile;
    try {
      profile = await base44.asServiceRole.entities.ICEProfile.get(profileId);
    } catch {
      return Response.json({ error: 'Profile not found' }, { status: 404 });
    }
    if (!profile) {
      return Response.json({ error: 'Profile not found' }, { status: 404 });
    }

    // ── Authorization ──────────────────────────────────────────────
    // The profile's own fusion identity, its primary guardian, any verified
    // co-guardian, the Base44 user who created the profile, or an admin.
    const access = await authorizeProfileAccess(base44, profile, fusionUserId);
    if (!access.authorized) {
      return Response.json({ error: 'Not authorized to manage contacts for this profile' }, { status: 403 });
    }
    const actorUserId = access.actorUserId;

    // ── Perform action ─────────────────────────────────────────────
    switch (action) {
      case 'list': {
        const contacts = await base44.asServiceRole.entities.ICEContact.filter(
          { profile_id: profileId }, "priority", 100
        );
        return Response.json({ success: true, contacts });
      }
      case 'create': {
        const created = await base44.asServiceRole.entities.ICEContact.create({
          ...contactData,
          profile_id: profileId,
          created_by_id: actorUserId || profile.created_by_id || null,
        });
        return Response.json({ success: true, contact: created });
      }
      case 'update': {
        if (!contactId) return Response.json({ error: 'contactId required for update' }, { status: 400 });
        const updated = await base44.asServiceRole.entities.ICEContact.update(contactId, contactData);
        return Response.json({ success: true, contact: updated });
      }
      case 'delete': {
        if (!contactId) return Response.json({ error: 'contactId required for delete' }, { status: 400 });
        await base44.asServiceRole.entities.ICEContact.delete(contactId);
        return Response.json({ success: true });
      }
      default:
        return Response.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error("[manageICEContact]", error);
    return Response.json({ error: error.message || 'Unknown error', detail: String(error) }, { status: 500 });
  }
});