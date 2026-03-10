import { createClient } from "@supabase/supabase-js";
import { NextResponse } from "next/server";

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
    .select("role")
    .eq("id", user.id)
    .single();
  if (!["ADMIN", "MANAGER"].includes(profile?.role))
    return { error: "Forbidden", status: 403 };
  return { user, supabaseAdmin };
}

// GET /api/accounting/expenses-all
// Returns merged view: manual expense_transactions + vendor_payments + staff_payments
export async function GET(request: Request) {
  try {
    const auth = await verifyAuth(request);
    if ("error" in auth)
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { supabaseAdmin } = auth;
    const { searchParams } = new URL(request.url);

    const accountId = searchParams.get("account_id");
    const categoryId = searchParams.get("category_id");
    const dateFrom = searchParams.get("date_from");
    const dateTo = searchParams.get("date_to");
    const sourceFilter = searchParams.get("source"); // 'manual' | 'staff_payment' | ''
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // ── 1. Manual expense transactions ──────────────────────────────────────
    let expQ = supabaseAdmin.from("expense_transactions").select(
      `
        id, expense_date, amount, remarks, source, created_at,
        account_id,
        accounts(id, account_name),
        expense_categories(id, name),
        users(id, name)
      `,
      { count: "exact" },
    );

    if (accountId) expQ = expQ.eq("account_id", accountId);
    if (categoryId) expQ = expQ.eq("expense_category_id", categoryId);
    if (dateFrom) expQ = expQ.gte("expense_date", dateFrom);
    if (dateTo) expQ = expQ.lte("expense_date", dateTo);
    if (sourceFilter === "manual") expQ = expQ.eq("source", "manual");

    const { data: manualTxs, error: expError } = await expQ
      .order("expense_date", { ascending: false })
      .order("created_at", { ascending: false });

    if (expError)
      console.error("[expenses-all] manual query error:", expError.message);

    // ── 2. Staff payments (read-only) ───────────────────────────────────────
    let spQ = supabaseAdmin
      .from("staff_payments")
      .select(
        `id, payment_date, amount, note, staff_id, account_id, created_at, payment_type, accounts(id, account_name), users!staff_payments_staff_id_fkey(id, name), creator:users!staff_payments_created_by_fkey(id, name)`,
      );
    if (dateFrom) spQ = spQ.gte("payment_date", dateFrom);
    if (dateTo) spQ = spQ.lte("payment_date", dateTo);
    if (accountId) spQ = spQ.eq("account_id", accountId);
    const { data: staffPayments } =
      sourceFilter && sourceFilter !== "staff_payment"
        ? { data: [] }
        : await spQ.order("payment_date", { ascending: false });

    // Exclude manual entries if filter is staff_payment
    const filteredManual =
      sourceFilter && sourceFilter !== "manual" ? [] : manualTxs || [];

    const manualRows = filteredManual.map((t: any) => ({
      id: t.id,
      date: t.expense_date,
      amount: Number(t.amount),
      remarks: t.remarks || "",
      source: t.source || "manual",
      account: t.accounts?.account_name || "—",
      account_id: t.account_id,
      category: t.expense_categories?.name || "—",
      created_by: t.users?.name || "—",
      ref_name: "",
      deletable: true,
      editable: false,
      created_at: t.created_at || "",
    }));

    const staffRows = (staffPayments || []).map((p: any) => ({
      id: p.id,
      date: p.payment_date,
      amount: Number(p.amount),
      remarks: p.note || "",
      source: "staff_payment",
      account: (p.accounts as any)?.account_name || "—",
      account_id: p.account_id || null,
      category: p.payment_type === "salary" ? "Staff Salary" : "Staff Payment",
      created_by: (p.creator as any)?.name || "—",
      ref_name: (p.users as any)?.name || "—",
      ref_sub: "",
      deletable: false,
      editable: false,
      created_at: p.created_at || "",
    }));

    // Merge all, sort by created_at descending so newest entry always appears first
    const allRows = [...manualRows, ...staffRows].sort((a, b) =>
      (b.created_at || "").localeCompare(a.created_at || ""),
    );

    // Paginate
    const total = allRows.length;
    const start = (page - 1) * limit;
    const paged = allRows.slice(start, start + limit);

    return NextResponse.json({ data: paged, count: total, page, limit });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
