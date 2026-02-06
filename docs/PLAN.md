# PLAN: Midnight Studio UI Enhancement 🎬

This plan outlines the transformation of First Story Films' job management system into a premium, cinematic experience using **Tailwind CSS v4**.

## 🎯 Objectives
- Implement a cohesive "Midnight Studio" design system.
- Transition from standard dashboard layouts to a high-impact cinematic interface.
- Ensure 100% responsiveness and high performance.
- Avoid CSS naming collisions with Tailwind v4 core tokens.

## 🎨 Phase 1: Foundation (Tokens & Identity)
- **Primary Palette**: 
  - `fs-midnight`: `#020617` (Deep Obsidian background)
  - `fs-charcoal`: `#0F172A` (Surface/Card color)
  - `fs-electric`: `#0369A1` (Primary interaction/Accent)
  - `fs-gold`: `#EAB308` (Status/Alert accent for a cinematic pop)
- **Typography**: 
  - Heading: Fira Code (Technical/Pro)
  - Body: Fira Sans (Clean/Modern)

## 🛠 Phase 2: Core Component Revamp
### 1. The Cinema Sidebar
- **Logic**: Slim sidebar by default, expands on hover or click.
- **Glassmorphism**: 10% opacity border with `backdrop-blur`.
- **Active States**: Gradient glow on the left edge.

### 2. Glassmorphic Data Cards
- Replace solid shadows with `border: 1px solid rgba(255,255,255,0.05)`.
- Use a slight gradient background from `#0F172A` to `#1E293B`.

### 3. Precision Inputs & Buttons
- **Buttons**: Micro-shadows and scale-down effects on click.
- **Inputs**: Focus ring with "electric" glow.

## 🔍 Phase 3: Debug & Stability (Orchestration Focus)
- **Agent**: `debugger`
- **Task**: Audit `globals.css` for any variables that might clash with Tailwind v4's internal units (specifically checking prefixing fs-).
- **Audit**: Verify that `maxWidth` and `spacing` utilities are using standard Tailwind scales while design tokens are custom.

## 🚀 Phase 4: Implementation Roadmap
1. **Foundation**: Update `globals.css` with new extended theme.
2. **Auth Surface**: Redesign `login/page.tsx` with high-impact visuals.
3. **Core Shell**: Update `dashboard/layout.tsx` (navigation & layout).
4. **Data Layers**: Update Jobs and Services grids to use new card system.

---
**Verification Criteria**:
- Passes `npx tsc --noEmit`.
- No visual squashing in dev mode.
- Accessibility (A11y) check for contrast in dark mode.
