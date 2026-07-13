import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

function generateToken() {
  const arr = new Uint8Array(24);
  crypto.getRandomValues(arr);
  return Array.from(arr).map(b => b.toString(16).padStart(2, '0')).join('');
}

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { dependentProfileId, inviteeEmail, inviterFusionId, inviterName, appUrl: clientAppUrl } = await req.json();

    if (!dependentProfileId || !inviteeEmail || !inviterFusionId) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

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

    // Check for existing pending invite to the same email
    const existing = await base44.asServiceRole.entities.GuardianInvite.filter({
      dependent_profile_id: dependentProfileId,
      invitee_email: inviteeEmail.toLowerCase(),
      status: 'pending',
    });
    if (existing.length > 0) {
      return Response.json({ error: 'An invite is already pending for this email.' }, { status: 409 });
    }

    const token = generateToken();
    const invite = await base44.asServiceRole.entities.GuardianInvite.create({
      dependent_profile_id: dependentProfileId,
      dependent_name: profile.display_name || 'Dependent',
      inviter_fusion_id: String(inviterFusionId),
      inviter_name: inviterName || 'A guardian',
      invitee_email: inviteeEmail.toLowerCase(),
      status: 'pending',
      token,
    });

    // Send invite email via Mailgun (delivers to external/non-registered addresses,
    // unlike the built-in SendEmail which is restricted to registered app users)
    const appUrl = clientAppUrl || 'https://app.fusiononq.com';
    const acceptUrl = `${appUrl}/profile?acceptInvite=${token}`;
    const mailgunDomain = Deno.env.get('MAILGUN_DOMAIN');
    const fromEmail = 'ICE onQ <noreply@' + mailgunDomain + '>';
    const subject = `You've been invited to co-manage ${profile.display_name || "a dependent"}'s ICE profile`;
    const htmlBody = `
<div style="font-family: sans-serif; max-width: 520px; margin: 0 auto; padding: 24px;">
  <h2 style="color: #1a3a6b;">ICE onQ — Guardian Invite</h2>
  <p><strong>${inviterName || 'Someone'}</strong> has invited you to co-manage the ICE emergency profile for <strong>${profile.display_name || 'a dependent'}</strong>.</p>
  <p>As a co-guardian, you will be able to view and update their emergency medical information at any time.</p>
  <p style="margin: 24px 0;">
    <a href="${acceptUrl}" style="background: #1a3a6b; color: white; padding: 12px 24px; border-radius: 8px; text-decoration: none; font-weight: bold;">Accept Invitation</a>
  </p>
  <p style="color: #666; font-size: 13px;">If you don't have a fusion onQ account yet, you'll be prompted to create one — it's free and only takes a moment.</p>
  <p style="color: #999; font-size: 12px;">If you did not expect this invite, you can safely ignore this email.</p>
</div>
    `;
    console.log('[inviteGuardian] Sending email to:', inviteeEmail, 'acceptUrl:', acceptUrl);

    const form = new FormData();
    form.append('from', fromEmail);
    form.append('to', inviteeEmail);
    form.append('subject', subject);
    form.append('html', htmlBody);

    const emailRes = await fetch('https://api.mailgun.net/v3/' + mailgunDomain + '/messages', {
      method: 'POST',
      headers: {
        'Authorization': 'Basic ' + btoa('api:' + Deno.env.get('MAILGUN_API_KEY')),
      },
      body: form,
    });

    if (!emailRes.ok) {
      const errText = await emailRes.text();
      console.error('[inviteGuardian] Mailgun FAILED:', emailRes.status, errText);
      return Response.json({ error: `Could not send invite email: ${errText}` }, { status: 502 });
    }

    const emailData = await emailRes.json();
    console.log('[inviteGuardian] Mailgun success:', JSON.stringify(emailData));

    return Response.json({ success: true, inviteId: invite.id });
  } catch (error) {
    console.error('[inviteGuardian]', error);
    return Response.json({ error: error.message }, { status: 500 });
  }
});