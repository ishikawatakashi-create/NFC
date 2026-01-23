/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // 本番環境ではTypeScriptエラーをチェックする
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
}

export default nextConfig
