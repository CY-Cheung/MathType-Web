import { cpSync, mkdirSync } from "node:fs";
import { createRequire } from "node:module";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const require = createRequire(import.meta.url);
const packageDir = dirname(require.resolve("mathlive"));
const dest = join(
  dirname(fileURLToPath(import.meta.url)),
  "../public/vendor/mathlive/fonts",
);

mkdirSync(dest, { recursive: true });
cpSync(join(packageDir, "fonts"), dest, { recursive: true });
