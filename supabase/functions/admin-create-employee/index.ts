// Supabase Edge Function: admin-create-employee
// Creates an employee login + profile. Only HR can call this.

// @ts-ignore - Deno globals are available in Supabase Edge Functions
declare const Deno: {
  serve(handler: (req: Request) => Promise<Response>): void;
  env: {
    get(key: string): string | undefined;
  };
};

import { createClient } from "@supabase/supabase-js";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
  const anonKey = Deno.env.get("SUPABASE_PUBLISHABLE_KEY")!;
  const serviceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;

  const authHeader = req.headers.get("Authorization") || "";

  const supabaseAuth = createClient(supabaseUrl, anonKey, {
    global: { headers: { Authorization: authHeader } },
  });

  const supabaseAdmin = createClient(supabaseUrl, serviceKey);

  const {
    data: { user },
    error: userErr,
  } = await supabaseAuth.auth.getUser();

  if (userErr || !user) {
    return new Response(JSON.stringify({ error: "Unauthorized" }), {
      status: 401,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: roleRow, error: roleErr } = await supabaseAdmin
    .from("user_roles")
    .select("role")
    .eq("user_id", user.id)
    .maybeSingle();

  if (roleErr || roleRow?.role !== "hr") {
    return new Response(JSON.stringify({ error: "Forbidden" }), {
      status: 403,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  let body: { email?: string; password?: string; full_name?: string } = {};
  try {
    body = await req.json();
  } catch {
    // ignore
  }

  const email = (body.email || "").trim().toLowerCase();
  const password = body.password || "";
  const full_name = (body.full_name || "").trim();

  if (!email || !password || !full_name) {
    return new Response(JSON.stringify({ error: "Missing required fields" }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  const { data: created, error: createErr } = await supabaseAdmin.auth.admin.createUser({
    email,
    password,
    email_confirm: true,
    user_metadata: { full_name },
  });

  if (createErr || !created?.user) {
    return new Response(
      JSON.stringify({ error: createErr?.message || "Failed to create user" }),
      {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }

  const newUserId = created.user.id;

  // Create/ensure profile
  const { error: profileErr } = await supabaseAdmin.from("profiles").insert({
    user_id: newUserId,
    full_name,
    email,
  });

  if (profileErr) {
    // If this fails, still return user creation; HR can fix profile later
    console.error("profile insert failed", profileErr);
  }

  // Assign employee role
  const { error: roleInsertErr } = await supabaseAdmin.from("user_roles").insert({
    user_id: newUserId,
    role: "employee",
  });

  if (roleInsertErr) {
    console.error("role insert failed", roleInsertErr);
  }

  return new Response(JSON.stringify({ user_id: newUserId }), {
    status: 200,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
