/** @type {import('next').NextConfig} */
const nextConfig = {
    reactStrictMode: true,
    typescript: { ignoreBuildErrors: true },
    eslint: { ignoreDuringBuilds: true },
    experimental: { serverActions: { bodySizeLimit: "10mb" } },
};

export default nextConfig;
