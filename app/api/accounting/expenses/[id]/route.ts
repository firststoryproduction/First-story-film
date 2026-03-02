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
  return { user, supabaseAdmin, userName: profile?.name as string };
}

export async function PUT(
  request: Request,
  { params }: { params: Promise<{ id: string }> },
) {
  try {
    const auth = await verifyAuth(request);
    if ("error" in auth)
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { user, supabaseAdmin, userName } = auth;
    const { id } = await params;
    const body = await request.json();

    if (
      !body.expense_date ||
      !body.account_id ||
      !body.expense_category_id ||
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
      .from("expense_transactions")
      .update({
        expense_date: body.expense_date,
        account_id: body.account_id,
        expense_category_id: body.expense_category_id,
        amount: body.amount,
        remarks: body.remarks || null,
      })
      .eq("id", id)
      .select(
        `*, accounts(id, account_name), expense_categories(id, name), users(id, name)`,
      )
      .single();

    if (error) throw error;
    logActivity({
      userId: user.id,
      userName,
      actionType: "UPDATE",
      moduleName: "Expense",
      recordId: data.id,
      description: `Updated expense: ${data.expense_categories?.name || "Expense"} - ${data.amount}`,
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
    const { user, supabaseAdmin, userName } = auth;
    const { id } = await params;
    const { error } = await supabaseAdmin
      .from("expense_transactions")
      .delete()
      .eq("id", id);
    if (error) throw error;
    logActivity({
      userId: user.id,
      userName,
      actionType: "DELETE",
      moduleName: "Expense",
      recordId: id,
      description: `Deleted expense ID: ${id}`,
    });
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
