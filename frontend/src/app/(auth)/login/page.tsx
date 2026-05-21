"use client";

/**
 * login/page.tsx — Authentication: Login
 *
 * Stitch layout: Two-panel split
 *   Left (lg+): Deep navy brand panel with radial depth — "Connect with clarity."
 *   Right: White form panel — "Welcome back"
 *
 * Refinements applied:
 *   - aria-invalid approach for field error styling (uses Input's built-in styles)
 *   - h-10 input override (h-8 default is too small for auth)
 *   - Password show/hide toggle (Eye/EyeOff)
 *   - Button: cursor-pointer, hover:bg-slate-700, active:scale-[0.98], transition-all
 *   - Left panel: subtle radial gradient for depth (preserving dark navy identity)
 *   - Error banner: AnimatePresence smooth fade-in
 *   - noValidate on form to prevent browser native validation conflicts
 *   - autoFocus on email field
 *   - Removed dead justify-between wrapper (no forgot password implemented)
 */

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { motion, AnimatePresence } from "framer-motion";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import * as z from "zod";
import { AlertCircle, Eye, EyeOff } from "lucide-react";

import { login } from "@/lib/api";
import { useAuthStore } from "@/store/auth-store";
import { Spinner } from "@/components/shared/spinner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

// ─── Schema ───────────────────────────────────────────────────────────────────

const loginSchema = z.object({
  email: z.string().email("Enter a valid email address"),
  password: z.string().min(6, "Password must be at least 6 characters"),
});

type LoginValues = z.infer<typeof loginSchema>;

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function LoginPage() {
  const router = useRouter();
  const setUser = useAuthStore((s) => s.setUser);
  const isAuthenticated = useAuthStore((s) => s._hasHydrated && !!s.user);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  const [isLoading, setIsLoading] = useState(false);
  const [serverError, setServerError] = useState<string | null>(null);
  const [showPassword, setShowPassword] = useState(false);

  // Client-side guard — redirect immediately if already authenticated
  useEffect(() => {
    if (hasHydrated && isAuthenticated) {
      router.replace("/feed");
    }
  }, [hasHydrated, isAuthenticated, router]);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginValues>({
    resolver: zodResolver(loginSchema),
  });

  async function onSubmit(values: LoginValues) {
    setIsLoading(true);
    setServerError(null);
    try {
      const user = await login({ email: values.email, password: values.password });
      setUser(user);
      router.push("/feed");
    } catch (error: unknown) {
      const axiosError = error as { response?: { data?: { message?: string }; status?: number } };
      const msg = axiosError.response?.data?.message;
      setServerError(msg || "Invalid email or password. Please try again.");
    } finally {
      setIsLoading(false);
    }
  }

  return (
    <div className="flex min-h-screen">
      {/* ── Left brand panel ───────────────────────────────────── */}
      <div
        className="hidden lg:flex lg:w-1/2 flex-col justify-between p-12 text-white relative overflow-hidden"
        style={{
          background:
            "radial-gradient(ellipse 80% 60% at 20% 40%, rgba(79,70,229,0.18) 0%, transparent 60%), #0f172a",
        }}
      >
        {/* Subtle grid texture overlay */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 opacity-[0.03]"
          style={{
            backgroundImage:
              "linear-gradient(rgba(255,255,255,0.5) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.5) 1px, transparent 1px)",
            backgroundSize: "40px 40px",
          }}
        />

        {/* Logo */}
        <div className="relative flex items-center gap-2.5">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4f46e5] text-white text-sm font-bold shadow-lg shadow-indigo-500/30">
            L
          </div>
          <span className="text-lg font-semibold tracking-tight">LinkUp</span>
        </div>

        {/* Headline */}
        <div className="relative space-y-4">
          <h1 className="text-[2.75rem] font-semibold leading-tight tracking-tight">
            Connect with<br />clarity.
          </h1>
          <p className="max-w-xs text-base leading-relaxed text-slate-400">
            Join the premier network for professionals who value signal over
            noise. A white-glove digital environment designed for focused
            collaboration.
          </p>
        </div>

        {/* Footer */}
        <p className="relative text-xs text-slate-500">
          © 2024 LinkUp Professional. Elevated networking.
        </p>
      </div>

      {/* ── Right form panel ───────────────────────────────────── */}
      <div className="flex flex-1 items-center justify-center bg-white px-6 py-12">
        <motion.div
          initial={{ opacity: 0, x: 24 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ duration: 0.4, ease: "easeOut" }}
          className="w-full max-w-[400px] space-y-8"
        >
          {/* Mobile logo */}
          <div className="flex items-center gap-2.5 lg:hidden">
            <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-[#4f46e5] text-white text-sm font-bold shadow-sm shadow-indigo-500/20">
              L
            </div>
            <span className="text-base font-semibold tracking-tight text-[#0f172a]">
              LinkUp
            </span>
          </div>

          {/* Heading */}
          <div className="space-y-1.5">
            <h2 className="text-2xl font-semibold tracking-tight text-slate-900">
              Welcome back
            </h2>
            <p className="text-sm text-slate-500">
              Sign in to your LinkUp account to continue.
            </p>
          </div>

          {/* Server error banner */}
          <AnimatePresence mode="wait">
            {serverError && (
              <motion.div
                key="error"
                initial={{ opacity: 0, y: -8 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -8 }}
                transition={{ duration: 0.2 }}
                role="alert"
                aria-live="polite"
                className="flex items-start gap-2.5 rounded-lg border border-red-200 bg-red-50 px-4 py-3"
              >
                <AlertCircle size={16} className="mt-0.5 shrink-0 text-red-500" />
                <p className="text-sm text-red-700">{serverError}</p>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Form */}
          <form
            onSubmit={handleSubmit(onSubmit)}
            noValidate
            className="space-y-5"
          >
            {/* Email */}
            <div className="space-y-1.5">
              <Label
                htmlFor="email"
                className="text-xs font-semibold text-slate-500 uppercase tracking-widest"
              >
                Email
              </Label>
              <Input
                id="email"
                type="email"
                placeholder="name@example.com"
                autoComplete="email"
                autoFocus
                disabled={isLoading}
                aria-invalid={!!errors.email}
                {...register("email")}
                className="h-10 px-3 text-sm"
              />
              {errors.email && (
                <p className="text-xs text-red-500 mt-1">{errors.email.message}</p>
              )}
            </div>

            {/* Password */}
            <div className="space-y-1.5">
              <Label
                htmlFor="password"
                className="text-xs font-semibold text-slate-500 uppercase tracking-widest"
              >
                Password
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  autoComplete="current-password"
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
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-700 transition-colors focus:outline-none"
                >
                  {showPassword ? (
                    <EyeOff size={15} strokeWidth={1.5} />
                  ) : (
                    <Eye size={15} strokeWidth={1.5} />
                  )}
                </button>
              </div>
              {errors.password && (
                <p className="text-xs text-red-500 mt-1">{errors.password.message}</p>
              )}
            </div>

            {/* Submit */}
            <button
              type="submit"
              disabled={isLoading}
              className="flex w-full cursor-pointer items-center justify-center gap-2.5 rounded-lg bg-[#0f172a] py-3 text-sm font-semibold text-white transition-all duration-200 hover:bg-slate-700 active:scale-[0.98] active:opacity-90 disabled:cursor-not-allowed disabled:opacity-50"
            >
              {isLoading && <Spinner size="sm" />}
              Sign In
            </button>
          </form>

          {/* Navigation to register */}
          <p className="text-center text-sm text-slate-500">
            Don&apos;t have an account?{" "}
            <Link
              href="/register"
              className="font-semibold text-[#4f46e5] underline-offset-2 hover:underline transition-colors"
            >
              Create one
            </Link>
          </p>
        </motion.div>
      </div>
    </div>
  );
}
