<!-- BEGIN:nextjs-agent-rules -->
# This is NOT the Next.js you know

This version has breaking changes — APIs, conventions, and file structure may all differ from your training data. Read the relevant guide in `node_modules/next/dist/docs/` before writing any code. Heed deprecation notices.
<!-- END:nextjs-agent-rules -->

# Instructions for LLM Agent (opencode)

## Project
Unique — Arabic/English bilingual quiz platform built with Next.js, MongoDB, JWT auth.

## Build & Typecheck
Run `npx tsc --noEmit` after any TypeScript change. Do NOT run `next build` — it OOMs.

## Goal
Complete the admin panel with role-based auth, bilingual content, full user CRUD, AI key tracking, and group chat system.

## Constraints & Preferences
- Access tokens expire in 15 min; JWT `exp` validated client-side
- Colleges/subjects have separate Arabic/English names (`nameAr`/`nameEn`)
- Admin sees all groups; teachers manage their subject groups; paid students create groups; free users request join
- Only group creator or site admin can delete a group
- Color input must show live preview, accept CSS color names, and validate
- Logout must show a confirmation dialog

## Progress
### Done
- Auth utility `getStoredAuth()` / `getAuthOrRefresh()` validates `exp` claim, used on all pages
- Role-based navbar links (admin → /admin, teacher → /teacher) on landing, about, dashboard, colleges
- Bilingual `nameAr`/`nameEn` on College and Subject models + admin forms + display throughout
- `GET /api/admin/stats` — 10 stat cards on admin dashboard (added groups + messages)
- Admin students page: search, upgrade to teacher (with `SuccessDialog` popup), downgrade from teacher, tier toggle, delete (`ConfirmDialog`)
- Admin teachers page: downgrade to student (removed from `Subject.teacherIds`), delete
- `ApiSetting` model (singleton Gemini key storage) + `ApiUsage` model (per-user token tracking)
- `GET/POST /api/admin/ai` — retrieve masked key + totals, upsert key
- `GET /api/admin/ai/usage?days=30` — per-user usage breakdown
- Admin AI settings page (`/admin/ai`): masked key input, 3 stat cards (requests, in/out tokens), per-user usage table with day filter
- `Group` model extended: `isLocked`, `joinMode` (open/request), `groupAdmins[]`, `blockedMembers[]`
- `JoinRequest` model (pending/approved/rejected, compound unique index)
- Full group chat API: CRUD groups, join/open-request, approve/reject requests, members (add/remove), admins (promote/demote), block/unblock, messages (lock + block check)
- `POST/DELETE /api/groups/[id]/block` — block/unblock endpoint
- Chat page redesign: group sidebar, create dialog, management panel (edit, lock, join-mode, members, admins, requests, block/unblock, blocked list, delete), join buttons, polling every 5s, `?group=` query param support
- Added `tier` to JWT payload and `AuthUser` return (frontend knows subscription status)
- `SuccessDialog` component (green checkmark, name, email)
- Logout confirmation dialogs on admin layout, landing page, dashboard, about page
- `ColorInput` component: live swatch preview, native `<input type="color">`, natural language CSS colornames, validation with error message
- College form uses `ColorInput` instead of plain text input
- Fixed college/subject form crash — `name` field was empty when `nameAr`/`nameEn` was set; payload now derives `name` from `nameAr || nameEn || name || "untitled"`
- Script validation on `nameAr` (must contain Arabic) and `nameEn` (must contain Latin) with inline error messages (colleges + subjects form)
- Admin groups page at `/admin/groups` with grid cards showing member/admin/blocked counts, join mode, type, direct link to chat
- Admin sidebar includes "المجموعات" nav item linked to `/admin/groups`
- `GET /api/admin/stats` now includes `totalGroups` and `totalMessages` counts
- Group list API populates `members`, `groupAdmins`, `blockedMembers` with names/emails/roles
- `tsc --noEmit` passes with zero errors; full `next build` OOMs due to environment memory
- Refactored admin colleges page to use shared `Table`/`TableRow`/`TableCell` components; fixed joined active+comingSoon badge text by rendering them as separate `Badge` components

### Blocked
- Full `next build` crashes with `JavaScript heap out of memory` — environment memory limit, not a code defect

## Key Decisions
- Students page shows both upgrade (student→teacher) and downgrade (teacher→student) buttons depending on current role
- Group chat permissions: site-admin > group-creator > group-admin > member. Only creator/site-admin can delete; block/unblock available to creator and group-admins
- Blocked members stay in the members list but cannot send messages; their UI shows a ban icon
- ColorInput uses CSS color validation (`document.createElement('span').style.color`) rather than a regex
- Bilingual name `name` field is derived from `nameAr || nameEn || name || "untitled"` at form submit time to satisfy API Zod schema

## Critical Context
- Refresh token is httpOnly cookie with `sameSite: "strict"` — XSS-safe, seamless refresh
- `npx tsc --noEmit` confirms zero type errors; build OOM is infra not code
- Teacher/student delete cascades: removing a teacher pulls them from all `Subject.teacherIds`
- Admin groups page calls the same `/api/groups` endpoint (admin sees all groups) with populated member/admin/blocked data

## Relevant Files
- `src/lib/auth-client.ts` — `getStoredAuth()`, `getAuthOrRefresh()` with JWT exp + tier
- `src/lib/auth.ts` — `TokenPayload` now includes `tier`
- `src/models/Group.ts` — `isLocked`, `joinMode`, `groupAdmins`, `blockedMembers` fields
- `src/models/JoinRequest.ts` — new model for join requests
- `src/models/ApiSetting.ts`, `src/models/ApiUsage.ts` — AI key + usage tracking
- `src/app/admin/students/page.tsx` — upgrade (SuccessDialog), downgrade (ConfirmDialog), tier toggle, delete
- `src/app/admin/teachers/page.tsx` — downgrade, delete
- `src/app/admin/ai/page.tsx` — AI key management + usage dashboard
- `src/app/admin/groups/page.tsx` — admin groups management dashboard
- `src/app/chat/page.tsx` — full group chat with management panel (block/unblock, members, admins, requests)
- `src/app/api/groups/[id]/block/route.ts` — block/unblock endpoint
- `src/components/ui/SuccessDialog.tsx` — new success popup
- `src/components/ui/ColorInput.tsx` — new color picker with validation
- `src/app/admin/layout.tsx`, `src/app/page.tsx`, `src/app/dashboard/page.tsx`, `src/app/about/page.tsx` — logout confirmation dialogs
