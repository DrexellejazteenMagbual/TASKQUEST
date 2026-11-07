import { createClient } from '@supabase/supabase-js'

const url = import.meta.env.VITE_SUPABASE_URL
const key = import.meta.env.VITE_SUPABASE_ANON_KEY

export const isConfigured = Boolean(url && key && !url.includes('YOUR-PROJECT'))

export const supabase = isConfigured
  ? createClient(url, key, { auth: { persistSession: true, autoRefreshToken: true } })
  : null

// Supabase Auth needs an email behind every account and rejects made-up domains,
// so each username gets a hidden "+alias" of a real mailbox (never shown to users):
//   drex  ->  yourname+drex@gmail.com
// No emails are sent as long as "Confirm email" is OFF in Supabase.
export function usernameToEmail(username, base = import.meta.env.VITE_AUTH_EMAIL_BASE) {
  if (!base || !base.includes('@')) throw new Error('VITE_AUTH_EMAIL_BASE is missing in .env')
  const [local, domain] = base.trim().toLowerCase().split('@')
  return `${local}+${username.trim().toLowerCase()}@${domain}`
}
