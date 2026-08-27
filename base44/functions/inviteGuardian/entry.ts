import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';
import { normalizeMobile } from "../../shared/mobileNormalize.ts";

function generateToken() {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

const DEFAULT_WHATSAPP_TEMPLATE = `Hi, I'm inviting you to be a co-guardian of [Name]'s ICE profile in Health onQ.

As a co-guardian, you will be able to help manage and keep [Name]'s emergency information up to date.

Please use the link below to download fusion onQ and register:
https://link.fusiononq.com

Once registered, open Health onQ and accept the co-guardian invitation using this link:
[AcceptLink]

Please let me know if you have any difficulty.`;

const DEFAULT_SMS_TEMPLATE = `Hi, I'm inviting you as a co-guardian of [Name]'s ICE profile. Download fusion onQ, register, then open Health onQ to accept: [AcceptLink]`;

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { dependentProfileId, inviteeMobile, inviterFusionId, inviterName, appUrl: clientAppUrl } = await req.json();

    if (!dependentProfileId || !inviteeMobile || !inviterFusionId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const mobile = normalizeMobile(inviteeMobile);

    // Get the dependent profile
    const profile = await base44.asServiceRole.entities.ICEProfile.get(dependentProfileId);
    if (!profile) {
      return Response.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Verify the inviter is an authorized guardian of this profile
    const existingGuardians = await base44.asServiceRole.entities.ProfileGuardian.filter({
      dependent_profile_id: dependentProfileId,
      guardian_fusion_id: String(inviterFusionId),
    });
    const isPrimaryGuardian = String(profile.guardian_fid) === String(inviterFusionId);
    if (!isPrimaryGuardian && existingGuardians.length === 0) {
      return Response.json({ error: 'Not authorized to invite guardians for this profile' }, { status: 403 });
    }

    // Check for existing pending invite to the same mobile
    const existing = await base44.asServiceRole.entities.GuardianInvite.filter({
      dependent_profile_id: dependentProfileId,
      invitee_mobile: mobile,
      status: 'pending',
    });
    if (existing.length > 0) {
      return Response.json({ error: 'An invite is already pending for this number.' }, { status: 409 });
    }

    const token = generateToken();
    const appUrl = clientAppUrl || 'https://app.fusiononq.com';
    const acceptLink = `${appUrl}/profile?acceptInvite=${token}`;

    // Fetch admin-configured templates (fall back to defaults)
    let whatsappTemplate = DEFAULT_WHATSAPP_TEMPLATE;
    let smsTemplate = DEFAULT_SMS_TEMPLATE;
    try {
      const setups = await base44.asServiceRole.entities.ICESetup.list();
      if (setups.length > 0) {
        if (setups[0].whatsapp_template) whatsappTemplate = setups[0].whatsapp_template;
        if (setups[0].sms_template) smsTemplate = setups[0].sms_template;
      }
    } catch (e) {
      console.log('[inviteGuardian] ICESetup lookup skipped:', e?.message);
    }

    const name = profile.display_name || 'your dependent';
    const whatsappMessage = whatsappTemplate.replaceAll('[Name]', name).replaceAll('[AcceptLink]', acceptLink);
    const smsMessage = smsTemplate.replaceAll('[Name]', name).replaceAll('[AcceptLink]', acceptLink);

    const invite = await base44.asServiceRole.entities.GuardianInvite.create({
      dependent_profile_id: dependentProfileId,
      dependent_name: profile.display_name || 'Dependent',
      inviter_fusion_id: String(inviterFusionId),
      inviter_name: inviterName || 'A guardian',
      invitee_mobile: mobile,
      status: 'pending',
      token,
    });

    return Response.json({ success: true, inviteId: invite.id, token, mobile, whatsappMessage, smsMessage });
  } catch (error) {
    console.error('[inviteGuardian]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});