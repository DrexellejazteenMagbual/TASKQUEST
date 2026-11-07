// Creates (or resets) the built-in admin account:  username "Admin" / password "Admin101"
// Usage:  npm run create-admin
// Needs VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and VITE_AUTH_EMAIL_BASE in .env
import { createClient } from '@supabase/supabase-js'

const url = process.env.VITE_SUPABASE_URL
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY
const base = process.env.VITE_AUTH_EMAIL_BASE
if (!url || url.includes('YOUR-PROJECT') || !serviceKey || !base?.includes('@')) {
  console.error('Fill in VITE_SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY and VITE_AUTH_EMAIL_BASE in .env first.')
  process.exit(1)
}

const USERNAME = 'Admin'
const PASSWORD = 'Admin101'
// same mapping as usernameToEmail() in src/lib/supabase.js
const [local, domain] = base.trim().toLowerCase().split('@')
const EMAIL = `${local}+${USERNAME.toLowerCase()}@${domain}`

const sb = createClient(url, serviceKey, { auth: { persistSession: false } })

// Is there already an Admin (e.g. from an earlier run with another email)?
const { data: existingProfile, error: lookupErr } = await sb
  .from('profiles').select('id').ilike('username', USERNAME).maybeSingle()
if (lookupErr) {
  console.error('Could not read profiles – did you run supabase/schema.sql?\n', lookupErr.message)
  process.exit(1)
}

let userId
if (existingProfile) {
  userId = existingProfile.id
  const { error } = await sb.auth.admin.updateUserById(userId, { email: EMAIL, password: PASSWORD, email_confirm: true })
  if (error) throw error
  console.log('Admin already existed – email and password reset.')
} else {
  const { data, error } = await sb.auth.admin.createUser({
    email: EMAIL,
    password: PASSWORD,
    email_confirm: true,
    user_metadata: { username: USERNAME },
  })
  if (error) throw error
  userId = data.user.id
  console.log('Admin user created.')
}

const { error: profErr } = await sb
  .from('profiles')
  .upsert({ id: userId, username: USERNAME, display_name: 'Guild Master', role: 'admin', email: EMAIL })
if (profErr) throw profErr

console.log(`Done. Log in with  ${USERNAME} / ${PASSWORD}`)
