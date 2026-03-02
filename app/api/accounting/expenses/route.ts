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

// GET expense transactions with filters
export async function GET(request: Request) {
  try {
    const auth = await verifyAuth(request);
    if ("error" in auth)
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { supabaseAdmin } = auth;
    const { searchParams } = new URL(request.url);

    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");
    const accountId = searchParams.get("account_id");
    const categoryId = searchParams.get("category_id");
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");
    const createdBy = searchParams.get("created_by");
    const start = (page - 1) * limit;
    const end = start + limit - 1;

    let query = supabaseAdmin.from("expense_transactions").select(
      `
        *,
        accounts(id, account_name),
        expense_categories(id, name),
        users(id, name)
      `,
      { count: "exact" },
    );

    if (accountId) query = query.eq("account_id", accountId);
    if (categoryId) query = query.eq("expense_category_id", categoryId);
    if (dateFrom) query = query.gte("expense_date", dateFrom);
    if (dateTo) query = query.lte("expense_date", dateTo);
    if (createdBy) query = query.eq("created_by", createdBy);

    const { data, error, count } = await query
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false })
      .range(start, end);

    if (error) throw error;
    return NextResponse.json({ data, count, page, limit });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST create expense transaction
export async function POST(request: Request) {
  try {
    const auth = await verifyAuth(request);
    if ("error" in auth)
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { user, supabaseAdmin, userName } = auth;
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
        { error: "Amount must be greater than 0" },
        { status: 400 },
      );

    const { data: account } = await supabaseAdmin
      .from("accounts")
      .select("status")
      .eq("id", body.account_id)
      .single();
    if (account?.status !== "active")
      return NextResponse.json(
        { error: "Selected account is inactive" },
        { status: 400 },
      );

    const { data: category } = await supabaseAdmin
      .from("expense_categories")
      .select("status")
      .eq("id", body.expense_category_id)
      .single();
    if (category?.status !== "active")
      return NextResponse.json(
        { error: "Selected category is inactive" },
        { status: 400 },
      );

    const { data, error } = await supabaseAdmin
      .from("expense_transactions")
      .insert([
        {
          expense_date: body.expense_date,
          account_id: body.account_id,
          expense_category_id: body.expense_category_id,
          amount: body.amount,
          remarks: body.remarks || null,
          created_by: user.id,
        },
      ])
      .select(
        `*, accounts(id, account_name), expense_categories(id, name), users(id, name)`,
      )
      .single();

    if (error) throw error;
    logActivity({
      userId: user.id,
      userName,
      actionType: "CREATE",
      moduleName: "Expense",
      recordId: data.id,
      description: `Created expense: ${data.expense_categories?.name || "Expense"} - ${data.amount}`,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
