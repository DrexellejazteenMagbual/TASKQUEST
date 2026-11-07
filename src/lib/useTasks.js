import { useCallback, useEffect, useState } from 'react'
import { ScrollText, Sparkles } from 'lucide-react'
import { useAuth } from './auth'
import { useToast } from '../components/Toast'
import { createTask, deleteTask, fetchTasks, toggleTask, updateTask } from './tasks'
import { levelInfo } from './game'

export function useTasks() {
  const { user, profile, updateProfile } = useAuth()
  const toast = useToast()
  const [tasks, setTasks] = useState([])
  const [loading, setLoading] = useState(true)

  const reload = useCallback(async () => {
    try { setTasks(await fetchTasks(user.id)) } catch (e) { toast.show(e.message) }
    setLoading(false)
  }, [user.id, toast])

  useEffect(() => { reload() }, [reload])

  const add = async (t) => {
    const created = await createTask(user.id, t)
    setTasks((ts) => [created, ...ts])
    toast.show('Quest accepted!', ScrollText)
    return created
  }

  const edit = async (id, patch) => {
    const updated = await updateTask(id, patch)
    setTasks((ts) => ts.map((t) => (t.id === id ? updated : t)))
  }

  const remove = async (task) => {
    await deleteTask(task.id)
    setTasks((ts) => ts.filter((t) => t.id !== task.id))
    // keep XP honest if a completed quest is deleted
    if (task.status === 'done') await updateProfile({ xp: Math.max(0, profile.xp - task.xp_reward) })
  }

  const toggle = async (task) => {
    const before = levelInfo(profile.xp).level
    try {
      const { task: updated, xpDelta } = await toggleTask(task, profile, updateProfile)
      setTasks((ts) => ts.map((t) => (t.id === task.id ? updated : t)))
      const after = levelInfo(Math.max(0, profile.xp + xpDelta)).level
      if (after > before) toast.celebrate(`LEVEL UP! LV ${after}`)
      else if (xpDelta > 0) toast.show(`+${xpDelta} XP — quest cleared!`, Sparkles)
    } catch (e) {
      toast.show(e.message)
    }
  }

  return { tasks, loading, reload, add, edit, remove, toggle }
}
