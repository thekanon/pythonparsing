# SEED design system adapter

NewsOrder uses a SEED-inspired token adapter in
`apps/web/src/app/seed-tokens.css`. It works alongside Tailwind 4 and the existing
CSS variables, so components keep their current contracts.

## Foundations

- Foreground: `#1a1c20` in light mode and `#f3f4f5` in dark mode.
- Surfaces: `#ffffff` in light mode and `#16171b` in dark mode.
- Brand orange is reserved for a key action; ordinary controls remain neutral.
- Semantic state colors are separate from the brand color.
- Body copy follows a 16px / 24px rhythm; screen titles follow a 26px / 35px rhythm.
- Controls use 8px corners and cards use 12px corners.
- Spacing follows 4, 8, 12, 16, 24, and 32px steps.
- Interactive color and transform feedback uses a 150ms duration.

## Navigation and accessibility

The global skip link remains available on every route. The site header now identifies
the current page in both desktop and mobile navigation with `aria-current="page"`
and a visible state. Focus treatment is shared across controls and motion reduction
continues to be honored.
