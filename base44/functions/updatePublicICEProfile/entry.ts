import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    const { profileId, updates, create } = await req.json();

    // CREATE mode — no profileId needed
    if (create) {
      const allowedCreate = [
        'display_name', 'date_of_birth', 'blood_group', 'dependent_relationship',
        'guardian_fid', 'fusion_link_pending', 'pre_login_enabled',
        'fusion_id', 'profile_photo', 'emergency_notes',
      ];
      const safeCreate = {};
      for (const key of allowedCreate) {
        if (key in create) safeCreate[key] = create[key];
      }
      const newProfile = await base44.asServiceRole.entities.ICEProfile.create(safeCreate);
      return Response.json({ success: true, profile: newProfile });
    }

    if (!profileId || !updates) {
      return Response.json({ error: 'Missing required fields' }, { status: 400 });
    }

    // Attempt auth — fall back to service-role for fusion-pending / testing profiles
    let user = null;
    try { user = await base44.auth.me(); } catch { /* unauthenticated — allow service-role bypass */ }

    // Verify profile exists
    const profile = await base44.asServiceRole.entities.ICEProfile.get(profileId);
    if (!profile) {
      return Response.json({ error: 'Profile not found' }, { status: 404 });
    }

    // Safe fields that can be updated via this endpoint
    const allowedFields = [
      'display_name', 'date_of_birth', 'blood_group', 'critical_alerts', 'emergency_notes',
      'medical_aid_name', 'medical_aid_number', 'medical_aid_plan',
      'doctor_name', 'doctor_practice', 'doctor_mobile', 'doctor_practice_number',
      'hospital_name', 'hospital_location', 'profile_photo',
      'fusion_id', 'fusion_link_pending', 'dependent_relationship', 'guardian_fid',
      'is_deleted', 'deleted_at',
      'profile_photo_updated', 'allergies_reviewed_date', 'conditions_reviewed_date', 'medications_reviewed_date'
    ];

    const safeUpdates = {};
    for (const key of allowedFields) {
      if (key in updates) safeUpdates[key] = updates[key];
    }

    const updated = await base44.asServiceRole.entities.ICEProfile.update(profileId, safeUpdates);

    return Response.json({ success: true, profile: updated });
  } catch (error) {
    console.error("[updatePublicICEProfile]", error);
    return Response.json({ error: error.message || 'Unknown error', detail: String(error) }, { status: 500 });
  }
});