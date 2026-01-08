/** @type {import('next').NextConfig} */
const nextConfig = {
    allowedDevOrigins: ["*.preview.same-app.com"],
    output: "standalone",
    images: {
        domains: [
            "source.unsplash.com",
            "images.unsplash.com",
            "img.freepik.com",
            "ext.same-assets.com",
            "ugc.same-assets.com",
            "*.cloudfront.net",
            "nqwovhetvhmtjigonohq.supabase.co",
            "lh3.googleusercontent.com",
            "images.saatchiart.com",
            "media.artsper.com",
            "img.jamesedition.com",
        ],
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
                hostname: "nqwovhetvhmtjigonohq.supabase.co",
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
            // Allow all HTTPS domains for link preview images
            {
                protocol: 'https',
                hostname: '**',
            },
        ],
    },
};

module.exports = nextConfig;
