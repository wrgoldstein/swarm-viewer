# Design System

## Aesthetic Philosophy

This application follows a **productive minimalism** aesthetic - beautiful through restraint, with color used strategically for function rather than flair. Think modern developer tooling like Linear, Vercel, Raycast, or contemporary GitHub.

## Core Principles

### 1. Scandinavian Minimalism
- Restrained use of color
- Generous white space
- Subtle borders and separation
- Functional, purposeful design
- Nothing decorative without purpose

### 2. Information Density
- Present lots of data cleanly without cluttering
- Clear information hierarchy
- Structured, scannable layouts
- Efficient use of space

### 3. Developer-First
- Monospace fonts for technical content (paths, identifiers, code)
- Clean sans-serif for UI text
- Precise, unambiguous labeling
- Fast, keyboard-friendly interactions

## Color System

### Approach
Colors serve **function over decoration**:
- Agent identification (consistent color per agent)
- Status indicators (active sessions, states)
- Visual hierarchy (subtle grays for secondary info)
- Data visualization (minimap timeline)

### Palette
- **Backgrounds**: Pure white (`#ffffff`), subtle gray (`#f9fafb`, `#f3f4f6`)
- **Text**: Near-black (`#111827`), muted gray (`#6b7280`, `#9ca3af`)
- **Borders**: Light gray (`#e5e7eb`, `#d1d5db`)
- **Agent pills**: Muted pastels - soft, distinguishable colors
  - Sky blue, coral orange, sage green, rose pink, lavender, etc.
  - Generated consistently per agent using hash-based algorithm
  - Never vibrant primaries - always softened and muted

### Typography
- **UI Text**: Inter (300, 400, 500 weights) - light, readable, modern
- **Code/Technical**: Fira Mono (400, 500) - clear monospace
- **Tracking**: Tight letter-spacing on headings for sophistication
- **Weights**: Favor light (300) and regular (400) over bold

## Layout Patterns

### Structure
- Sidebar navigation (sessions list)
- Main content area (messages/events)
- Right minimap (timeline visualization)
- Fixed header with controls

### Spacing
- Consistent padding: `px-6 py-4` for containers
- Generous margins between sections
- `space-y-3` for message stacks
- Breathing room around all interactive elements

### Depth & Hierarchy
- Minimal shadows (only where needed for clarity)
- Border-based separation (`border-gray-200`)
- Subtle hover states
- No heavy drop shadows or gradients

## Component Styling

### Pills/Badges (Agent Filters)
- Rounded-full shape
- Border colored to match agent
- Light weight (font-light)
- Transparent background when selected
- Muted gray when deselected

### Cards/Messages
- Subtle border (`border-gray-200`)
- White background
- Rounded corners (`rounded-lg`)
- Padding for breathability

### Interactive Elements
- Checkboxes with rounded corners
- Subtle hover states (no dramatic transitions)
- Clear active/selected states
- Keyboard navigation support

### Status Indicators
- Small badges or labels
- Color-coded but muted
- Positioned consistently
- Clear, concise text

## Animation

### Approach
Keep animations **subtle and purposeful**:
- Smooth transitions (not abrupt)
- Fast timing (200-300ms)
- Only animate what needs attention
- Never gratuitous movement

### Examples
- Hover state transitions on buttons/links
- Smooth scrolling when auto-scroll enabled
- Fade-in for new messages (if needed)
- Color shifts for status changes

## Accessibility

- High contrast text (near-black on white)
- Clear focus indicators
- Semantic HTML structure
- Keyboard navigation throughout
- Readable font sizes (14px minimum)

## Visual Hierarchy

1. **Primary**: Session title, agent names, message content
2. **Secondary**: Timestamps, metadata, file paths
3. **Tertiary**: Session IDs, technical details

Use **size, weight, and color** (in that order) to establish hierarchy.

## Anti-Patterns (What to Avoid)

- ❌ Vibrant, saturated colors
- ❌ Heavy drop shadows
- ❌ Gradient backgrounds
- ❌ Decorative icons without purpose
- ❌ Bold typography everywhere
- ❌ Cluttered, busy interfaces
- ❌ Skeuomorphic design
- ❌ Excessive animation

## Inspiration References

- Linear (project management)
- Vercel Dashboard
- Raycast (launcher)
- GitHub (modern redesign)
- Notion (clean, functional)
- Stripe Dashboard

---

**Summary**: Clean, functional, sophisticated. Every design decision should enhance clarity and usability.
