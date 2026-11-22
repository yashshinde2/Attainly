'use client'

import { Moon, Sun } from 'lucide-react'
import { useTheme } from 'next-themes'
import { useEffect, useState } from 'react'

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme()
  const [mounted, setMounted] = useState(false)

  useEffect(() => setMounted(true), [])

  if (!mounted) return <span className="size-9" aria-hidden="true" />

  const dark = resolvedTheme === 'dark'
  return <button type="button" onClick={() => setTheme(dark ? 'light' : 'dark')} className="flex size-9 items-center justify-center rounded-full border border-border bg-card text-muted-foreground transition hover:bg-muted hover:text-foreground" aria-label={`Switch to ${dark ? 'light' : 'dark'} mode`} title={`Switch to ${dark ? 'light' : 'dark'} mode`}>{dark ? <Sun aria-hidden="true" size={16} /> : <Moon aria-hidden="true" size={16} />}</button>
}
