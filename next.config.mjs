/** @type {import('next').NextConfig} */
const nextConfig = {
  // Allow mobile phones on local network to fetch dev resources without crashing.
  // Move specific IPs/hostnames to .env.local if they need to change per-developer.
  allowedDevOrigins: [
    "192.168.1.2",
    "192.168.1.3",
    "192.168.1.4",
    "192.168.1.5",
    "172.21.96.1",
    "zoe-unhappy-chasity.ngrok-free.dev",
  ],
  images: {
    unoptimized: true,
  },
};

export default nextConfig;
