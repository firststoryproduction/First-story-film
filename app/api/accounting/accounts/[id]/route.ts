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

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await verifyAuth(request);
    if ("error" in auth)
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { supabaseAdmin } = auth;
    const { id } = await params;
    const { data, error } = await supabaseAdmin
      .from("accounts")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await verifyAuth(request);
    if ("error" in auth)
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { supabaseAdmin } = auth;
    const { id } = await params;
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
        .neq("id", id)
        .eq("is_default", true);
    }

    const { data, error } = await supabaseAdmin
      .from("accounts")
      .update({
        account_name: body.account_name,
        opening_balance: body.opening_balance ?? 0,
        notes: body.notes || null,
        is_default: body.is_default || false,
        status: body.status || "active",
      })
      .eq("id", id)
      .select()
      .single();

    if (error) throw error;
    await logActivity({
      userId: auth.user.id,
      userName: auth.userName,
      actionType: "UPDATE",
      moduleName: "Accounts",
      recordId: id,
      description: `Updated account "${data.account_name}"`,
    });
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

export async function DELETE(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await verifyAuth(request);
    if ("error" in auth)
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { supabaseAdmin } = auth;
    const { id } = await params;

    // Check for linked transactions
    const { count: incomeCount } = await supabaseAdmin
      .from("income_transactions")
      .select("id", { count: "exact", head: true })
      .eq("account_id", id);
    const { count: expenseCount } = await supabaseAdmin
      .from("expense_transactions")
      .select("id", { count: "exact", head: true })
      .eq("account_id", id);

    if ((incomeCount || 0) + (expenseCount || 0) > 0) {
      return NextResponse.json(
        { error: "Cannot delete account with existing transactions" },
        { status: 400 },
      );
    }

    const { error } = await supabaseAdmin
      .from("accounts")
      .delete()
      .eq("id", id);
    if (error) throw error;
    await logActivity({
      userId: auth.user.id,
      userName: auth.userName,
      actionType: "DELETE",
      moduleName: "Accounts",
      recordId: id,
      description: `Deleted account ID ${id}`,
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
