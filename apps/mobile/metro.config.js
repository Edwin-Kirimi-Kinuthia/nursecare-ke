const { getDefaultConfig } = require("expo/metro-config");
const path = require("path");

const projectRoot = __dirname;
const repoRoot = path.resolve(projectRoot, "../..");

const config = getDefaultConfig(projectRoot);

// The app shares TypeScript source with the web app (@carebora/shared: schemas,
// validation, names; @carebora/api-client: the typed API client). They live
// outside this folder, so Metro has to be told to watch and resolve them.
//
// This project is deliberately NOT an npm workspace: React Native pins its own
// React, and hoisting it into the root would collide with the web app's.
config.watchFolders = [path.join(repoRoot, "packages")];

// Fallbacks, used only when normal resolution finds nothing. They matter on a
// cloud build (EAS), which installs just this folder: there is no repo-root
// node_modules, so the shared packages — and the `zod` they import — must be
// found from here instead.
config.resolver.extraNodeModules = {
  "@carebora/shared": path.join(repoRoot, "packages/shared"),
  "@carebora/api-client": path.join(repoRoot, "packages/api-client"),
  zod: path.join(projectRoot, "node_modules/zod"),
};

module.exports = config;
