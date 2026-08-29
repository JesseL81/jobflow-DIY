import type { NextConfig } from "next"
import withPWAInit from "@ducanh2912/next-pwa"

const withPWA = withPWAInit({
  dest: "public",
  cacheOnFrontEndNav: true,
  aggressiveFrontEndNavCaching: true,
  reloadOnOnline: true,
  // This disables the service worker during local development so it doesn't cache your hot-reloads
  disable: process.env.NODE_ENV === "development",
})

const nextConfig: NextConfig = {
  // If you have any existing config in here, keep it!
}

export default withPWA(nextConfig)