# App Store Readiness

This app is a strong candidate for an iOS wrapper approach when we decide to ship it in the App Store. The recommended path is:

1. Keep the existing React + TypeScript + Vite web app.
2. Add Capacitor for the native iOS shell.
3. Add iPhone-specific polish and App Store metadata.
4. Add PWA support later for the web experience.

PWA support is useful, but it is not the thing that gets this app into the App Store. The iOS path should start with Capacitor.

## Current State

As of March 30, 2026, this repo has:

- React 19 + TypeScript + Vite
- Firebase Hosting for the web deploy
- Firestore + Firebase Auth
- Mobile-responsive layouts
- Safe-area CSS in a few key views

This repo does not yet have:

- A web app manifest
- A service worker
- App icons or splash assets in the repo
- Capacitor packages
- `capacitor.config.*`
- An `ios/` native project

## Why Capacitor First

Capacitor lets us keep one product codebase and wrap the existing web app in a native iOS shell. For this app, that is the best fit because the core product is education, quizzes, references, progress tracking, and limited patient logging rather than heavy device-native workflows.

Capacitor-first also gives us the option to add small native touches later without rewriting the app:

- Local notifications
- Share sheet support
- Better network/offline handling
- Native splash/icon setup

## Review Risks To Plan For

Apple review is the main product risk, not the technical wrapper.

The key concerns to plan around:

- The app cannot feel like a thin website wrapper.
- The app needs a polished iPhone layout, loading states, and error handling.
- Privacy language needs to be very clear because the app includes patient logging.
- The app should continue to enforce no-PHI expectations in both product copy and policy text.

## Project-Specific Gaps

Before App Store work begins, these are the main repo gaps to address:

### 1. Native shell setup

- Add Capacitor packages
- Create `capacitor.config.ts`
- Generate the iOS project
- Choose a final app name and bundle identifier

### 2. App metadata and assets

- Create app icon set
- Create splash screen assets
- Add App Store screenshots
- Draft App Store description and privacy answers

### 3. Product polish for review

- Add network-aware empty and retry states
- Verify auth/session behavior on iPhone and app resume
- Verify keyboard and viewport behavior in forms
- Verify all tab/navigation behavior in a mobile shell
- Verify long topic chips and content cards on smaller phones

### 4. Privacy and compliance readiness

- Add a public privacy policy URL
- Add clear in-app language that patient fields are for de-identified educational use only
- Re-check all no-PHI guardrails before submission
- Prepare App Review notes that explain the educational purpose of the app

### 5. Optional web improvements

- Add `manifest.webmanifest`
- Add a service worker
- Add offline caching rules

These are worth doing, but they are not prerequisites for generating the iOS shell.

## Recommended Future Sequence

When we are ready to actually build the iOS app, follow this order:

1. Create a dedicated branch for app-store work.
2. Add Capacitor and create the iOS shell.
3. Add icons, splash assets, and iPhone-specific polish.
4. Test on simulator and at least one real iPhone.
5. Prepare privacy policy, screenshots, and submission metadata.
6. Add optional PWA support for the web app.
7. Submit through App Store Connect.

## First Commands To Run Later

Reconfirm the latest versions against the official Capacitor docs before running these:

```bash
npm install @capacitor/core @capacitor/cli @capacitor/ios
npx cap init
npx cap add ios
npm run build
npx cap sync ios
npx cap open ios
```

Likely config values we will need at that point:

- App name: `Nephrology Rotation`
- Web output directory: `dist`
- Bundle identifier: choose later, for example `com.premiernephrology.rotation`

## App Store Prep Checklist

- Decide the final app name and bundle identifier.
- Enroll in the Apple Developer Program.
- Create or collect app icons, splash art, and screenshots.
- Publish a privacy policy URL.
- Add Capacitor and generate the iOS project.
- Test login, student flows, admin flows, and patient entry on iPhone.
- Confirm no-PHI messaging is visible and accurate.
- Write App Review notes that explain what the app does and who it is for.

## Nice-To-Have Native Enhancements

These are not required for version one, but they would strengthen App Review positioning:

- Local reminders for study progress
- Native share for guides or study sheets
- Pull-to-refresh styling inside the shell
- Better offline read-only support for core teaching content

## Decision Notes

- Start with Capacitor, not a React Native rewrite.
- Treat PWA support as a web enhancement, not the gate to iOS.
- Keep the current app as the source of truth unless future product needs become heavily native.

## References

- Apple App Review Guidelines: https://developer.apple.com/appstore/resources/approval/guidelines.html
- Apple Developer Program overview: https://developer.apple.com/programs/
- Capacitor docs: https://capacitorjs.com/docs
