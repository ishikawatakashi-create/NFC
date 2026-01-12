"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

interface RoleBonusThresholdDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  role: "student" | "part_time" | "full_time"
  roleLabel: string
}

export function RoleBonusThresholdDialog({
  open,
  onOpenChange,
  role,
  roleLabel,
}: RoleBonusThresholdDialogProps) {
  const { toast } = useToast()
  const [bonusThreshold, setBonusThreshold] = useState("10")
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // データを読み込む
  useEffect(() => {
    if (open) {
      loadBonusThreshold()
    }
  }, [open, role])

  async function loadBonusThreshold() {
    setIsLoading(true)
    try {
      const res = await fetch("/api/bonus-thresholds/role", { cache: "no-store" })
      const data = await res.json()

      if (res.ok && data?.ok && data?.thresholds?.[role]) {
        setBonusThreshold(String(data.thresholds[role]))
      }
    } catch (e: any) {
      console.error("Failed to load bonus threshold:", e)
    } finally {
      setIsLoading(false)
    }
  }

  async function handleSave() {
    setIsSaving(true)
    try {
      const threshold = parseInt(bonusThreshold, 10)
      if (isNaN(threshold) || threshold <= 0) {
        throw new Error("ボーナス閾値は1以上の数値である必要があります")
      }

      const res = await fetch("/api/bonus-thresholds/role", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          role,
          bonusThreshold: threshold,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data?.ok) {
        const errorMessage = data?.error || "保存に失敗しました"
        throw new Error(errorMessage)
      }

      toast({
        title: "保存しました",
        description: `${roleLabel}のボーナス閾値を保存しました。`,
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
          <DialogTitle>{roleLabel}のボーナス閾値設定</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`bonus-threshold-${role}`}>ボーナス閾値（回数）</Label>
            <Input
              id={`bonus-threshold-${role}`}
              type="number"
              min="1"
              value={bonusThreshold}
              onChange={(e) => setBonusThreshold(e.target.value)}
              disabled={isLoading || isSaving}
              className="max-w-xs"
            />
            <p className="text-sm text-muted-foreground">
              同月内でこの回数入室すると、ボーナスポイント3点が付与されます
            </p>
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






