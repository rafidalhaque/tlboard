# Fix Prompt: tlboard UI/UX pass (login, dashboard, admin)

Paste this into Claude Code. The app works functionally but the UI reads as an unstyled scaffold — no visual hierarchy, no identity, weak empty states. Fix these three screens as a set, using one shared design system, not three one-off patches.

---

## Establish a shared design system first

Before touching individual screens, create/confirm these as reusable primitives (component library or shared CSS):

- **Color**: one accent color (pick one — e.g. a mid-blue or indigo) used ONLY for primary actions and active/selected states. Everything else is neutral gray. Right now every button looks identical, so nothing reads as "the important one."
- **Typography scale**: page title (20–24px/500), section heading (16px/500), body (14px/400), muted/meta text (12–13px/400, secondary color). Stop using the same weight/size for headings, labels, and buttons.
- **Spacing scale**: 4/8/12/16/24/32px. Audit current screens — spacing looks ad hoc (e.g. that top accent bar on login/admin is a leftover, not an intentional design element — either make it a deliberate brand stripe with real color or remove it).
- **Buttons**: exactly one primary style (filled, accent color, used once per screen for the main action), one secondary style (outline/ghost, for everything else), one destructive style (red text or fill, used sparingly, never at equal visual weight to primary actions).
- **Cards**: consistent border-radius (10–12px), consistent border (1px, light gray), no double-bordering.
- **Empty states**: never just a gray sentence floating alone. Every empty state gets an icon or illustration, a one-line explanation, and — where relevant — a CTA.

---

## Screen 1: Login page

**Current problems:**
- Stray dark bar pinned to the top of the viewport with no purpose — looks like a rendering bug, not a design choice.
- Card floats in a sea of empty gray with no visual anchor (no logo mark, no illustration, no context about what tlboard actually does beyond one line of gray text).
- "Continue with Google" / "Continue with GitHub" buttons have no provider icons — visually indistinguishable from each other and from any other button in the app.
- No loading state on click, no error state (e.g. OAuth failure, account rejected/banned trying to log in), no focus states specified.

**Fixes:**
1. Remove the stray top bar, or convert it into an intentional 3–4px accent stripe in the brand color if you want a brand touch — not an unstyled leftover.
2. Add a simple wordmark or icon above "tlboard" (even a simple geometric mark is fine — this is a real product, not a placeholder).
3. Add the Google and GitHub logos (official brand SVGs, left-aligned inside each button, 18–20px) to the auth buttons. Buttons should be full-width, 44–48px tall, clearly tappable.
4. Add a loading state per button (spinner replaces text, button disabled) while the OAuth redirect is in flight.
5. Add an error banner slot above the buttons for: OAuth failure, "your account was rejected," "your account was banned" — each with distinct copy, not a generic error string.
6. Center the whole card vertically as well as horizontally (currently it sits high/awkward on tall viewports) and cap card width at ~400px.

---

## Screen 2: Dashboard (boards list)

Reference the dashboard mockup already discussed in this conversation — thumbnail-style board cards (icon or preview tile, not just text), one primary action (Open, via clicking the card itself) with secondary actions (Rename, Share, Duplicate, Delete) collapsed into a `⋯` overflow menu instead of five equal-weight buttons, a visibility badge (Private/Org) on each card, and a dashed "create new board" tile shown alongside real boards instead of leaving the rest of the page empty. Header should visually separate the logo, search, and account controls (Admin button, avatar, sign out) with the account cluster grouped together on the right, avatar as an initials circle rather than plain text.

**Additional requirements not covered by the mockup:**
- Zero-boards empty state: centered illustration/icon, "Create your first board" headline, one-line explanation, single primary "New board" button — not a blank page.
- Search results state: as-you-type filtering of the grid, with matched text highlighted, and a distinct "no boards match" state (different from the zero-boards state).
- Loading state for the initial board-list fetch (skeleton cards, not a blank flash).

---

## Screen 3: Admin panel

**Current problems:**
- "Pending Users" / "All Users" / "Settings" tabs are functional but visually thin — active tab indicator is just a color change plus underline with no spacing/weight difference, easy to miss.
- Empty "No pending users." state is a single gray sentence in a vast blank page — no visual weight, doesn't confirm the check actually ran successfully.
- No visible content for "All Users" or "Settings" tabs was shown, but they need the same treatment: don't ship a bare table or bare toggle with no card/spacing structure.
- "Dashboard" back-link top-left is a bordered button, same visual weight as any other button — should read as clear secondary navigation (ghost/text style, arrow icon), not compete with page actions.

**Fixes:**
1. Give the active tab a stronger state: bold weight (500) + accent-colored underline + accent text color, inactive tabs at secondary/muted color. Add a count badge next to "Pending Users" (e.g. "Pending users · 3") so admins don't have to click in to know if action is needed.
2. Empty pending-queue state: icon (e.g. checkmark), "You're all caught up" headline, "No accounts waiting for approval." body — confirms the query ran and there's genuinely nothing to do, rather than looking broken.
3. "All Users" tab: table or row-list (bordered rows per the restraint principle, not individual cards) with columns for avatar+name, email, provider, status badge (color-coded: pending=amber, approved=green, rejected=gray, banned=red), role, and a row-level actions menu. Include the filter/search bar specified in the original build prompt — it wasn't visible in the screenshot, so verify it's actually implemented.
4. "Settings" tab: wrap the Signup Mode radio choice in a card with a clear heading ("Signup mode"), helper text explaining the consequence of each option, and a visible "Save" action if changes aren't auto-saved (don't leave the user guessing whether a radio click persisted).
5. Restyle the "← Dashboard" link as ghost/text-only with a left arrow icon, visually lighter than the "Admin" page title next to it.

---

## General QA pass

- Every screen needs a defined loading and error state, not just the happy path — audit all three for missing states before calling this done.
- Confirm dark mode isn't broken — none of the current screens show any dark-mode handling; check whatever CSS variable/theme system the frontend uses actually flips these screens too.
- Run a pass at 375px viewport width — the dashboard grid and admin tabs both need to reflow sanely on mobile, not just clip.
- Commit UI fixes as their own commits, separate from any backend/logic changes, so the design pass is easy to review or revert independently.