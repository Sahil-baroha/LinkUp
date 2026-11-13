"use client";

/**
 * register/page.tsx — Authentication: Register
 *
 * Requirements:
 *   - Client Zod rules mirror backend registerSchema
 *   - Server field errors through mapServerErrors
 *   - Other errors as a toast
 *   - Submit disabled while loading
 *   - Show/hide password toggle
 *   - Keep redirects and ?from= support
 *   - Design tokens and shared components, no uppercase
 */

import { useState, useEffect, Suspense } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import Link from "next/link";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { Eye, EyeOff } from "lucide-react";
import { toast } from "sonner";

import { register as apiRegister, login } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { mapServerErrors } from "@/lib/errors";
import { Spinner } from "@/components/shared/spinner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ─── Schema matching Backend registerSchema ──────────────────────────────────

const registerSchema = z.object({
  name: z.string().min(1, "Name is required"),
  username: z
    .string()
    .min(3, "Username must be at least 3 characters")
    .regex(
      /^[a-zA-Z0-9_]+$/,
      "Username can only contain letters, numbers, and underscores"
    ),
  email: z.string().email("Invalid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type RegisterValues = z.infer<typeof registerSchema>;

function RegisterForm() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const from = searchParams.get("from");
  const destination = from && from.startsWith("/") ? from : "/feed";

  const setUser = useAuthStore((s) => s.setUser);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);

  // Clear stale local auth state on mount
  useEffect(() => {
    if (hasHydrated) {
      clearAuth();
    }
  }, [hasHydrated, clearAuth]);

  const {
    register,
    handleSubmit,
    setError,
    formState: { errors },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
  });

  async function onSubmit(values: RegisterValues) {
    setIsLoading(true);
    try {
      // 1. Register user
      await apiRegister({
        name: values.name.trim(),
        username: values.username.trim(),
        email: values.email.trim(),
        password: values.password,
      });

      // 2. Auto-login on success
      const user = await login({
        email: values.email.trim(),
        password: values.password,
      });
      setUser(user);
      toast.success("Account created successfully!");
      router.push(destination);
    } catch (error: unknown) {
      const axiosError = error as {
        response?: {
          status?: number;
          data?: {
            message?: string;
            errors?: { field: string; message: string }[];
          };
        };
      };

      const status = axiosError.response?.status;
      const data = axiosError.response?.data;

      if (status === 409) {
        const msg = data?.message?.toLowerCase() ?? "";
        if (msg.includes("email")) {
          setError("email", { message: "This email is already registered." });
        } else if (msg.includes("username")) {
          setError("username", {
            message: "This username is already taken.",
          });
        } else {
          toast.error(
            data?.message || "An account with this email or username already exists."
          );
        }
        return;
      }

      const serverErrors = data?.errors;
      if (serverErrors && Array.isArray(serverErrors)) {
        const unmatched = mapServerErrors(serverErrors, setError, [
          "name",
          "username",
          "email",
          "password",
        ]);
        if (unmatched.length > 0) {
          toast.error(unmatched.join(". "));
        }
      } else {
        const msg =
          data?.message || "Registration failed. Please check your information.";
        toast.error(msg);
      }
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* Left brand panel */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 text-white relative overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 20% 40%, rgba(79,70,229,0.18) 0%, transparent 70%), #0f172a",
        }}
      >
        <div className="flex items-center gap-3">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl bg-brand text-white font-bold shadow-md shadow-brand/30">
            L
          </div>
          <span className="text-xl font-bold tracking-tight">LinkUp</span>
        </div>

        <div className="max-w-md space-y-4">
          <p className="text-xs font-semibold text-brand tracking-wide">
            Professional network
          </p>
          <h1 className="text-4xl font-bold leading-tight tracking-tight">
            Build your network.
          </h1>
          <p className="text-base text-slate-300 leading-relaxed">
            Connect with peers, share thoughtful perspectives, and discover
            exciting opportunities on LinkUp.
          </p>
        </div>

        <p className="text-xs text-slate-400">
          © {new Date().getFullYear()} LinkUp, Inc. All rights reserved.
        </p>
      </div>

      {/* Right form panel */}
      <div className="flex flex-1 items-center justify-center bg-white px-6 py-12 lg:px-16">
        <div className="w-full max-w-sm space-y-8">
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-brand text-white text-sm font-bold shadow-sm">
              L
            </div>
            <span className="text-base font-semibold tracking-tight text-slate-900">
              LinkUp
            </span>
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Create an account
            </h2>
            <p className="text-sm text-slate-500">
              Join LinkUp and start connecting today.
            </p>
          </div>

          {/* Form */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="space-y-4"
          >
            {/* Full Name */}
            <div className="space-y-1.5">
              <Label
                htmlFor="name"
                className="text-xs font-medium text-slate-700"
              >
                Full name
              </Label>
              <Input
                id="name"
                placeholder="Jane Smith"
                autoComplete="name"
                autoFocus
                disabled={isLoading}
                aria-invalid={!!errors.name}
                {...register("name")}
                className="h-10 px-3 text-sm"
              />
              {errors.name && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.name.message}
                </p>
              )}
            </div>

            {/* Username */}
            <div className="space-y-1.5">
              <Label
                htmlFor="username"
                className="text-xs font-medium text-slate-700"
              >
                Username
              </Label>
              <Input
                id="username"
                placeholder="janesmith_99"
                autoComplete="username"
                disabled={isLoading}
                aria-invalid={!!errors.username}
                {...register("username")}
                className="h-10 px-3 text-sm"
              />
              {errors.username ? (
                <p className="text-xs text-red-500 mt-1">
                  {errors.username.message}
                </p>
              ) : (
                <p className="text-xs text-slate-400 mt-1">
                  Letters, numbers, and underscores only
                </p>
              )}
            </div>

            {/* Email */}
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-xs font-medium text-slate-700"
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                autoComplete="email"
                disabled={isLoading}
                aria-invalid={!!errors.email}
                {...register("email")}
                className="h-10 px-3 text-sm"
              />
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">
                  {errors.email.message}
                </p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-xs font-medium text-slate-700"
              >
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="new-password"
                  disabled={isLoading}
                  aria-invalid={!!errors.password}
                  {...register("password")}
                  className="h-10 px-3 pr-10 text-sm"
                />
                <button
                  type="button"
                  tabIndex={-1}
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? "Hide password" : "Show password"}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors focus:outline-none cursor-pointer"
                >
                  {showPassword ? (
                    <EyeOff size={16} strokeWidth={1.5} />
                  ) : (
                    <Eye size={16} strokeWidth={1.5} />
                  )}
                </button>
              </div>
              {errors.password ? (
                <p className="text-xs text-red-500 mt-1">
                  {errors.password.message}
                </p>
              ) : (
                <p className="text-xs text-slate-400 mt-1">
                  Minimum 6 characters
                </p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full cursor-pointer items-center justify-center gap-2 rounded-lg bg-slate-900 py-2.5 text-sm font-semibold text-white transition-colors hover:bg-slate-800 disabled:cursor-not-allowed disabled:opacity-50 mt-2"
            >
              {isLoading && <Spinner size="sm" />}
              <span>Create account</span>
            </button>
          </form>

          {/* Navigation to login */}
          <p className="text-center text-sm text-slate-500">
            Already have an account?{" "}
            <Link
              href="/login"
              className="font-medium text-brand underline-offset-2 hover:underline transition-colors"
            >
              Sign in
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}

export default function RegisterPage() {
  return (
    <Suspense
      fallback={
        <div className="flex min-h-screen items-center justify-center">
          <Spinner size="lg" />
        </div>
      }
    >
      <RegisterForm />
    </Suspense>
  );
}
