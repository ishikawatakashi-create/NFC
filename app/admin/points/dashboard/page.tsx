"use client"

import { AdminLayout } from "@/components/admin/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { useToast } from "@/hooks/use-toast"
import { RefreshCw, TrendingUp, TrendingDown, Users, Coins } from "lucide-react"
import { useState, useEffect } from "react"
import {
  LineChart,
  Line,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend,
  ResponsiveContainer,
} from "recharts"

interface Statistics {
  totalAwarded: number
  totalConsumed: number
  entryPoints: number
  bonusPoints: number
  adminAdded: number
  adminSubtracted: number
  consumption: number
  entryCount: number
  transactionCount: number
  averagePointsPerEntry: number
  pointAwardRate: number
}

interface DailyStat {
  date: string
  awarded: number
  consumed: number
  entryCount: number
}

export default function PointsDashboardPage() {
  const { toast } = useToast()
  const [statistics, setStatistics] = useState<Statistics | null>(null)
  const [dailyStats, setDailyStats] = useState<DailyStat[]>([])
  const [isLoading, setIsLoading] = useState(false)
  const [period, setPeriod] = useState<"day" | "week" | "month" | "year">("month")

  useEffect(() => {
    loadStatistics()
  }, [period])

  async function loadStatistics() {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/points/statistics?period=${period}`, { cache: "no-store" })
      const data = await res.json()

      if (res.ok && data?.ok && data?.statistics) {
        setStatistics(data.statistics)
        setDailyStats(data.dailyStats || [])
      } else {
        throw new Error(data?.error || "統計データの取得に失敗しました")
      }
    } catch (e: any) {
      toast({
        title: "エラー",
        description: e?.message || "統計データの取得に失敗しました",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  function formatNumber(num: number) {
    return num.toLocaleString("ja-JP")
  }

  const netPoints = statistics ? statistics.totalAwarded - statistics.totalConsumed : 0

  return (
    <AdminLayout
      pageTitle="ポイント統計ダッシュボード"
      breadcrumbs={[{ label: "ポイント管理", href: "/admin/points" }, { label: "統計ダッシュボード" }]}
    >
      <div className="mx-auto max-w-7xl space-y-6">
        {/* 期間選択 */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div>
                <CardTitle>ポイント統計ダッシュボード</CardTitle>
                <CardDescription>期間別のポイント獲得・消費の統計を表示します</CardDescription>
              </div>
              <div className="flex gap-2">
                <Button
                  variant={period === "day" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPeriod("day")}
                >
                  日次
                </Button>
                <Button
                  variant={period === "week" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPeriod("week")}
                >
                  週次
                </Button>
                <Button
                  variant={period === "month" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPeriod("month")}
                >
                  月次
                </Button>
                <Button
                  variant={period === "year" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setPeriod("year")}
                >
                  年次
                </Button>
                <Button onClick={loadStatistics} variant="outline" size="sm" disabled={isLoading} className="gap-2">
                  <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                  更新
                </Button>
              </div>
            </div>
          </CardHeader>
        </Card>

        {isLoading ? (
          <div className="text-center py-12 text-muted-foreground">読み込み中...</div>
        ) : statistics ? (
          <>
            {/* サマリー統計 */}
            <div className="grid gap-4 md:grid-cols-4">
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">総獲得ポイント</CardTitle>
                  <TrendingUp className="h-4 w-4 text-green-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-green-600">{formatNumber(statistics.totalAwarded)}</div>
                  <p className="text-xs text-muted-foreground">期間内の獲得合計</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">総消費ポイント</CardTitle>
                  <TrendingDown className="h-4 w-4 text-red-600" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold text-red-600">{formatNumber(statistics.totalConsumed)}</div>
                  <p className="text-xs text-muted-foreground">期間内の消費合計</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">純増ポイント</CardTitle>
                  <Coins className="h-4 w-4 text-blue-600" />
                </CardHeader>
                <CardContent>
                  <div className={`text-2xl font-bold ${netPoints >= 0 ? "text-blue-600" : "text-red-600"}`}>
                    {formatNumber(netPoints)}
                  </div>
                  <p className="text-xs text-muted-foreground">獲得 - 消費</p>
                </CardContent>
              </Card>
              <Card>
                <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
                  <CardTitle className="text-sm font-medium">入室回数</CardTitle>
                  <Users className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                  <div className="text-2xl font-bold">{formatNumber(statistics.entryCount)}</div>
                  <p className="text-xs text-muted-foreground">期間内の入室合計</p>
                </CardContent>
              </Card>
            </div>

            {/* 詳細統計 */}
            <div className="grid gap-4 md:grid-cols-2">
              <Card>
                <CardHeader>
                  <CardTitle>獲得ポイント内訳</CardTitle>
                  <CardDescription>獲得ポイントの種別別内訳</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">入室ポイント</span>
                      <span className="font-semibold">{formatNumber(statistics.entryPoints)} pt</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">ボーナスポイント</span>
                      <span className="font-semibold">{formatNumber(statistics.bonusPoints)} pt</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">管理追加</span>
                      <span className="font-semibold">{formatNumber(statistics.adminAdded)} pt</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
              <Card>
                <CardHeader>
                  <CardTitle>消費ポイント内訳</CardTitle>
                  <CardDescription>消費ポイントの種別別内訳</CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">管理減算</span>
                      <span className="font-semibold">{formatNumber(statistics.adminSubtracted)} pt</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-sm text-muted-foreground">消費</span>
                      <span className="font-semibold">{formatNumber(statistics.consumption)} pt</span>
                    </div>
                  </div>
                </CardContent>
              </Card>
            </div>

            {/* 効率指標 */}
            <Card>
              <CardHeader>
                <CardTitle>効率指標</CardTitle>
                <CardDescription>ポイント運用の効率を表す指標</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid gap-4 md:grid-cols-3">
                  <div>
                    <p className="text-sm text-muted-foreground">入室1回あたりの平均ポイント</p>
                    <p className="text-2xl font-bold">{statistics.averagePointsPerEntry.toFixed(2)} pt</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">取引回数</p>
                    <p className="text-2xl font-bold">{formatNumber(statistics.transactionCount)} 回</p>
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">ポイント獲得率</p>
                    <p className="text-2xl font-bold">{statistics.pointAwardRate.toFixed(1)}%</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* 日別推移グラフ */}
            {dailyStats.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>日別ポイント推移</CardTitle>
                  <CardDescription>期間内の日別ポイント獲得・消費の推移</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <LineChart data={dailyStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Line type="monotone" dataKey="awarded" stroke="#22c55e" name="獲得" />
                      <Line type="monotone" dataKey="consumed" stroke="#ef4444" name="消費" />
                    </LineChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}

            {/* 日別入室回数グラフ */}
            {dailyStats.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle>日別入室回数</CardTitle>
                  <CardDescription>期間内の日別入室回数の推移</CardDescription>
                </CardHeader>
                <CardContent>
                  <ResponsiveContainer width="100%" height={300}>
                    <BarChart data={dailyStats}>
                      <CartesianGrid strokeDasharray="3 3" />
                      <XAxis dataKey="date" />
                      <YAxis />
                      <Tooltip />
                      <Legend />
                      <Bar dataKey="entryCount" fill="#3b82f6" name="入室回数" />
                    </BarChart>
                  </ResponsiveContainer>
                </CardContent>
              </Card>
            )}
          </>
        ) : (
          <div className="text-center py-12 text-muted-foreground">データがありません</div>
        )}
      </div>
    </AdminLayout>
  )
}
