import assert from "node:assert";
import crypto from "node:crypto";

import $ from "dax";
import klaw from "klaw";
import prettyBytes from "pretty-bytes";
import { temporaryDirectory } from "tempy";

const dir = (
  await Promise.all(
    Array.from($.path(".").readDirFilePathsSync())
      .filter((v) => v.isFileSync() && v.extname() == ".exe")
      .map(async (v) => ({
        path: v,
        time: (await v.stat())?.mtime?.valueOf() || 0,
      })),
  )
)
  .sort((a, b) => b.time - a.time)
  .map((v) => v.path);

const selection = await $.select({
  message: "Pick a file",
  options: dir.map((v) => v.basename()),
});
const file = dir[selection.index];
assert(file);

function formatSize(size: number): string {
  return prettyBytes(size, {
    binary: true,
    minimumFractionDigits: 1,
    maximumFractionDigits: 1,
    space: false,
  }).replace("i", "");
}

const stat = await file.stat();
assert(stat);
const downloadSize = formatSize(stat.size);
const hash = crypto
  .createHash("md5")
  .update(await file.readBytes())
  .digest("hex");

const tempDir = $.path(temporaryDirectory());
for (const type of ["unload", "unhandledrejection"])
  globalThis.addEventListener(type, () => {
    tempDir.ensureRemoveSync({ recursive: true });
  });

await $`${file} /DESTINATION=${tempDir}\\`;

let tempSize = 0;
for await (const { stats } of klaw(tempDir.toString())) {
  if (stats.isDirectory()) continue;
  tempSize += stats.size;
}
const installedSize = formatSize(tempSize);

await tempDir.ensureRemove({ recursive: true });

console.log(`[${downloadSize} download / ${installedSize} installed]
(MD5: ${hash})`);
