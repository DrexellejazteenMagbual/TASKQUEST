import { Settings } from 'lucide-react'

export default function SetupNeeded() {
  return (
    <div className="hero">
      <h1 className="title">TaskQuest</h1>
      <div className="card stack mt">
        <b className="title-row"><Settings size={18} /> Connect Supabase to start</b>
        <ol className="small" style={{ margin: 0, paddingLeft: 18, lineHeight: 1.7 }}>
          <li>Create a free project at supabase.com</li>
          <li>Run <code>supabase/schema.sql</code> in the SQL Editor</li>
          <li>Paste your Supabase project URL + anon key into <code>.env</code></li>
          <li>Restart <code>npm run dev</code></li>
        </ol>
        <span className="small muted">Full steps are in README.md.</span>
      </div>
    </div>
  )
}
