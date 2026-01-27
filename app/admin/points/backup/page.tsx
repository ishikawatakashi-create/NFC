"use client"

import { AdminLayout } from "@/components/admin/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Label } from "@/components/ui/label"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { Save, RefreshCw, RotateCcw, Trash2, Download } from "lucide-react"
import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface Backup {
  id: string
  backupName: string
  description: string | null
  createdAt: string
  createdBy: string | null
  studentCount: number
}

export default function PointsBackupPage() {
  const { toast } = useToast()
  const [backups, setBackups] = useState<Backup[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [isCreating, setIsCreating] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const [isDeleting, setIsDeleting] = useState(false)
  const [createDialogOpen, setCreateDialogOpen] = useState(false)
  const [restoreDialogOpen, setRestoreDialogOpen] = useState(false)
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false)
  const [selectedBackup, setSelectedBackup] = useState<Backup | null>(null)
  const [backupName, setBackupName] = useState("")
  const [backupDescription, setBackupDescription] = useState("")

  useEffect(() => {
    loadBackups()
  }, [])

  async function loadBackups() {
    setIsLoading(true)
    try {
      const res = await fetch("/api/points/backup", { cache: "no-store" })
      const data = await res.json()

      if (res.ok && data?.ok && data?.backups) {
        setBackups(data.backups)
      }
    } catch (e: any) {
      toast({
        title: "エラー",
        description: "バックアップ一覧の取得に失敗しました",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleCreateBackup() {
    if (!backupName.trim()) {
      toast({
        title: "エラー",
        description: "バックアップ名を入力してください",
        variant: "destructive",
      })
      return
    }

    setIsCreating(true)
    try {
      const res = await fetch("/api/points/backup", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backupName: backupName.trim(),
          description: backupDescription.trim() || undefined,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "バックアップの作成に失敗しました")
      }

      toast({
        title: "成功",
        description: data.message || "バックアップを作成しました",
      })

      setCreateDialogOpen(false)
      setBackupName("")
      setBackupDescription("")
      await loadBackups()
    } catch (e: any) {
      toast({
        title: "エラー",
        description: e?.message || "バックアップの作成に失敗しました",
        variant: "destructive",
      })
    } finally {
      setIsCreating(false)
    }
  }

  async function handleRestore() {
    if (!selectedBackup) return

    setIsRestoring(true)
    try {
      const res = await fetch("/api/points/restore", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          backupId: selectedBackup.id,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "復元に失敗しました")
      }

      toast({
        title: "成功",
        description: data.message || "ポイントを復元しました",
      })

      setRestoreDialogOpen(false)
      setSelectedBackup(null)
    } catch (e: any) {
      toast({
        title: "エラー",
        description: e?.message || "復元に失敗しました",
        variant: "destructive",
      })
    } finally {
      setIsRestoring(false)
    }
  }

  async function handleDelete() {
    if (!selectedBackup) return

    setIsDeleting(true)
    try {
      const res = await fetch(`/api/points/restore?backupId=${selectedBackup.id}`, {
        method: "DELETE",
      })

      const data = await res.json()

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "削除に失敗しました")
      }

      toast({
        title: "成功",
        description: "バックアップを削除しました",
      })

      setDeleteDialogOpen(false)
      setSelectedBackup(null)
      await loadBackups()
    } catch (e: any) {
      toast({
        title: "エラー",
        description: e?.message || "削除に失敗しました",
        variant: "destructive",
      })
    } finally {
      setIsDeleting(false)
    }
  }

  function formatDate(dateString: string) {
    return new Date(dateString).toLocaleString("ja-JP", {
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    })
  }

  return (
    <AdminLayout
      pageTitle="ポイントバックアップ・復元"
      breadcrumbs={[{ label: "ポイント管理", href: "/admin/points" }, { label: "バックアップ・復元" }]}
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>ポイントバックアップ・復元</CardTitle>
                <CardDescription>
                  ポイント状態のスナップショットを作成し、誤操作時に復元できます
                </CardDescription>
              </div>
              <div className="flex gap-2">
                <Button onClick={() => setCreateDialogOpen(true)} className="gap-2">
                  <Save className="h-4 w-4" />
                  バックアップ作成
                </Button>
                <Button onClick={loadBackups} variant="outline" className="gap-2" disabled={isLoading}>
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                  更新
                </Button>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">読み込み中...</div>
            ) : backups.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                バックアップがありません。バックアップを作成してください。
              </div>
            ) : (
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>バックアップ名</TableHead>
                    <TableHead>説明</TableHead>
                    <TableHead>作成日時</TableHead>
                    <TableHead>作成者</TableHead>
                    <TableHead className="text-right">生徒数</TableHead>
                    <TableHead>操作</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {backups.map((backup) => (
                    <TableRow key={backup.id}>
                      <TableCell className="font-medium">{backup.backupName}</TableCell>
                      <TableCell className="text-sm text-muted-foreground">
                        {backup.description || "-"}
                      </TableCell>
                      <TableCell>{formatDate(backup.createdAt)}</TableCell>
                      <TableCell>{backup.createdBy || "-"}</TableCell>
                      <TableCell className="text-right">{backup.studentCount}名</TableCell>
                      <TableCell>
                        <div className="flex gap-2">
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedBackup(backup)
                              setRestoreDialogOpen(true)
                            }}
                            disabled={isRestoring || isDeleting}
                            className="gap-1"
                          >
                            <RotateCcw className="h-3 w-3" />
                            復元
                          </Button>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setSelectedBackup(backup)
                              setDeleteDialogOpen(true)
                            }}
                            disabled={isRestoring || isDeleting}
                            className="gap-1 text-destructive"
                          >
                            <Trash2 className="h-3 w-3" />
                            削除
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            )}
          </CardContent>
        </Card>

        {/* バックアップ作成ダイアログ */}
        <Dialog open={createDialogOpen} onOpenChange={setCreateDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>バックアップ作成</DialogTitle>
              <DialogDescription>
                現在のポイント状態をスナップショットとして保存します
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="backup-name">バックアップ名 *</Label>
                <Input
                  id="backup-name"
                  value={backupName}
                  onChange={(e) => setBackupName(e.target.value)}
                  placeholder="例: 2024年1月バックアップ"
                  disabled={isCreating}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="backup-description">説明（任意）</Label>
                <Textarea
                  id="backup-description"
                  value={backupDescription}
                  onChange={(e) => setBackupDescription(e.target.value)}
                  placeholder="例: 月次バックアップ"
                  rows={3}
                  disabled={isCreating}
                />
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setCreateDialogOpen(false)} disabled={isCreating}>
                キャンセル
              </Button>
              <Button onClick={handleCreateBackup} disabled={isCreating}>
                {isCreating ? "作成中..." : "作成"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 復元確認ダイアログ */}
        <Dialog open={restoreDialogOpen} onOpenChange={setRestoreDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>ポイント復元</DialogTitle>
              <DialogDescription>
                選択したバックアップからポイントを復元します。この操作は取り消せません。
              </DialogDescription>
            </DialogHeader>
            {selectedBackup && (
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>バックアップ名:</strong> {selectedBackup.backupName}
                </p>
                <p className="text-sm">
                  <strong>作成日時:</strong> {formatDate(selectedBackup.createdAt)}
                </p>
                <p className="text-sm">
                  <strong>対象生徒数:</strong> {selectedBackup.studentCount}名
                </p>
                <Alert variant="destructive" className="mt-4">
                  <AlertDescription>
                    すべての生徒のポイントがこのバックアップの状態に戻ります。この操作は取り消せません。
                  </AlertDescription>
                </Alert>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setRestoreDialogOpen(false)} disabled={isRestoring}>
                キャンセル
              </Button>
              <Button onClick={handleRestore} disabled={isRestoring} variant="destructive">
                {isRestoring ? "復元中..." : "復元する"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* 削除確認ダイアログ */}
        <Dialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>バックアップ削除</DialogTitle>
              <DialogDescription>
                選択したバックアップを削除します。この操作は取り消せません。
              </DialogDescription>
            </DialogHeader>
            {selectedBackup && (
              <div className="space-y-2">
                <p className="text-sm">
                  <strong>バックアップ名:</strong> {selectedBackup.backupName}
                </p>
              </div>
            )}
            <DialogFooter>
              <Button variant="outline" onClick={() => setDeleteDialogOpen(false)} disabled={isDeleting}>
                キャンセル
              </Button>
              <Button onClick={handleDelete} disabled={isDeleting} variant="destructive">
                {isDeleting ? "削除中..." : "削除する"}
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
