import { AlarmClock, Camera, Flame, Gem, Map, Palette, PartyPopper, Skull, Sprout, Star, Sword, Swords, Trophy } from 'lucide-react'

// ---------- quest difficulty & XP ----------
export const PRIORITIES = {
  easy:   { label: 'Easy',   xp: 10, color: '#22a861', icon: Sprout },
  normal: { label: 'Normal', xp: 20, color: '#1f7ff0', icon: Swords },
  hard:   { label: 'Hard',   xp: 40, color: '#ff8a00', icon: Flame },
  boss:   { label: 'Boss',   xp: 80, color: '#e5306b', icon: Skull },
}

// XP needed for the next level starts at 100 and grows by 50 per level
export function levelInfo(xp = 0) {
  let level = 1
  let need = 100
  let rest = xp
  while (rest >= need) { rest -= need; level++; need += 50 }
  return { level, current: rest, needed: need, pct: Math.round((rest / need) * 100), title: rankTitle(level) }
}

export function rankTitle(level) {
  if (level >= 20) return 'Mythic Legend'
  if (level >= 15) return 'Celestial Sage'
  if (level >= 10) return 'Dragon Knight'
  if (level >= 7) return 'Spirit Hero'
  if (level >= 4) return 'Rising Ranger'
  if (level >= 2) return 'Apprentice'
  return 'Novice Adventurer'
}

// ---------- streak ----------
export const dayKey = (d) => new Date(d).toLocaleDateString('en-CA')

export function streakDays(tasks) {
  const days = new Set(tasks.filter((t) => t.completed_at).map((t) => dayKey(t.completed_at)))
  let streak = 0
  const d = new Date()
  if (!days.has(dayKey(d))) d.setDate(d.getDate() - 1) // streak survives until today ends
  while (days.has(dayKey(d))) { streak++; d.setDate(d.getDate() - 1) }
  return streak
}

// ---------- achievements (computed from the user's data) ----------
export const ACHIEVEMENTS = [
  { code: 'first',   icon: PartyPopper, name: 'First Quest',    desc: 'Complete your first quest',         test: (s) => s.done >= 1 },
  { code: 'five',    icon: Sword, name: 'Quest Hunter',   desc: 'Complete 5 quests',                 test: (s) => s.done >= 5 },
  { code: 'tf',      icon: Trophy, name: 'Guild Champion', desc: 'Complete 25 quests',                test: (s) => s.done >= 25 },
  { code: 'boss',    icon: Skull, name: 'Boss Slayer',    desc: 'Defeat a Boss quest',               test: (s) => s.bossDone >= 1 },
  { code: 'mapper',  icon: Map, name: 'Cartographer',   desc: 'Pin 5 quests on the map',           test: (s) => s.pinned >= 5 },
  { code: 'early',   icon: AlarmClock, name: 'Early Bird',     desc: 'Finish 3 quests before they are due', test: (s) => s.early >= 3 },
  { code: 'streak3', icon: Flame, name: 'On Fire',        desc: '3-day completion streak',           test: (s) => s.streak >= 3 },
  { code: 'streak7', icon: Star, name: 'Unstoppable',    desc: '7-day completion streak',           test: (s) => s.streak >= 7 },
  { code: 'level5',  icon: Gem, name: 'Power Up',       desc: 'Reach level 5',                     test: (s) => s.level >= 5 },
  { code: 'avatar',  icon: Camera, name: 'New Look',       desc: 'Upload a profile picture',          test: (s) => s.hasAvatar },
  { code: 'stylist', icon: Palette, name: 'Style Shifter',  desc: 'Pick a theme other than Sakura',    test: (s) => s.theme !== 'sakura' },
]

export function computeStats(tasks, profile) {
  const done = tasks.filter((t) => t.status === 'done')
  return {
    total: tasks.length,
    done: done.length,
    open: tasks.length - done.length,
    bossDone: done.filter((t) => t.priority === 'boss').length,
    pinned: tasks.filter((t) => t.lat != null).length,
    early: done.filter((t) => t.due_at && t.completed_at && new Date(t.completed_at) <= new Date(t.due_at)).length,
    overdue: tasks.filter((t) => t.status !== 'done' && t.due_at && new Date(t.due_at) < new Date()).length,
    streak: streakDays(tasks),
    level: levelInfo(profile?.xp).level,
    hasAvatar: Boolean(profile?.avatar_url),
    theme: profile?.theme || 'sakura',
  }
}

export const withUnlocks = (stats) => ACHIEVEMENTS.map((a) => ({ ...a, unlocked: a.test(stats) }))
