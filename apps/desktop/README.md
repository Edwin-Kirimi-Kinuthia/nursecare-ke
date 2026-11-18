# Care Bora desktop

Windows, macOS (Intel and Apple Silicon), and Linux installers. The desktop app
uses the live Care Bora portal and its existing authenticated APIs, so clinical
features and payment checks stay identical to the website. Internet is required.
The separate React Native app in `../mobile` remains the Android/iOS client.

Run `npm ci`, `npm test`, then `npm start` here. Build locally with `npm run build`.
Build each OS on its matching GitHub runner with the **Desktop apps** workflow.
No Node.js APIs or IPC bridge are exposed to the remote portal. All external
navigation requires confirmation, and camera/microphone access is restricted to
the portal and requires consent. Sign in using email and your emailed code;
third-party identity providers may disallow desktop embedded browsers.

Choose **Care Bora → Enable alerts for this account** after signing in. The app
checks the authenticated notification feed every 15 seconds and displays only
fixed service-request, appointment-request and provider-joined alerts. No patient
name, diagnosis or message body appears on the lock screen. Each account opts in
separately. Closing the window keeps an opted-in app in the tray; **Quit Care Bora**
stops alerts. Alerts are best effort and require an internet connection. Existing
notifications are not replayed when launching the app. The portal's idle sign-out
still applies, including in the tray; sign in again to resume notifications.

Initial desktop packages are unsigned unless release signing credentials are
configured. Windows may show SmartScreen and macOS may block opening an unsigned
download. macOS distribution needs an Apple Developer ID and notarization for a
normal install experience. Do not disable OS security globally to install builds.
Keep Electron patched and distribute updated installers through `/download`.

The workflow uploads installers and SHA-256 checksums as GitHub Actions artifacts.
Its optional publish input creates a **draft** GitHub release for review; publishing
that release makes its files publicly downloadable. After checking the installers
and checksums, update `apps/web/src/lib/app-release.json` with the published asset
URLs and sizes and deploy the website. The download page uses this verified
catalog, so GitHub API failures cannot hide available files.
