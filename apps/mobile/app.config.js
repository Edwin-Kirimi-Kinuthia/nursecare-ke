// Supply the existing EAS project ID in the build/update environment.
module.exports = ({ config }) => {
  // 1.0.5 and 1.0.6 use the same native modules; 1.0.6 only changes APK compression.
  // Target an older compatible binary explicitly when exporting/publishing JS-only fixes.
  const otaVersion = process.env.CAREBORA_OTA_APP_VERSION;
  if (otaVersion && !["1.0.5", config.version].includes(otaVersion)) {
    throw new Error("CAREBORA_OTA_APP_VERSION must target a reviewed compatible release");
  }
  const projectId = process.env.EAS_PROJECT_ID || config.extra?.eas?.projectId;
  return {
    ...config,
    ...(otaVersion ? { version: otaVersion } : {}),
    runtimeVersion: { policy: "appVersion" },
    updates: {
      ...config.updates,
      enabled: Boolean(projectId),
      ...(projectId ? { url: `https://u.expo.dev/${projectId}` } : {}),
      checkAutomatically: "ON_LOAD",
      fallbackToCacheTimeout: 0,
    },
    extra: {
      ...config.extra,
      ...(projectId ? { eas: { ...config.extra?.eas, projectId } } : {}),
    },
    android: {
      ...config.android,
      ...(process.env.GOOGLE_SERVICES_JSON ? { googleServicesFile: process.env.GOOGLE_SERVICES_JSON } : {}),
    },
  };
};
