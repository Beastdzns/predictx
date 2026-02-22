import type { NextConfig } from "next";
import path from "path";
// @ts-ignore
import withPWA from "next-pwa";

const nextConfig: NextConfig = {
  webpack: (config, { isServer }) => {
    // PrivacyCash SDK (and its deps) use WASM + some Node core modules in the browser.
    config.experiments = {
      ...(config.experiments ?? {}),
      asyncWebAssembly: true,
      topLevelAwait: true,
      layers: true,
    };

    if (!isServer) {
      config.resolve.fallback = {
        ...(config.resolve.fallback ?? {}),
        crypto: require.resolve("crypto-browserify"),
        stream: require.resolve("stream-browserify"),
        buffer: require.resolve("buffer/"),
        process: require.resolve("process/browser"),
        fs: false,
        net: false,
        tls: false,
      };

      // Handle WASM files
      config.module.rules.push({
        test: /\.wasm$/,
        type: "asset/resource",
        generator: {
          filename: "static/wasm/[name].[hash][ext]",
        },
      });
    }

    // Add extensions for resolving modules
    config.resolve.extensions = [
      ".wasm",
      ".mjs",
      ".js",
      ".ts",
      ".tsx",
      ".json",
      ".jsx",
      ...(config.resolve.extensions || []),
    ];

    return config;
  },
};

export default withPWA({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
})(nextConfig);
