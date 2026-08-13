import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { generateQrToken, normalizeQrToken } from "../../shared/qrToken.ts";

// Authorization helper — mirrors the pattern in manageICEContact:
// fusion identity matching fusion_id/guardian_fid, OR authenticated Base44
// user who is admin / creator of the profile.
async function authorize(base44, profile, body) {
  const { fusionUserId } = body;
  if (fusionUserId && String(fusionUserId) !== "0") {
    if (String(profile.fusion_id) === String(fusionUserId) ||
        String(profile.guardian_fid) === String(fusionUserId)) {
      return { authorized: true, actorEmail: '' };
    }
  }
  try {
    const user = await base44.auth.me();
    if (user && (user.role === 'admin' || profile.created_by_id === user.id || profile.created_by === user.email)) {
      return { authorized: true, actorEmail: user.email || '' };
    }
  } catch { /* unauthenticated */ }
  return { authorized: false, actorEmail: '' };
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const body = await req.json().catch(() => ({}));
    const { action, qrToken: rawToken, profileId, linkName, linkedQrId } = body;

    // ── resolve: public lookup, no auth needed ──────────────────────────
    if (action === 'resolve') {
      const qrToken = normalizeQrToken(rawToken);
      if (!qrToken) return Response.json({ status: 'invalid' });

      // 1) founding token stored on the ICEProfile record
      const founding = await base44.asServiceRole.entities.ICEProfile.filter({ qr_token: qrToken });
      if (founding[0] && !founding[0].is_deleted) {
        return Response.json({
          status: 'linked',
          profileId: founding[0].id,
          fusionId: founding[0].fusion_id,
          isFounding: true,
          displayName: founding[0].display_name,
        });
      }
      // 2) secondary alias in LinkedQRCode
      const alias = await base44.asServiceRole.entities.LinkedQRCode.filter({ qr_token: qrToken });
      if (alias[0]) {
        const p = await base44.asServiceRole.entities.ICEProfile.get(alias[0].profile_id).catch(() => null);
        if (p && !p.is_deleted) {
          return Response.json({
            status: 'linked',
            profileId: p.id,
            fusionId: p.fusion_id,
            isFounding: false,
            linkName: alias[0].link_name,
            displayName: p.display_name,
          });
        }
      }
      return Response.json({ status: 'unlinked' });
    }

    // ── list: founding + aliases for a profile ──────────────────────────
    if (action === 'list') {
      if (!profileId) return Response.json({ error: 'profileId required' }, { status: 400 });
      const profile = await base44.asServiceRole.entities.ICEProfile.get(profileId).catch(() => null);
      if (!profile) return Response.json({ error: 'Profile not found' }, { status: 404 });
      const auth = await authorize(base44, profile, body);
      if (!auth.authorized) return Response.json({ error: 'Not authorized' }, { status: 403 });

      // Lazy backfill: ensure the founding token exists
      let profileToken = profile.qr_token;
      if (!profileToken) {
        profileToken = generateQrToken();
        await base44.asServiceRole.entities.ICEProfile.update(profileId, { qr_token: profileToken });
      }

      const aliases = await base44.asServiceRole.entities.LinkedQRCode.filter({ profile_id: profileId }, "-linked_at");
      const codes = [
        {
          id: 'founding',
          qr_token: profileToken,
          link_name: 'Primary ICE QR Code',
          is_founding: true,
          linked_at: profile.created_date,
        },
        ...aliases.map(a => ({
          id: a.id,
          qr_token: a.qr_token,
          link_name: a.link_name || 'Linked QR Code',
          is_founding: false,
          linked_at: a.linked_at,
        })),
      ];
      return Response.json({ success: true, codes });
    }

    // ── link: claim a QR token for a profile ────────────────────────────
    if (action === 'link') {
      const qrToken = normalizeQrToken(rawToken);
      if (!qrToken || !profileId) return Response.json({ error: 'qrToken and profileId required' }, { status: 400 });

      const profile = await base44.asServiceRole.entities.ICEProfile.get(profileId).catch(() => null);
      if (!profile) return Response.json({ error: 'Profile not found' }, { status: 404 });
      const auth = await authorize(base44, profile, body);
      if (!auth.authorized) return Response.json({ error: 'Not authorized to link QR codes for this profile' }, { status: 403 });

      // Already claimed as a founding token by another profile?
      const founding = await base44.asServiceRole.entities.ICEProfile.filter({ qr_token: qrToken });
      if (founding[0] && founding[0].id !== profileId) {
        return Response.json({ status: 'claimed', ownerProfileId: founding[0].id, ownerName: founding[0].display_name || 'Another profile', linkType: 'founding', linkName: 'Primary ICE QR Code' });
      }
      // Already claimed as an alias by another profile?
      const alias = await base44.asServiceRole.entities.LinkedQRCode.filter({ qr_token: qrToken });
      if (alias[0] && alias[0].profile_id !== profileId) {
        const owner = await base44.asServiceRole.entities.ICEProfile.get(alias[0].profile_id).catch(() => null);
        return Response.json({ status: 'claimed', ownerProfileId: alias[0].profile_id, ownerName: owner?.display_name || 'Another profile', linkType: 'alias', linkName: alias[0].link_name || 'Linked QR Code' });
      }
      // Already linked to this same profile
      if (alias[0] && alias[0].profile_id === profileId) {
        return Response.json({ status: 'already_linked' });
      }

      const created = await base44.asServiceRole.entities.LinkedQRCode.create({
        qr_token: qrToken,
        profile_id: profileId,
        link_name: linkName || 'Linked QR Code',
        linked_at: new Date().toISOString(),
        linked_by: auth.actorEmail || String(body.fusionUserId || ''),
      });
      return Response.json({ status: 'linked', code: created });
    }

    // ── update: rename a linked QR code alias ───────────────────────────
    if (action === 'update') {
      if (!linkedQrId) return Response.json({ error: 'linkedQrId required' }, { status: 400 });
      const record = await base44.asServiceRole.entities.LinkedQRCode.get(linkedQrId).catch(() => null);
      if (!record) return Response.json({ error: 'Record not found' }, { status: 404 });
      const profile = await base44.asServiceRole.entities.ICEProfile.get(record.profile_id).catch(() => null);
      if (!profile) return Response.json({ error: 'Profile not found' }, { status: 404 });
      const auth = await authorize(base44, profile, body);
      if (!auth.authorized) return Response.json({ error: 'Not authorized' }, { status: 403 });
      const newName = (linkName || '').trim() || 'Linked QR Code';
      await base44.asServiceRole.entities.LinkedQRCode.update(linkedQrId, { link_name: newName });
      return Response.json({ status: 'updated', link_name: newName });
    }

    // ── unlink: delete an alias (founding codes are never stored here) ──
    if (action === 'unlink') {
      if (!linkedQrId) return Response.json({ error: 'linkedQrId required' }, { status: 400 });
      const record = await base44.asServiceRole.entities.LinkedQRCode.get(linkedQrId).catch(() => null);
      if (!record) return Response.json({ error: 'Record not found' }, { status: 404 });
      const profile = await base44.asServiceRole.entities.ICEProfile.get(record.profile_id).catch(() => null);
      if (!profile) return Response.json({ error: 'Profile not found' }, { status: 404 });
      const auth = await authorize(base44, profile, body);
      if (!auth.authorized) return Response.json({ error: 'Not authorized' }, { status: 403 });
      await base44.asServiceRole.entities.LinkedQRCode.delete(linkedQrId);
      return Response.json({ status: 'unlinked' });
    }

    return Response.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error("[manageQRCode]", error);
    return Response.json({ error: error.message || 'Unknown error', detail: String(error) }, { status: 500 });
  }
});