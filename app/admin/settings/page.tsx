"use client"

import { AdminLayout } from "@/components/admin/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { Switch } from "@/components/ui/switch"
import { Alert, AlertDescription } from "@/components/ui/alert"
import { useToast } from "@/hooks/use-toast"
import { AlertTriangle, Save } from "lucide-react"
import { useState } from "react"

export default function SettingsPage() {
  const { toast } = useToast()

  // セクション1: 開放時間
  const [openingTime, setOpeningTime] = useState("09:00")
  const [closingTime, setClosingTime] = useState("20:00")

  // セクション2: 通知テンプレート
  const [entryTemplate, setEntryTemplate] = useState("[生徒名]さんが入室しました。\n時刻: [現在時刻]")
  const [exitTemplate, setExitTemplate] = useState("[生徒名]さんが退室しました。\n時刻: [現在時刻]")

  // セクション3: ポイント設定
  const [entryPoints, setEntryPoints] = useState("10")
  const [dailyLimit, setDailyLimit] = useState(true)

  const handleSave = () => {
    // 保存処理（API呼び出しなど）
    console.log("[v0] Settings saved:", {
      openingTime,
      closingTime,
      entryTemplate,
      exitTemplate,
      entryPoints,
      dailyLimit,
    })

    toast({
      title: "設定を保存しました",
      description: "設定の変更が正常に保存されました。",
    })
  }

  return (
    <AdminLayout pageTitle="設定" breadcrumbs={[{ label: "設定" }]}>
      <div className="mx-auto max-w-4xl space-y-6">
        {/* 注意喚起 */}
        <Alert>
          <AlertTriangle className="h-4 w-4" />
          <AlertDescription>
            設定の変更は全体に影響します。変更する際は内容をよく確認してから保存してください。
          </AlertDescription>
        </Alert>

        {/* セクション1: 開放時間 */}
        <Card>
          <CardHeader>
            <CardTitle>開放時間</CardTitle>
            <CardDescription>施設の利用可能時間を設定します</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="opening-time">開始時刻</Label>
                <Input
                  id="opening-time"
                  type="time"
                  value={openingTime}
                  onChange={(e) => setOpeningTime(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="closing-time">終了時刻</Label>
                <Input
                  id="closing-time"
                  type="time"
                  value={closingTime}
                  onChange={(e) => setClosingTime(e.target.value)}
                />
              </div>
            </div>
            <Alert>
              <AlertDescription className="text-sm">
                終了時刻に未退室の生徒は自動的に強制退室となります（通知なし）
              </AlertDescription>
            </Alert>
          </CardContent>
        </Card>

        {/* セクション2: 通知テンプレート */}
        <Card>
          <CardHeader>
            <CardTitle>通知テンプレート</CardTitle>
            <CardDescription>入退室時の通知メッセージのテンプレートを設定します</CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* 利用可能タグ */}
            <div className="rounded-lg bg-muted p-4">
              <p className="mb-2 text-sm font-medium">利用可能なタグ:</p>
              <div className="flex flex-wrap gap-2">
                <code className="rounded bg-background px-2 py-1 text-sm">[生徒名]</code>
                <code className="rounded bg-background px-2 py-1 text-sm">[現在時刻]</code>
              </div>
            </div>

            {/* 入室テンプレート */}
            <div className="space-y-2">
              <Label htmlFor="entry-template">入室テンプレート</Label>
              <Textarea
                id="entry-template"
                rows={4}
                value={entryTemplate}
                onChange={(e) => setEntryTemplate(e.target.value)}
                placeholder="入室時の通知メッセージを入力してください"
              />
            </div>

            {/* 退室テンプレート */}
            <div className="space-y-2">
              <Label htmlFor="exit-template">退室テンプレート</Label>
              <Textarea
                id="exit-template"
                rows={4}
                value={exitTemplate}
                onChange={(e) => setExitTemplate(e.target.value)}
                placeholder="退室時の通知メッセージを入力してください"
              />
            </div>
          </CardContent>
        </Card>

        {/* セクション3: ポイント設定 */}
        <Card>
          <CardHeader>
            <CardTitle>ポイント設定</CardTitle>
            <CardDescription>入室時のポイント付与に関する設定を行います</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="entry-points">入室ポイント付与量</Label>
              <Input
                id="entry-points"
                type="number"
                min="0"
                value={entryPoints}
                onChange={(e) => setEntryPoints(e.target.value)}
                className="max-w-xs"
              />
              <p className="text-sm text-muted-foreground">入室1回あたりに付与するポイント数</p>
            </div>

            <div className="flex items-center justify-between rounded-lg border border-border p-4">
              <div className="space-y-0.5">
                <Label htmlFor="daily-limit" className="text-base">
                  1日1回制限
                </Label>
                <p className="text-sm text-muted-foreground">同じ日に複数回入室してもポイントは1回のみ付与されます</p>
              </div>
              <Switch id="daily-limit" checked={dailyLimit} onCheckedChange={setDailyLimit} />
            </div>
          </CardContent>
        </Card>

        {/* 保存ボタン */}
        <div className="flex justify-end">
          <Button onClick={handleSave} size="lg" className="gap-2">
            <Save className="h-4 w-4" />
            保存
          </Button>
        </div>
      </div>
    </AdminLayout>
  )
}
