import type { NextConfig } from "next";

const allowedOrigins: string[] = [];

// Helper to extract hostname from a URL string
const extractHostname = (url?: string) => {
  if (!url) return null;
  try {
    // Check if it already looks like a hostname (no http prefix)
    if (!url.startsWith('http')) {
      return url.split(/[:/]/)[0];
    }
    return new URL(url).hostname;
  } catch {
    return url.replace(/^https?:\/\//, '').split(/[:/]/)[0];
  }
};

// Target all possible environment variables for the tunnel/custom host
const tunnelHost = extractHostname(process.env.FRONTEND_URL || process.env.BASE_URL || process.env.TUNNEL_HOST);
if (tunnelHost) {
  allowedOrigins.push(tunnelHost);
}

const backendHost = extractHostname(process.env.BACKEND_URL);
if (backendHost && !allowedOrigins.includes(backendHost)) {
  allowedOrigins.push(backendHost);
}

const extraAllowedHosts = (process.env.ALLOWED_TUNNEL_HOSTS || "")
  .split(",")
  .map((host) => host.trim())
  .filter(Boolean);

for (const host of extraAllowedHosts) {
  if (!allowedOrigins.includes(host)) {
    allowedOrigins.push(host);
  }
}

const nextConfig: NextConfig = {
  // Allow the tunnel hostname to bypass cross-origin dev security for HMR/WebSocket
  allowedDevOrigins: allowedOrigins,
  images: {
    remotePatterns: [
      { protocol: 'https', hostname: 'lh3.googleusercontent.com' },
      { protocol: 'https', hostname: 'avatars.githubusercontent.com' },
      { protocol: 'https', hostname: 'images.unsplash.com' },
    ],
  },
};

export default nextConfig;
