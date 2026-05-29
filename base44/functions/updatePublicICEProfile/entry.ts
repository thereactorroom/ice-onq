import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { profileId, userEmail, updates } = await req.json();

    if (!profileId || !userEmail || !updates) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Fetch the profile as service role to check ownership
    const profile = await base44.asServiceRole.entities.ICEProfile.get(profileId);

    if (!profile) {
      return Response.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Validate ownership by matching the email passed from Fusion
    if (profile.created_by !== userEmail) {
      return Response.json({ error: 'Forbidden: You do not own this profile' }, { status: 403 });
    }

    // Safe fields that can be updated via this public endpoint
    const allowedFields = [
      'date_of_birth', 'blood_group', 'critical_alerts', 'emergency_notes',
      'medical_aid_name', 'medical_aid_number', 'medical_aid_plan',
      'doctor_name', 'doctor_practice', 'doctor_mobile', 'doctor_practice_number',
      'hospital_name', 'hospital_location', 'profile_photo'
    ];

    const safeUpdates = {};
    for (const key of allowedFields) {
      if (key in updates) safeUpdates[key] = updates[key];
    }

    const updated = await base44.asServiceRole.entities.ICEProfile.update(profileId, safeUpdates);

    return Response.json({ success: true, profile: updated });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});