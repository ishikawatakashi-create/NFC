// 認証チェックはmiddleware.tsで行うため、ここでは何もしない
export default function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return <>{children}</>
}

