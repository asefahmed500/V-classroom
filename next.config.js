/** @type {import('next').NextConfig} */
const nextConfig = {
  // Production optimizations
  serverExternalPackages: ["mongoose"],
  experimental: {
    optimizeCss: true,
    optimizePackageImports: ["lucide-react", "@radix-ui/react-icons"],
  },

  // Webpack optimizations
  webpack: (config, { isServer, dev }) => {
    // Client-side optimizations
    if (!isServer) {
      config.resolve.fallback = {
        ...config.resolve.fallback,
        fs: false,
        net: false,
        tls: false,
        crypto: false,
      }

      // Production optimizations
      if (!dev) {
        config.optimization = {
          ...config.optimization,
          splitChunks: {
            chunks: "all",
            cacheGroups: {
              vendor: {
                test: /[\\/]node_modules[\\/]/,
                name: "vendors",
                chunks: "all",
              },
              common: {
                name: "common",
                minChunks: 2,
                chunks: "all",
                enforce: true,
              },
            },
          },
        }
      }
    }

    return config
  },

  // Image optimizations
  images: {
    domains: ["localhost"],
    remotePatterns: [
      {
        protocol: "http",
        hostname: "localhost",
        port: "3000",
        pathname: "/uploads/**",
      },
      {
        protocol: "https",
        hostname: "*.vercel.app",
        pathname: "/uploads/**",
      },
    ],
    formats: ["image/webp", "image/avif"],
    minimumCacheTTL: 60,
    dangerouslyAllowSVG: true,
    contentSecurityPolicy: "default-src 'self'; script-src 'none'; sandbox;",
  },

  // Performance optimizations
  compress: true,
  poweredByHeader: false,

  // Build optimizations
  eslint: {
    ignoreDuringBuilds: false, // Enable ESLint in production
  },
  typescript: {
    ignoreBuildErrors: false, // Enable TypeScript checking in production
  },

  // Headers for security and performance
  async headers() {
    return [
      {
        source: "/(.*)",
        headers: [
          {
            key: "X-Frame-Options",
            value: "DENY",
          },
          {
            key: "X-Content-Type-Options",
            value: "nosniff",
          },
          {
            key: "Referrer-Policy",
            value: "origin-when-cross-origin",
          },
          {
            key: "Permissions-Policy",
            value: "camera=(), microphone=(), geolocation=()",
          },
        ],
      },
      {
        source: "/api/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "no-store, max-age=0",
          },
        ],
      },
      {
        source: "/_next/static/(.*)",
        headers: [
          {
            key: "Cache-Control",
            value: "public, max-age=31536000, immutable",
          },
        ],
      },
    ]
  },

  // Redirects and rewrites
  async rewrites() {
    return [
      {
        source: "/socket.io/:path*",
        destination: "/api/socketio/:path*",
      },
    ]
  },

  // Environment variables validation
  env: {
    CUSTOM_KEY: process.env.CUSTOM_KEY,
  },

  // Output configuration for deployment
  output: "standalone",

  // Logging
  logging: {
    fetches: {
      fullUrl: true,
    },
  },
}

module.exports = nextConfig
