# Auth System Setup

## 1. Apply Database Migration

Run this SQL in Supabase SQL Editor:

```sql
-- File: supabase/migrations/20260929_auth_system.sql
```

This creates:
- `user_profiles` — user profiles linked to Supabase Auth
- `user_game_stats` — game statistics per user
- `achievements` — achievement definitions
- `user_achievements` — user achievement unlocks
- `xp_events` — XP audit trail
- `leaderboard_view` — public leaderboard view

## 2. Enable Supabase Auth

1. Go to Supabase Dashboard → Authentication → Providers
2. Enable **Email** provider
3. (Optional) Enable **Google** provider:
   - Create OAuth client in Google Cloud Console
   - Add client ID/secret to Supabase
   - Add redirect URL: `https://<your-subabase-project>.supabase.co/auth/v1/callback`

## 3. Environment Variables

Already in `.env.local`:
```
NEXT_PUBLIC_SUPABASE_URL=https://wkxxdixxieiyjgreepvv.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_q9jOHsRECissHnmCKUkVdQ_x3iM6KXg
```

## 4. Routes

- `/login` — Login page (email + Google)
- `/register` — Registration page
- `/profile` — User profile (protected)
- `/settings` — Account settings (protected)
- `/leaderboard` — Global leaderboard

## 5. Architecture

```
src/lib/
├── auth.ts           — Supabase Auth wrapper
├── xp.ts             — XP/Level formula service
├── game-stats.ts     — Game stats registry
└── achievements.ts   — Achievement definitions

src/components/
├── auth-provider.tsx — React context for auth state
├── login-page.tsx    — Login UI
├── register-page.tsx — Registration UI
├── profile-page.tsx  — Profile UI
└── settings-page.tsx — Settings UI

src/app/
├── login/page.tsx
├── register/page.tsx
├── profile/page.tsx
├── settings/page.tsx
├── leaderboard/page.tsx
└── api/xp/award/route.ts — Server-side XP awarding
```

## 6. Security

- RLS policies on all tables (users can only access their own data)
- XP awarded server-side only (client cannot fake XP)
- Passwords handled by Supabase Auth (bcrypt hashed)
- Session persistence via Supabase JWT tokens

## 7. Guest → Account Migration

- Guest users use `fd_device_id` from localStorage
- On registration, can migrate guest progress
- `migrated_from_device_id` prevents double migration
- Guest XP imported as `guest_migration` event
