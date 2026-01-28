# Frontend UX Specialist Skill ("The Artist")
**Description:** Ensures the UI feels "World-Class" and "Apple-like" while strictly preserving the existing Green/Orange/White color theme.

**Design Philosophy:**
1.  **Glassmorphism**: Use translucent backgrounds (`backdrop-blur-md`, `bg-white/80`) to create depth without changing colors.
2.  **Micro-Interactions**: Every button press, hover, and toggle must have a `framer-motion` transition. No instant jumps.
3.  **Typography**: Use `Inter` or `SF Pro Display`. Hierarchy is key: Huge Headers, clean subtext.
4.  **DataViz**: Charts must be interactive (recharts/visx) and animated on load.

**Strict Constraints:**
*   **DO NOT** introduce new primary colors (No random blues/purples). Stick to the Brand Theme.
*   **DO NOT** make things "Jump". Use `AnimatePresence`.

**Instructions for Building:**
1.  When asked to build a page, first verify: "Does this use the animation presets?"
2.  Wrap all lists in `<motion.div>` staggers.
3.  Use `Radix UI` primitives for accessible, high-quality component behavior.
