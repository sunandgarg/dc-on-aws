import { handleRequest } from "./index.mjs";

export const handler = async (event) => {
  const headers = new Headers(event.headers || {});
  const request = new Request(`https://${headers.get("host") || "api.dekhocampus.in"}${event.rawPath || "/"}${event.rawQueryString ? `?${event.rawQueryString}` : ""}`, {
    method: event.requestContext?.http?.method || event.httpMethod || "GET",
    headers,
    body: ["GET", "HEAD"].includes(event.requestContext?.http?.method || event.httpMethod) ? undefined : event.body ? (event.isBase64Encoded ? Buffer.from(event.body, "base64") : event.body) : undefined,
  });
  const response = await handleRequest(request);
  return { statusCode: response.status, headers: Object.fromEntries(response.headers), body: await response.text() };
};
