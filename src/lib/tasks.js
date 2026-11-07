import { supabase } from './supabase'
import { PRIORITIES } from './game'

export async function fetchTasks(userId) {
  const { data, error } = await supabase
    .from('tasks').select('*').eq('user_id', userId)
    .order('created_at', { ascending: false })
  if (error) throw error
  return data
}

export async function createTask(userId, t) {
  const { data, error } = await supabase
    .from('tasks')
    .insert({ ...t, user_id: userId, xp_reward: PRIORITIES[t.priority]?.xp ?? 20 })
    .select().single()
  if (error) throw error
  return data
}

export async function updateTask(id, patch) {
  const { data, error } = await supabase.from('tasks').update(patch).eq('id', id).select().single()
  if (error) throw error
  return data
}

export async function deleteTask(id) {
  const { error } = await supabase.from('tasks').delete().eq('id', id)
  if (error) throw error
}

// Toggle completion and award / revoke XP. Returns { task, xpDelta }
export async function toggleTask(task, profile, updateProfile) {
  const done = task.status !== 'done'
  const updated = await updateTask(task.id, {
    status: done ? 'done' : 'todo',
    completed_at: done ? new Date().toISOString() : null,
  })
  const xpDelta = done ? task.xp_reward : -task.xp_reward
  await updateProfile({ xp: Math.max(0, (profile.xp || 0) + xpDelta) })
  return { task: updated, xpDelta }
}
