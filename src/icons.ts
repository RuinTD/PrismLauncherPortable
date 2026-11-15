import $, { Path } from "dax";
import { uniq } from "es-toolkit/array";
import { temporaryDirectory } from "tempy";

const pngSizes = [16, 32, 75, 128, 256];
const icoSizes = [16, 32, 48, 256];

// Adapted from https://github.com/PrismLauncher/PrismLauncher/blob/develop/program_info/genicons.sh

const tempPath = $.path(temporaryDirectory());
const svgPath = tempPath.join("appicon.svg");
const svg = await $.request(
  "https://github.com/PrismLauncher/PrismLauncher/raw/refs/heads/develop/program_info/org.prismlauncher.PrismLauncher.svg",
).pipeToPath(svgPath);
async function svg2png(path: Path, size: number) {
  await $`inkscape -w ${size} -h ${size} -o ${path} ${svgPath}`;
  await $`oxipng --opt max --strip all --alpha --interlace 0 ${path}`.quiet();
}

const appInfoPath = $.path("PrismLauncherPortable/App/AppInfo");
const files: Record<number, Path> = {};
const allSizes = uniq([...pngSizes, ...icoSizes]).sort((a, b) => a - b);

let pb = $.progress("Generating PNGs", { length: allSizes.length });
await pb.with(async () => {
  for (const size of allSizes) {
    const filename = `appicon_${size}.png`;
    pb.message(filename);
    const dir = pngSizes.includes(size) ? appInfoPath : tempPath;
    const path = dir.join(filename);
    await svg2png(path, size);
    files[size] = path;
    pb.increment();
  }
});

pb = $.progress("Generating ICO");
await pb.with(async () => {
  const outPath = appInfoPath.join("appicon.ico");
  const inPaths = icoSizes.map((size) => files[size]);

  await $`magick ${inPaths} ${outPath}`;
});

await tempPath.ensureRemove({ recursive: true });
