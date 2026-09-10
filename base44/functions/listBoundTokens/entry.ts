import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { secrets } from 'base44:runtime';

// Inbound reconciliation endpoint for the ICE onQ QR Generator (ice-link-gen).
// Lets the generator pull every alias QR code bound in this app so it can
// diff against its own records and detect drift. Founding codes (stored on
// ICEProfile.qr_token) are excluded — the generator never produces those.
//
// Auth: shared secret in the request body (`shared_secret`), matched against
// the QR_GEN_CALLBACK_SECRET env var (the same secret used for outbound
// bind/unbind callbacks).
//
// Deployed URL: https://ice-onq-app.base44.app/functions/listBoundTokens

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));

    // ── Authenticate via shared secret ──────────────────────────────────
    const sharedSecret = secrets.get("QR_GEN_CALLBACK_SECRET");
    if (!sharedSecret || body.shared_secret !== sharedSecret) {
      return Response.json({ error: 'Unauthorized' }, { status: 401 });
    }

    // ── Pull every alias binding (LinkedQRCode rows) ────────────────────
    const links = await base44.asServiceRole.entities.LinkedQRCode.list("-linked_at", 1000);

    // Resolve each bound profile's fusion_id in one pass (dedupe profile_ids).
    const profileIds = [...new Set(links.map((l) => l.profile_id).filter(Boolean))];
    const profileById = new Map();
    await Promise.all(profileIds.map(async (pid) => {
      const p = await base44.asServiceRole.entities.ICEProfile.get(pid).catch(() => null);
      if (p) profileById.set(pid, p);
    }));

    // ── Build the response — exclude rows whose profile is soft-deleted ─
    const result = links
      .filter((l) => {
        const p = profileById.get(l.profile_id);
        return p && !p.is_deleted;
      })
      .map((l) => ({
        token: l.qr_token,
        type: 'alias',
        profile_id: profileById.get(l.profile_id).fusion_id || '',
        status: 'bound',
        link_name: l.link_name || '',
        linked_at: l.linked_at || '',
      }));

    return Response.json(result);
  } catch (error) {
    console.error('[listBoundTokens]', error);
    return Response.json({ error: error.message || 'Unknown error' }, { status: 500 });
  }
});