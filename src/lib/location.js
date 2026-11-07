// One shared, fast location service for the whole app.
//
// Why it's fast:
//  1. The last known position is kept in memory and localStorage, so maps can
//     centre instantly, even right after a reload.
//  2. A fresh high-accuracy GPS fix is requested first, with a network-based
//     fallback if GPS is unavailable.
//  3. A single watchPosition() is shared by every page instead of each page
//     starting its own GPS request.
import { useEffect, useState } from 'react'

const STORAGE_KEY = 'tq:lastpos'
const listeners = new Set()
let last = load()
let watchId = null
let watchers = 0

function load() {
  try { return JSON.parse(localStorage.getItem(STORAGE_KEY)) } catch { return null }
}

function update(p) {
  const pos = { lat: p.coords.latitude, lng: p.coords.longitude, accuracy: p.coords.accuracy, at: Date.now() }
  // don't let a rough fix overwrite a fresh precise one
  if (last && Date.now() - last.at < 15000 && last.accuracy < pos.accuracy) return last
  last = pos
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(pos)) } catch { /* private mode */ }
  listeners.forEach((fn) => fn(pos))
  return pos
}

export const getLastKnown = () => last

// Resolves with a fresh high-accuracy fix when possible. A network-based fix is
// used only when GPS times out or is unavailable.
export function getCurrentPosition({ maxAge = 30000 } = {}) {
  return new Promise((resolve, reject) => {
    if (!navigator.geolocation) { reject(new Error('Geolocation not supported')); return }
    if (last && Date.now() - last.at < maxAge && last.accuracy <= 50) {
      resolve(last)
      refine()
      return
    }
    let done = false
    let fallbackError = null
    const finish = (p) => {
      if (done) return
      done = true
      resolve(update(p))
    }
    const fallback = (e) => {
      fallbackError = e
      navigator.geolocation.getCurrentPosition(finish, (fallbackFailure) => {
        if (!done) {
          done = true
          last ? resolve(last) : reject(fallbackError || fallbackFailure)
        }
      }, { enableHighAccuracy: false, maximumAge: 60000, timeout: 8000 })
    }
    navigator.geolocation.getCurrentPosition(finish, fallback, {
      enableHighAccuracy: true,
      maximumAge: 0,
      timeout: 20000,
    })
  })
}

// background high-accuracy refresh (no waiting)
function refine() {
  navigator.geolocation?.getCurrentPosition(update, () => {}, { enableHighAccuracy: true, maximumAge: 10000, timeout: 20000 })
}

// Shared continuous tracking; ref-counted so it stops when nobody needs it.
export function watchLocation(fn) {
  listeners.add(fn)
  if (navigator.geolocation && watchers++ === 0) {
    watchId = navigator.geolocation.watchPosition(update, () => {}, { enableHighAccuracy: true, maximumAge: 10000 })
  }
  return () => {
    listeners.delete(fn)
    if (--watchers === 0 && watchId != null) { navigator.geolocation.clearWatch(watchId); watchId = null }
  }
}

// React hook: latest known position (starts with the cached one, updates live)
export function useMyLocation() {
  const [pos, setPos] = useState(last)
  useEffect(() => {
    const stop = watchLocation(setPos)
    getCurrentPosition().then(setPos).catch(() => {})
    return stop
  }, [])
  return pos
}
