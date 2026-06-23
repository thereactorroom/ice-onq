import { createClientFromRequest } from 'npm:@base44/sdk@0.8.31';

// In-memory cache — persists across requests within a warm isolate.
// TTL of 60s balances freshness with speed for this existence check.
const CACHE_TTL_MS = 60_000;
const cache = new Map();

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

    // Check cache first
    const cached = cache.get(fusionId);
    if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
      return Response.json({ exists: cached.exists, cached: true });
    }

    // Lean query: only check ICEProfile, exclude deleted records
    const profiles = await base44.asServiceRole.entities.ICEProfile.filter({
      fusion_id: fusionId,
      is_deleted: { $ne: true }
    });

    const exists = profiles.length > 0;
    cache.set(fusionId, { exists, timestamp: Date.now() });

    return Response.json({ exists });
  } catch (error) {
    return Response.json({ error: error.message }, { status: 500 });
  }
});