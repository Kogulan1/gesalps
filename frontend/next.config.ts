import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

// Enable next-intl by wrapping the config. Points to next-intl.config.ts
// Point the plugin to the i18n request config (default would be ./i18n.ts)
const withNextIntl = createNextIntlPlugin("./i18n.ts");

const nextConfig: NextConfig = {
  /* other Next.js options can stay here */
};

export default withNextIntl(nextConfig);
