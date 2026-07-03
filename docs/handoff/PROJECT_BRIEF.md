# Job Bottle / 未来星瓶 — Complete Project Brief

> Generated 2026-07-03. For consumption by a redesign model.
> Based on full codebase inspection. No assumptions made.

---

## 1. Project Stack

| Layer | Technology | Version |
|-------|-----------|---------|
| Framework | Next.js (App Router) | 16.2.10 |
| Language | TypeScript | 5.x (strict mode) |
| React | React / React DOM | 19.2.4 |
| Styling | Tailwind CSS | 4.x (PostCSS plugin) |
| Animation | Motion for React (framer-motion successor) | 12.42.2 |
| Backend | Supabase (Postgres + Auth + Storage) | @supabase/ssr 0.12.0, supabase-js 2.110.0 |
| Forms | React Hook Form + Zod | 7.80.0 / 4.4.3 |
| CSV | PapaParse | 5.5.4 |
| Icons | Lucide React | 1.23.0 |
| Build | Turbopack (dev + prod) | bundled with Next 16 |

**Deployment assumptions:** No deployment config found. No Dockerfile, no Vercel config. Assumed Vercel or similar Node.js host. Turbopack used for both dev and production builds.

**Environment variables:**
- `NEXT_PUBLIC_SUPABASE_URL` — Supabase project URL
- `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — Supabase anon/publishable key
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — Legacy alias (code falls back to PUBLISHABLE_KEY)
- `SUPABASE_SERVICE_ROLE_KEY` — Server-only, not present in .env.local.example

---

## 2. Current Route Structure

### Implemented routes (confirmed via build output):

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | GalaxyHome (no Navbar) | Full-screen solar system navigation homepage |
| `/jobs` | HomeClient + PageShell | Job listing with filters (formerly at `/`) |
| `/my-applications` | MyApplicationsClient + PageShell | Application table view |
| `/my-bottle` | MyBottleClient + PageShell | Bottle visualization |
| `/forum` | ForumClient + PageShell | Discussion forum |
| `/login` | LoginForm + PageShell | Auth (login/register toggle) |
| `/admin` | AdminShell | Admin dashboard (two action cards) |
| `/admin/jobs` | AdminJobsClient + AdminShell | Job CRUD |
| `/admin/import` | CsvImportPanel + AdminShell | CSV bulk import |

### Planned but not implemented:
- No `/galaxy` route (galaxy is at `/`)
- No `/discussions` route (forum is at `/forum`)
- No user profile/settings page
- No notification system
- No search history

---

## 3. Supabase / Database Integration

### Client setup:
- **Server client:** `src/lib/supabase/server.ts` — uses `@supabase/ssr` with cookie-based auth
- **Browser client:** `src/lib/supabase/client.ts` — singleton, falls back from PUBLISHABLE_KEY to ANON_KEY
- Both include `isSupabaseConfigured()` guard

### Database tables (from schema.sql + types.ts):

#### `profiles`
| Field | Type | Notes |
|-------|------|-------|
| id | uuid (PK, FK → auth.users) | Auto-created via trigger |
| display_name | text | Defaults to email prefix |
| role | text | 'user' or 'admin' |
| created_at | timestamptz | |
| updated_at | timestamptz | Auto-updated via trigger |

#### `jobs`
| Field | Type | Notes |
|-------|------|-------|
| id | uuid (PK) | gen_random_uuid() |
| company_name | text | NOT NULL |
| start_date | text | Stored as string (e.g., "5.24") |
| industry | text | Single value, but seed data has comma-separated |
| batch_type | text | "27秋招提前批" or "27秋招正式批" |
| job_titles | text | Comma-separated |
| locations | text | Comma-separated |
| apply_url | text | NOT NULL |
| notes | text | |
| logo_url | text | Supabase Storage URL |
| tags | text[] | Array of strings |
| is_active | boolean | Default true |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `user_applications`
| Field | Type | Notes |
|-------|------|-------|
| id | uuid (PK) | gen_random_uuid() |
| user_id | uuid (FK → auth.users) | NOT NULL |
| job_id | uuid (FK → jobs) | NOT NULL |
| status | text | Enum: opened/applied/written_test/first_round/second_round/final_round/offer/rejected/withdrawn |
| progress_note | text | |
| applied_at | timestamptz | |
| updated_at | timestamptz | |
| **unique** | (user_id, job_id) | One application per user per job |

#### `forum_posts`
| Field | Type | Notes |
|-------|------|-------|
| id | uuid (PK) | |
| user_id | uuid (FK → auth.users) | |
| title | text | NOT NULL |
| content | text | NOT NULL |
| category | text | Default '讨论'. Enum: 讨论/经验/求助/分享 |
| tags | text[] | |
| like_count | int | Default 0 |
| comment_count | int | Default 0 |
| is_pinned | boolean | Default false |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `forum_comments`
| Field | Type | Notes |
|-------|------|-------|
| id | uuid (PK) | |
| post_id | uuid (FK → forum_posts) | |
| user_id | uuid (FK → auth.users) | |
| content | text | NOT NULL |
| like_count | int | Default 0 |
| created_at | timestamptz | |
| updated_at | timestamptz | |

#### `forum_likes`
| Field | Type | Notes |
|-------|------|-------|
| user_id | uuid (FK → auth.users) | |
| post_id | uuid (FK → forum_posts) | Nullable |
| comment_id | uuid (FK → forum_comments) | Nullable |
| created_at | timestamptz | |
| **unique** | (user_id, post_id) | |
| **unique** | (user_id, comment_id) | |

### RLS policies (from policies.sql):
- **profiles:** Users can read own; admins can read all; authenticated can insert own (role='user'); can update own display_name (role locked)
- **jobs:** anon + authenticated can read active; admins can CRUD all
- **user_applications:** authenticated can CRUD own only
- **forum_posts/comments/likes:** public read (after fix_forum_rls.sql); authenticated can write own
- **storage.objects (company-logos):** public read; admin-only write

### Critical RLS issue:
`forum_posts.user_id` references `auth.users(id)`, NOT `profiles(id)`. PostgREST cannot infer a foreign key relationship between `forum_posts` and `profiles`. The code works around this by fetching profiles in a separate query (no join).

### Admin access control:
- `is_admin()` SQL function checks `profiles.role = 'admin'`
- Frontend checks via Supabase query: `supabase.from('profiles').select('role').eq('id', user.id)`
- AdminShell component gates `/admin/*` routes
- GalaxyHome hides admin planet for non-admin users

### Data operations implemented:
| Operation | File | Status |
|-----------|------|--------|
| fetchActiveJobs | jobs.ts | ✅ Working |
| filterJobs (keyword/industry/batch/location/tags) | jobs.ts | ✅ Working |
| getJobFacetOptions (dedup comma values) | jobs.ts | ✅ Working |
| fetchAllJobsForAdmin | jobs.ts | ✅ Working |
| createJob / updateJob / deleteJob / toggleActive | jobs.ts | ✅ Working |
| upsertApplication | applications.ts | ✅ Working |
| updateApplication (status/notes) | applications.ts | ✅ Working |
| deleteApplication | applications.ts | ✅ Working |
| fetchMyApplications (with job join) | applications.ts | ✅ Working |
| CSV bulk import | csv.ts | ✅ Working |
| Logo upload (2MB limit) | storage.ts | ✅ Working |
| Forum CRUD | forum.ts | ✅ Working (no-profile-join version) |
| Forum like toggle | forum.ts | ✅ Working |
| Auth (signup/login/logout) | auth.ts + LoginForm | ✅ Working |
| ensureProfile (auto-create) | auth.ts | ✅ Working (via DB trigger) |

### Seed data:
167 job entries from Excel source. 2 skipped for non-HTTP links. Duplicate protection by company + apply_url.

---

## 4. Current Visual System

### Background:
- **Primary color:** `#02040A` (near-black blue)
- **Body CSS:** Simple linear-gradient from #02040A to #080c1a
- **Star dots:** body::before pseudo-element with 2 radial-gradient layers, spacing 140px/200px grid, opacity 0.18
- **StarFieldBackground component:** 10 tiny white dots (1-2px, opacity 0.15-0.25) + single ultra-subtle radial gradient. Has `quiet` mode.
- **GalaxyHome:** Canvas-based star field with 200 stars (twinkle animation) + comet trails (8-23s interval)

### Navbar:
- Sticky top, z-40, `bg-void-950/72 backdrop-blur-xl`
- Border-bottom: `rgba(148,163,184,0.08)`
- Logo: `/logo.png` (56px, no border, rounded-xl)
- Nav items: 岗位星图(/jobs), 我的投递(/my-applications), 我的星瓶(/my-bottle), 讨论区(/forum)
- Right side: admin badge + user display_name or "个人中心" + logout, OR login button
- Mobile: hamburger menu

### Typography:
- Geist Sans + Geist Mono (Google Fonts)
- Primary text: `#d8dce4` (ink-primary)
- Secondary: `#8a919d` (ink-secondary)
- Muted: `#525966` (ink-muted)

### Color palette (tailwind.config.ts):
```
void-950: #02040A     void-900: #050814     void-800: #0a0f1e
void-700: #0f1628     nebula-blue: #6b8db5   nebula-violet: #8b9dc3
nebula-silver: #b0bac8  aurum-300: #c8a96a    text-*: ink-primary/secondary/muted
```

### Surface/card styles:
- Glass panels: `rgba(8,12,24,0.72)` background, `rgba(148,163,184,0.08)` border
- Hover borders: `rgba(148,163,184,0.16)`
- Shadows: `0 24px 80px rgba(0,0,0,0.42)` — deep black only
- Rounded corners: 24px-28px for cards

### Buttons:
- `gold-button`: subtle gradient background, aurum-tinted border
- `muted-button`: very dark background, faint border
- Primary/secondary/danger variants in Button.tsx

### Pages do NOT share a unified background:
- Homepage (GalaxyHome): has its own Canvas star field, no Navbar, full viewport
- Other pages: UserShell → StarFieldBackground + Navbar + main content (max-w-1440px)
- Admin pages: AdminShell with sidebar nav, separate layout
- Visible color layering risk between StarFieldBackground and page content containers

---

## 5. Current Major UI Modules

### 5.1 Job List (`/jobs`)
- **Files:** HomeClient.tsx, JobCard.tsx, JobFilterBar.tsx, CompanyBadge.tsx
- **What it does:** Fetches active jobs from Supabase, renders filterable list. Filter bar (sidebar) with keyword search, industry/batch/location dropdowns, tag toggles. Job rows show company badge, name, industry, titles, batch, location, date, apply button.
- **Layout:** 2-column (filter sidebar | job list). Jobs are compact horizontal rows with divide-y separators.
- **Incomplete:** Industry dedup works (comma values split), but filter UI still shows raw combined values in tag toggles (e.g., "市场类（包含商分" and "战略）" appear as separate tags due to comma splitting).
- **Weak:** Job row design is functional but plain. No visual connection to the star/bottle metaphor on this page. The "去官网投递" button creates an application record silently.
- **Preserve:** Filter logic, dedup approach, sorting (newest first), upsert on apply.

### 5.2 Galaxy Homepage (`/`)
- **Files:** GalaxyHome.tsx, planet-routes.ts
- **What it does:** Full-screen solar system navigation. Center star with logo + "未来星瓶" text. 5 orbiting planet buttons (jobs, bottle, applications, forum, admin). CSS keyframe animation (rotate + translateX + counter-rotate). Canvas star field + comet animation. Info panel (bottom-left) + CTA buttons (bottom-right).
- **Planet colors:** Each variant has distinct color (blue, teal, silver, purple, gray). Orbit rings match planet colors.
- **Planet sizes:** jobs 100px, bottle 85px, applications 72px, forum 62px, admin 54px. Core star 260px.
- **Orbit radii:** jobs 240, bottle 335, applications 415, forum 480, admin 540.
- **Incomplete:** No login planet — login is a separate button in the corner. No smooth transition from galaxy to subpages.
- **Weak:** Planets are still somewhat small relative to the viewport. The CSS animation approach means planets orbit at the same speed regardless of screen size. No parallax or depth effect. The info panel text is basic.
- **Preserve:** Canvas star field, comet animation, planet color differentiation, counter-rotation for text readability, mobile fallback to list.

### 5.3 My Applications (`/my-applications`)
- **Files:** MyApplicationsClient.tsx
- **What it does:** Table view of all user applications with keyword search and status filter. Columns: company, job title, location, industry, batch, status, updated time, actions.
- **Weak:** Very plain table design. No visual connection to stars or orbit. Feels like an admin table.
- **Preserve:** Data fetching, status filtering, ProgressDrawer integration.

### 5.4 My Bottle (`/my-bottle`)
- **Files:** MyBottleClient.tsx, ApplicationBottle.tsx, CompanyStar.tsx
- **What it does:** Renders a glass bottle SVG with company stars positioned inside. Stars pile up from bottom based on status weight. Falling star animation on new application. Detail card below bottle.
- **Bottle SVG:** Simple rect body (260×340, rx=22) + narrow neck (64×65) + cork (74×23, wood brown). Glass fill gradient, shoulder connection lines, dual reflection lines, neck rim.
- **Star positioning:** calculatePilePositions() — grid-based bottom-up layout, 48px slots, 4 columns, deterministic offset per star ID.
- **Star colors:** Warm progression (dark → yellow → gold) based on application status.
- **Falling animation:** Detects count increase via localStorage, animates from bottle opening (neckY) to pile position with gravity + 3 bounces.
- **Detail card:** Shows hovered/selected/most-recent application (company, titles, status pill, time, "查看进度" button).
- **Incomplete:** Stars are positioned in a grid — they don't feel organic or physics-based. The bottle SVG is functional but not beautiful (basic rectangles). No glass transparency effect where you can see stars through the bottle.
- **Weak:** The bottle shape is too simple (rectangles with rounded corners). No bottle interior depth or liquid effect. The falling animation starts at the neck but doesn't pass through a visible opening.
- **Preserve:** Status-based star coloring, pile-up logic, falling animation concept, detail card, localStorage tracking.

### 5.5 Discussion Forum (`/forum`)
- **Files:** ForumClient.tsx, PostCard.tsx, NewPostForm.tsx, forum.ts
- **What it does:** Category-filtered post list (全部/讨论/经验/求助/分享). Posts expand to show content + comments. Like toggle. New post form with react-hook-form + zod.
- **Incomplete:** Author names fetched via separate query (no join). No pagination. No edit post UI. No reply-to-comment.
- **Weak:** Basic card design. Category badges have hardcoded colors.
- **Preserve:** Category system, separate-profile-fetch approach, like toggle.

### 5.6 Admin Pages (`/admin/*`)
- **Files:** AdminShell.tsx, AdminJobsClient.tsx, AdminJobForm.tsx, AdminJobTable.tsx, CsvImportPanel.tsx
- **What it does:** Full CRUD for jobs. CSV bulk import with preview. Logo upload to Supabase Storage.
- **AdminShell:** Sidebar navigation (岗位管理, 批量导入), logout, role check. Separate from user layout.
- **Preserve:** Complete admin functionality, sidebar layout, role-based access.

### 5.7 Login (`/login`)
- **Files:** LoginForm.tsx
- **What it does:** Toggle between login/register. Supabase Auth. Auto-creates profile via DB trigger. Translates auth errors to Chinese.
- **Preserve:** Auth flow, error translation, next parameter redirect.

### 5.8 Visual Components (unused or legacy)
- **HeroConstellation.tsx** — SVG constellation graphic. No longer imported by any page (was removed from homepage).
- **EmptyConstellation.tsx** — Empty state SVG. May still be used in HomeClient.
- **FlyingStar.tsx** — One-shot animation when user applies. Still imported in HomeClient.
- **CompanyBadge.tsx** — Circular company avatar (logo or initials).

---

## 6. Current Interaction Model

### User flow:
1. **Landing** (`/`): User sees solar system. Planets represent features. Hover shows description. Click navigates.
2. **Browse jobs** (`/jobs`): Filter sidebar + job list. Click "去官网投递" → creates application record → opens company URL in new tab. Flying star animation plays.
3. **Track applications** (`/my-applications`): Table view. Click row → ProgressDrawer slides in. Edit status, add notes.
4. **View bottle** (`/my-bottle`): Bottle SVG with company stars. Stars positioned by status weight. Click star → ProgressDrawer. Newest application triggers falling animation.
5. **Discuss** (`/forum`): Create posts, comment, like. Category filtering.
6. **Admin** (`/admin/*`): CRUD jobs, CSV import. Separate layout.

### Connection between views:
- Job list → Application record creation (upsert on "去官网投递")
- Application record → Bottle star (one star per application)
- Application record → My Applications table (one row per application)
- Status change in ProgressDrawer → reflected in bottle star color + position
- **Missing connection:** Job list doesn't show which jobs are already applied (no star indicator on job rows after applying). The "查看进度" button appears but only when the application exists in the current session's state.

### Metaphor implementation:
- Job list is purely functional (no star metaphor)
- Galaxy homepage is purely navigational (no job data)
- Bottle is the only page that implements the "jobs as stars" metaphor
- No unified "space world" connecting all pages

---

## 7. Current Visual Metaphor Implementation

| Metaphor Element | Status | Notes |
|-----------------|--------|-------|
| "Job as star" | **Partially implemented** | Only in bottle page. Jobs list has no star representation. |
| "Industry/region as nebula" | **Missing** | No nebula grouping. Industries are filter dropdown values only. |
| "Application as capture" | **Partially implemented** | "去官网投递" creates record + flying star animation. But no visual "capture" moment on the job list itself. |
| "Application progress as orbit" | **Missing** | No orbit visualization for progress. Status is a text pill. |
| "My bottle as collected stars" | **Implemented** | Bottle SVG with positioned stars. Stars color by status. Pile-up layout. |
| "Unified deep-space world" | **Missing** | Pages have separate visual treatments. No consistent space theme connecting job list → bottle → applications. |
| "Professional restrained design" | **Implemented** | Dark theme, minimal colors, no bright decorations. |
| "Readable job search/list interface" | **Implemented** | Compact rows, filters, sorting. Functional and scannable. |

---

## 8. Known Design Problems

| Problem | Status | Details |
|---------|--------|---------|
| Star overlap in bottle | **Fixed** | Grid-based positioning with 48px slots prevents overlap. |
| Company labels overlapping | **Fixed** | max-w-[120px] truncate on company names. |
| Job list has no star metaphor | **Not addressed** | Jobs are plain table rows. |
| Galaxy planets too small | **Recently fixed** | Sizes increased (jobs 100px, core 260px). User still may want bigger. |
| Galaxy planets were overlapping | **Fixed** | Orbit radii increased to prevent collision. |
| Multiple page backgrounds | **Exists** | GalaxyHome has Canvas, other pages have StarFieldBackground, admin has its own. No unified background. |
| Admin/user layout separation | **Implemented** | AdminShell vs UserShell are separate. |
| Bottle shape too simple | **Exists** | Rectangle-based SVG. No elegant glass vessel shape. |
| Star-drop animation unnatural | **Partially fixed** | Falls from bottle opening, has bounce. But bottle has no visible opening gap. |
| Forum RLS blocking anon reads | **Fixed in code** | forum.ts uses separate profile fetch. Still needs SQL execution for RLS policies. |
| Industry tag splitting shows fragments | **Exists** | "市场类（包含商分" and "战略）" appear as separate tags due to comma splitting inside parenthetical text. |
| No transition from galaxy to subpages | **Exists** | Clicking a planet navigates instantly. No animation or visual continuity. |
| Orbit text readability | **Fixed** | Counter-rotation keeps text upright. |

---

## 9. File Map

### Layout files:
```
src/app/layout.tsx              Root layout (fonts, metadata)
src/components/layout/PageShell.tsx    → UserShell
src/components/layout/UserShell.tsx    StarFieldBackground + Navbar + content
src/components/layout/AdminShell.tsx   Sidebar nav + role check
src/components/layout/Navbar.tsx       Sticky nav with auth
```

### Visual/background files:
```
src/app/globals.css             CSS variables, glass utilities, star dots
tailwind.config.ts              Color palette, shadows, animations
src/components/visuals/StarFieldBackground.tsx   Subtle background dots
src/components/visuals/HeroConstellation.tsx     Legacy (unused)
src/components/visuals/EmptyConstellation.tsx     Empty state SVG
src/components/galaxy/GalaxyHome.tsx              Solar system homepage
src/lib/planet-routes.ts                         Planet route definitions
public/logo.png                                  Site logo
```

### Job components:
```
src/components/jobs/HomeClient.tsx     Main job list client
src/components/jobs/JobCard.tsx        Compact job row
src/components/jobs/JobFilterBar.tsx   Filter sidebar
src/components/jobs/CompanyBadge.tsx   Company avatar
src/lib/jobs.ts                        Job data layer
src/lib/csv.ts                         CSV parsing
src/lib/storage.ts                     Logo upload
```

### Application/orbit/bottle components:
```
src/components/applications/ApplicationBottle.tsx   Bottle SVG + star layout + falling animation
src/components/applications/CompanyStar.tsx          Individual star (warm colors)
src/components/applications/MyApplicationsClient.tsx Application table
src/components/applications/MyBottleClient.tsx       Bottle page client
src/components/applications/ProgressDrawer.tsx       Status edit drawer
src/components/applications/StatusPill.tsx           Status badge
src/components/applications/StatusSelect.tsx         Status dropdown
src/components/applications/FlyingStar.tsx           Apply animation
src/lib/applications.ts                             Application data layer
```

### Discussion components:
```
src/components/forum/ForumClient.tsx    Main forum client
src/components/forum/PostCard.tsx       Post with comments
src/components/forum/NewPostForm.tsx    Create post form
src/lib/forum.ts                        Forum data layer
```

### Admin components:
```
src/components/admin/AdminJobsClient.tsx   Job management
src/components/admin/AdminJobForm.tsx      Job form
src/components/admin/AdminJobTable.tsx     Job table
src/components/admin/CsvImportPanel.tsx    CSV import
```

### Auth:
```
src/components/auth/LoginForm.tsx    Login/register
src/lib/auth.ts                     Auth helpers
```

### UI primitives:
```
src/components/ui/Button.tsx, Input.tsx, Select.tsx, Textarea.tsx, Badge.tsx, Card.tsx, Drawer.tsx
```

### Data types:
```
src/lib/types.ts        All TypeScript types + Supabase Database type
src/lib/constants.ts    Status labels, filter defaults, site name
src/lib/utils.ts        cn(), getCompanyInitials(), formatDateTime(), getBottlePosition(), etc.
```

### Supabase:
```
src/lib/supabase/client.ts    Browser client
src/lib/supabase/server.ts    Server client (cookies)
supabase/schema.sql           3 core tables + triggers + indexes
supabase/policies.sql         RLS policies
supabase/seed.sql             167 job entries
supabase/forum.sql            Forum tables + RLS
supabase/fix_forum_rls.sql    Forum RLS fix (anon read)
```

### Docs:
```
docs/prd/PRD_1-5              Product requirement documents
docs/handoff/REQUIREMENTS_AUDIT.md
docs/handoff/IMPLEMENTATION_STATUS.md
docs/handoff/VISUAL_REDESIGN_2026.md
docs/handoff/CHANGELOG.md
```

---

## 10. Implementation Risks

### Data mutation / RLS:
- `forum_posts.user_id` FK points to `auth.users`, not `profiles`. Any PostgREST join with profiles will fail (PGRST200). Current code works around this.
- `user_applications` RLS requires `user_id = auth.uid()`. Upsert must pass the correct user_id or it silently fails.
- Forum RLS fix SQL must be executed in Supabase Dashboard for anonymous forum access to work.
- No service role key in .env.local — server-side admin operations (like deleting any user's data) are impossible from the app.

### Route migration risks:
- `/` was the job list, now it's the GalaxyHome. Any bookmarks or links to the old homepage will show the galaxy instead of jobs.
- Navbar "岗位星图" now points to `/jobs`, not `/`. This is correct but may confuse users who expect `/` to be the main content page.
- `fetchMyApplications` joins `jobs` table — this works because the FK relationship exists (user_applications.job_id → jobs.id).

### Animation performance:
- GalaxyHome Canvas has 200 stars + comet animation running at 60fps via requestAnimationFrame. On low-end devices this may cause jank.
- CSS orbit animations use 5 simultaneous @keyframes. Performance should be fine but hasn't been tested on mobile.
- CompanyStar floating animation (7s cycle, infinite) runs on every star in the bottle simultaneously.
- Motion/react FallingStar animation is one-shot, no performance concern.
- `prefers-reduced-motion` is supported in GalaxyHome but NOT in CompanyStar or FallingStar.

### Mobile responsiveness:
- GalaxyHome falls back to vertical list on <767px. Works but loses the solar system effect entirely.
- Job list: responsive column hiding works but no horizontal scroll for filters on mobile.
- Bottle: fixed dimensions (h-[560px] max-w-[440px]) — may overflow on small screens.
- Admin sidebar: no mobile collapse detected.

### Hydration issues:
- GalaxyHome uses `window.matchMedia` in useEffect — no SSR hydration mismatch risk (client-only).
- StarFieldBackground uses absolute positioning — no hydration risk.
- CompanyStar uses motion/react — should be fine.
- Navbar reads auth state client-side — no hydration issue.

### State synchronization:
- HomeClient fetches jobs AND applications in parallel on mount. If the user applies to a job, the page re-fetches all data (loadData()). No optimistic updates.
- MyBottleClient fetches independently — no shared state with HomeClient.
- ProgressDrawer updates via `onChanged` callback which triggers a full re-fetch.
- **Risk:** If user applies on `/jobs` then navigates to `/my-bottle`, the bottle may not show the new star until the data re-fetches. localStorage count tracking handles the falling animation, but the star itself needs the data.

### Position stability:
- Star positions in the bottle use deterministic hashing (id.charCodeAt → hash). Same ID always produces the same position. This is stable across sessions.
- GalaxyHome planet positions are defined in planet-routes.ts (static). Stable.
- Job facet options are computed from fetched data — changes when data changes. Not a stability risk.

---

## 11. Brief for the Next Model

### What this project is:
A Chinese-language web app for tracking autumn recruitment job applications. Users browse job listings, apply via external company URLs, save application records, track progress through interview stages, and visualize their applications as stars collected in a personal bottle. The project also includes a discussion forum and admin backend.

### What is already built:
- Complete Supabase-backed data layer (jobs, applications, profiles, forum)
- Auth with role-based access control (user/admin)
- Job listing with filters, sorting, and industry dedup
- Application lifecycle tracking (9 statuses)
- Bottle visualization with status-colored stars and falling animation
- Galaxy/solar-system homepage with orbiting planet navigation
- Discussion forum with categories, comments, likes
- Admin CRUD for jobs + CSV bulk import
- Dark space theme with restrained professional aesthetic
- Canvas star field with comet animation
- Mobile-responsive fallbacks

### What needs to be redesigned:
1. **The visual metaphor is fragmented.** The galaxy homepage, job list, bottle, and applications page are visually disconnected. They share a color scheme but not a spatial metaphor. Jobs should feel like they exist in the same universe as the stars and bottle.
2. **The bottle SVG is too simple.** Rectangle-based geometry doesn't look like a real glass vessel. Needs a proper bottle shape with glass transparency, depth, and interior visibility.
3. **The job list has no star metaphor.** It's a plain table. Users can't see which jobs they've already applied to without hovering. The "capture" metaphor is missing on the most-used page.
4. **No orbit system for application progress.** Progress is a text pill and a drawer. The "orbit" concept from the PRD is not implemented.
5. **The galaxy homepage needs polish.** Planets are functional but feel like flat circles with icons, not celestial bodies. No depth, no parallax, no atmospheric effects.
6. **Background inconsistency.** Three different background systems (Canvas, CSS pseudo-elements, plain gradient) across different page types.
7. **Industry tag splitting breaks on parenthetical text.** "市场类（包含商分, 战略）" gets split into "市场类（包含商分" and "战略）".

### Which files are most important:
- `src/components/galaxy/GalaxyHome.tsx` — homepage, first impression
- `src/components/applications/ApplicationBottle.tsx` — core visual feature
- `src/components/applications/CompanyStar.tsx` — star representation
- `src/components/jobs/HomeClient.tsx` — most-used page
- `src/components/jobs/JobCard.tsx` — job presentation
- `src/app/globals.css` + `tailwind.config.ts` — design system
- `src/lib/types.ts` — data model (don't break types)
- `src/lib/applications.ts` — application logic (don't break upsert)
- `src/lib/jobs.ts` — job fetching + filtering

### Which logic must not be broken:
- Supabase Auth flow (signup → profile trigger → login → session)
- Application upsert (unique user_id + job_id constraint)
- RLS policies (user isolation, admin elevation)
- Status enum (9 values, used in DB constraints + frontend labels)
- Job filter + dedup logic (comma-split industries)
- Admin role check (is_admin() SQL function)
- Forum profile fetch workaround (no join, separate query)
- localStorage bottle count tracking (falling animation trigger)

### Which visual direction must be preserved:
- Dark space background (#02040A base)
- Cold color palette (blue, silver, muted gold)
- Professional, restrained, modern
- Chinese UI throughout
- No bright neon, no cartoon, no game-like effects
- Warm star color progression (dark → yellow → gold) for application status

### Which visual direction must be avoided:
- SaaS dashboard look (cards in grid, metrics bar)
- Bright/golden borders on every element
- Decorative subtitle text under every section header
- AI-generated template feel
- Warm/gold as primary structural color
- Overly complex animations that distract from content
- Three.js, Canvas particle systems (keep lightweight)

### Implementation constraints:
- No Three.js (project decision — keep it 2D, CSS/SVG/Canvas only)
- No external image assets (all visuals must be SVG or CSS)
- Supabase anon key only (no service role in browser)
- Mobile-first responsive (but galaxy can degrade to list)
- Must support prefers-reduced-motion
- All text in Chinese (no English UI labels)
- Turbopack build (no Webpack fallback)
- No server-side rendering for data-heavy pages (all client-side fetch with "use client")
