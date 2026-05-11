import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        // Cloudinary — post images and profile pictures
        // Verified: both post.service.js and user profilePicture field
        // use Cloudinary exclusively. No local Express static serving.
        protocol: "https",
        hostname: "res.cloudinary.com",
        pathname: "/**",
      },
    ],
  },
};

export default nextConfig;
