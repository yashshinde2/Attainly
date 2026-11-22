'use client'

import { useActionState, useState } from 'react'
import { changePasswordAction, type ChangePasswordState } from '@/app/actions/auth'
import { ShieldCheck, Eye, EyeOff } from 'lucide-react'

const initialState: ChangePasswordState = { status: 'idle', message: '' }

export function ChangePasswordForm() {
  const [state, action, pending] = useActionState(changePasswordAction, initialState)
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)

  // Password strength calculation
  const hasLength = newPassword.length >= 8
  const hasMixedCase = /[a-z]/.test(newPassword) && /[A-Z]/.test(newPassword)
  const hasNumberOrSymbol = /[0-9]/.test(newPassword) || /[^A-Za-z0-9]/.test(newPassword)

  const strengthScore = [hasLength, hasMixedCase, hasNumberOrSymbol].filter(Boolean).length
  const strengthLabel = strengthScore === 0 ? '' : strengthScore === 1 ? 'Weak' : strengthScore === 2 ? 'Fair' : 'Strong'
  const strengthColor =
    strengthScore === 1 ? 'bg-amber-500' : strengthScore === 2 ? 'bg-blue-500' : strengthScore === 3 ? 'bg-emerald-500' : 'bg-muted'

  const passwordsMatch = confirmPassword.length > 0 && newPassword === confirmPassword
  const passwordsMismatch = confirmPassword.length > 0 && newPassword !== confirmPassword

  return (
    <form action={action} className="mt-6 flex flex-col gap-4">
      {state.status === 'error' && (
        <div role="alert" className="rounded-xl border border-destructive/30 bg-destructive/10 p-3 text-sm text-destructive">
          {state.message}
        </div>
      )}

      <div>
        <label htmlFor="newPassword" className="text-sm font-medium text-foreground">
          New password
        </label>
        <div className="relative mt-2">
          <input
            id="newPassword"
            name="newPassword"
            type={showPassword ? 'text' : 'password'}
            required
            autoComplete="new-password"
            value={newPassword}
            onChange={(e) => setNewPassword(e.target.value)}
            className="w-full rounded-xl border border-input bg-background px-3.5 py-2.5 pr-10 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring"
            placeholder="At least 8 characters"
          />
          <button
            type="button"
            onClick={() => setShowPassword(!showPassword)}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
            tabIndex={-1}
            aria-label={showPassword ? 'Hide password' : 'Show password'}
          >
            {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
          </button>
        </div>

        {/* Strength indicators */}
        {newPassword.length > 0 && (
          <div className="mt-2.5 space-y-1.5">
            <div className="flex items-center justify-between text-xs">
              <span className="text-muted-foreground">Strength:</span>
              <span className="font-semibold text-foreground">{strengthLabel}</span>
            </div>
            <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
              <div
                className={`h-full transition-all duration-300 ${strengthColor}`}
                style={{ width: `${(strengthScore / 3) * 100}%` }}
              />
            </div>
            <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
              <li className={hasLength ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}>
                • Minimum 8 characters
              </li>
              <li className={hasMixedCase ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}>
                • Upper and lowercase letters
              </li>
              <li className={hasNumberOrSymbol ? 'text-emerald-600 dark:text-emerald-400 font-medium' : ''}>
                • Numbers or symbols (!@#$%^&*)
              </li>
            </ul>
          </div>
        )}
      </div>

      <div>
        <label htmlFor="confirmPassword" className="text-sm font-medium text-foreground">
          Confirm new password
        </label>
        <input
          id="confirmPassword"
          name="confirmPassword"
          type="password"
          required
          autoComplete="new-password"
          value={confirmPassword}
          onChange={(e) => setConfirmPassword(e.target.value)}
          className={`mt-2 w-full rounded-xl border bg-background px-3.5 py-2.5 text-sm text-foreground outline-none transition placeholder:text-muted-foreground focus-visible:ring-2 ${
            passwordsMismatch
              ? 'border-destructive focus-visible:ring-destructive'
              : 'border-input focus-visible:ring-ring'
          }`}
          placeholder="Re-enter your new password"
        />
        {passwordsMismatch && (
          <p className="mt-1.5 text-xs text-destructive">Passwords do not match.</p>
        )}
        {passwordsMatch && (
          <p className="mt-1.5 flex items-center gap-1 text-xs text-emerald-600 dark:text-emerald-400">
            <ShieldCheck size={13} /> Passwords match
          </p>
        )}
      </div>

      <button
        type="submit"
        disabled={pending || !hasLength || passwordsMismatch || !confirmPassword}
        className="mt-2 flex w-full items-center justify-center rounded-xl bg-primary px-4 py-2.5 text-sm font-semibold text-primary-foreground shadow-sm transition hover:opacity-90 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {pending ? 'Updating password…' : 'Update password & continue'}
      </button>
    </form>
  )
}
