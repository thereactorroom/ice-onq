import { createClientFromRequest } from 'npm:@base44/sdk@0.8.25';

Deno.serve(async (req) => {
  return Response.json({ message: 'Use the CompressImagesTool in the Dashboard instead.' });
});