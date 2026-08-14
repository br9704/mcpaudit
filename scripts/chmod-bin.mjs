// npm does not preserve the executable bit through tsc; set it after build.
import { chmod } from "node:fs/promises";
await chmod(new URL("../dist/cli.js", import.meta.url), 0o755);
