# Role access, global search, and page context

## Goal
Make each portal role see only permitted sections and actions, add one search experience across existing portal content, and give every section a clear responsive title and breadcrumb trail.

## Role-based access
- Treat the existing **Department Head** role as the manager role.
- Centralize role capabilities so navigation and action visibility use the same rules:
  - **Employee:** Dashboard, Messages, Events, Employee Directory, and Profile; can use existing conversations and view permitted records, but cannot create managed content or administer users.
  - **Department Head / Manager:** Employee access plus creating chats and events, department-scoped employee and approval actions already allowed by database policies.
  - **Admin:** Manager access plus Administration, invitations, user status, departments, and approvals.
  - **Super Admin:** Admin access plus role assignment and role-change review.
- Hide unavailable navigation and action controls instead of displaying disabled administrative controls.
- Guard direct section URLs as well as navigation. An authenticated user opening a forbidden URL receives a clear access-denied view with a safe link to Dashboard; valid allowed URLs remain unchanged.
- Keep Supabase row-level security as the enforcement layer; UI controls only mirror those existing permissions.

## Global search
- Add a responsive search control to the portal header with keyboard-friendly results and category filters for Messages, Events, Employees, Tasks, and Files.
- Search only records the signed-in user can already read through existing Supabase policies:
  - Messages and attached files from the user's chat memberships.
  - Events visible to the user.
  - Employees visible through the existing admin or department-safe directory functions.
  - Tasks from existing task-style notifications in the Activity Center.
- Debounce queries, require a useful minimum query length, limit result counts, and show loading, empty, and error states.
- Give each result a canonical deep link with query parameters identifying the item, such as its chat group, message, event, employee, notification, or file.
- Update Messages, Events, Employees, and Activity Center handling so those links select, reveal, and focus the matching result after navigation without exposing inaccessible records.

## Page titles and breadcrumbs
- Add a shared responsive page-context header below the main navigation.
- Use section-specific document titles and visible headings for Dashboard, Messages, Events, Employee Directory, Administration, and My Profile.
- Show compact `Portal / Current section` breadcrumbs on phones and fuller trails on larger screens.
- For selected search results and admin subsections, append the current item or subsection and make parent crumbs return to the correct canonical URL.
- Preserve direct links, refresh behavior, and browser back/forward navigation.

## Validation
- Run TypeScript checks and focused linting for changed files.
- Verify signed-out redirects and public recovery pages.
- In an authenticated test session, verify each role's visible sections and actions, forbidden direct URLs, all five search filters, result deep links, refresh, breadcrumbs, and browser back/forward across phone, tablet, and desktop sizes.
- If an authenticated managed session is unavailable, report authenticated role and search paths as unverified rather than claiming completion.
