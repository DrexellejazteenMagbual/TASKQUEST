import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase, usernameToEmail } from './supabase'
import { applyTheme } from './themes'

const AuthCtx = createContext(null)

export function AuthProvider({ children }) {
  const [session, setSession] = useState(null)
  const [profile, setProfile] = useState(null)
  const [loading, setLoading] = useState(true)
  // true right after a login / sign-up → the consent screen is shown
  const [askConsent, setAskConsent] = useState(false)

  const loadProfile = useCallback(async (userId) => {
    if (!userId) { setProfile(null); return }
    const { data } = await supabase.from('profiles').select('*').eq('id', userId).single()
    setProfile(data)
    if (data?.theme) applyTheme(data.theme)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(async ({ data }) => {
      setSession(data.session)
      await loadProfile(data.session?.user?.id)
      setLoading(false)
    })
    const { data: sub } = supabase.auth.onAuthStateChange((_e, s) => {
      setSession(s)
      // defer: calling supabase inside the auth callback can deadlock
      setTimeout(() => loadProfile(s?.user?.id), 0)
    })
    return () => sub.subscription.unsubscribe()
  }, [loadProfile])

  const signIn = async (username, password) => {
    const { error } = await supabase.auth.signInWithPassword({ email: usernameToEmail(username), password })
    if (error) {
      if (error.message.toLowerCase().includes('not confirmed')) throw new Error('This account is waiting for email confirmation. Turn off "Confirm email" in Supabase (see README).')
      if (error.message.toLowerCase().includes('disabled')) throw new Error('The Email provider is switched off in Supabase. Turn ON "Enable Email provider".')
      throw new Error(error.message === 'Invalid login credentials' ? 'Wrong username or password' : error.message)
    }
    setAskConsent(true)
  }

  const signUp = async (username, password) => {
    username = username.trim()
    if (!/^[a-zA-Z0-9_]{3,20}$/.test(username)) throw new Error('Username: 3–20 letters, numbers or _')
    const { data, error } = await supabase.auth.signUp({
      email: usernameToEmail(username),
      password,
      options: { data: { username } },
    })
    if (error) {
      const m = error.message.toLowerCase()
      if (m.includes('registered') || m.includes('database error')) throw new Error('That username is taken')
      if (m.includes('signups are disabled') || m.includes('logins are disabled')) throw new Error('The Email provider is switched off in Supabase. Turn ON "Enable Email provider" (keep "Confirm email" OFF).')
      if (m.includes('signups not allowed')) throw new Error('New sign-ups are switched off in Supabase. Turn ON "Allow new users to sign up".')
      if (m.includes('rate limit')) throw new Error('Sign-up is blocked because "Confirm email" is ON in Supabase. Turn it off (see README).')
      throw new Error(error.message)
    }
    if (!data.session) throw new Error('"Confirm email" is ON in Supabase. Turn it off (see README), then log in.')
    setAskConsent(true)
  }

  const signOut = async () => {
    await supabase.auth.signOut()
    setProfile(null)
    setAskConsent(false)
    applyTheme('sakura')
  }

  const updateProfile = async (patch) => {
    const { data, error } = await supabase.from('profiles').update(patch).eq('id', session.user.id).select().single()
    if (error) throw error
    setProfile(data)
    if (patch.theme) applyTheme(patch.theme)
    return data
  }

  const value = {
    session,
    user: session?.user ?? null,
    profile,
    loading,
    isAdmin: profile?.role === 'admin',
    signIn, signUp, signOut, updateProfile,
    askConsent, doneConsent: () => setAskConsent(false),
    refreshProfile: () => loadProfile(session?.user?.id),
  }
  return <AuthCtx.Provider value={value}>{children}</AuthCtx.Provider>
}

export const useAuth = () => useContext(AuthCtx)
