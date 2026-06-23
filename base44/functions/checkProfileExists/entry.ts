import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

Deno.serve(async (req) => {
  try {
    const base44 = createClientFromRequest(req);
    let fusionId;
    try {
      const body = await req.json();
      fusionId = body?.id;
    } catch {
      const url = new URL(req.url);
      fusionId = url.searchParams.get("id");
    }

    if (!fusionId) {
      return Response.json({ error: 'Parameter "id" (fusion_id) is required' }, { status: 400 });
    }

    // Lean query: only check ICEProfile, exclude deleted records
    const profiles = await base44.asServiceRole.entities.ICEProfile.filter({
      fusion_id: fusionId,
      is_deleted: { $ne: true }
    });

    return Response.json({ exists: profiles.length > 0 });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});