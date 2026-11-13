"use client";

/**
 * settings/page.tsx — User Settings Page
 *
 * Requirements:
 *   Card sections:
 *     1. Account: name, username, email as read-only text plus a link to /profile/edit
 *     2. Session: Log out, reusing the existing logout
 *     3. Danger zone (Deactivate account):
 *        - Dialog explaining consequences
 *        - Enables confirmation button only after user types their username
 *        - On confirm: call deactivateAccount, logout best-effort, clear auth store,
 *          clear query cache, redirect to /login with toast.
 *   - Design tokens, no uppercase classes
 */

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useQueryClient } from "@tanstack/react-query";
import { User, ShieldAlert, LogOut, ExternalLink, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

import { useAuthStore } from "@/store/auth-store";
import { logout, deactivateAccount } from "@/lib/api";
import { Spinner } from "@/components/shared/spinner";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from "@/components/ui/dialog";

export default function SettingsPage() {
  const router = useRouter();
  const queryClient = useQueryClient();

  const user = useAuthStore((s) => s.user);
  const clearAuth = useAuthStore((s) => s.clearAuth);
  const hasHydrated = useAuthStore((s) => s._hasHydrated);

  const [isLoggingOut, setIsLoggingOut] = useState(false);
  const [isDeactivating, setIsDeactivating] = useState(false);
  const [deactivateDialogOpen, setDeactivateDialogOpen] = useState(false);
  const [typedUsername, setTypedUsername] = useState("");

  if (!hasHydrated || !user) {
    return null;
  }

  async function handleLogout() {
    setIsLoggingOut(true);
    try {
      await logout();
    } catch {
      // Best-effort logout
    } finally {
      clearAuth();
      queryClient.clear();
      toast.success("Signed out successfully");
      router.replace("/login");
    }
  }

  async function handleDeactivate() {
    if (typedUsername !== user?.username) return;

    setIsDeactivating(true);
    try {
      // 1. Soft-delete user on backend
      await deactivateAccount(user._id);

      // 2. Clear server session cookie best-effort
      try {
        await logout();
      } catch {
        // Best-effort
      }

      // 3. Clear auth store and react-query caches
      clearAuth();
      queryClient.clear();

      toast.success("Your account has been deactivated");
      router.replace("/login");
    } catch (err: unknown) {
      const message =
        err instanceof Error ? err.message : "Failed to deactivate account";
      toast.error(message);
      setIsDeactivating(false);
    }
  }

  return (
    <div className="space-y-6">
      {/* Page Title */}
      <div>
        <h1 className="text-2xl font-bold tracking-tight text-slate-900">
          Settings
        </h1>
        <p className="text-sm text-slate-500 mt-1">
          Manage your account preferences and session.
        </p>
      </div>

      {/* ─── 1. Account Section ────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <User className="h-5 w-5 text-slate-600" />
          <h2 className="text-base font-semibold text-slate-900">Account</h2>
        </div>

        <div className="mt-5 space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div>
              <p className="text-xs font-medium text-slate-500">Full name</p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {user.name}
              </p>
            </div>

            <div>
              <p className="text-xs font-medium text-slate-500">Username</p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                @{user.username}
              </p>
            </div>

            <div className="sm:col-span-2">
              <p className="text-xs font-medium text-slate-500">Email address</p>
              <p className="mt-1 text-sm font-medium text-slate-900">
                {user.email || "—"}
              </p>
            </div>
          </div>

          <div className="pt-2">
            <Link
              href="/profile/edit"
              className="inline-flex items-center gap-1.5 text-sm font-medium text-brand hover:underline"
            >
              <span>Edit profile details</span>
              <ExternalLink size={14} />
            </Link>
          </div>
        </div>
      </div>

      {/* ─── 2. Session Section ────────────────────────────────────────────── */}
      <div className="rounded-xl border border-slate-200/80 bg-white p-6 shadow-xs">
        <div className="flex items-center gap-2.5 pb-4 border-b border-slate-100">
          <LogOut className="h-5 w-5 text-slate-600" />
          <h2 className="text-base font-semibold text-slate-900">Session</h2>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-medium text-slate-900">Log out</p>
            <p className="text-xs text-slate-500 mt-0.5">
              Sign out from your current browser session.
            </p>
          </div>

          <button
            type="button"
            onClick={handleLogout}
            disabled={isLoggingOut}
            className="inline-flex items-center justify-center gap-2 rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50 hover:text-slate-900 disabled:opacity-50 transition-colors cursor-pointer"
          >
            {isLoggingOut && <Spinner size="sm" />}
            <span>Log out</span>
          </button>
        </div>
      </div>

      {/* ─── 3. Danger Zone Section ────────────────────────────────────────── */}
      <div className="rounded-xl border border-red-200 bg-red-50/30 p-6 shadow-xs">
        <div className="flex items-center gap-2.5 pb-4 border-b border-red-100">
          <ShieldAlert className="h-5 w-5 text-red-600" />
          <h2 className="text-base font-semibold text-red-900">Danger zone</h2>
        </div>

        <div className="mt-4 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <p className="text-sm font-semibold text-slate-900">
              Deactivate account
            </p>
            <p className="text-xs text-slate-600 mt-0.5 max-w-md">
              Soft-deactivates your account. Your posts and profile will be
              hidden. You will be immediately logged out.
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setTypedUsername("");
              setDeactivateDialogOpen(true);
            }}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors cursor-pointer shrink-0"
          >
            <span>Deactivate account</span>
          </button>
        </div>
      </div>

      {/* ─── Deactivate Confirmation Dialog ─────────────────────────────────── */}
      <Dialog
        open={deactivateDialogOpen}
        onOpenChange={(open) => {
          if (!isDeactivating) {
            setDeactivateDialogOpen(open);
            if (!open) setTypedUsername("");
          }
        }}
      >
        <DialogContent showCloseButton={!isDeactivating}>
          <DialogHeader>
            <div className="flex items-center gap-2 text-red-600 mb-1">
              <AlertTriangle className="h-5 w-5" />
              <DialogTitle>Deactivate your account?</DialogTitle>
            </div>
            <DialogDescription>
              This action will deactivate your profile and all associated data.
              Your existing cookies and sessions will be invalidated. To confirm,
              please type your username{" "}
              <strong className="text-slate-900">{user.username}</strong> below:
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-2 py-2">
            <Label htmlFor="confirm-username" className="text-xs font-medium text-slate-700">
              Confirm your username
            </Label>
            <Input
              id="confirm-username"
              value={typedUsername}
              onChange={(e) => setTypedUsername(e.target.value)}
              placeholder={user.username}
              disabled={isDeactivating}
              autoComplete="off"
              className="text-sm"
            />
          </div>

          <DialogFooter>
            <DialogClose
              render={
                <button
                  type="button"
                  disabled={isDeactivating}
                  className="rounded-lg border border-slate-200 px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 transition-colors"
                />
              }
            >
              Cancel
            </DialogClose>
            <button
              type="button"
              onClick={handleDeactivate}
              disabled={isDeactivating || typedUsername !== user.username}
              className="flex items-center gap-1.5 rounded-lg bg-red-600 px-4 py-2 text-sm font-medium text-white hover:bg-red-700 transition-colors disabled:cursor-not-allowed disabled:opacity-50 cursor-pointer"
            >
              {isDeactivating && <Spinner size="sm" />}
              <span>Confirm deactivation</span>
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
