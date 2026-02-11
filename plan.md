

# Plan: Enhance Android Mobile Game Experience + Private Room Setup

## Overview
Optimize the entire game screen for Android/mobile with smooth 60fps animations, touch-friendly controls, responsive layouts, and add a private room creation feature for friends to play locally. This covers 8 files of mobile UX improvements plus a new private room system with database support.

---

## Part 1: Mobile UX Enhancements

### Step 1: Viewport and Meta Tags
**File: `index.html`**
- Add `viewport-fit=cover` to the existing viewport meta tag for edge-to-edge rendering
- Add `<meta name="theme-color" content="#0d1117">` for Android status bar color matching the dark casino theme
- Add `<meta name="mobile-web-app-capable" content="yes">` for fullscreen capability
- Update title/description to "Sindhi Sparkle" branding

### Step 2: Mobile CSS Utilities
**File: `src/index.css`**
- Add `touch-action: manipulation` on interactive elements to kill the 300ms tap delay
- Add `-webkit-tap-highlight-color: transparent` on body
- Add `overscroll-behavior: none` on `.game-container` class to prevent pull-to-refresh
- Add `@media (prefers-reduced-motion: reduce)` block to disable shimmer/float/pulse animations
- Add safe-area padding utilities: `.safe-area-bottom { padding-bottom: env(safe-area-inset-bottom, 16px); }`
- Add `.game-container` class with `height: 100dvh; touch-action: none; user-select: none;`

### Step 3: Responsive Game Page
**File: `src/pages/Game.tsx`**
- Import and use `useIsMobile()` hook
- Change outer div from `min-h-screen` to the new `game-container` class on mobile
- Lock body scroll on mount with `useEffect` (set `document.body.style.overflow = 'hidden'`, restore on unmount)
- Top bar: reduce padding to `p-2` on mobile, shrink icon buttons
- Timer: reposition below the top bar on mobile instead of absolute center (avoids overlap)
- Game table container: change `pb-48` to `pb-40` on mobile for more table space
- Add safe-area-bottom class to the betting controls wrapper area

### Step 4: Responsive Game Table
**File: `src/components/game/GameTable.tsx`**
- Import `useIsMobile()`
- Change `inset-8` to `inset-2 sm:inset-8` (responsive)
- Change `rounded-[100px]` to `rounded-[50px] sm:rounded-[100px]`
- Change `border-8` to `border-4 sm:border-8`
- Inner border: `rounded-[40px] sm:rounded-[80px]`
- Pot text: smaller font on mobile
- Community cards gap: `gap-1 sm:gap-2`
- `min-h-[500px]` to `min-h-[350px] sm:min-h-[500px]`

### Step 5: Mobile Player Seats
**File: `src/components/game/PlayerSeat.tsx`**
- Import `useIsMobile()`
- Create separate mobile position map that uses tighter positioning to prevent overlap on small screens:
  - `bottom`: same
  - `left`: `left-1 top-1/2` (instead of `left-4`)
  - `right`: `right-1 top-1/2` (instead of `right-4`)
  - `top`: `top-2 left-1/2`
  - `top-left`: `top-4 left-[10%]`
  - `top-right`: `top-4 right-[10%]`
- Mobile: Avatar `w-8 h-8` (instead of `w-10 h-10`), name `max-w-16` (instead of `max-w-20`)
- Mobile: Empty seat `w-16 h-20` (instead of `w-24 h-32`)
- Reduce padding in player info cards on mobile

### Step 6: Touch-Friendly Betting Controls
**File: `src/components/game/BettingControls.tsx`**
- Import `useIsMobile()`
- Increase all action button heights: `size="lg"` with added `h-12 min-h-[48px]` on mobile (Material Design guideline)
- Increase minimum button widths: `min-w-28` for Fold, `min-w-32` for Call, `min-w-36` for Raise
- Slider: add custom class for thicker track on mobile (override to `h-3`)
- Preset raise buttons: horizontal scroll container with `overflow-x-auto flex-nowrap` on mobile
- Add `active:scale-95 transition-transform` on all action buttons for tactile press feedback
- Add safe-area bottom padding to the fixed bottom container
- Player chips display: larger font on mobile

### Step 7: Responsive Playing Cards
**File: `src/components/game/PlayingCard.tsx`**
- Remove `whileHover` on mobile (no hover on touch devices) -- conditionally apply using `useIsMobile()`
- Simplify spring config on mobile: `stiffness: 80` instead of `100`, remove `x: -100` initial animation
- Keep size classes as-is (sm is already compact)

### Step 8: Responsive Chip Stack
**File: `src/components/game/ChipStack.tsx`**
- Import `useIsMobile()`
- On mobile: cap `numChips` to `Math.min(3, ...)` instead of 5 to reduce rendering
- Remove edge detail divs (the 4 rotated lines) on mobile for cleaner look and better perf
- `SingleChip`: remove `whileHover` on mobile, keep `whileTap`

---

## Part 2: Private Room for Friends

### Step 9: Database Migration
Create a new migration to add a `room_code` column and private room support:
- Add `room_code` column (TEXT, nullable, unique) to `game_tables` table
- Add `is_private` column (BOOLEAN, default false) to `game_tables`
- Add `created_by` column (UUID, nullable) to `game_tables`
- Add RLS policy: players can INSERT into `game_tables` if authenticated (to create private rooms)
- Add RLS policy: private tables are only visible to players who know the code or are in the session

### Step 10: Create Private Room Dialog
**New file: `src/components/lobby/CreatePrivateRoomDialog.tsx`**
- Dialog with form fields: Room Name, Max Players (2-6), Buy-in Range, Blinds
- Auto-generates a 6-character alphanumeric room code
- Creates a record in `game_tables` with `is_private = true` and the generated `room_code`
- Shows the room code prominently after creation for sharing with friends
- Copy-to-clipboard button for the room code

### Step 11: Join Private Room Dialog
**New file: `src/components/lobby/JoinPrivateRoomDialog.tsx`**
- Simple dialog with a 6-character code input (using `input-otp` component for nice UX)
- Looks up the `game_tables` record by `room_code`
- If found and not full, navigates to the game
- Error states for invalid code, full room, or inactive room

### Step 12: Update Lobby Page
**File: `src/pages/Lobby.tsx`**
- Add "Private Room" button next to "Create Table"
- Add "Join Room" button with a key/lock icon
- Wire up both dialogs
- Filter: private tables only show if user created them or has the code

---

## Files Summary

| Action | File | Purpose |
|--------|------|---------|
| Modify | `index.html` | Viewport, theme-color, mobile meta tags |
| Modify | `src/index.css` | Touch utilities, safe areas, reduced motion |
| Modify | `src/pages/Game.tsx` | Mobile layout, scroll lock, responsive spacing |
| Modify | `src/components/game/GameTable.tsx` | Responsive table sizing |
| Modify | `src/components/game/PlayerSeat.tsx` | Mobile seat positions |
| Modify | `src/components/game/BettingControls.tsx` | Touch-friendly controls |
| Modify | `src/components/game/PlayingCard.tsx` | Mobile animation optimization |
| Modify | `src/components/game/ChipStack.tsx` | Mobile chip rendering |
| Modify | `src/components/ui/slider.tsx` | Thicker mobile track variant |
| Create | Migration SQL | room_code, is_private, created_by columns |
| Create | `src/components/lobby/CreatePrivateRoomDialog.tsx` | Private room creation UI |
| Create | `src/components/lobby/JoinPrivateRoomDialog.tsx` | Join by code UI |
| Modify | `src/pages/Lobby.tsx` | Private room buttons and dialogs |

---

## Technical Notes

- `useIsMobile()` hook already exists at 768px breakpoint -- will be reused throughout
- All mobile checks are runtime via the hook for components, CSS media queries for global styles
- Spring animations simplified on mobile: fewer properties, lower stiffness for 60fps on mid-range Android
- Safe area insets use `env()` with fallback values for devices without notches
- Room codes: 6-char uppercase alphanumeric, generated client-side, uniqueness enforced by DB constraint
- Private room RLS: authenticated users can create; visibility restricted to creator + joined players + those with the code (lookup via a database function)

