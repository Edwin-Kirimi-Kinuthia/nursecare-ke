#!/usr/bin/env python3
"""Install a release APK on an emulator and verify a fresh native launch.

This clears CareBora's emulator data. Physical devices are deliberately refused.
Only standard Python and the Android SDK's adb are required.
"""

import argparse
from pathlib import Path
import subprocess
import tempfile
import time


def main():
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("apk", type=Path)
    parser.add_argument("--serial", required=True)
    parser.add_argument("--adb", default="adb")
    parser.add_argument("--output", type=Path)
    args = parser.parse_args()
    if not args.apk.is_file():
        parser.error("APK does not exist")

    def adb(*parts, timeout=30, check=True):
        return subprocess.run(
            [args.adb, "-s", args.serial, *parts],
            check=check, capture_output=True, timeout=timeout,
        )

    if adb("shell", "getprop", "ro.kernel.qemu").stdout.strip() != b"1":
        parser.error("Use a disposable Android emulator; physical phones are refused")
    if adb("shell", "getprop", "sys.boot_completed").stdout.strip() != b"1":
        parser.error("Wait for Android to finish booting")

    package = "ke.co.carebora.app"
    out = args.output or Path(tempfile.mkdtemp(prefix="carebora-android-startup-"))
    out.mkdir(parents=True, exist_ok=True)
    print(adb("install", "-r", str(args.apk.resolve()), timeout=120).stdout.decode().strip())
    adb("shell", "pm", "clear", package)
    adb("logcat", "-c")
    try:
        print(adb("shell", "am", "start", "-W", "-n", f"{package}/.MainActivity").stdout.decode().strip())
        # A process alone is insufficient: a native splash may remain alive
        # after JavaScript fails. Require the actual signed-out home screen.
        deadline = time.monotonic() + 60
        while time.monotonic() < deadline:
            if not adb("shell", "pidof", package, check=False).stdout.strip():
                raise RuntimeError("CareBora exited during native startup")
            adb("shell", "uiautomator", "dump", "/sdcard/carebora-startup.xml", check=False)
            xml = adb("shell", "cat", "/sdcard/carebora-startup.xml", check=False).stdout
            if b"Find a provider" in xml or (b"Our services" in xml and b"Consultations" in xml):
                (out / "home.xml").write_bytes(xml)
                break
            time.sleep(2)
        else:
            raise RuntimeError("Native home screen did not render within 60 seconds")

        time.sleep(20)
        if not adb("shell", "pidof", package, check=False).stdout.strip():
            raise RuntimeError("CareBora exited after rendering the home screen")
        (out / "home.png").write_bytes(adb("exec-out", "screencap", "-p").stdout)
        print("PASS: release APK rendered the native home screen and stayed running")
    finally:
        # Retain diagnostics on failure as well as success. This is an emulator,
        # never a person's phone, and only contains the fresh test installation.
        logs = adb("logcat", "-d", "-s", "AndroidRuntime:E", "ReactNativeJS:E", "libc:F", "jni_zero:W", check=False).stdout
        (out / "startup.log").write_bytes(logs)
        print(f"Startup evidence: {out}")
        if logs.strip():
            print(logs.decode(errors="replace")[-12000:])


if __name__ == "__main__":
    main()
