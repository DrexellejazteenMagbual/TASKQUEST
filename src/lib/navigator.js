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
  nova: {
    key: 'nova',
    name: 'NOVA',
    role: 'Stellar Navigator',
    full: '/characters/nova.png',
    portrait: '/characters/nova.png',
    lines: {
      login: 'Signal received. NOVA is ready to guide your next mission.',
      register: 'New operator detected. Choose your callsign and let us begin.',
      greet: (name) => `Welcome back, ${name}. A new route is waiting.`,
      empty: 'No active quests detected. Let us chart your next objective.',
      overdue: (n) => `${n} quest${n > 1 ? 's are' : ' is'} overdue. Recalculate and move.`,
      allDone: 'All objectives complete. Excellent navigation, operator.',
      consent: 'Before we begin, choose what information you share with the admin.',
      levelUp: 'New level reached. Your signal is getting stronger!',
    },
  },
  lyra: {
    key: 'lyra',
    name: 'LYRA',
    role: 'Mission Navigator',
    full: '/characters/lyra.png',
    portrait: '/characters/lyra.png',
    lines: {
      login: 'Mission channel open. Ready when you are, operator.',
      register: 'Welcome, recruit. Set your callsign and let us make progress.',
      greet: (name) => `${name}, your mission board is online.`,
      empty: 'No missions queued. Add one and let us make it happen.',
      overdue: (n) => `Alert: ${n} quest${n > 1 ? 's need' : ' needs'} your attention.`,
      allDone: 'Mission board clear. Outstanding work.',
      consent: 'Your privacy is your command. Choose your sharing settings.',
      levelUp: 'Upgrade confirmed. Keep the momentum going!',
    },
  },
  orion: {
    key: 'orion',
    name: 'ORION',
    role: 'Recon Navigator',
    full: '/characters/orion.png',
    portrait: '/characters/orion.png',
    lines: {
      login: 'Recon systems online. Identify yourself, operator.',
      register: 'New signal acquired. Register your callsign to deploy.',
      greet: (name) => `${name}, recon is complete. Your quests await.`,
      empty: 'No active targets. Add a quest to begin the operation.',
      overdue: (n) => `Recon alert: ${n} quest${n > 1 ? 's remain' : ' remains'} unresolved.`,
      allDone: 'All targets cleared. Operation successful.',
      consent: 'Review your privacy controls before we deploy.',
      levelUp: 'Rank elevation detected. Operation continues!',
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
