// Centralized logger for edge functions.
// Writes to console (visible in supabase function logs) AND inserts into
// public.system_logs so admins can see a unified console in the app.

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

type LogLevel = "debug" | "info" | "warn" | "error";

const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SERVICE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const _client = SUPABASE_URL && SERVICE_KEY
  ? createClient(SUPABASE_URL, SERVICE_KEY)
  : null;

export class Logger {
  functionName: string;
  requestId: string;
  flow?: string;

  constructor(functionName: string, requestId?: string, flow?: string) {
    this.functionName = functionName;
    this.requestId = requestId || crypto.randomUUID();
    this.flow = flow;
    this.info("class", `Logger constructed for ${functionName}`);
  }

  child(flow: string) {
    const c = new Logger(this.functionName, this.requestId, flow);
    return c;
  }

  private async write(level: LogLevel, method: string, message: string, context?: unknown) {
    const line = `[${this.functionName}]${this.flow ? `[${this.flow}]` : ""}[${method}] ${message}`;
    if (level === "error") console.error(line, context ?? "");
    else if (level === "warn") console.warn(line, context ?? "");
    else console.log(line, context ?? "");
    if (!_client) return;
    try {
      await _client.from("system_logs").insert({
        function_name: this.functionName,
        level,
        flow: this.flow ?? null,
        method,
        message,
        context: context ? JSON.parse(JSON.stringify(context)) : null,
        request_id: this.requestId,
      });
    } catch (_) {
      // never throw from logger
    }
  }

  debug(method: string, message: string, context?: unknown) { return this.write("debug", method, message, context); }
  info(method: string, message: string, context?: unknown)  { return this.write("info",  method, message, context); }
  warn(method: string, message: string, context?: unknown)  { return this.write("warn",  method, message, context); }
  error(method: string, message: string, context?: unknown) { return this.write("error", method, message, context); }
}

export function newLogger(functionName: string, requestId?: string, flow?: string) {
  return new Logger(functionName, requestId, flow);
}
