// Minimal AWS Signature V4 signer for Deno (no AWS SDK dependency).
// Supports SNS (form-encoded query API) and SES v2 (JSON) over HTTPS.

async function sha256Hex(data: string | Uint8Array): Promise<string> {
  const bytes = typeof data === "string" ? new TextEncoder().encode(data) : data;
  const hash = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

async function hmac(key: ArrayBuffer | Uint8Array, data: string): Promise<ArrayBuffer> {
  const cryptoKey = await crypto.subtle.importKey(
    "raw",
    key instanceof Uint8Array ? key : new Uint8Array(key),
    { name: "HMAC", hash: "SHA-256" },
    false,
    ["sign"],
  );
  return await crypto.subtle.sign("HMAC", cryptoKey, new TextEncoder().encode(data));
}

async function signingKey(secret: string, dateStamp: string, region: string, service: string): Promise<ArrayBuffer> {
  const kDate = await hmac(new TextEncoder().encode("AWS4" + secret), dateStamp);
  const kRegion = await hmac(kDate, region);
  const kService = await hmac(kRegion, service);
  return await hmac(kService, "aws4_request");
}

export interface AwsCreds {
  accessKeyId: string;
  secretAccessKey: string;
  region: string;
}

export interface SignedRequestInit {
  service: "sns" | "ses" | string;
  host: string;
  path?: string; // default "/"
  method?: "POST" | "GET";
  contentType?: string;
  body: string;
}

/** Returns a Headers object with AWS SigV4 headers populated. */
export async function signAwsRequest(creds: AwsCreds, req: SignedRequestInit): Promise<Headers> {
  const method = req.method || "POST";
  const path = req.path || "/";
  const contentType = req.contentType || "application/x-www-form-urlencoded; charset=utf-8";

  const amzDate = new Date().toISOString().replace(/[:-]|\.\d{3}/g, ""); // YYYYMMDDTHHMMSSZ
  const dateStamp = amzDate.slice(0, 8);

  const payloadHash = await sha256Hex(req.body);
  const canonicalHeaders = `content-type:${contentType}\nhost:${req.host}\nx-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-date";
  const canonicalRequest = [method, path, "", canonicalHeaders, signedHeaders, payloadHash].join("\n");

  const algorithm = "AWS4-HMAC-SHA256";
  const credentialScope = `${dateStamp}/${creds.region}/${req.service}/aws4_request`;
  const stringToSign = [algorithm, amzDate, credentialScope, await sha256Hex(canonicalRequest)].join("\n");

  const key = await signingKey(creds.secretAccessKey, dateStamp, creds.region, req.service);
  const sigBuf = await hmac(key, stringToSign);
  const signature = Array.from(new Uint8Array(sigBuf)).map((b) => b.toString(16).padStart(2, "0")).join("");

  const authorization = `${algorithm} Credential=${creds.accessKeyId}/${credentialScope}, SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const headers = new Headers();
  headers.set("Content-Type", contentType);
  headers.set("Host", req.host);
  headers.set("X-Amz-Date", amzDate);
  headers.set("Authorization", authorization);
  return headers;
}

/** Publish an SMS via AWS SNS. */
export async function snsPublishSMS(creds: AwsCreds, phoneE164: string, message: string, senderId?: string): Promise<{ ok: boolean; messageId?: string; detail?: string; raw?: string }> {
  const host = `sns.${creds.region}.amazonaws.com`;
  const params: Record<string, string> = {
    Action: "Publish",
    Version: "2010-03-31",
    PhoneNumber: phoneE164,
    Message: message,
    "MessageAttributes.entry.1.Name": "AWS.SNS.SMS.SMSType",
    "MessageAttributes.entry.1.Value.DataType": "String",
    "MessageAttributes.entry.1.Value.StringValue": "Transactional",
  };
  if (senderId) {
    params["MessageAttributes.entry.2.Name"] = "AWS.SNS.SMS.SenderID";
    params["MessageAttributes.entry.2.Value.DataType"] = "String";
    params["MessageAttributes.entry.2.Value.StringValue"] = senderId;
  }
  const body = new URLSearchParams(params).toString();
  const headers = await signAwsRequest(creds, { service: "sns", host, body });
  const res = await fetch(`https://${host}/`, { method: "POST", headers, body });
  const text = await res.text();
  if (!res.ok) return { ok: false, detail: `HTTP ${res.status}: ${text.slice(0, 300)}`, raw: text };
  const mid = text.match(/<MessageId>([^<]+)<\/MessageId>/)?.[1];
  return { ok: true, messageId: mid, raw: text };
}

/** Send an email via AWS SES v2. */
export async function sesSendEmail(
  creds: AwsCreds,
  args: { from: string; to: string | string[]; subject: string; text?: string; html?: string; replyTo?: string },
): Promise<{ ok: boolean; messageId?: string; detail?: string; raw?: string }> {
  const host = `email.${creds.region}.amazonaws.com`;
  const toList = Array.isArray(args.to) ? args.to : [args.to];
  const bodyJson: any = {
    FromEmailAddress: args.from,
    Destination: { ToAddresses: toList },
    Content: {
      Simple: {
        Subject: { Data: args.subject, Charset: "UTF-8" },
        Body: {} as any,
      },
    },
  };
  if (args.text) bodyJson.Content.Simple.Body.Text = { Data: args.text, Charset: "UTF-8" };
  if (args.html) bodyJson.Content.Simple.Body.Html = { Data: args.html, Charset: "UTF-8" };
  if (!args.text && !args.html) bodyJson.Content.Simple.Body.Text = { Data: "", Charset: "UTF-8" };
  if (args.replyTo) bodyJson.ReplyToAddresses = [args.replyTo];

  const body = JSON.stringify(bodyJson);
  const headers = await signAwsRequest(creds, {
    service: "ses",
    host,
    path: "/v2/email/outbound-emails",
    contentType: "application/json",
    body,
  });
  const res = await fetch(`https://${host}/v2/email/outbound-emails`, { method: "POST", headers, body });
  const text = await res.text();
  if (!res.ok) return { ok: false, detail: `HTTP ${res.status}: ${text.slice(0, 300)}`, raw: text };
  let parsed: any = null;
  try { parsed = JSON.parse(text); } catch { /* */ }
  return { ok: true, messageId: parsed?.MessageId, raw: text };
}
