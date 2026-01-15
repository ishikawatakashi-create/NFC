"use client"

import { useState, useEffect } from "react"
import { AdminLayout } from "@/components/admin/admin-layout"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent } from "@/components/ui/card"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Badge } from "@/components/ui/badge"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Plus, Search, Pencil, Trash2, Users, Key } from "lucide-react"

interface Admin {
  id: string
  authUserId: string
  email: string
  firstName: string
  lastName: string
  employmentType: "part_time" | "full_time"
  createdAt: string
  updatedAt: string
}

export default function AdminsPage() {
  const [admins, setAdmins] = useState<Admin[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [searchQuery, setSearchQuery] = useState("")
  const [employmentTypeFilter, setEmploymentTypeFilter] = useState<string>("all")
  const [isAddDialogOpen, setIsAddDialogOpen] = useState(false)
  const [isEditDialogOpen, setIsEditDialogOpen] = useState(false)
  const [isDeleteDialogOpen, setIsDeleteDialogOpen] = useState(false)
  const [isPasswordResetDialogOpen, setIsPasswordResetDialogOpen] = useState(false)
  const [editingAdmin, setEditingAdmin] = useState<Admin | null>(null)
  const [resettingPasswordAdmin, setResettingPasswordAdmin] = useState<Admin | null>(null)
  const [newPassword, setNewPassword] = useState("")
  const [newAdmin, setNewAdmin] = useState({
    email: "",
    password: "",
    firstName: "",
    lastName: "",
    employmentType: "part_time" as "part_time" | "full_time",
  })

  async function loadAdmins() {
    setIsLoading(true)
    setError(null)

    try {
      const timestamp = new Date().getTime()
      const res = await fetch(`/api/admins?_t=${timestamp}`, { cache: "no-store" })
      const data = await res.json()

      if (!res.ok || !data?.ok) {
        const errorMessage = typeof data?.error === "string" 
          ? data.error 
          : data?.error?.message || String(data?.error) || "管理ユーザーの取得に失敗しました"
        throw new Error(errorMessage)
      }

      const apiAdmins: Admin[] = (data.admins || []).map((a: any) => ({
        id: String(a.id),
        authUserId: String(a.authUserId),
        email: a.email || "",
        firstName: a.firstName || "",
        lastName: a.lastName || "",
        employmentType: a.employmentType || "part_time",
        createdAt: a.createdAt || "",
        updatedAt: a.updatedAt || "",
      }))

      setAdmins(apiAdmins)
    } catch (e: any) {
      const errorMessage = e?.message || String(e) || "Unknown error"
      setError(errorMessage)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadAdmins()
  }, [])

  const handleAddAdmin = async () => {
    if (!newAdmin.email || !newAdmin.password || !newAdmin.firstName || !newAdmin.lastName) {
      alert("すべての項目を入力してください")
      return
    }

    // パスワード要件チェック
    if (newAdmin.password.length < 8) {
      alert("パスワードは8文字以上である必要があります")
      return
    }
    if (!/[a-z]/.test(newAdmin.password)) {
      alert("パスワードに小文字を含める必要があります")
      return
    }
    if (!/[A-Z]/.test(newAdmin.password)) {
      alert("パスワードに大文字を含める必要があります")
      return
    }
    if (!/[0-9]/.test(newAdmin.password)) {
      alert("パスワードに数字を含める必要があります")
      return
    }

    try {
      const res = await fetch("/api/admin/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          email: newAdmin.email.trim(),
          password: newAdmin.password,
          firstName: newAdmin.firstName.trim(),
          lastName: newAdmin.lastName.trim(),
          employmentType: newAdmin.employmentType,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data?.ok) {
        const errorMessage = typeof data?.error === "string" 
          ? data.error 
          : data?.error?.message || String(data?.error) || "管理ユーザーの登録に失敗しました"
        throw new Error(errorMessage)
      }

      setIsAddDialogOpen(false)
      setNewAdmin({
        email: "",
        password: "",
        firstName: "",
        lastName: "",
        employmentType: "part_time",
      })
      await loadAdmins()
      alert("管理ユーザーを登録しました")
    } catch (e: any) {
      const errorMessage = e?.message || String(e) || "管理ユーザーの登録に失敗しました"
      alert(`エラー: ${errorMessage}`)
    }
  }

  const handleEditAdmin = (admin: Admin) => {
    setEditingAdmin(admin)
    setNewAdmin({
      email: admin.email,
      password: "", // 編集時はパスワードは変更しない
      firstName: admin.firstName,
      lastName: admin.lastName,
      employmentType: admin.employmentType,
    })
    setIsEditDialogOpen(true)
  }

  const handleUpdateAdmin = async () => {
    if (!editingAdmin || !newAdmin.firstName || !newAdmin.lastName) {
      alert("すべての項目を入力してください")
      return
    }

    try {
      const res = await fetch(`/api/admins/${editingAdmin.id}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          firstName: newAdmin.firstName.trim(),
          lastName: newAdmin.lastName.trim(),
          employmentType: newAdmin.employmentType,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data?.ok) {
        const errorMessage = typeof data?.error === "string" 
          ? data.error 
          : data?.error?.message || String(data?.error) || "管理ユーザーの更新に失敗しました"
        throw new Error(errorMessage)
      }

      setIsEditDialogOpen(false)
      setEditingAdmin(null)
      await loadAdmins()
      alert("管理ユーザーを更新しました")
    } catch (e: any) {
      const errorMessage = e?.message || String(e) || "管理ユーザーの更新に失敗しました"
      alert(`エラー: ${errorMessage}`)
    }
  }

  const handleDeleteAdmin = async () => {
    if (!editingAdmin) return

    if (!confirm(`本当に「${editingAdmin.lastName} ${editingAdmin.firstName}」を削除しますか？\nこの操作は取り消せません。`)) {
      return
    }

    try {
      const res = await fetch(`/api/admins/${editingAdmin.id}`, {
        method: "DELETE",
      })

      const data = await res.json()

      if (!res.ok || !data?.ok) {
        const errorMessage = typeof data?.error === "string" 
          ? data.error 
          : data?.error?.message || String(data?.error) || "管理ユーザーの削除に失敗しました"
        throw new Error(errorMessage)
      }

      setIsDeleteDialogOpen(false)
      setEditingAdmin(null)
      await loadAdmins()
      alert("管理ユーザーを削除しました")
    } catch (e: any) {
      const errorMessage = e?.message || String(e) || "管理ユーザーの削除に失敗しました"
      alert(`エラー: ${errorMessage}`)
    }
  }

  const handleOpenPasswordResetDialog = (admin: Admin) => {
    setResettingPasswordAdmin(admin)
    setNewPassword("")
    setIsPasswordResetDialogOpen(true)
  }

  const handleResetPassword = async () => {
    if (!resettingPasswordAdmin || !newPassword) {
      alert("パスワードを入力してください")
      return
    }

    // パスワード要件チェック
    if (newPassword.length < 8) {
      alert("パスワードは8文字以上である必要があります")
      return
    }
    if (!/[a-z]/.test(newPassword)) {
      alert("パスワードに小文字を含める必要があります")
      return
    }
    if (!/[A-Z]/.test(newPassword)) {
      alert("パスワードに大文字を含める必要があります")
      return
    }
    if (!/[0-9]/.test(newPassword)) {
      alert("パスワードに数字を含める必要があります")
      return
    }

    try {
      const res = await fetch(`/api/admins/${resettingPasswordAdmin.id}/password`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          password: newPassword,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data?.ok) {
        const errorMessage = typeof data?.error === "string" 
          ? data.error 
          : data?.error?.message || String(data?.error) || "パスワードの更新に失敗しました"
        throw new Error(errorMessage)
      }

      setIsPasswordResetDialogOpen(false)
      setResettingPasswordAdmin(null)
      setNewPassword("")
      alert("パスワードを更新しました")
    } catch (e: any) {
      const errorMessage = e?.message || String(e) || "パスワードの更新に失敗しました"
      alert(`エラー: ${errorMessage}`)
    }
  }

  const filteredAdmins = admins.filter((admin) => {
    const matchesSearch = 
      admin.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.firstName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      admin.lastName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      `${admin.lastName} ${admin.firstName}`.toLowerCase().includes(searchQuery.toLowerCase())
    
    const matchesFilter = 
      employmentTypeFilter === "all" || admin.employmentType === employmentTypeFilter

    return matchesSearch && matchesFilter
  })

  return (
    <AdminLayout
      pageTitle="管理ユーザー管理"
      breadcrumbs={[{ label: "管理ユーザー管理" }]}
      actions={
        <Button size="sm" className="gap-2" onClick={() => setIsAddDialogOpen(true)}>
          <Plus className="h-4 w-4" />
          <span className="hidden sm:inline">管理ユーザー追加</span>
        </Button>
      }
    >
      <div className="space-y-4">
        {/* Search and Filter Section */}
        <Card>
          <CardContent className="pt-6">
            <div className="flex flex-col gap-4 sm:flex-row">
              <div className="flex-1">
                <div className="relative">
                  <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
                  <Input
                    placeholder="メールアドレス、名前で検索..."
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    className="pl-9"
                  />
                </div>
              </div>
              <Select value={employmentTypeFilter} onValueChange={setEmploymentTypeFilter}>
                <SelectTrigger className="w-full sm:w-[180px]">
                  <SelectValue placeholder="雇用形態でフィルタ" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">すべて</SelectItem>
                  <SelectItem value="part_time">アルバイト</SelectItem>
                  <SelectItem value="full_time">正社員</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        {/* Error Message */}
        {error && (
          <Card className="border-destructive">
            <CardContent className="pt-6">
              <p className="text-sm text-destructive">{error}</p>
            </CardContent>
          </Card>
        )}

        {/* Admins Table */}
        <Card>
          <CardContent className="pt-6">
            {isLoading ? (
              <div className="py-8 text-center text-muted-foreground">読み込み中...</div>
            ) : filteredAdmins.length === 0 ? (
              <div className="py-8 text-center text-muted-foreground">
                {searchQuery || employmentTypeFilter !== "all" 
                  ? "条件に一致する管理ユーザーが見つかりませんでした" 
                  : "管理ユーザーが登録されていません"}
              </div>
            ) : (
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>メールアドレス</TableHead>
                      <TableHead>名前</TableHead>
                      <TableHead>雇用形態</TableHead>
                      <TableHead>登録日時</TableHead>
                      <TableHead className="text-right">操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {filteredAdmins.map((admin) => (
                      <TableRow key={admin.id}>
                        <TableCell className="font-medium">{admin.email}</TableCell>
                        <TableCell>{admin.lastName} {admin.firstName}</TableCell>
                        <TableCell>
                          <Badge variant={admin.employmentType === "full_time" ? "default" : "secondary"}>
                            {admin.employmentType === "full_time" ? "正社員" : "アルバイト"}
                          </Badge>
                        </TableCell>
                        <TableCell>
                          {admin.createdAt ? new Date(admin.createdAt).toLocaleString("ja-JP") : "-"}
                        </TableCell>
                        <TableCell className="text-right">
                          <div className="flex justify-end gap-2">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleEditAdmin(admin)}
                              title="編集"
                            >
                              <Pencil className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleOpenPasswordResetDialog(admin)}
                              title="パスワード再設定"
                            >
                              <Key className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => {
                                setEditingAdmin(admin)
                                setIsDeleteDialogOpen(true)
                              }}
                              title="削除"
                            >
                              <Trash2 className="h-4 w-4 text-destructive" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            )}
          </CardContent>
        </Card>

        {/* Add Admin Dialog */}
        <Dialog open={isAddDialogOpen} onOpenChange={setIsAddDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>管理ユーザー追加</DialogTitle>
              <DialogDescription>
                新しい管理ユーザーを登録します。メールアドレスとパスワードでログインできます。
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="add-email">メールアドレス *</Label>
                <Input
                  id="add-email"
                  type="email"
                  placeholder="example@example.com"
                  value={newAdmin.email}
                  onChange={(e) => setNewAdmin({ ...newAdmin, email: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-password">パスワード *</Label>
                <Input
                  id="add-password"
                  type="password"
                  placeholder="8文字以上、大文字・小文字・数字を含む"
                  value={newAdmin.password}
                  onChange={(e) => setNewAdmin({ ...newAdmin, password: e.target.value })}
                />
                <p className="text-xs text-muted-foreground">
                  パスワードは8文字以上で、大文字・小文字・数字を含む必要があります
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-last-name">姓 *</Label>
                <Input
                  id="add-last-name"
                  placeholder="山田"
                  value={newAdmin.lastName}
                  onChange={(e) => setNewAdmin({ ...newAdmin, lastName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-first-name">名 *</Label>
                <Input
                  id="add-first-name"
                  placeholder="太郎"
                  value={newAdmin.firstName}
                  onChange={(e) => setNewAdmin({ ...newAdmin, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="add-employment-type">雇用形態 *</Label>
                <Select
                  value={newAdmin.employmentType}
                  onValueChange={(value: "part_time" | "full_time") =>
                    setNewAdmin({ ...newAdmin, employmentType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="part_time">アルバイト</SelectItem>
                    <SelectItem value="full_time">正社員</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsAddDialogOpen(false)}>
                キャンセル
              </Button>
              <Button onClick={handleAddAdmin}>追加</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Edit Admin Dialog */}
        <Dialog open={isEditDialogOpen} onOpenChange={setIsEditDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>管理ユーザー編集</DialogTitle>
              <DialogDescription>
                管理ユーザーの情報を編集します。パスワードは変更できません。
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="edit-email">メールアドレス</Label>
                <Input
                  id="edit-email"
                  type="email"
                  value={newAdmin.email}
                  disabled
                  className="bg-muted"
                />
                <p className="text-xs text-muted-foreground">
                  メールアドレスは変更できません
                </p>
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-last-name">姓 *</Label>
                <Input
                  id="edit-last-name"
                  placeholder="山田"
                  value={newAdmin.lastName}
                  onChange={(e) => setNewAdmin({ ...newAdmin, lastName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-first-name">名 *</Label>
                <Input
                  id="edit-first-name"
                  placeholder="太郎"
                  value={newAdmin.firstName}
                  onChange={(e) => setNewAdmin({ ...newAdmin, firstName: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="edit-employment-type">雇用形態 *</Label>
                <Select
                  value={newAdmin.employmentType}
                  onValueChange={(value: "part_time" | "full_time") =>
                    setNewAdmin({ ...newAdmin, employmentType: value })
                  }
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="part_time">アルバイト</SelectItem>
                    <SelectItem value="full_time">正社員</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsEditDialogOpen(false)}>
                キャンセル
              </Button>
              <Button onClick={handleUpdateAdmin}>更新</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Delete Admin Dialog */}
        <Dialog open={isDeleteDialogOpen} onOpenChange={setIsDeleteDialogOpen}>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>管理ユーザー削除</DialogTitle>
              <DialogDescription>
                本当に「{editingAdmin?.lastName} {editingAdmin?.firstName}」を削除しますか？
                <br />
                この操作は取り消せません。
              </DialogDescription>
            </DialogHeader>
            <DialogFooter>
              <Button variant="outline" onClick={() => setIsDeleteDialogOpen(false)}>
                キャンセル
              </Button>
              <Button variant="destructive" onClick={handleDeleteAdmin}>
                削除
              </Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>

        {/* Password Reset Dialog */}
        <Dialog open={isPasswordResetDialogOpen} onOpenChange={setIsPasswordResetDialogOpen}>
          <DialogContent className="sm:max-w-[500px]">
            <DialogHeader>
              <DialogTitle>パスワード再設定</DialogTitle>
              <DialogDescription>
                「{resettingPasswordAdmin?.lastName} {resettingPasswordAdmin?.firstName}」のパスワードを再設定します。
              </DialogDescription>
            </DialogHeader>
            <div className="space-y-4 py-4">
              <div className="space-y-2">
                <Label htmlFor="reset-password">新しいパスワード *</Label>
                <Input
                  id="reset-password"
                  type="password"
                  placeholder="8文字以上、大文字・小文字・数字を含む"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                />
                <p className="text-xs text-muted-foreground">
                  パスワードは8文字以上で、大文字・小文字・数字を含む必要があります
                </p>
              </div>
            </div>
            <DialogFooter>
              <Button variant="outline" onClick={() => {
                setIsPasswordResetDialogOpen(false)
                setResettingPasswordAdmin(null)
                setNewPassword("")
              }}>
                キャンセル
              </Button>
              <Button onClick={handleResetPassword}>パスワードを更新</Button>
            </DialogFooter>
          </DialogContent>
        </Dialog>
      </div>
    </AdminLayout>
  )
}
