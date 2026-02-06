# UI/UX Refinement Plan: Aesthetic Studio Light Pro

## 📋 Task Overview
Coordinate specialized agents to refine the UI/UX of First Story Films studio management platform to a "Production-Grade" aesthetic while ensuring zero changes to core functionality or naming conventions.

---

## 🎨 Design System (Source: MASTER.md)
| Element | Specification |
|---------|---------------|
| **Theme** | Aesthetic Studio Light |
| **Accent** | Electric Indigo (#6366f1) + Electric Blue (#0ea5e9) |
| **Background**| #f8fafc (Subtle Slate) |
| **Surface** | #ffffff (Pure White) |
| **Typography**| Inter (UI) + Fira Code (Technical Headers) |
| **Effects** | Motion-Driven (smooth transitions, glassmorphism) |

---

## 🛠️ Orchestration Strategy (3+ Agents)

### Phase 1: Planning (Current)
- **Agent:** `project-planner`
- **Output:** This document (`docs/ui-ux-refinement.md`)

### Phase 2: Implementation (Sequential Execution)

#### Agent 1: `frontend-specialist` (Design Execution)
- **Task:** Finalize `globals.css` with the full design system. Implement missing micro-interactions (hover, focus, transitions).
- **Scope:** 
  - `app/globals.css`: Expand utility classes for glassmorphism and motion.
  - `app/dashboard/layout.tsx`: Refine Sidebar profile widget and nav active states.
  - `app/dashboard/page.tsx`: Polish dashboard stats with "Production" aesthetics.
  - Audit all admin pages for pixel-perfect alignment.

#### Agent 2: `performance-optimizer` (Experience Polish)
- **Task:** Audit and optimize UI responsiveness and smoothness.
- **Scope:** 
  - Verify mobile responsiveness (375px+).
  - Ensure 300-400ms transitions for all interactive elements.
  - Check for layout shifts during state changes.

#### Agent 3: `test-engineer` (Verification)
- **Task:** Run validation scripts to ensure zero breaking changes.
- **Scope:**
  - `python .agent/scripts/checklist.py .`
  - Manual visual verification of naming conventions (Ensuring "Staff", "Jobs", etc. remain unchanged).

---

## 📝 Detailed Task Breakdown

### 1. Global Styles Refresh
- [ ] Add `--fs-glass-bg` and `--fs-glass-border` tokens.
- [ ] Implement `.btn-aesthetic-cta` for primary actions.
- [ ] Refine `.card-aesthetic` with dynamic shadow hover (`shadow-luxury`).

### 2. Dashboard Interface
- [ ] Update Stats Cards with icon-specific color backgrounds.
- [ ] Add "Welcome" header motion entrance.

### 3. Navigation Refinement
- [ ] Ensure sidebar active state uses the indigo gradient.
- [ ] Add smooth transition to sidebar profile widget.

### 4. Admin Page Audit
- [ ] Check `Staff Registration` spacing and form alignment.
- [ ] Verify `Job List` table contrast and status badge legibility.
- [ ] Ensure `Vendor Management` modal follows the new glassmorphism spec.

---

## 🛑 CHECKPOINT: User Approval Required
**Please confirm the plan above to proceed with Phase 2 implementation.**
