/** @type {import('next').NextConfig} */
const nextConfig = {
  typescript: {
    // 本番環境ではTypeScriptエラーをチェックする
    ignoreBuildErrors: false,
  },
  images: {
    unoptimized: true,
  },
  // Instrumentation機能を有効化（環境変数検証用）
  experimental: {
    instrumentationHook: true,
  },
}

export default nextConfig
