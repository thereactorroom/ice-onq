import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

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
    // Allow if the fusion identity matches the profile's fusion_id or
    // guardian_fid (guardian managing a dependent), OR if the caller is
    // the Base44 user who created the profile / an admin.
    let authorized = false;
    let actorUserId = null;

    if (fusionUserId && String(fusionUserId) !== "0") {
      if (String(profile.fusion_id) === String(fusionUserId) ||
          String(profile.guardian_fid) === String(fusionUserId)) {
        authorized = true;
      }
    }

    if (!authorized) {
      try {
        const user = await base44.auth.me();
        if (user) {
          actorUserId = user.id;
          if (user.role === 'admin' || profile.created_by_id === user.id) {
            authorized = true;
          }
        }
      } catch { /* unauthenticated — fusion-pending user */ }
    }

    if (!authorized) {
      return Response.json({ error: 'Not authorized to manage contacts for this profile' }, { status: 403 });
    }

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