// Copyright (C) 2026 gbao86 <tiktokthu10@gmail.com>
// This file is part of the chims project.
// Licensed under the GNU General Public License v3.0; see LICENSE for details.
import type { NextConfig } from "next";

const isProd = !!process.env.NEXT_PUBLIC_API_URL;

const nextConfig: NextConfig = {
  // Rewrites only active in local dev (when NEXT_PUBLIC_API_URL is not set).
  // On Cloudflare / Render the env var is set so axios calls the backend directly.
  ...(!isProd && {
    async rewrites() {
      return [
        {
          source: "/api/:path*",
          destination: "http://localhost:8000/api/:path*",
        },
      ];
    },
  }),
};

export default nextConfig;

