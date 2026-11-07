import { supabase } from './supabase'
import { PRIORITIES } from './game'

export async function fetchTasks(userId) {
  const { data, error } = await supabase
    .from('tasks').select('*').or(`user_id.eq.${userId},is_public.eq.true`)
    .order('created_at', { ascending: false })
  if (error) throw error
  const publicIds = data.filter((task) => task.is_public).map((task) => task.id)
  if (!publicIds.length) return data
  const { data: completions, error: completionError } = await supabase
    .from('task_completions').select('task_id,completed_at')
    .eq('user_id', userId).in('task_id', publicIds)
  if (completionError) throw completionError
  const completed = new Map((completions || []).map((item) => [item.task_id, item.completed_at]))
  return data.map((task) => task.is_public
    ? { ...task, status: completed.has(task.id) ? 'done' : 'todo', completed_at: completed.get(task.id) || null }
    : task)
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
  let updated
  if (task.is_public) {
    const now = new Date().toISOString()
    const result = done
      ? await supabase.from('task_completions').upsert({ task_id: task.id, user_id: profile.id, completed_at: now }).select().single()
      : await supabase.from('task_completions').delete().eq('task_id', task.id).eq('user_id', profile.id)
    if (result.error) throw result.error
    updated = { ...task, status: done ? 'done' : 'todo', completed_at: done ? now : null }
  } else {
    updated = await updateTask(task.id, {
      status: done ? 'done' : 'todo',
      completed_at: done ? new Date().toISOString() : null,
    })
  }
  const xpDelta = done ? task.xp_reward : -task.xp_reward
  await updateProfile({ xp: Math.max(0, (profile.xp || 0) + xpDelta) })
  return { task: updated, xpDelta }
}
