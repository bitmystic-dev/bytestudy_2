# ByteStudy Firebase merge plan

## Outcome

Turn the current BytePrep tracker into ByteStudy while preserving its existing calm/classic visual language. Unauthenticated visitors will see a product landing page; signed-in students will land on the tracker dashboard and can open an entitled study library module.

This is a fresh Firebase cutover. Existing tracker data in the current backend will not be migrated.

## User-facing changes

- Rename visible product copy, page titles, metadata, and version text from BytePrep to ByteStudy.
- Replace the current unauthenticated entry screen with a public ByteStudy landing page containing:
  - clear study-library and tracker value proposition
  - class 11/12 academics coverage
  - tracker, focus, missions, and library highlights
  - sign in and create account actions
- Remove Google sign-in and keep email/password sign-in, registration, reset password, and change password.
- Remove the AI mentor, AI onboarding questions, AI dashboard entry, and AI-related settings or navigation.
- Remove the test schedule feature and its route/settings links.
- Remove the admin route, admin navigation, Allen webview, and all Allen integration code.
- Change bottom navigation to Home, Planner, Focus, Library, and Settings.
- Add a Library page using the current card styling:
  - categories and published modules from Firestore
  - future scheduled modules hidden
  - locked state for modules not present in the user’s purchases array
  - entitled modules open a folder browser
- Add a material browser using the existing visual language:
  - breadcrumb navigation
  - folders open in place
  - files offer View
  - Download appears only when the Firebase user has `downloads: true`
  - retry and return-to-library states

## Data and access rules

- Firebase Authentication is the only authentication source.
- New students are created in Firebase Auth and in `users/{uid}` with:
  - `name`
  - `email`
  - `purchases: []`
  - `downloads: false`
  - `createdAt`
- CMS reads use:
  - `course_categories`, ordered by `displayOrder`
  - `course_modules`, filtered to `status == "published"`
  - client-side filtering of `publishAt` values in the future
- Entitlement is an exact module-ID check against `users/{uid}.purchases`; admin access is not managed by this app.
- Tracker records use the prompt’s Firebase layout:
  - `users/{uid}/chapter_progress/{chapterKey}` for chapter metadata/checkpoints
  - `users/{uid}/missions/{missionId}` for missions
  - root `users/{uid}` fields for profile, focus totals, and streak-related values
- The static JEE syllabus JSON remains local and is not fetched from Firestore.
- Firestore writes are limited to the signed-in user’s own records and are shaped to comply with the supplied rules.

## Implementation steps

1. **Firebase foundation**
   - Add the Firebase client package.
   - Create a browser-safe Firebase initialization module using `VITE_FIREBASE_API_KEY`, `VITE_FIREBASE_AUTH_DOMAIN`, `VITE_FIREBASE_PROJECT_ID`, `VITE_FIREBASE_STORAGE_BUCKET`, `VITE_FIREBASE_MESSAGING_SENDER_ID`, and `VITE_FIREBASE_APP_ID`.
   - Add Firebase Auth and Firestore service modules for auth, student profiles, tracker data, CMS content, entitlements, and Drive browsing.
   - Keep public Firebase web configuration in environment variables; never hardcode the API key.

2. **Remove the old platform integration**
   - Replace the current auth provider and cloud hooks with Firebase-backed equivalents while keeping the existing page-facing hook signatures where practical.
   - Remove current backend client imports, auth middleware/attacher, generated backend integration files, AI server functions, Allen sync remnants, and test persistence code.
   - Remove Lovable-specific runtime/build dependencies and replace the Vite/TanStack configuration with the standard supported TanStack Start plugins so the app has no Lovable-specific package dependency.
   - Update package scripts/lockfile and environment names accordingly.

3. **Routing and navigation**
   - Keep TanStack Router and the existing authenticated redirect behavior, but make the unauthenticated default `/` render the landing page rather than redirecting to sign in.
   - Add `/library` and keep `/settings` as the settings destination.
   - Ensure signed-in users go to `/` and incomplete student profiles go through onboarding.
   - Remove `/admin`, `/ai`, and `/tests` route references and files.

4. **Authentication and onboarding**
   - Rebuild `AuthProvider` around Firebase Auth state changes.
   - Support registration, login, logout, reset password, password change, and account deletion where the current UI exposes it.
   - Preserve the current password policy behavior: no client-side six-character minimum; Firebase’s own server validation remains authoritative.
   - Simplify onboarding to tracker profile fields only and save them to the Firebase user document without changing protected entitlement fields.

5. **Tracker persistence**
   - Port profile, missions, focus sessions, chapter metadata, and custom chapter handling to Firestore.
   - Preserve the current route/component data contracts to minimize visual changes.
   - Store timestamps consistently as Firestore timestamps while converting to the current numeric/ISO display types at the hook boundary.
   - Keep optimistic UI updates, loading states, and user-scoped writes.

6. **Library and PDF/material browsing**
   - Create Firestore CMS types and a `useLibrary` data hook.
   - Port the external portal’s category/module filtering and entitlement rules.
   - Create a React material browser that ports the external folder-history and breadcrumb behavior.
   - Support the external portal’s proxy-first Drive lookup through `VITE_BACKEND_PROXY_URL`, with direct public Drive API fallback using a named environment value rather than embedded credentials.
   - Validate external URLs before opening them and keep all external links in new tabs.

7. **Branding and cleanup**
   - Update all visible BytePrep references to ByteStudy, including metadata, headings, splash text, settings version copy, and accessibility labels.
   - Keep the calm theme as the default and Classic as the alternate theme.
   - Remove unused imports, types, hooks, routes, assets, and package dependencies after the migration.

## Verification

- Run lint/build checks after the dependency/config migration.
- Verify unauthenticated `/` shows the ByteStudy landing page and its sign-in/create-account actions.
- Verify email registration creates both the Firebase Auth user and the protected default user document.
- Verify sign-in/logout/reset/change-password flows.
- Verify onboarding saves only allowed student fields.
- Verify tracker writes are isolated to the current user.
- Verify Library hides future modules, shows locked modules, and opens entitled modules.
- Verify folder breadcrumbs, retry, View, and download permission behavior.
- Verify mobile and desktop layouts retain the current calm/classic styling.
- Confirm no source or package references remain for the old backend, AI, tests, Allen, Google sign-in, or Lovable-specific dependencies.
