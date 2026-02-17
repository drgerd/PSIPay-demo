import { defineConfig } from "vite";
import type { Plugin } from "vite";
import react from "@vitejs/plugin-react";

import fs from "node:fs";
import path from "node:path";

function copyPublicDirWorkaround(): Plugin {
  // Work around EPERM copyfile issues on some mounted filesystems.
  // Vite normally uses copyFileSync for public assets; here we do read+write instead.
  let outDir = "dist";
  let publicDir = "public";

  async function copyTree(src: string, dst: string): Promise<void> {
    const entries = await fs.promises.readdir(src, { withFileTypes: true });
    await fs.promises.mkdir(dst, { recursive: true });

    for (const ent of entries) {
      const from = path.join(src, ent.name);
      const to = path.join(dst, ent.name);
      if (ent.isDirectory()) {
        await copyTree(from, to);
        continue;
      }
      if (ent.isFile()) {
        const buf = await fs.promises.readFile(from);
        await fs.promises.mkdir(path.dirname(to), { recursive: true });
        await fs.promises.writeFile(to, buf);
      }
    }
  }

  return {
    name: "psipay-copy-public-workaround",
    apply: "build" as const,
    configResolved(config) {
      outDir = config.build.outDir;
      publicDir = config.publicDir;
    },
    async closeBundle() {
      const src = path.resolve(publicDir);
      const dst = path.resolve(outDir);
      if (!fs.existsSync(src)) return;
      await copyTree(src, dst);
    },
  };
}

export default defineConfig({
  plugins: [react(), copyPublicDirWorkaround()],
  build: {
    copyPublicDir: false,
  },
  server: {
    port: 5173,
  },
});
