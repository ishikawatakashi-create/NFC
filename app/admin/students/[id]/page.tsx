import { AdminLayout } from "@/components/admin/admin-layout"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Pencil } from "lucide-react"

export default function StudentDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  // Note: params must be awaited in Next.js 16
  return (
    <AdminLayout
      pageTitle="生徒詳細"
      breadcrumbs={[{ label: "生徒一覧", href: "/admin/students" }, { label: "生徒詳細" }]}
      actions={
        <Button size="sm" className="gap-2">
          <Pencil className="h-4 w-4" />
          <span className="hidden sm:inline">編集</span>
        </Button>
      }
    >
      <Card>
        <CardHeader>
          <CardTitle>生徒情報</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">ここに生徒の詳細情報が表示されます（パンくずの例として作成）</p>
        </CardContent>
      </Card>
    </AdminLayout>
  )
}
