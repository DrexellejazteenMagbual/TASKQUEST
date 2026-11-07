import { createPortal } from 'react-dom'
import { useCallback, useEffect, useRef, useState } from 'react'
import { Camera } from 'lucide-react'
import { useAuth } from '../lib/auth'
import { supabase } from '../lib/supabase'
import { useToast } from './Toast'

// Listens for admin camera requests. The camera is never opened without the user
// tapping "Allow", and a photo is only sent when they tap "Capture & send".
export default function CameraRequestListener() {
  const { user, profile } = useAuth()
  const toast = useToast()
  const [req, setReq] = useState(null)
  const [stage, setStage] = useState('ask') // ask | camera | sending
  const [err, setErr] = useState('')
  const videoRef = useRef(null)
  const streamRef = useRef(null)

  const loadPending = useCallback(async () => {
    const { data } = await supabase.from('camera_requests')
      .select('*').eq('user_id', user.id).eq('status', 'pending')
      .order('created_at', { ascending: false }).limit(1)
    if (data?.[0]) { setReq(data[0]); setStage('ask') }
  }, [user.id])

  useEffect(() => {
    if (!profile?.camera_consent) return
    loadPending()
    const ch = supabase.channel(`camreq-${user.id}`)
      .on('postgres_changes', { event: 'INSERT', schema: 'public', table: 'camera_requests', filter: `user_id=eq.${user.id}` },
        (payload) => { setReq(payload.new); setStage('ask') })
      .subscribe()
    return () => { supabase.removeChannel(ch) }
  }, [profile?.camera_consent, user.id, loadPending])

  const stopCam = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop())
    streamRef.current = null
  }
  useEffect(() => stopCam, [])

  const respond = async (status) => {
    await supabase.from('camera_requests').update({ status, responded_at: new Date().toISOString() }).eq('id', req.id)
  }

  const deny = async () => {
    stopCam()
    await respond('denied')
    setReq(null)
    toast.show('Camera request declined')
  }

  const allow = async () => {
    setErr('')
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'user' }, audio: false })
      streamRef.current = stream
      setStage('camera')
      setTimeout(() => { if (videoRef.current) videoRef.current.srcObject = stream }, 0)
    } catch {
      setErr('Could not open the camera. Check your browser permissions.')
    }
  }

  const capture = async () => {
    const v = videoRef.current
    if (!v) return
    setStage('sending')
    const canvas = document.createElement('canvas')
    canvas.width = v.videoWidth
    canvas.height = v.videoHeight
    canvas.getContext('2d').drawImage(v, 0, 0)
    stopCam()
    const blob = await new Promise((r) => canvas.toBlob(r, 'image/jpeg', 0.85))
    const path = `${user.id}/${Date.now()}.jpg`
    const up = await supabase.storage.from('snapshots').upload(path, blob, { contentType: 'image/jpeg' })
    if (up.error) { setErr(up.error.message); setStage('ask'); return }
    await supabase.from('camera_snapshots').insert({ user_id: user.id, request_id: req.id, path })
    await respond('approved')
    setReq(null)
    toast.show('Snapshot sent to admin', Camera)
  }

  if (!req) return null
  return createPortal(
    <div className="backdrop">
      <div className="sheet stack">
        <div className="sheet-handle" />
        <h2 className="title title-row" style={{ fontSize: 26 }}><Camera size={26} strokeWidth={2.6} /> Camera request</h2>
        <p className="small" style={{ margin: 0 }}>
          The admin is asking for <b>one photo</b> from your camera.
          {req.message && <><br /><i>“{req.message}”</i></>}
        </p>
        <p className="tiny muted" style={{ margin: 0 }}>Nothing is recorded or sent unless you choose to. You can turn off camera requests in Profile.</p>
        {stage === 'camera' && <video ref={videoRef} className="cam" autoPlay playsInline muted />}
        {err && <div className="error">{err}</div>}
        {stage === 'ask' && (
          <div className="grid2">
            <button className="btn" onClick={deny}>Deny</button>
            <button className="btn btn-primary" onClick={allow}>Allow camera</button>
          </div>
        )}
        {stage === 'camera' && (
          <div className="grid2">
            <button className="btn" onClick={deny}>Cancel</button>
            <button className="btn btn-primary" onClick={capture}>Capture & send</button>
          </div>
        )}
        {stage === 'sending' && <div className="spinner" style={{ margin: '10px auto' }} />}
      </div>
    </div>,
    document.body,
  )
}
