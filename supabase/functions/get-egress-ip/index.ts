// purge-university-cache replaced — kept for purge. This file is get-egress-ip.
import { corsHeaders } from 'npm:@supabase/supabase-js@2/cors';

// Returns full network/runtime metadata about whichever Supabase Edge worker
// handled this request: egress IPv4/IPv6, AWS region, datacenter, hostname, etc.
Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') return new Response('ok', { headers: corsHeaders });

  const probes = [
    { name: 'ipify-v4', url: 'https://api.ipify.org?format=json', parse: (j: any) => ({ ip: j.ip }) },
    { name: 'ipify-v6', url: 'https://api64.ipify.org?format=json', parse: (j: any) => ({ ip: j.ip }) },
    { name: 'icanhazip', url: 'https://ipv4.icanhazip.com', parse: (t: string) => ({ ip: String(t).trim() }) },
    {
      name: 'ifconfig.co',
      url: 'https://ifconfig.co/json',
      parse: (j: any) => ({
        ip: j.ip,
        country: j.country,
        country_iso: j.country_iso,
        region: j.region_name,
        city: j.city,
        asn: j.asn,
        asn_org: j.asn_org,
        hostname: j.hostname,
        latitude: j.latitude,
        longitude: j.longitude,
      }),
    },
    {
      name: 'ipapi.co',
      url: 'https://ipapi.co/json/',
      parse: (j: any) => ({
        ip: j.ip,
        country: j.country_name,
        region: j.region,
        city: j.city,
        org: j.org,
        asn: j.asn,
        timezone: j.timezone,
      }),
    },
  ];

  const probeResults: Record<string, any> = {};
  const ips = new Set<string>();
  let meta: Record<string, any> = {};

  await Promise.all(
    probes.map(async (p) => {
      try {
        const r = await fetch(p.url, { headers: { 'User-Agent': 'dekho-leadpush-ip-probe' } });
        const ct = r.headers.get('content-type') || '';
        const body = ct.includes('json') ? await r.json() : await r.text();
        const parsed: any = (p.parse as any)(body);
        probeResults[p.name] = parsed;
        if (parsed?.ip) ips.add(parsed.ip);
        // Merge enrichment (country / asn / region) from the richest probe
        if (parsed && Object.keys(parsed).length > 1) meta = { ...parsed, ...meta };
      } catch (e) {
        probeResults[p.name] = `error: ${String(e).slice(0, 80)}`;
      }
    }),
  );

  // Edge worker / runtime info
  const reqUrl = new URL(req.url);
  const runtime = {
    deno_version: (Deno as any)?.version?.deno ?? null,
    typescript: (Deno as any)?.version?.typescript ?? null,
    v8: (Deno as any)?.version?.v8 ?? null,
    region: Deno.env.get('SB_REGION') || Deno.env.get('DENO_REGION') || null,
    deployment_id: Deno.env.get('SB_EXECUTION_ID') || Deno.env.get('DENO_DEPLOYMENT_ID') || null,
    hostname: (Deno as any)?.hostname?.() ?? null,
    request_host: reqUrl.host,
    request_url: reqUrl.toString(),
    cf_ray: req.headers.get('cf-ray'),
    cf_ipcountry: req.headers.get('cf-ipcountry'),
    cf_connecting_ip: req.headers.get('cf-connecting-ip'),
    x_forwarded_for: req.headers.get('x-forwarded-for'),
    x_real_ip: req.headers.get('x-real-ip'),
    user_agent: req.headers.get('user-agent'),
  };

  return new Response(
    JSON.stringify({
      ok: ips.size > 0,
      ips: Array.from(ips),
      meta, // country / asn / city / org of the egress IP
      runtime, // edge worker info + inbound headers
      probes: probeResults, // raw per-probe response
      checked_at: new Date().toISOString(),
      note:
        'Supabase Edge Functions egress IPs are not stable. They rotate across the AWS fleet (Deno Deploy). Use a static-IP proxy or API-key auth for partner whitelisting.',
    }),
    { headers: { ...corsHeaders, 'Content-Type': 'application/json' } },
  );
});
