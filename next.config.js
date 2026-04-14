/** @type {import('next').NextConfig} */
const nextConfig = {
    allowedDevOrigins: ["*.preview.same-app.com"],
    output: "standalone",
    images: {
        formats: ["image/avif", "image/webp"],
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
