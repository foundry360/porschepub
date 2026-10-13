import { Suspense } from "react";
import { brand } from "@/config/brand";
import { LoginForm } from "./login-form";

// Authenticated, request-time screen: opt out of instant-navigation validation.
export const instant = false;

export const metadata = { title: "Sign in" };

async function LoginBody({ searchParams }: { searchParams: Promise<{ next?: string | string[] }> }) {
  const { next } = await searchParams;
  return <LoginForm next={typeof next === "string" ? next : ""} />;
}

export default function LoginPage({ searchParams }: PageProps<"/admin/login">) {
  return (
    <main id="main" className="mx-auto flex min-h-dvh max-w-md flex-col justify-center px-6 py-16">
      <p className="eyebrow mb-3 text-accent">Editorial</p>
      <h1 className="font-display text-[2.4rem] leading-none">{brand.name}</h1>
      <p className="mb-8 mt-4 text-stone">Sign in with your editorial account.</p>
      <Suspense fallback={<div className="h-64" aria-hidden />}>
        <LoginBody searchParams={searchParams as Promise<{ next?: string | string[] }>} />
      </Suspense>
      <p className="mt-8 text-[0.82rem] text-stone">
        Accounts are created by an administrator. Public sign-up is not available.
      </p>
    </main>
  );
}
