"use client"

import { AdminLayout } from "@/components/admin/admin-layout"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Badge } from "@/components/ui/badge"
import { useToast } from "@/hooks/use-toast"
import { AlertTriangle, CheckCircle, RefreshCw, Download } from "lucide-react"
import { useState } from "react"
import { Alert, AlertDescription } from "@/components/ui/alert"

interface VerifyResult {
  studentId: string
  studentName: string
  currentPoints: number
  calculatedPoints: number
  difference: number
  isCorrect: boolean
  fixed?: boolean
}

interface VerifyResponse {
  ok: boolean
  results?: VerifyResult[]
  summary?: {
    total: number
    correct: number
    incorrect: number
    fixed: number
  }
  error?: string
}

export default function PointsVerifyPage() {
  const { toast } = useToast()
  const [results, setResults] = useState<VerifyResult[]>([])
  const [summary, setSummary] = useState<{
    total: number
    correct: number
    incorrect: number
    fixed: number
  } | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isFixing, setIsFixing] = useState(false)

  async function handleVerify(autoFix: boolean = false) {
    setIsLoading(true)
    try {
      const res = await fetch(`/api/points/verify?autoFix=${autoFix}`, {
        cache: "no-store",
      })
      const data: VerifyResponse = await res.json()

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "整合性チェックに失敗しました")
      }

      setResults(data.results || [])
      setSummary(data.summary || null)

      if (autoFix && data.summary) {
        toast({
          title: "修正完了",
          description: `${data.summary.fixed}件の不整合を修正しました`,
        })
      } else {
        toast({
          title: "チェック完了",
          description: `${data.summary?.incorrect || 0}件の不整合が見つかりました`,
          variant: data.summary?.incorrect ? "destructive" : "default",
        })
      }
    } catch (e: any) {
      toast({
        title: "エラー",
        description: e?.message || "整合性チェックに失敗しました",
        variant: "destructive",
      })
    } finally {
      setIsLoading(false)
    }
  }

  async function handleFixStudent(studentId: string) {
    setIsFixing(true)
    try {
      const res = await fetch("/api/points/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ studentId }),
      })

      const data = await res.json()

      if (!res.ok || !data?.ok) {
        throw new Error(data?.error || "修正に失敗しました")
      }

      toast({
        title: "修正完了",
        description: "ポイントを修正しました",
      })

      // 再チェック
      await handleVerify(false)
    } catch (e: any) {
      toast({
        title: "エラー",
        description: e?.message || "修正に失敗しました",
        variant: "destructive",
      })
    } finally {
      setIsFixing(false)
    }
  }

  function handleExportCSV() {
    if (results.length === 0) {
      toast({
        title: "エラー",
        description: "エクスポートするデータがありません",
        variant: "destructive",
      })
      return
    }

    const csvHeader = "生徒名,現在のポイント,計算されたポイント,差分,状態\n"
    const csvRows = results
      .map((r) => {
        const status = r.isCorrect ? "正常" : "不整合"
        return `"${r.studentName}",${r.currentPoints},${r.calculatedPoints},${r.difference},${status}`
      })
      .join("\n")

    const csv = csvHeader + csvRows
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" })
    const url = URL.createObjectURL(blob)
    const link = document.createElement("a")
    link.href = url
    link.download = `ポイント整合性チェック_${new Date().toISOString().split("T")[0]}.csv`
    link.click()
    URL.revokeObjectURL(url)
  }

  const incorrectResults = results.filter((r) => !r.isCorrect)

  return (
    <AdminLayout
      pageTitle="ポイント整合性チェック"
      breadcrumbs={[{ label: "ポイント管理", href: "/admin/points" }, { label: "整合性チェック" }]}
    >
      <div className="mx-auto max-w-7xl space-y-6">
        <Card>
          <CardHeader>
            <CardTitle>ポイント整合性チェック</CardTitle>
            <CardDescription>
              ポイント履歴から計算されたポイント数と、現在のポイント数を比較して整合性をチェックします
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex gap-2">
              <Button onClick={() => handleVerify(false)} disabled={isLoading} className="gap-2">
                <RefreshCw className={`h-4 w-4 ${isLoading ? "animate-spin" : ""}`} />
                チェック実行
              </Button>
              <Button
                onClick={() => handleVerify(true)}
                disabled={isLoading || isFixing}
                variant="default"
                className="gap-2"
              >
                <CheckCircle className="h-4 w-4" />
                チェック & 自動修正
              </Button>
              {results.length > 0 && (
                <Button onClick={handleExportCSV} variant="outline" className="gap-2">
                  <Download className="h-4 w-4" />
                  CSVエクスポート
                </Button>
              )}
            </div>

            {summary && (
              <div className="grid gap-4 md:grid-cols-4">
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold">{summary.total}</div>
                    <p className="text-xs text-muted-foreground">総チェック数</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-green-600">{summary.correct}</div>
                    <p className="text-xs text-muted-foreground">正常</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-red-600">{summary.incorrect}</div>
                    <p className="text-xs text-muted-foreground">不整合</p>
                  </CardContent>
                </Card>
                <Card>
                  <CardContent className="pt-6">
                    <div className="text-2xl font-bold text-blue-600">{summary.fixed}</div>
                    <p className="text-xs text-muted-foreground">修正済み</p>
                  </CardContent>
                </Card>
              </div>
            )}

            {summary && summary.incorrect > 0 && (
              <Alert variant="destructive">
                <AlertTriangle className="h-4 w-4" />
                <AlertDescription>
                  {summary.incorrect}件の不整合が見つかりました。「チェック & 自動修正」を実行するか、個別に修正してください。
                </AlertDescription>
              </Alert>
            )}

            {summary && summary.incorrect === 0 && summary.total > 0 && (
              <Alert>
                <CheckCircle className="h-4 w-4" />
                <AlertDescription>すべてのポイントが正常です。</AlertDescription>
              </Alert>
            )}
          </CardContent>
        </Card>

        {results.length > 0 && (
          <Card>
            <CardHeader>
              <CardTitle>チェック結果</CardTitle>
              <CardDescription>
                {incorrectResults.length > 0
                  ? `${incorrectResults.length}件の不整合が見つかりました`
                  : "すべて正常です"}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="overflow-x-auto">
                <Table>
                  <TableHeader>
                    <TableRow>
                      <TableHead>生徒名</TableHead>
                      <TableHead className="text-right">現在のポイント</TableHead>
                      <TableHead className="text-right">計算されたポイント</TableHead>
                      <TableHead className="text-right">差分</TableHead>
                      <TableHead>状態</TableHead>
                      <TableHead>操作</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {results.map((result) => (
                      <TableRow key={result.studentId}>
                        <TableCell className="font-medium">{result.studentName}</TableCell>
                        <TableCell className="text-right">{result.currentPoints}</TableCell>
                        <TableCell className="text-right">{result.calculatedPoints}</TableCell>
                        <TableCell
                          className={`text-right font-semibold ${
                            result.difference > 0 ? "text-green-600" : result.difference < 0 ? "text-red-600" : ""
                          }`}
                        >
                          {result.difference > 0 ? "+" : ""}
                          {result.difference}
                        </TableCell>
                        <TableCell>
                          {result.isCorrect ? (
                            <Badge variant="default" className="bg-green-600">
                              <CheckCircle className="h-3 w-3 mr-1" />
                              正常
                            </Badge>
                          ) : (
                            <Badge variant="destructive">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              不整合
                            </Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {!result.isCorrect && (
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => handleFixStudent(result.studentId)}
                              disabled={isFixing}
                            >
                              修正
                            </Button>
                          )}
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </AdminLayout>
  )
}
