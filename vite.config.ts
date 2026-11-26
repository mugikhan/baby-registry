import { defineConfig } from "vite";
import { tanstackStart } from "@tanstack/react-start/plugin/vite";
import viteReact from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { cloudflare } from "@cloudflare/vite-plugin";

export default defineConfig({
  resolve: { tsconfigPaths: true },
  plugins: [
    cloudflare({ viteEnvironment: { name: "ssr" } }),
    tailwindcss(),
    tanstackStart({
      router: {
        codeSplittingOptions: {
          splitBehavior: ({ routeId }) =>
            routeId.startsWith("/admin") ? [["loader", "component"]] : undefined,
        },
      },
    }),
    viteReact(),
  ],
});
