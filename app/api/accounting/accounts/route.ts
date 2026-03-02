import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";
import { logActivity } from "@/lib/activity-logger";

const getSupabaseAdmin = () =>
  createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    { auth: { autoRefreshToken: false, persistSession: false } },
  );

async function verifyAuth(request: Request) {
  const token = request.headers.get("Authorization")?.split(" ")[1];
  if (!token) return { error: "Unauthorized", status: 401 };
  const supabaseAdmin = getSupabaseAdmin();
  const {
    data: { user },
    error,
  } = await supabaseAdmin.auth.getUser(token);
  if (error || !user) return { error: "Invalid Session", status: 401 };
  const { data: profile } = await supabaseAdmin
    .from("users")
    .select("role, name")
    .eq("id", user.id)
    .single();
  if (!["ADMIN", "MANAGER"].includes(profile?.role))
    return { error: "Forbidden", status: 403 };
  return {
    user,
    supabaseAdmin,
    userName: (profile?.name as string) || "Admin",
  };
}

export async function GET(request: Request) {
  try {
    const auth = await verifyAuth(request);
    if ("error" in auth)
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { supabaseAdmin } = auth;

    const { data, error } = await supabaseAdmin
      .from("accounts")
      .select("*")
      .order("is_default", { ascending: false })
      .order("account_name");

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function POST(request: Request) {
  try {
    const auth = await verifyAuth(request);
    if ("error" in auth)
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { user, supabaseAdmin } = auth;
    const body = await request.json();

    if (!body.account_name)
      return NextResponse.json(
        { error: "Account name is required" },
        { status: 400 },
      );

    // If setting as default, unset all others first
    if (body.is_default) {
      await supabaseAdmin
        .from("accounts")
        .update({ is_default: false })
        .eq("is_default", true);
    }

    const { data, error } = await supabaseAdmin
      .from("accounts")
      .insert([
        {
          account_name: body.account_name,
          opening_balance: body.opening_balance || 0,
          notes: body.notes || null,
          is_default: body.is_default || false,
          status: body.status || "active",
          created_by: user.id,
        },
      ])
      .select()
      .single();

    if (error) throw error;
    await logActivity({
      userId: user.id,
      userName: auth.userName,
      actionType: "CREATE",
      moduleName: "Accounts",
      recordId: data.id,
      description: `Created account "${data.account_name}"`,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
