import type { NextConfig } from "next";

const isProduction = process.env.NODE_ENV === "production";
const backendOrigin =
  process.env.BACKEND_ORIGIN ||
  (isProduction ? "" : "http://localhost:5000");

if (isProduction && !process.env.BACKEND_ORIGIN) {
  throw new Error(
    "Missing required environment variable: BACKEND_ORIGIN is required in production build"
  );
}

const remotePatterns: NonNullable<NonNullable<NextConfig["images"]>["remotePatterns"]> = [
  {
    // Cloudinary — post images and profile pictures
    protocol: "https",
    hostname: "res.cloudinary.com",
    pathname: "/**",
  },
];

if (!isProduction) {
  remotePatterns.push({
    // Local backend — profile pictures during development
    protocol: "http",
    hostname: "localhost",
    port: "3000",
    pathname: "/**",
  });
}

const nextConfig: NextConfig = {
  images: {
    remotePatterns,
  },
  async rewrites() {
    return [
      {
        source: "/api/:path*",
        destination: `${backendOrigin}/api/:path*`,
      },
    ];
  },
};

export default nextConfig;
