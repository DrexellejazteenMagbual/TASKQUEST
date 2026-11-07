# TaskQuest 🌸

A mobile-first, anime-style **gamified task tracker**. You add quests, pin them on a map, get a route there, earn XP, level up and unlock achievements. Admins can see users' locations and request camera snapshots, but only with each user's consent.

**Stack:** React 18 + Vite · Leaflet (via `react-leaflet`) · Mapbox (map tiles, Directions, Geocoding) · Lucide icons (`lucide-react`) · Supabase (auth, Postgres, storage, realtime) · Recharts

---

## Features

| Area | What it does |
|---|---|
| **Login** | Plain username + password (sign up and log in) |
| **Quests** | Add, edit and delete tasks with difficulty (Easy/Normal/Hard/Boss), due date and notes. Admins can publish shared quests that every user can complete independently. Filter by Active, Today, Cleared or All |
| **Map** | Every pinned quest appears as a marker. Tap 📍 then tap the map to create a quest at that spot. Select a quest to get a **route** by car, foot or bike with distance and ETA |
| **Gamification** | XP per quest, levels and rank titles, day streaks, 11 achievements, "LEVEL UP!" splash |
| **Profile** | Profile picture upload, display name and bio, achievements, 5 themes (Sakura, Neon Tokyo, Ocean, Forest, Crimson Sunset), privacy toggles |
| **Analytics** | Clear rate, streak, overdue count, quests cleared per day (7-day chart), difficulty mix, most productive hour |
| **Admin** | Live map of users who share their location, user list with online status, each user's profile, quests and analytics, consent-based camera requests and snapshot gallery, promote or demote admins. The admin also has their own quests and profile |

### How consent works
- **Location:** a user appears on the admin map only while *Profile → Share my location with admin* is ON. Turning it off erases their last position.
- **Camera:** the admin can only send a request if the user turned ON *Allow camera requests*. Each request shows the user a prompt. The camera opens only after they tap **Allow**, and a photo is sent only when they tap **Capture & send**. There is no silent or live streaming. The database rules (RLS) enforce this as well.

---

## Setup (about 10 minutes)

### 1. Create the Supabase project
1. Go to <https://supabase.com> and create a new project (free tier is fine).
2. Open **SQL Editor → New query**, paste the whole of [`supabase/schema.sql`](supabase/schema.sql) and click **Run**. Then do the same with [`supabase/002_email_login.sql`](supabase/002_email_login.sql) and [`supabase/003_public_quests.sql`](supabase/003_public_quests.sql).
3. **Required:** under **Authentication → Sign In / Providers → Email**, turn **OFF "Confirm email"** and save. Accounts are username-only, so there's no inbox to confirm, and with it ON sign-ups fail with "email rate limit exceeded".

### 2. Configure the app
`.env` already exists with the Mapbox token. Fill in the Supabase values from **Project Settings → API**:
- `VITE_SUPABASE_URL`: the Project URL
- `VITE_SUPABASE_ANON_KEY`: the `anon` `public` key
- `SUPABASE_SERVICE_ROLE_KEY`: the `service_role` key. It is used **only** by the admin script and never reaches the browser.
- `VITE_MAPBOX_TOKEN`: already filled in with your Mapbox public token.
- `VITE_AUTH_EMAIL_BASE`: a real Gmail address. Supabase needs an email behind every account and rejects fake domains, so the username `drex` is stored as `yourname+drex@gmail.com`. Users never see or type it.

### 3. Create the admin account
```bash
npm install
npm run create-admin
```
This creates the admin account **`Admin` / `Admin101`**.

### 4. Run it
```bash
npm run dev
```
Open the URL shown in the terminal. To try it on your phone, use the **Network** URL on the same Wi-Fi.

> 📱 **Phone note:** browsers allow GPS and the camera only on `https://` or `localhost`. For phone testing over Wi-Fi, deploy the app (step 5) or use a tunnel such as `npx localtunnel --port 5173`.

### 5. Deploy to Render (optional)
The repository includes [`render.yaml`](../render.yaml), which configures the app as a Render Static Site with the `app/` root directory, Vite build command and `dist` publish directory.

1. Push the repository to GitHub or GitLab.
2. In Render, choose **New → Blueprint** and select the repository.
3. Confirm the service named `taskquest`, then create it.
4. In the service's **Environment** settings, enter:
   - `VITE_SUPABASE_URL`: the Supabase Project URL
   - `VITE_SUPABASE_ANON_KEY`: the Supabase `anon`/public key
   - `VITE_MAPBOX_TOKEN`: the Mapbox public token
   - `VITE_AUTH_EMAIL_BASE`: the real mailbox base used for username aliases
5. Trigger a deploy. Render runs the build in `app/` and publishes `dist`.

After the first deploy, add the Render URL to Supabase **Authentication → URL Configuration → Redirect URLs**. Also restrict the Mapbox public token to the Render hostname.

`SUPABASE_SERVICE_ROLE_KEY` is not needed by the frontend Static Site and must not be added to Render. It is only for the local `create-admin` script.

The installed PWA caches the application shell, JavaScript, styles, images, fonts and recently used map tiles for offline startup. Supabase data, authentication, routing and geocoding still require a network connection.

---

## Project structure
```
app/
├─ supabase/schema.sql        tables, RLS security, storage buckets, realtime
├─ supabase/003_public_quests.sql  admin-created public quests and per-user completions
├─ scripts/create-admin.mjs   creates Admin / Admin101
└─ src/
   ├─ lib/        supabase client, auth context, game rules (XP/achievements), themes, map/routing helpers
   ├─ components/ nav, XP bar, quest card & form, map picker, mascot, location reporter, camera consent prompt
   └─ pages/      Login, Quests, MapPage, Stats, Profile, Admin, AdminUser
```

## Customising
- **XP values, ranks, achievements:** `src/lib/game.js`
- **Themes:** `src/lib/themes.js`
- **System navigators:** `src/lib/navigator.js` and `public/characters/`
- **Default map centre (Manila), map styles:** `src/lib/geo.js`
- **Map markers:** `src/components/MapKit.jsx`

## Security notes
- `Admin101` is the password the project brief asked for. Change it before real use: edit `scripts/create-admin.mjs`, run it again, and the password is reset.
- Normal users cannot make themselves admin. A database trigger blocks role changes made by non-admins.
- The Mapbox token is a public (`pk.`) token and is visible in the browser, which is normal. In your Mapbox account, restrict it to your site's URLs so others can't use it on their own sites.
