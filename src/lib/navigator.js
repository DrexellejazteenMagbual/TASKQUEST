// "System navigator": the character who guides the user through the app.
// The choice is stored on this device (localStorage), so it also works on the
// login screen before anyone is signed in.
import { useSyncExternalStore } from 'react'

export const NAVIGATORS = {
  zera: {
    key: 'zera',
    name: 'ZERA',
    role: 'Tactical Navigator',
    full: '/characters/zera-full.webp',
    portrait: '/characters/zera-portrait.webp',
    lines: {
      login: 'Link established. Identify yourself, operator~',
      register: 'A new operator? Register your callsign and I will handle the rest.',
      greet: (name) => `Welcome back, ${name}. Your quest board is ready.`,
      empty: 'No active quests. Shall we plan a new mission?',
      overdue: (n) => `Warning: ${n} quest${n > 1 ? 's are' : ' is'} overdue. Let's clear ${n > 1 ? 'them' : 'it'}.`,
      allDone: 'All quests cleared. Impressive work, operator.',
      consent: 'Before we deploy, choose what you share with the admin. You stay in control.',
      levelUp: 'Power level rising!',
    },
  },
  kai: {
    key: 'kai',
    name: 'KAI',
    role: 'Combat Navigator',
    full: '/characters/kai-full.webp',
    portrait: '/characters/kai-portrait.webp',
    lines: {
      login: 'System online. State your callsign, operator.',
      register: 'New recruit? Pick a callsign. We move out right after.',
      greet: (name) => `${name}, you're back. Let's cut through today's quests.`,
      empty: 'Board is empty. Add a quest and let\'s get moving.',
      overdue: (n) => `${n} quest${n > 1 ? 's' : ''} past due. We strike now.`,
      allDone: 'Every quest down. Not bad, operator.',
      consent: 'Quick check before we roll: decide what the admin can see.',
      levelUp: 'Level up. Keep pushing!',
    },
  },
}

const KEY = 'tq:navigator'
const listeners = new Set()

function read() {
  try {
    const v = localStorage.getItem(KEY)
    if (v && NAVIGATORS[v]) return v
  } catch { /* storage blocked */ }
  return 'zera'
}

let current = read()

export function setNavigator(key) {
  if (!NAVIGATORS[key]) return
  current = key
  try { localStorage.setItem(KEY, key) } catch { /* ignore */ }
  listeners.forEach((fn) => fn())
}

export const getNavigator = () => NAVIGATORS[current]

export function useNavigator() {
  const key = useSyncExternalStore(
    (fn) => { listeners.add(fn); return () => listeners.delete(fn) },
    () => current,
  )
  return NAVIGATORS[key]
}
