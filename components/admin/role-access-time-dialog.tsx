"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

interface RoleAccessTimeDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: "student" | "part_time" | "full_time"
  roleLabel: string
}

export function RoleAccessTimeDialog({
  open,
  onOpenChange,
  role,
  roleLabel,
}: RoleAccessTimeDialogProps) {
  const { toast } = useToast()
  const [startTime, setStartTime] = useState("09:00")
  const [endTime, setEndTime] = useState("20:00")
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // データを読み込む
  useEffect(() => {
    if (open) {
      loadAccessTime()
    }
  }, [open, role])

  async function loadAccessTime() {
    setIsLoading(true)
    try {
      const res = await fetch("/api/access-times", { cache: "no-store" })
      const data = await res.json()

      if (res.ok && data?.ok && data?.accessTimes?.[role]) {
        setStartTime(data.accessTimes[role].start_time || "09:00")
        setEndTime(data.accessTimes[role].end_time || "20:00")
      }
    } catch (e: any) {
      console.error("Failed to load access time:", e)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSave() {
    setIsSaving(true)
    try {
      const res = await fetch("/api/access-times", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          startTime,
          endTime,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data?.ok) {
        const errorMessage = data?.error || "保存に失敗しました"
        throw new Error(errorMessage)
      }

      toast({
        title: "保存しました",
        description: `${roleLabel}の開放時間を保存しました。`,
      })

      onOpenChange(false)
    } catch (e: any) {
      toast({
        title: "エラー",
        description: e?.message || "保存に失敗しました",
        variant: "destructive",
      })
    } finally {
      setIsSaving(false)
    }
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>{roleLabel}の開放時間設定</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <div className="space-y-2">
              <Label htmlFor={`start-time-${role}`}>開始時刻</Label>
              <Input
                id={`start-time-${role}`}
                type="time"
                value={startTime}
                onChange={(e) => setStartTime(e.target.value)}
                disabled={isLoading || isSaving}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor={`end-time-${role}`}>終了時刻</Label>
              <Input
                id={`end-time-${role}`}
                type="time"
                value={endTime}
                onChange={(e) => setEndTime(e.target.value)}
                disabled={isLoading || isSaving}
              />
            </div>
          </div>
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isSaving}>
            キャンセル
          </Button>
          <Button onClick={handleSave} disabled={isLoading || isSaving}>
            {isSaving ? "保存中..." : "保存"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}


