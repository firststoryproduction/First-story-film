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

// GET /api/accounting/income-all
// Returns merged view: manual income_transactions + vendor_payments (income received from vendors/clients)
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
    const sourceFilter = searchParams.get("source"); // 'manual' | 'vendor_payment' | ''
    const page = parseInt(searchParams.get("page") || "1");
    const limit = parseInt(searchParams.get("limit") || "20");

    // ── 1. Manual income transactions ──────────────────────────────────────
    let incQ = supabaseAdmin.from("income_transactions").select(
      `
        id, income_date, amount, remarks, created_at,
        account_id,
        accounts(id, account_name),
        income_categories(id, name),
        users(id, name)
      `,
      { count: "exact" },
    );

    if (accountId) incQ = incQ.eq("account_id", accountId);
    if (categoryId) incQ = incQ.eq("income_category_id", categoryId);
    if (dateFrom) incQ = incQ.gte("income_date", dateFrom);
    if (dateTo) incQ = incQ.lte("income_date", dateTo);
    // income_transactions has no source column — all rows are manual

    const { data: manualTxs } = await incQ
      .order("income_date", { ascending: false })
      .order("created_at", { ascending: false });

    // ── 2. Vendor payments (income received from vendors/clients) ───────────
    let vpQ = supabaseAdmin
      .from("vendor_payments")
      .select(
        `id, payment_date, amount, note, vendor_id, account_id, created_at, vendors(id, studio_name), accounts(id, account_name)`,
      );
    if (dateFrom) vpQ = vpQ.gte("payment_date", dateFrom);
    if (dateTo) vpQ = vpQ.lte("payment_date", dateTo);
    if (accountId) vpQ = vpQ.eq("account_id", accountId);
    const { data: vendorPayments } =
      sourceFilter && sourceFilter !== "vendor_payment"
        ? { data: [] }
        : await vpQ.order("payment_date", { ascending: false });

    // ── Build rows ──────────────────────────────────────────────────────────
    const shouldIncludeManual = !sourceFilter || sourceFilter === "manual";
    const manualRows = (shouldIncludeManual ? manualTxs || [] : []).map(
      (t: any) => ({
        id: t.id,
        date: t.income_date,
        amount: Number(t.amount),
        remarks: t.remarks || "",
        source: "manual",
        account: t.accounts?.account_name || "—",
        account_id: t.account_id,
        category: t.income_categories?.name || "—",
        created_by: t.users?.name || "—",
        ref_name: "",
        deletable: true,
        editable: false,
        created_at: t.created_at || "",
      }),
    );

    const vendorRows = (vendorPayments || []).map((p: any) => ({
      id: p.id,
      date: p.payment_date,
      amount: Number(p.amount),
      remarks: p.note || "",
      source: "vendor_payment",
      account: (p.accounts as any)?.account_name || "—",
      account_id: p.account_id || null,
      category: "Vendor Payment",
      created_by: "—",
      ref_name: (p.vendors as any)?.studio_name || "—",
      deletable: false,
      editable: false,
      created_at: p.created_at || "",
    }));

    // Merge all, sort by created_at descending so newest entry always appears first
    const allRows = [...manualRows, ...vendorRows].sort((a, b) =>
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
