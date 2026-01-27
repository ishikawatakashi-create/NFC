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
import { AlertTriangle, Save, Clock } from "lucide-react"
import { useState, useEffect } from "react"
import { RoleAccessTimeDialog } from "@/components/admin/role-access-time-dialog"
import { IndividualAccessTimeDialog } from "@/components/admin/individual-access-time-dialog"

export default function SettingsPage() {
  const { toast } = useToast()

  // 開放時間設定ダイアログの状態
  const [studentDialogOpen, setStudentDialogOpen] = useState(false)
  const [partTimeDialogOpen, setPartTimeDialogOpen] = useState(false)
  const [fullTimeDialogOpen, setFullTimeDialogOpen] = useState(false)
  const [individualDialogOpen, setIndividualDialogOpen] = useState(false)

  // セクション2: 通知テンプレート
  const [entryTemplate, setEntryTemplate] = useState("[生徒名]さんが入室しました。\n時刻: [現在時刻]")
  const [exitTemplate, setExitTemplate] = useState("[生徒名]さんが退室しました。\n時刻: [現在時刻]")
  const [loading, setLoading] = useState(false)
  const [autoExitLoading, setAutoExitLoading] = useState(false)

  // 初期値を読み込む
  useEffect(() => {
    const loadSettings = async () => {
      try {
        const res = await fetch("/api/point-settings")
        const data = await res.json()

        if (data.ok && data.settings) {
          if (data.settings.entry_notification_template) {
            setEntryTemplate(data.settings.entry_notification_template)
          }
          if (data.settings.exit_notification_template) {
            setExitTemplate(data.settings.exit_notification_template)
          }
        }
      } catch (error) {
        console.error("Failed to load settings:", error)
      }
    }

    loadSettings()
  }, [])

  const handleSave = async () => {
    setLoading(true)
    try {
      const res = await fetch("/api/point-settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          entryPoints: 1, // デフォルト値（既存の設定を維持）
          dailyLimit: true, // デフォルト値（既存の設定を維持）
          entryTemplate,
          exitTemplate,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data.ok) {
        throw new Error(data.error || "設定の保存に失敗しました")
      }

      toast({
        title: "設定を保存しました",
        description: "通知テンプレートの変更が正常に保存されました。",
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "エラー",
        description: error.message || "設定の保存に失敗しました",
      })
    } finally {
      setLoading(false)
    }
  }

  const handleAutoExitRun = async () => {
    const confirmed = window.confirm(
      "現在の時刻で強制退室チェックを実行します。よろしいですか？"
    )
    if (!confirmed) return

    setAutoExitLoading(true)
    try {
      const res = await fetch("/api/auto-exit/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      })
      const data = await res.json()

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "強制退室の実行に失敗しました")
      }

      toast({
        title: "実行完了",
        description: data.message || "強制退室チェックが完了しました。",
      })
    } catch (error: any) {
      toast({
        variant: "destructive",
        title: "エラー",
        description: error.message || "強制退室の実行に失敗しました",
      })
    } finally {
      setAutoExitLoading(false)
    }
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

        {/* セクション1: 利用可能時間 */}
        <Card>
          <CardHeader>
            <CardTitle>利用可能時間設定</CardTitle>
            <CardDescription>属性ごと、または個別に利用開始時間と強制退室時間を設定します</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <button
                type="button"
                className="group rounded-md border border-border border-t-2 border-t-[color:var(--link)] bg-card px-4 py-3 text-left transition-colors hover:bg-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                onClick={() => setStudentDialogOpen(true)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm link-accent">生徒</p>
                    <p className="text-xs text-muted-foreground">利用可能時間を設定</p>
                  </div>
                  <Clock className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                </div>
              </button>
              <button
                type="button"
                className="group rounded-md border border-border border-t-2 border-t-[color:var(--link)] bg-card px-4 py-3 text-left transition-colors hover:bg-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                onClick={() => setPartTimeDialogOpen(true)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm link-accent">アルバイト</p>
                    <p className="text-xs text-muted-foreground">利用可能時間を設定</p>
                  </div>
                  <Clock className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                </div>
              </button>
              <button
                type="button"
                className="group rounded-md border border-border border-t-2 border-t-[color:var(--link)] bg-card px-4 py-3 text-left transition-colors hover:bg-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                onClick={() => setFullTimeDialogOpen(true)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm link-accent">正社員</p>
                    <p className="text-xs text-muted-foreground">利用可能時間を設定</p>
                  </div>
                  <Clock className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                </div>
              </button>
              <button
                type="button"
                className="group rounded-md border border-border border-t-2 border-t-[color:var(--link)] bg-card px-4 py-3 text-left transition-colors hover:bg-accent/80 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring/50"
                onClick={() => setIndividualDialogOpen(true)}
              >
                <div className="flex items-center justify-between gap-3">
                  <div>
                    <p className="text-sm link-accent">個別設定</p>
                    <p className="text-xs text-muted-foreground">ユーザーごとに設定</p>
                  </div>
                  <Clock className="h-4 w-4 text-muted-foreground group-hover:text-foreground" />
                </div>
              </button>
            </div>
            <Alert>
              <AlertDescription className="text-sm">
                <ul className="list-disc list-inside space-y-1 mt-2">
                  <li>開放開始時間：入室が可能になる時刻</li>
                  <li>強制退室時間：この時刻になると未退室のユーザーは自動的に退室処理されます（通知なし）</li>
                  <li>新規登録時は、対応する属性に紐づいた設定が適用されます</li>
                  <li>個別設定をしたユーザーは、属性が変更されても個別設定が優先されます</li>
                </ul>
              </AlertDescription>
            </Alert>
            <div className="flex justify-end">
              <Button
                variant="outline"
                onClick={handleAutoExitRun}
                disabled={autoExitLoading}
              >
                {autoExitLoading ? "強制退室チェック中..." : "強制退室を実行"}
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* 開放時間設定ダイアログ */}
        <RoleAccessTimeDialog
          open={studentDialogOpen}
          onOpenChange={setStudentDialogOpen}
          role="student"
          roleLabel="生徒"
        />
        <RoleAccessTimeDialog
          open={partTimeDialogOpen}
          onOpenChange={setPartTimeDialogOpen}
          role="part_time"
          roleLabel="アルバイト"
        />
        <RoleAccessTimeDialog
          open={fullTimeDialogOpen}
          onOpenChange={setFullTimeDialogOpen}
          role="full_time"
          roleLabel="正社員"
        />
        <IndividualAccessTimeDialog
          open={individualDialogOpen}
          onOpenChange={setIndividualDialogOpen}
        />


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


        {/* 保存ボタン */}
        <div className="flex justify-end">
          <Button onClick={handleSave} size="lg" className="gap-2" disabled={loading}>
            <Save className="h-4 w-4" />
            {loading ? "保存中..." : "保存"}
          </Button>
        </div>
      </div>
    </AdminLayout>
  )
}
