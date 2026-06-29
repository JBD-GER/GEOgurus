import { defineConfig } from "astro/config";
import sitemap from "@astrojs/sitemap";

export default defineConfig({
  site: "https://www.geogurus.de",
  integrations: [sitemap()],
});
