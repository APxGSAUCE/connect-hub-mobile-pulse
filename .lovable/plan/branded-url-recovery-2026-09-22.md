# Branded URL Recovery

## Goal
Keep every valid employee portal section on its requested page while giving invalid or retired links a clear, branded recovery path.

## Changes
- Add explicit aliases for common outdated portal links and preserve query details when forwarding them.
- Replace the generic 404 screen with an accessible PGIS Employee Portal page offering Home, Messages, Events, Employees, and Profile destinations.
- Keep unknown URLs visible on the recovery page instead of silently sending users to the dashboard.
- Validate direct links, refresh behavior, legacy aliases, and browser back/forward navigation.

## Technical details
- React Router remains the single source of truth for portal section selection.
- Legacy redirects use router navigation with replacement so retired URLs do not create broken back-button history.
- Recovery actions use existing design tokens and button components.
