import Link from "next/link";
import { appDownloads } from "@/lib/app-downloads";
import { absoluteUrl } from "@/lib/seo";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Download Care Bora for mobile and desktop",
  description: "Get Care Bora for Android, Windows, macOS and Linux. Use the same account for appointments, consultations and care updates.",
  alternates: { canonical: absoluteUrl("/download") },
};

export default async function DownloadPage() {
  const downloads = await appDownloads();
  const platforms = [
    { title: "Android", match: /-android\.apk$/, detail: "Install the Android app directly while the Play Store listing is being prepared. Your phone will ask you to allow installation from your browser." },
    { title: "Windows", match: /-win-x64\.exe$/, detail: "Windows 64-bit installer." },
    { title: "macOS · Apple Silicon", match: /-mac-arm64\.dmg$/, detail: "For Macs with an M-series chip." },
    { title: "macOS · Intel", match: /-mac-x64\.dmg$/, detail: "For Macs with an Intel processor." },
    { title: "Linux", match: /-linux-(?:x64|x86_64|amd64)\.(AppImage|deb)$/, detail: "Choose AppImage, or the Debian/Ubuntu package." },
  ];
  return (
    <div className="mx-auto max-w-5xl px-5 py-12">
      <p className="text-sm font-semibold text-primary">CARE BORA APPS</p>
      <h1 className="mt-3 text-3xl font-bold tracking-tight sm:text-4xl">Your care, on your phone and computer</h1>
      <p className="mt-4 max-w-2xl text-lg text-slate-600">Use your existing Care Bora account to book appointments, join consultations and receive care updates. Internet is required.</p>
      <div className="mt-8 grid gap-5 sm:grid-cols-2">
        {platforms.map(platform => {
          const assets = downloads.filter(asset => platform.match.test(asset.name));
          return <section key={platform.title} className="rounded-2xl border border-slate-200 bg-white p-6">
            <h2 className="text-xl font-semibold">{platform.title}</h2>
            <p className="mt-2 text-sm text-slate-600">{platform.detail}</p>
            {assets.length ? assets.map(asset => <a key={asset.name} href={asset.url} download className="button-primary mt-4 flex w-full justify-center underline underline-offset-4 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-teal-700">
              Download {asset.name.split(".").pop()} · {Math.ceil(asset.size / 1024 / 1024)} MB
            </a>) : <p className="mt-4 text-sm font-medium text-slate-500">Download will appear here after the build is released.</p>}
          </section>;
        })}
        <section className="rounded-2xl border border-slate-200 bg-white p-6">
          <h2 className="text-xl font-semibold">iPhone and iPad</h2>
          <p className="mt-2 text-sm text-slate-600">The iOS app will be available after Apple distribution is set up. Until then, open Care Bora in Safari and choose Share → Add to Home Screen for quick access to the website.</p>
          <Link href="/" className="mt-4 inline-block font-semibold text-primary">Open Care Bora →</Link>
        </section>
      </div>
      <section className="mt-8 rounded-2xl bg-slate-50 p-6">
        <h2 className="text-xl font-semibold">Enable your alerts</h2>
        <p className="mt-2 text-slate-600">In the mobile app, open Account → Enable notifications. In the desktop app, choose Care Bora → Enable alerts for this account. Admins receive service requests, providers receive appointment requests, and clients are alerted when their provider joins the consultation.</p>
        <p className="mt-3 text-sm text-slate-600">On the website, sign in and open the notification bell → Enable sound and device alerts. Use Test sound and notification to check delivery. On iPhone, add the website to your Home Screen first and enable alerts from there.</p>
        <p className="mt-3 text-sm text-slate-600">For desktop sign-in, use your email and the verification code sent to your inbox.</p>
        <p className="mt-3 text-sm text-slate-600">Desktop alerts require the app to keep running and your account to stay signed in. Closing the window keeps an opted-in app in the system tray; Quit stops alerts. On mobile, allow notifications in your device settings. Delivery depends on internet access and device settings.</p>
        <p className="mt-3 text-sm text-slate-600">Sound and lock-screen banners follow your notification, volume and Do Not Disturb settings. Initial desktop builds may be unsigned. Windows can show a publisher warning, and macOS may block installation or native notifications until signing is complete. Browser alerts remain an option while macOS signing is pending.</p>
      </section>
      {downloads.some(d => d.name.startsWith("SHA256SUMS")) && <div className="mt-6 text-sm">Verify your download: {downloads.filter(d => d.name.startsWith("SHA256SUMS")).map(d => <a key={d.name} className="mr-4 underline" href={d.url}>{d.name}</a>)}</div>}
      <p className="mt-6 text-sm text-slate-500">Consultation fees and payment rules are the same in every app. <Link className="underline" href="/contact">Get help installing</Link></p>
    </div>
  );
}
