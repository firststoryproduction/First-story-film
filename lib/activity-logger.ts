import { createClient } from "@supabase/supabase-js";

const getSupabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

export type ActionType = "CREATE" | "UPDATE" | "DELETE" | "LOGIN" | "LOGOUT";
export type LogStatus = "Success" | "Failed";

export interface LogParams {
  userId?: string | null;
  userName?: string;
  actionType: ActionType;
  moduleName: string;
  recordId?: string | null;
  description: string;
  status?: LogStatus;
  ipAddress?: string | null;
}

/**
 * Write an activity log entry.
 * Fire-and-forget — never throws. Does not block the main operation.
 */
export async function logActivity(params: LogParams): Promise<void> {
  try {
    const supabaseAdmin = getSupabaseAdmin();
    await supabaseAdmin.from("activity_logs").insert([
      {
        user_id: params.userId ?? null,
        user_name: params.userName ?? "System",
        action_type: params.actionType,
        module_name: params.moduleName,
        record_id: params.recordId ?? null,
        description: params.description,
        status: params.status ?? "Success",
        ip_address: params.ipAddress ?? null,
      },
    ]);
  } catch {
    // Silently swallow — logging must never break primary operations
  }
}
