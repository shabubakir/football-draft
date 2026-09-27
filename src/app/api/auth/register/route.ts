import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

export async function POST(request: NextRequest) {
  try {
    const { email, password, username } = await request.json();

    if (!email || !password || !username) {
      return NextResponse.json(
        { error: "Все поля обязательны" },
        { status: 400 }
      );
    }

    const cleanUsername = username.trim().replace(/[^a-zA-Z0-9_]/g, "_").slice(0, 16);
    if (cleanUsername.length < 3) {
      return NextResponse.json(
        { error: "Username слишком короткий (мин. 3 символа)" },
        { status: 400 }
      );
    }

    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

    if (!supabaseUrl || !serviceRoleKey) {
      return NextResponse.json(
        { error: "Server not configured" },
        { status: 500 }
      );
    }

    const admin = createClient(supabaseUrl, serviceRoleKey, {
      auth: { persistSession: false },
    });

    // Check if username is taken
    const { data: existingUsername } = await admin
      .from("user_profiles")
      .select("id")
      .eq("username", cleanUsername)
      .maybeSingle();

    if (existingUsername) {
      return NextResponse.json(
        { error: "Username уже занят" },
        { status: 409 }
      );
    }

    // Create user (auto-confirm email for development)
    const { data, error } = await admin.auth.admin.createUser({
      email,
      password,
      email_confirm: true,
      user_metadata: { username: cleanUsername },
    });

    if (error) {
      if (error.message.includes("already registered") || error.message.includes("already exists")) {
        return NextResponse.json(
          { error: "Email уже зарегистрирован" },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: error.message },
        { status: 500 }
      );
    }

    // Create profile (service role bypasses RLS)
    const { error: profileError } = await admin
      .from("user_profiles")
      .insert({
        id: data.user.id,
        username: cleanUsername,
      });

    if (profileError) {
      await admin.auth.admin.deleteUser(data.user.id);
      return NextResponse.json(
        { error: "Failed to create profile: " + profileError.message },
        { status: 500 }
      );
    }

    return NextResponse.json(
      { success: true, userId: data.user.id },
      { status: 201 }
    );
  } catch (error) {
    console.error("Register error:", error);
    return NextResponse.json(
      { error: "Internal server error" },
      { status: 500 }
    );
  }
}
