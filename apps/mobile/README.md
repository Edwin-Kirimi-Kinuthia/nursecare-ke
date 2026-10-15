# Care Bora mobile app (iOS and Android)

One React Native codebase (Expo, Expo Router) for both stores. It talks to the same
API as the website (`https://app.carebora.co.ke/api/v1`) and shares the web app's
TypeScript: `@carebora/api-client` (typed client) and `@carebora/shared` (validation,
password rules, name handling, country list).

This folder is **not** an npm workspace. React Native pins its own React, which would
collide with the web app's if hoisted. `metro.config.js` points at `../../packages`
instead. Run every command here, from `apps/mobile`.

```
npm install
npm run check          # type-check + lint + expo-doctor (all must pass)
npx expo start         # dev server (needs a development build, see below)
```

## What is in version 1

| Area | Status |
| --- | --- |
| Sign up, sign in with emailed code, forgot password, verify email | done |
| Browse doctors (specialty filter from real data), doctor profile, reviews, open times | done |
| Book. Doctor available: confirmed at once. Busy: they confirm first | done |
| Pay the consultation fee by M-Pesa (waits for the real result) | done |
| Video consultation (LiveKit) with chat; doctor can leave or end | done |
| Doctor side: confirm, start, end, Available/Busy switch | done |
| Review a completed appointment | done |
| Message us / request a document (works signed out) | done |
| Notifications list and **push notifications** | done (needs the Firebase step below for Android) |
| Edit profile and photo, **delete account**, sign out | done |
| Ambulance: call screen | done (a phone call, not a form; see below) |
| Pharmacy, home visits, lab tests, medical records, clinical notes and prescriptions for doctors | **not yet**: use the website |

Ambulance is a call screen on purpose. The website's request form is handed to
ambulance operators and none are onboarded, so a form would send an emergency into a
queue nobody reads.

## Before you can publish: things only you can do

1. **Developer accounts.** Apple Developer Program (about $99/year) and Google Play
   Console ($25 once). A *personal* Play account created recently must run a closed
   test with a minimum number of testers for a minimum number of days before it can
   publish to production. Check Google's current rule. An organisation account is exempt.
2. **Expo account and project.**
   ```
   npx eas-cli@latest login
   npx eas-cli@latest init        # writes extra.eas.projectId into app.json; push needs it
   ```
3. **Bundle identifiers are permanent once published.** They are `ke.co.carebora.app`
   on both stores (`app.json`). Change them now if you want something else.
4. **Android push needs Firebase.** Create a Firebase project, add an Android app with
   package `ke.co.carebora.app`, download `google-services.json` into this folder and add
   `"googleServicesFile": "./google-services.json"` under `expo.android` in `app.json`.
   Then upload an FCM v1 service-account key to EAS (`npx eas-cli credentials`).
   iOS push is handled by EAS using your Apple account. Without this step Android builds
   still work; they just won't get push.
5. **Build.**
   ```
   npm run build:android      # produces an .aab
   npm run build:ios          # asks for your Apple login and creates certificates
   ```
   The video-call library has native code, so these are real builds. Expo Go cannot run it.
   For daily development make a development build once: `eas build --profile development`.
6. **Submit.** Google requires the *first* upload to go through the Play Console by hand;
   after that `eas submit -p android` works. iOS: `eas submit -p ios`, then fill in the
   listing in App Store Connect.

## Store listing checklist

- **Privacy policy:** `https://app.carebora.co.ke/privacy`
- **Account deletion page** (Play requires it): `https://app.carebora.co.ke/delete-account`.
  In-app deletion is Account, then Delete account.
- **Support URL / email:** `https://app.carebora.co.ke/contact`, `customercare@carebora.co.ke`
- **Screenshots:** iPhone 6.9" and 6.5", an Android phone, and for Play a 1024x500 feature
  graphic. Take them from a real build; none are generated here.
- **Data collected** (for Apple's privacy labels and Google's Data safety form). All of it is
  linked to the user and used for app functionality; none for ads or tracking:
  name, email, phone, health information (allergies, conditions, clinical notes the doctor
  writes), payment information (M-Pesa number and receipt, never the PIN), photos (the
  profile picture only), device push token, purchase history. Video calls are not recorded.
- **Encryption:** standard HTTPS only; `ITSAppUsesNonExemptEncryption` is already `false`.
- **Health apps:** Google asks for a Health apps declaration. Apple reviews health apps
  closely (guideline 1.4.1). The app says it is not for emergencies and puts the ambulance
  number first. Keep that.
- **Payments:** consultations are real-world services paid by M-Pesa, so Apple's in-app
  purchase rule does not apply (guideline 3.1.3(e)). Say so in the review notes.

### The app review sign-in problem (decide before submitting)

Apple and Google reviewers must be able to sign in, but every sign-in sends a code to an
email inbox the reviewer cannot see. Two ways round it:

1. **Give them a mailbox.** Create an inbox for a review account and put its address and
   password in the review notes. Nothing in the code changes; reviewers read the code
   themselves. This is the safer option.
2. **A review account with a fixed code**, enabled by an environment variable for that one
   email address only. Convenient, but it is a deliberate hole in sign-in, so it must be
   limited to a single throwaway patient account with no real data.

Either way, create a review patient and a review doctor so they can see both sides.

## Known issues to be aware of

- **Doctor slot times are three hours late.** The default calendar is meant to be 8am to
  6pm, but slots are generated in UTC, so they appear as 11:00 to 21:00 in Nairobi. This
  is in the shared backend (`availability.service.ts`) and affects the website too.
- Appointment lists carry each person's full photo, which can be large if it was uploaded
  from the website. Photos added from this app are shrunk to about 60 KB.
- Local Node is 20; Expo now asks for 22.13 or newer. Cloud builds use their own Node.

## Layout

```
src/app/        screens (Expo Router: every file is a route)
src/ui/         design system (theme with light + dark, Button, Field, PhoneField, ...)
src/features/   pieces with logic (MpesaPay, VideoRoom, ReviewForm, ...)
src/lib/        api client wiring, auth, secure token storage, push, config
scripts/        generate-icons.py rebuilds every icon from assets/brand/logo-source.png
```

The session lives in the device keychain (`expo-secure-store`), never plain storage.
The API client refreshes an expired access token by itself and retries once.
