export default function Avatar({ profile, size = 48 }) {
  const name = profile?.display_name || profile?.username || '?'
  return (
    <div className="avatar" style={{ width: size, height: size, fontSize: size * 0.42 }}>
      {profile?.avatar_url ? <img src={profile.avatar_url} alt={name} /> : name[0].toUpperCase()}
    </div>
  )
}
