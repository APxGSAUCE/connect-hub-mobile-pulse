# Accessible portal and activity center

## Goal
Make the employee portal easier to use with a keyboard and assistive technology, while consolidating important work updates into one clear activity center.

## Accessibility improvements
- Add a skip link and one primary content landmark for signed-in pages.
- Strengthen visible keyboard focus across links, buttons, tabs, file controls, and custom interactive rows.
- Add missing accessible names and label associations for icon controls, search, message entry, profile actions, and selectors.
- Replace clickable non-button rows with keyboard-operable controls.
- Increase small mobile tap targets to at least 44px where they are primary controls.
- Replace low-contrast gray and colored text with semantic foreground tokens in the affected shared screens.
- Announce loading, unread counts, and changing activity states to assistive technology.

## Activity center
- Upgrade the existing notification panel into an Activity Center rather than adding a competing panel.
- Group activity into Unread Messages, Upcoming Events, Task Updates, and File Activity.
- Use current secured data: message receipts, events, notification records, and message attachments.
- Show explicit “Unread” and “Read” text states in addition to visual styling.
- Add group filters, empty states, counts, refresh, individual mark-as-read, and mark-all-read controls.
- Let message, event, and task items open their existing portal section.
- Preserve current row-level access rules and avoid schema or permission changes.

## Validation
- Run code checks after implementation.
- Verify sign-in and signed-in navigation behavior at phone, tablet, and desktop sizes where authentication access permits.
- Verify keyboard focus order, accessible names, selected navigation state, activity grouping, and non-overlapping mobile controls.
