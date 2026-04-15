/** @type {import('next').NextConfig} */
const nextConfig = {
    allowedDevOrigins: ["*.preview.same-app.com"],
    output: "standalone",
    images: {
        formats: ["image/avif", "image/webp"],
        dangerouslyAllowSVG: true,
        minimumCacheTTL: 86400,
        deviceSizes: [640, 1080, 1920],
        remotePatterns: [
            {
                protocol: "https",
                hostname: "source.unsplash.com",
                pathname: "/**",
            },
            {
                protocol: "https",
                hostname: "images.unsplash.com",
                pathname: "/**",
            },
            {
                protocol: "https",
                hostname: "ext.same-assets.com",
                pathname: "/**",
            },
            {
                protocol: "https",
                hostname: "ugc.same-assets.com",
                pathname: "/**",
            },
            {
                protocol: "https",
                hostname: "siomjdoyjuuwlpimzaju.supabase.co",
                pathname: "/**",
            },
            {
                protocol: "https",
                hostname: "lh3.googleusercontent.com",
                pathname: "/**",
            },
            {
                protocol: 'https',
                hostname: '**.cloudfront.net',
                pathname: "/**",
            },
        ],
    },
};

module.exports = nextConfig;
