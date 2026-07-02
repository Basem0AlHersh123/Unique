# UNIQUE — Full UI/UX Redesign Brief

You are a world-class UI/UX designer and frontend engineer. Your task is to redesign **every screen** of the UNIQUE platform — a bilingual (Arabic/English) quiz-based learning platform. Read the 11 grouped source files (01 through 11) in this directory, then produce a **complete, production-ready redesign** of every component and page.

---

## 1. Project Identity

| Property | Value |
|---|---|
| **Name** | UNIQUE — منصة التعلم الذكي |
| **Tagline** | "استعد لاختبارات القبول الجامعي بثقة" |
| **Primary Color** | `#6C63FF` (purple) |
| **Secondary** | `#FF6584` (pink) |
| **Accent** | `#FFD166` (gold) |
| **Teal** | `#14B8A6` |
| **Success** | `#10B981` |
| **Fonts** | Cairo (Arabic) + Inter (Latin) |
| **Framework** | Next.js 16 + React 19 + TypeScript |
| **Styling** | Tailwind CSS v4 (`@import "tailwindcss"`, `@theme inline`) |
| **Icons** | lucide-react |
| **Auth** | JWT access token (localStorage) + httpOnly refresh cookie |
| **i18n** | Custom key-based system (`t()` function), Arabic default, English fallback |

---

## 2. Design Philosophy

Your redesign must embody these principles:

### 2a. Elevate Everything
- **No flat, boring interfaces.** Every card, button, input, and dialog must feel polished and intentional.
- Use **subtle shadows**, **soft gradients**, **border highlights**, **micro-interactions**, and **glassmorphism** (`.glass` class with `backdrop-filter: blur(20px)`) tastefully.
- The existing `Button` component already has `hover:scale-[1.02]` and `active:scale-[0.98]` — carry this DNA everywhere.
- The existing `Card` component already has `hover:shadow-lg hover:-translate-y-1` — extend this approach.

### 2b. Bilingual by Default
- **Every layout must be RTL-first.** Arabic is the default language. English (LTR) is a first-class citizen.
- The `LanguageProvider` mutates `<html dir>` and `<html lang>`. All spacing, margins, paddings, and flex directions must use logical properties or conditional classes based on `isRTL`.
- **No hardcoded left/right.** Use `flex-row` for LTR, `flex-row-reverse` for RTL where appropriate. Mirror icons with `rotate-180` when the language flips.

### 2c. Role-Aware
- The platform has 4 roles: **admin**, **teacher**, **student** (paid tier vs free tier), and **anonymous visitor**.
- The navbar already shows role-specific links. Extend this so every screen adapts to role.
- Admin screens are data-dense (CRUD tables). Teacher screens are management-focused. Student screens are learning-focused. Each should look distinct.

### 2d. Dark Mode is Not an Afterthought
- Toggle via `next-themes` with `attribute="class"`.
- CSS variables in `:root` (light) and `.dark` (dark) control background, surface, text, border colors.
- **Every redesigned component must look stunning in both modes.** Test mentally: does the shadow work on dark? Is the glass effect visible? Do gradients still pop?
- The `ThemeToggle` component shows a shimmer placeholder before hydration — design components with this SSR-safe pattern in mind.

### 2e. Motion with Purpose
- Use the existing CSS keyframes: `shimmer`, `float`, `glow-pulse`, `gradient-shift`, `stagger-fade`, `slide-in-right`, `toast-in`, `toast-out`, `particle-rise`.
- **Page transitions** when navigating between sections (dashboard, chat, settings, admin).
- **Staggered entry** for lists and grid items (`.stagger-children > *`).
- **Micro-interactions** on hover, focus, active for all interactive elements.
- **Loading skeletons** (`shimmer` class or `LoadingSkeleton` component) for data-fetching states.
- `LoadingScreen` component for full-page loading states.

---

## 3. File Groups Reference

The source code is split into 11 files. Read all of them before designing.

| File | What's Inside |
|---|---|
| `01-core-infrastructure.txt` | Root layout, globals.css, not-found, Navbar, ThemeProvider, LanguageToggle, ThemeToggle, ParticlesBackground, auth-client, api, LanguageProvider, i18n index |
| `02-translations.txt` | Complete Arabic/English dictionary (~800 keys) |
| `03-public-pages.txt` | Landing page, About, Contact, Colleges list, College detail |
| `04-authentication.txt` | Login, Register, Forgot password, Reset password, Zod auth schemas |
| `05-dashboard-learning.txt` | Dashboard layout+home, Subject detail, Topic detail, Quiz, Unit exam, AnimatedCounter hook |
| `06-chat.txt` | Group chat layout + full chat page (1618 lines) |
| `07-ai-chat.txt` | AI chat page |
| `08-settings.txt` | Profile/settings page |
| `09-teacher-panel.txt` | Teacher layout + dashboard |
| `10-admin-panel.txt` | Admin layout + all CRUD pages (17 files, 229KB) |
| `11-ui-components.txt` | 16 reusable UI components |

---

## 4. Screen-by-Screen Design Directives

### 4a. Core Infrastructure
**Keep as-is or improve subtly.** The root layout, providers, auth client, API client, and i18n system are architectural — don't break them.

- **Navbar**: Make the glass effect more prominent. The current nav links hide labels on mobile — consider a bottom tab bar for mobile instead.
- **ParticlesBackground**: Consider making particles responsive (fewer on mobile) and interactive (follow cursor).
- **not-found.tsx**: Add a playful illustration or animation.

### 4b. Public Pages (Landing, About, Contact, Colleges)

#### Landing Page (`page.tsx`)
Current structure: Hero → Stats → Video section → Features grid → Testimonials → CTA → Footer.
- **Hero**: Must be breathtaking. Full-bleed gradient/purple background, floating shapes, animated headline, CTA buttons with glow effect. The hero should immediately convey "modern EdTech."
- **Stats** (`AnimatedStat`): Make counters more dramatic — scale up on scroll into view, add icon animations.
- **Video section**: Wider, with a play button overlay, glass-effect border.
- **Features grid**: Each feature card should have a distinct icon + gradient accent, staggered entrance.
- **Testimonials**: Carousel/slider with avatar, quote, name. Auto-rotate with pause on hover.
- **Footer**: Currently inline. Make it a full site footer with columns: brand, quick links, contact info, social icons. Dark variant on scroll.

#### About Page
- Similar hero treatment. Stats with animated counters. Team/values section with cards.
- **Testimonial videos**: Grid of video thumbnails with play buttons.

#### Contact Page
- Split layout: form on one side, contact info (phone, email, address, map placeholder) on the other.
- Clean, minimal. Inputs with floating labels. Send button with loading state.

#### Colleges Page
- Grid of college cards. Each card shows the college icon, name (Ar + En), color swatch.
- **Hover**: card lifts, icon animates, color glow spreads.
- Filter/search bar at top.

#### College Detail Page
- Header with college color/icon. Subject list as cards with progress bars or "enroll" buttons.
- Auth-gated: anonymous users see "سجل دخول للانضمام" overlay.

### 4c. Authentication Pages
- **Login**: Centered card on gradient background. Turnstile captcha below the form. "Forgot password?" link. Deactivated account shows a reactivation prompt with inline message.
- **Register**: Multi-step (University → College → Form). Step indicator with animated progress. Each step slides in. Turnstile on final step.
- **Forgot Password**: Minimal — email input, success state with email icon and "تحقق من بريدك" message.
- **Reset Password**: Token in URL. New password + confirm with `PasswordStrength` meter. Success → auto-redirect to login.

### 4d. Dashboard & Learning
- **Dashboard Home**: Radar chart (use `canvas` or a lightweight chart lib), stats cards, recent activity list with avatars, weekly activity heatmap strip, unit exam cards.
- **Subject Detail**: Accordion for levels. Each level expands to show units → topics. Progress bar per level. Breadcrumb nav.
- **Topic Detail**: Video player (YouTube embed or mp4), key points as bullet cards, vocabulary list with translation toggle, AI Q&A section with message input, markdown content rendered with `MarkdownRenderer`.
- **Quiz**: Paginated (1 question at a time) or all-at-once. Timer. Option cards that highlight on select. Correct/wrong feedback after each answer. Score summary at end with confetti for passing.
- **Unit Exam**: Timed, all questions visible. Pass/fail with cooldown timer (show countdown until retry). Progress bar at top.

### 4e. Chat (Group Chat)
**This is the most complex UI in the app (1618 lines).** Group chat with messaging, image upload, group management, admin controls.

**Layout**: Three-panel desktop (sidebar → chat → detail), single-panel mobile with slide-over.
- **Sidebar**: Group list with avatars (first letter + color), unread badge, lock/type icons. "Create group" FAB at bottom.
- **Chat area**: Message bubbles (own = purple right, others = gray left). Timestamps. Image previews in-line. Typing indicator. Emoji picker. Attachment button (image upload). Edit/delete own messages.
- **Detail panel**: Group info (name, description, type). Members list with admin badges. Blocked members list. Join requests (approve/reject). Settings: lock, join mode, visibility, image permission.
- **Admin actions**: Promote/demote admin, block/unblock, remove member, delete group (creator only).
- **Responsive**: Mobile uses a bottom sheet or slideover for the detail panel. Sidebar becomes a hamburger drawer.

### 4f. AI Chat
- Clean chat interface. Messages from AI stream in (markdown rendered). Input bar at bottom. Subject context selector at top.
- Modeled after ChatGPT but with the UNIQUE purple theme. Dark mode support.

### 4g. Settings
- Profile image upload with crop/preview. Name, email fields. Password change section with `PasswordStrength`. College/university selector (dropdowns). Danger zone: delete account with `ConfirmDialog`.
- Tabbed or sectioned layout. Glass cards for each section.

### 4h. Teacher Panel
- **Layout**: Collapsible sidebar with dashboard, subjects, topics, units, questions, exam questions, groups. Logout button with confirmation.
- **Dashboard**: Stats (students, subjects, questions). Recent activity. Quick action buttons.

### 4i. Admin Panel (17 files, 229KB)
**The most data-heavy area.** Every CRUD page follows a similar pattern: table + modal/drawer form.

- Keep the **shared Table/TableRow/TableCell** component pattern. Enhance with:
  - **Sortable columns** (click header to sort)
  - **Search bar** that filters all columns
  - **Row hover** with action buttons appearing
  - **Bulk select** with batch actions (delete, export)
  - **Pagination** with page size selector
- **Forms** (universities, colleges, subjects, levels, units, topics, questions, announcements):
  - Use the existing `ColorInput`, `IconPicker`, `ImageTypeSelector` components but make them more polished.
  - Slide-in drawer (preferred) or modal dialog for add/edit.
  - **Bilingual fields** (`nameAr`/`nameEn`, `titleAr`/`titleEn`, `bodyAr`/`bodyEn`) side by side or with language tabs.
  - **Validation**: inline error messages below fields (already done for nameAr/nameEn script validation).
- **Dashboard** (`admin/page.tsx`): Stat cards with icons + animated counters, charts (user growth, question distribution), recent students/attempts list.
- **Students page**: Search bar, tier badge (paid/free with gold/gray), role badge (student/teacher), action buttons (upgrade, downgrade, deactivate, delete).
- **Teachers page**: Subject assignment chips/tags.
- **AI page**: Key input (masked) + usage stats cards + per-user usage table with day filter dropdown.
- **Groups page**: Grid cards with member/admin/blocked counts, join mode badge, direct "open in chat" link.
- **CMS page**: Inline editors for hero video URL, testimonial videos list, hero images, about section text. Live preview.
- **Contact Messages**: Inbox-style list (read/unread dots), expand to read full message, search.

### 4j. UI Components (Design System)
**Redesign every component.** They must be visually cohesive:

| Component | Design Requirements |
|---|---|
| **Badge** | Pill-shaped, multiple variants (primary, success, warning, danger, outline). Subtle shadow. Small dot variant. |
| **Button** | Already solid. Add `outline` variant refinement. Add `icon-only` mode. Loading spinner inside. Ripple effect on click (optional). |
| **Card** | Already solid. Add `withImage` variant (header image). Add `withBadge` (corner badge). |
| **ColorInput** | Live swatch preview, native color picker + text input for CSS names. Validation error. |
| **ConfirmDialog** | Centered modal with backdrop blur. Icon (warning/info/danger). Two buttons. Escape to close. |
| **SuccessDialog** | Green checkmark animation. Name + email display. Auto-close or manual. |
| **IconPicker** | Grid of icons with search. Selected state with ring. |
| **ImageTypeSelector** | Toggle buttons with icons (illustration/real/icon/mixed). |
| **Input** | Floating label or top label. Error state with icon. Password reveal toggle. Left/right icon slots. |
| **LoadingScreen** | Full-page overlay with spinner + platform logo. |
| **LoadingSkeleton** | Pulse animation blocks mimicking card/table/list shapes. |
| **MarkdownRenderer** | Clean typography for rendered markdown (math with KaTeX, code blocks with copy button). |
| **PasswordStrength** | Segmented bar (weak → strong). Color transitions red → yellow → green. Text label. |
| **Table** | Striped rows, sticky header, sort indicators, responsive (horizontal scroll on mobile). |
| **Toast / ToastProvider** | Stacked toasts, auto-dismiss, swipe to dismiss. Success (green), error (red), info (blue), warning (yellow) variants. |

---

## 5. Technical Constraints

### Do NOT change:
- The auth system (`auth-client.ts`, `api.ts` interceptors, refresh flow)
- The i18n system (`LanguageProvider`, `translations.ts`, `t()` calls)
- The provider hierarchy in `layout.tsx`
- The `next-themes` `ThemeProvider` wrapping
- The Tailwind v4 configuration (CSS variables + `@theme inline`)
- The mongoose model schemas or API routes (server-side is out of scope)

### You MAY change:
- Any `.tsx` file under `src/app/`, `src/components/`, `src/lib/` (client)
- `globals.css` — add new CSS variables, animations, utility classes
- Component props and interfaces (extend, don't break backward compatibility)
- Layout structure (rearrange sections, add wrappers, change nesting)

### Must preserve:
- All `"use client"` directives where needed
- `useLanguage()` calls for bilingual text
- `getAuthOrRefresh()` / `getStoredAuth()` for auth state
- RTL/LTR logic (`isRTL`, `dir`)
- Every translation key usage (don't break `t('...')` calls)
- Accessibility: `aria-label`, `role`, `tabIndex`, keyboard handlers
- All existing functionality (message sending, quiz scoring, CRUD operations, etc.)

### Performance:
- Avoid heavy animation libraries (GSAP, framer-motion). Use CSS keyframes and Tailwind transitions. The `@keyframes` in `globals.css` are sufficient.
- Lazy-load below-fold components where possible.
- Images should use `next/image` with proper sizing.
- The chat page polls every 5s — keep this, but consider adding `visibilitychange` pause.

---

## 6. Mobile Responsiveness

Every screen must be fully responsive:
- **Mobile first** — design for 375px, then extend to tablet (768px) and desktop (1280px+).
- Navbar: bottom tab bar on mobile (icons only), full navbar on desktop.
- Admin tables: horizontal scroll on mobile, or convert to card list.
- Sidebars (teacher, admin, chat): off-canvas drawer on mobile, persistent on desktop.
- Settings: stacked on mobile, two-column on desktop.
- Auth pages: full-screen card on desktop, edge-to-edge on mobile.
- Landing page: stacked sections on mobile, side-by-side on desktop.

---

## 7. Output Format

Produce **one new `.tsx`/`.ts`/`.css` file per source file you change**, with the **exact same relative path** from `src/`. Include the full file content. For example:

```
OUTPUT: src/app/page.tsx
```
```tsx
// full redesigned file content
```

```
OUTPUT: src/components/ui/Card.tsx
```
```tsx
// full redesigned file content
```

If a file needs no changes, say `// unchanged` and briefly explain why.

**Group your output by the same 11 groups** used in the source files, so I can diff and review systematically.

---

## 8. Final Checklist

Before delivering, verify:
- [ ] Every screen looks exceptional in both light and dark mode
- [ ] RTL layout is correct (Arabic) and LTR layout is correct (English)
- [ ] All translation keys are preserved and used correctly
- [ ] Auth state is respected (anonymous vs logged-in, student vs teacher vs admin)
- [ ] Mobile responsive (375px, 768px, 1280px)
- [ ] Loading states (skeletons, spinners) for data fetching
- [ ] Empty states (no messages, no results, no groups) with helpful illustrations
- [ ] Error states (API failure, network error) with retry buttons
- [ ] Micro-interactions on hover/focus/active for all interactive elements
- [ ] No regressions — the app still works exactly as before, just looks far better

---

**You have the full source code. You understand the architecture. Now design something extraordinary.**
