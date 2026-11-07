import { useEffect, useRef } from 'react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { getCurrentPosition, watchLocation } from '../lib/location'

// Shares the user's live position with the admin – ONLY while location sharing is turned on in Profile.
export default function LocationReporter() {
  const { user, profile } = useAuth()
  const last = useRef(0)
  const enabled = Boolean(profile?.location_consent)

  useEffect(() => {
    if (!enabled) return
    const send = async (p) => {
      if (Date.now() - last.current < 30000) return // at most every 30 s
      last.current = Date.now()
      await supabase.from('profiles').update({
        last_lat: p.lat, last_lng: p.lng, last_seen: new Date().toISOString(),
      }).eq('id', user.id)
    }
    getCurrentPosition().then(send).catch(() => {}) // report right away
    return watchLocation(send)
  }, [enabled, user?.id])

  return null
}
