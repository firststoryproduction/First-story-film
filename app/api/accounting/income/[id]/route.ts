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

    if (
      !body.income_date ||
      !body.account_id ||
      !body.income_category_id ||
      !body.amount
    ) {
      return NextResponse.json(
        { error: "Missing required fields" },
        { status: 400 },
      );
    }
    if (body.amount <= 0)
      return NextResponse.json(
        { error: "Amount must be > 0" },
        { status: 400 },
      );

    const { data, error } = await supabaseAdmin
      .from("income_transactions")
      .update({
        income_date: body.income_date,
        account_id: body.account_id,
        income_category_id: body.income_category_id,
        amount: body.amount,
        remarks: body.remarks || null,
      })
      .eq("id", id)
      .select(
        `*, accounts(id, account_name), income_categories(id, name), users(id, name)`,
      )
      .single();

    if (error) throw error;
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
    const { error } = await supabaseAdmin
      .from("income_transactions")
      .delete()
      .eq("id", id);
    if (error) throw error;
    await logActivity({
      userId: auth.user.id,
      userName: auth.userName,
      actionType: "DELETE",
      moduleName: "Income",
      recordId: id,
      description: `Deleted income transaction ID ${id}`,
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
