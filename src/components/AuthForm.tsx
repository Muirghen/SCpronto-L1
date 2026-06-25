"use client";

import { useFormState, useFormStatus } from "react-dom";
import Link from "next/link";
import { Logo } from "./Logo";
import { Field, Button, Alert } from "./ui";
import { signIn, signUp, type AuthState } from "@/app/auth/actions";

function SubmitButton({ label }: { label: string }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" disabled={pending} className="w-full">
      {pending ? "Please wait…" : label}
    </Button>
  );
}

export function AuthForm({ mode }: { mode: "login" | "register" }) {
  const action = mode === "login" ? signIn : signUp;
  const [state, formAction] = useFormState<AuthState, FormData>(action, {});

  return (
    <div className="w-full max-w-md">
      <div className="mb-8 flex flex-col items-center gap-3 text-center">
        <Logo size={56} withWordmark />
        <p className="text-sm text-espresso/60">
          {mode === "login"
            ? "Sign in to the SC Pronto employee portal."
            : "Create your SC Pronto employee account."}
        </p>
      </div>

      <form
        action={formAction}
        className="space-y-4 rounded-card border border-tan/40 bg-white/70 p-6 shadow-sm"
      >
        {mode === "register" && (
          <Field
            label="Full name"
            name="full_name"
            type="text"
            autoComplete="name"
            placeholder="Jane Doe"
            required
          />
        )}
        <Field
          label="Work email"
          name="email"
          type="email"
          autoComplete="email"
          placeholder="you@scpronto.com"
          required
        />
        <Field
          label="Password"
          name="password"
          type="password"
          autoComplete={mode === "login" ? "current-password" : "new-password"}
          placeholder="••••••••"
          required
        />

        {state.error && <Alert kind="error">{state.error}</Alert>}
        {state.message && <Alert kind="success">{state.message}</Alert>}

        <SubmitButton label={mode === "login" ? "Sign in" : "Create account"} />
      </form>

      <p className="mt-6 text-center text-sm text-espresso/60">
        {mode === "login" ? (
          <>
            New to SC Pronto?{" "}
            <Link href="/register" className="font-semibold text-orange-light">
              Register
            </Link>
          </>
        ) : (
          <>
            Already have an account?{" "}
            <Link href="/login" className="font-semibold text-orange-light">
              Sign in
            </Link>
          </>
        )}
      </p>
    </div>
  );
}
