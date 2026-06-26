"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { isAllowedEmail, ALLOWED_EMAIL_DOMAIN } from "@/lib/config";
import { emailAdminsPendingApproval } from "@/lib/notify/email";

export type AuthState = { error?: string; message?: string };

export async function signIn(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!email || !password) {
    return { error: "Email and password are required." };
  }

  const supabase = createClient();
  const { error } = await supabase.auth.signInWithPassword({ email, password });

  if (error) {
    return { error: "Incorrect email or password." };
  }

  revalidatePath("/", "layout");
  redirect("/apps");
}

export async function signUp(
  _prev: AuthState,
  formData: FormData,
): Promise<AuthState> {
  const fullName = String(formData.get("full_name") ?? "").trim();
  const email = String(formData.get("email") ?? "").trim();
  const password = String(formData.get("password") ?? "");

  if (!fullName || !email || !password) {
    return { error: "All fields are required." };
  }
  if (!isAllowedEmail(email)) {
    return {
      error: `Registration is restricted to @${ALLOWED_EMAIL_DOMAIN} email addresses.`,
    };
  }
  if (password.length < 8) {
    return { error: "Password must be at least 8 characters." };
  }

  const supabase = createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: { data: { full_name: fullName } },
  });

  if (error) {
    return { error: error.message };
  }

  // Best-effort: email active admins that someone is waiting (no-op if email
  // isn't configured). In-app notifications are created by a DB trigger.
  try {
    await emailAdminsPendingApproval({ name: fullName, email });
  } catch {
    /* don't let email problems block registration */
  }

  // New accounts start as "pending" and need an admin to approve them. If email
  // confirmation is also on there's no session yet, so surface a message.
  if (!data.session) {
    return {
      message:
        "Account created. Confirm your email, then wait for an admin to approve your account.",
    };
  }

  revalidatePath("/", "layout");
  redirect("/pending");
}

export async function signOut() {
  const supabase = createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
