import { parseArgs } from "node:util";

import chalk from "chalk";
import $ from "dax";
import * as semver from "semver";
import * as v from "valibot";

import { readAppInfo, writeAppInfo } from "./appinfo.ts";
import { buildInstaller, buildLauncher, redownloadPrism } from "./build.ts";
import { getLatestPrism } from "./prism.ts";

const log = console.log;
const { values: args } = parseArgs({
  options: {
    "pre-release": { type: "boolean", default: false, short: "P" },
  },
});

const appinfo = await readAppInfo();
const verParts = v.parse(
  v.tuple([v.string(), v.string(), v.string(), v.string()]),
  appinfo.Version.PackageVersion.split("."),
);
const currentVersion = verParts.slice(0, 3).join(".");
let updateNum = parseInt(verParts[3]) + 1;
const currentSemver = semver.parse(currentVersion, {}, true);

log(
  chalk.gray(
    `Old version: ${appinfo.Version.DisplayVersion} (${appinfo.Version.PackageVersion})`,
  ),
);

const latestRelease = await getLatestPrism(args["pre-release"]);
const latestVersion = latestRelease.tag_name;
const latestSemver = semver.parse(latestVersion, {}, true);
const baseVersion = `${latestSemver.major}.${latestSemver.minor}.${latestSemver.patch}`;

const updateAvailable = !semver.eq(
  currentSemver,
  semver.parse(baseVersion, {}, true),
);
if (updateAvailable) updateNum = 0;
appinfo.Version.DisplayVersion = latestVersion;
// if (updateNum > 0) appinfo.Version.DisplayVersion += ` Update ${updateNum}`;

appinfo.Version.PackageVersion = `${baseVersion}.${updateNum}`;

log(
  `New version: ${appinfo.Version.DisplayVersion} (${appinfo.Version.PackageVersion})`,
);

if (await $.confirm("Update appinfo.ini?")) {
  await writeAppInfo(appinfo);
  log(chalk.green("Updated appinfo.ini"));
}

if (updateAvailable || (await $.confirm("Redownload Prism Launcher?"))) {
  log(chalk.blue(`Downloading Prism Launcher ${latestVersion}...`));
  await redownloadPrism(latestRelease);
}

if (updateAvailable || (await $.confirm("Build launcher and installer?"))) {
  await buildLauncher();
  await buildInstaller();
}

log();
log(
  `- Using [Prism Launcher ${latestVersion}](https://prismlauncher.org/news/release-${latestVersion})`,
);
log();

log(chalk.green("Done!"));
