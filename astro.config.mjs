import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";
import vercel from "@astrojs/vercel";

export default defineConfig({
  site: "https://www.geogurus.de",
  adapter: vercel(),
  integrations: [sitemap()],
});
