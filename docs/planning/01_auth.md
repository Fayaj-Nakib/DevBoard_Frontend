# Prompt 01 — Auth Pages

Read `DEVBOARD_ROADMAP.md`, `DESIGN_SYSTEM.md`.
`00_setup.md` is complete — tokens, utils, ThemeProvider, AppLayout all exist.

## Task
Redesign all authentication pages. These pages do NOT use AppLayout (no TopNav/Sidebar).

---

## Shared auth layout

Create `components/auth/auth-layout.tsx`:

Two-column layout (desktop) / single column (mobile):

```
┌─────────────────────┬─────────────────────┐
│                     │                     │
│   LEFT PANEL        │   RIGHT PANEL       │
│   bg-primary        │   bg-background     │
│   Branding          │   Form              │
│   (hidden mobile)   │                     │
│                     │                     │
└─────────────────────┴─────────────────────┘
```

LEFT PANEL (`hidden md:flex`, bg-primary, flex-col, justify-between, p-10):
- TOP: "DevBoard" logo in white (font-semibold text-xl, with a small white square icon)
- CENTER:
  - Large headline: `"Ship faster. Stay aligned."` — text-4xl font-bold text-white leading-tight
  - Subtext: `"Tasks, sprints, and timelines built for developer teams."` — text-white/70 text-base mt-3
  - Decorative glow blobs: 2 absolutely positioned divs, rounded-full, bg-white/10, blur-3xl, pointer-events-none (one top-right ~300px, one bottom-left ~200px)
- BOTTOM: Testimonial card (white bg, rounded-xl, p-4, shadow-lg):
  - Quote: `"DevBoard replaced Jira for our 12-person team. We ship 30% faster."` — text-sm text-foreground
  - Author row: Avatar (initials, bg-primary-subtle) + Name `"Arif Rahman"` + Role `"CTO, Stackhive"` — text-xs text-foreground-secondary

RIGHT PANEL (flex-1, flex items-center justify-center, p-6):
- Inner container: w-full max-w-[380px]
- Slot for form content

LEFT panel is `md:w-[45%]`, RIGHT panel is `flex-1`.

---

## Install form dependencies

```bash
npm install react-hook-form @hookform/resolvers zod
```

---

## Page 1 — Login `/login`

Right panel content:

```
Welcome back              ← text-sm text-foreground-tertiary
Sign in to DevBoard       ← text-2xl font-semibold mt-1
Don't have an account? Sign up  ← text-sm text-foreground-tertiary, "Sign up" = Link in text-primary
```

Form (React Hook Form + Zod):
- Email field: Label + Input, placeholder `"you@company.com"`
- Password field: Label + Input type="password" with show/hide toggle (Eye/EyeOff icon button absolutely positioned inside input right side)
- Row: "Remember me" Checkbox + label LEFT, "Forgot password?" Link RIGHT (text-sm text-primary)
- Submit Button: full width, `"Sign in"`, loading state = `<Loader2 className="animate-spin" />` + "Signing in..."

Divider: shadcn Separator with `"or"` text centered over it (relative positioned span).

Social buttons row (two buttons side by side):
- Google: outline Button, Google SVG icon + "Google"
- GitHub: outline Button, Github icon from Lucide + "GitHub"

Micro-interactions:
- Input focus: ring-primary, smooth transition
- Form wrapper: `animate-fade-in` on mount
- Button hover: `hover:scale-[1.01] transition-transform`

Validation errors: below each field, `text-sm text-destructive animate-slide-up`

---

## Page 2 — Register `/register`

Same AuthLayout. Right panel:

```
Create your account
Already have an account? Sign in
```

Form fields in order:
1. Full name — Input
2. Email — Input
3. Password — Input + password strength bar below:
   - 4 segment bar (`div` with 4 equal-width spans)
   - Segments fill left to right as password strengthens
   - Colors: `bg-destructive` (1) → `bg-warning` (2) → `bg-warning` (3) → `bg-success` (4)
   - Strength label: "Weak" / "Fair" / "Good" / "Strong" — text-xs, matching color
   - Use simple scoring: length ≥8 (+1), has uppercase (+1), has number (+1), has special char (+1)
4. Confirm password — Input, shows `<Check className="text-success" />` icon inside input when it matches

Terms checkbox:
```tsx
<div className="flex items-start gap-2">
  <Checkbox id="terms" />
  <label htmlFor="terms" className="text-sm text-foreground-secondary leading-relaxed">
    I agree to the <Link className="text-primary">Terms of Service</Link> and{' '}
    <Link className="text-primary">Privacy Policy</Link>
  </label>
</div>
```

Submit: full width Button "Create account"

---

## Page 3 — Forgot Password `/forgot-password`

Single centered layout (no split panel). Full screen centered column.

Container: `min-h-screen flex items-center justify-center bg-background p-6`
Inner: `w-full max-w-[400px]`

```
← Back to sign in     ← ghost Button with ChevronLeft icon at top
```

Icon block: `w-12 h-12 rounded-xl bg-primary-subtle flex items-center justify-center mx-auto`
  → `<Mail className="w-6 h-6 text-primary" />`

```
Forgot your password?   ← text-2xl font-semibold text-center mt-4
Enter your email and we'll send you a reset link.  ← text-sm text-foreground-tertiary text-center mt-2
```

Form:
- Email Input
- Submit Button: full width "Send reset link"

SUCCESS STATE (shown after submit, replaces form with `animate-fade-in`):
```
<CheckCircle2 className="text-success" />  ← same icon block style, green
Check your email
We sent a link to {email}
```
+ "Resend email" ghost Button (with 60s cooldown — show countdown "Resend in 45s", disabled during cooldown)

---

## Page 4 — Reset Password `/reset-password`

Same centered single-column layout as forgot password.

Icon: `<Lock className="w-6 h-6 text-primary" />`

```
Set new password
```

Form:
- New password — Input + same strength indicator as register
- Confirm password — Input + match checkmark

Submit: "Reset password" full width

On success: redirect to `/login` and show a toast:
```tsx
toast.success("Password updated", {
  description: "Please sign in with your new password."
})
```

---

## Toasts

Install and configure shadcn Sonner:
```bash
npx shadcn@latest add sonner
```

Add `<Toaster />` to root layout.

Use `toast.error()` for auth failures and `toast.success()` for success events.

---

## Responsive rules

- Below `md` (768px): LEFT panel is hidden, RIGHT panel is full screen
- Mobile form: add `py-8` padding top/bottom so content doesn't hit edges
- Both pages must look correct on 375px width

---

## Verification checklist

- [ ] Login form submits and calls the existing auth endpoint
- [ ] Register form submits and calls the existing register endpoint
- [ ] Password strength bar animates as user types
- [ ] Show/hide password toggle works
- [ ] Forgot password success state renders after submit
- [ ] Light and dark mode both look correct on all 4 pages
- [ ] Responsive: mobile hides left panel correctly
