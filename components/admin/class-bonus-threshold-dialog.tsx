"use client"

import { useState, useEffect } from "react"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"

interface ClassBonusThresholdDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  class: "kindergarten" | "beginner" | "challenger" | "creator" | "innovator"
  classLabel: string
}

export function ClassBonusThresholdDialog({
  open,
  onOpenChange,
  class: studentClass,
  classLabel,
}: ClassBonusThresholdDialogProps) {
  const { toast } = useToast()
  const [bonusThreshold, setBonusThreshold] = useState("10")
  const [bonusPoints, setBonusPoints] = useState("3")
  const [isLoading, setIsLoading] = useState(false)
  const [isSaving, setIsSaving] = useState(false)

  // データを読み込む
  useEffect(() => {
    if (open) {
      loadBonusSettings()
    }
  }, [open, studentClass])

  async function loadBonusSettings() {
    setIsLoading(true)
    try {
      const res = await fetch("/api/bonus-thresholds/class", { cache: "no-store" })
      const data = await res.json()

      if (res.ok && data?.ok) {
        if (data?.thresholds?.[studentClass]) {
          setBonusThreshold(String(data.thresholds[studentClass]))
        }
        if (data?.bonusPoints?.[studentClass]) {
          setBonusPoints(String(data.bonusPoints[studentClass]))
        }
      }
    } catch (e: any) {
      console.error("Failed to load bonus settings:", e)
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

      const points = parseInt(bonusPoints, 10)
      if (isNaN(points) || points <= 0) {
        throw new Error("ボーナスポイント数は1以上の数値である必要があります")
      }

      const res = await fetch("/api/bonus-thresholds/class", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          class: studentClass,
          bonusThreshold: threshold,
          bonusPoints: points,
        }),
      })

      const data = await res.json()

      if (!res.ok || !data?.ok) {
        const errorMessage = data?.error || "保存に失敗しました"
        throw new Error(errorMessage)
      }

      toast({
        title: "保存しました",
        description: `${classLabel}のボーナス設定を保存しました。`,
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
          <DialogTitle>{classLabel}のボーナス設定</DialogTitle>
        </DialogHeader>
        <div className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor={`bonus-threshold-${studentClass}`}>ボーナス閾値（回数）</Label>
            <Input
              id={`bonus-threshold-${studentClass}`}
              type="number"
              min="1"
              value={bonusThreshold}
              onChange={(e) => setBonusThreshold(e.target.value)}
              disabled={isLoading || isSaving}
              className="max-w-xs"
            />
            <p className="text-sm text-muted-foreground">
              同月内でこの回数入室すると、ボーナスポイントが付与されます
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor={`bonus-points-${studentClass}`}>ボーナスポイント数</Label>
            <Input
              id={`bonus-points-${studentClass}`}
              type="number"
              min="1"
              value={bonusPoints}
              onChange={(e) => setBonusPoints(e.target.value)}
              disabled={isLoading || isSaving}
              className="max-w-xs"
            />
            <p className="text-sm text-muted-foreground">
              ボーナス閾値達成時に付与されるポイント数
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

