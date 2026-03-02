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

// GET income categories
export async function GET(request: Request) {
  try {
    const auth = await verifyAuth(request);
    if ("error" in auth)
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { supabaseAdmin } = auth;

    const { data, error } = await supabaseAdmin
      .from("income_categories")
      .select("*")
      .order("name");

    if (error) throw error;
    return NextResponse.json({ data });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST create income category
export async function POST(request: Request) {
  try {
    const auth = await verifyAuth(request);
    if ("error" in auth)
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { user, supabaseAdmin, userName } = auth;
    const body = await request.json();

    if (!body.name)
      return NextResponse.json(
        { error: "Category name is required" },
        { status: 400 },
      );

    const { data, error } = await supabaseAdmin
      .from("income_categories")
      .insert([
        {
          name: body.name,
          description: body.description || null,
          status: body.status || "active",
        },
      ])
      .select()
      .single();

    if (error) {
      if (error.code === "23505")
        return NextResponse.json(
          { error: "Category name already exists" },
          { status: 400 },
        );
      throw error;
    }
    logActivity({
      userId: user.id,
      userName,
      actionType: "CREATE",
      moduleName: "Income Category",
      recordId: data.id,
      description: `Created income category: ${data.name}`,
    });
    return NextResponse.json(data, { status: 201 });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT update income category
export async function PUT(request: Request) {
  try {
    const auth = await verifyAuth(request);
    if ("error" in auth)
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { supabaseAdmin } = auth;
    const body = await request.json();

    if (!body.id || !body.name)
      return NextResponse.json(
        { error: "ID and name required" },
        { status: 400 },
      );

    const { data, error } = await supabaseAdmin
      .from("income_categories")
      .update({
        name: body.name,
        description: body.description || null,
        status: body.status || "active",
      })
      .eq("id", body.id)
      .select()
      .single();

    if (error) throw error;
    return NextResponse.json(data);
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// DELETE income category
export async function DELETE(request: Request) {
  try {
    const auth = await verifyAuth(request);
    if ("error" in auth)
      return NextResponse.json({ error: auth.error }, { status: auth.status });
    const { supabaseAdmin } = auth;
    const { searchParams } = new URL(request.url);
    const id = searchParams.get("id");

    if (!id)
      return NextResponse.json({ error: "ID required" }, { status: 400 });

    const { count } = await supabaseAdmin
      .from("income_transactions")
      .select("id", { count: "exact", head: true })
      .eq("income_category_id", id);

    if ((count || 0) > 0)
      return NextResponse.json(
        { error: "Cannot delete category with existing transactions" },
        { status: 400 },
      );

    const { error } = await supabaseAdmin
      .from("income_categories")
      .delete()
      .eq("id", id);
    if (error) throw error;
    return NextResponse.json({ success: true });
  } catch (err: any) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}
