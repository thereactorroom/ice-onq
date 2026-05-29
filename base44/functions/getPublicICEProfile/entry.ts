Deno.serve(async (req) => {
  try {
    const body = await req.json().catch(() => ({}));
    const { profileId, userName } = body;

    if (!profileId) {
      return Response.json({ error: 'profileId (fID) is required' }, { status: 400 });
    }

    const SERVICE_ROLE_KEY = Deno.env.get('BASE44_SERVICE_ROLE_KEY');
    const SERVER_URL = Deno.env.get('BASE44_SERVER_URL') || 'https://api.base44.com';
    const APP_ID = Deno.env.get('BASE44_APP_ID');

    const headers = {
      'Authorization': `Bearer ${SERVICE_ROLE_KEY}`,
      'Content-Type': 'application/json',
      'X-App-Id': APP_ID,
    };

    // Look up profile by fusion_id
    const profileRes = await fetch(`${SERVER_URL}/entities/ICEProfile/filter`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ fusion_id: profileId }),
    });
    const profiles = await profileRes.json();
    let profile = profiles[0] || null;

    // Auto-create profile if none found
    if (!profile) {
      const createRes = await fetch(`${SERVER_URL}/entities/ICEProfile`, {
        method: 'POST',
        headers,
        body: JSON.stringify({
          fusion_id: profileId,
          display_name: userName || '',
          pre_login_enabled: true,
        }),
      });
      profile = await createRes.json();
    } else if (userName && profile.display_name !== userName) {
      const updateRes = await fetch(`${SERVER_URL}/entities/ICEProfile/${profile.id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ display_name: userName }),
      });
      profile = await updateRes.json();
    }

    const profileDbId = profile.id;

    // Fetch related records
    const [contactsRes, allergiesRes, conditionsRes, medicationsRes] = await Promise.all([
      fetch(`${SERVER_URL}/entities/ICEContact/filter`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ created_by: profile.created_by }),
      }),
      fetch(`${SERVER_URL}/entities/Allergy/filter`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ created_by: profile.created_by }),
      }),
      fetch(`${SERVER_URL}/entities/ChronicCondition/filter`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ created_by: profile.created_by }),
      }),
      fetch(`${SERVER_URL}/entities/Medication/filter`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ created_by: profile.created_by }),
      }),
    ]);

    const [contacts, allergies, conditions, medications] = await Promise.all([
      contactsRes.json(),
      allergiesRes.json(),
      conditionsRes.json(),
      medicationsRes.json(),
    ]);

    return Response.json({
      profile,
      profileDbId,
      contacts: contacts || [],
      allergies: allergies || [],
      conditions: conditions || [],
      medications: medications || [],
      user: { full_name: userName || profile.display_name || 'Unknown' },
    });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});