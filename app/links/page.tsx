"use client"

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { ExternalLink, LogIn, LogOut, Users, Clock, Settings, TestTube, Home } from "lucide-react"
import Link from "next/link"

export default function QuickLinksPage() {
  const currentUrl = typeof window !== 'undefined' ? window.location.origin : ''

  const links = [
    {
      category: "🚪 キオスク画面（入退室記録）",
      items: [
        {
          name: "入室画面",
          path: "/kiosk/entry",
          icon: LogIn,
          color: "bg-blue-50 hover:bg-blue-100",
          description: "教室の入口に設置。生徒がカードをタッチして入室を記録"
        },
        {
          name: "退室画面",
          path: "/kiosk/exit",
          icon: LogOut,
          color: "bg-orange-50 hover:bg-orange-100",
          description: "教室の出口に設置。生徒がカードをタッチして退室を記録"
        },
      ]
    },
    {
      category: "👨‍💼 管理画面",
      items: [
        {
          name: "生徒管理",
          path: "/admin/students",
          icon: Users,
          color: "bg-purple-50 hover:bg-purple-100",
          description: "生徒の追加・編集・削除、カード登録"
        },
        {
          name: "入退室ログ",
          path: "/admin/access-logs",
          icon: Clock,
          color: "bg-green-50 hover:bg-green-100",
          description: "入退室の履歴確認、検索、フィルタリング"
        },
        {
          name: "設定",
          path: "/admin/settings",
          icon: Settings,
          color: "bg-gray-50 hover:bg-gray-100",
          description: "システム設定、開放時間設定"
        },
      ]
    },
    {
      category: "🧪 テスト・デバッグ",
      items: [
        {
          name: "NFCテストページ",
          path: "/nfc-test",
          icon: TestTube,
          color: "bg-pink-50 hover:bg-pink-100",
          description: "NFCカードの読み取りテスト、デバッグ"
        },
        {
          name: "環境変数確認",
          path: "/envcheck",
          icon: Settings,
          color: "bg-yellow-50 hover:bg-yellow-100",
          description: "環境変数が正しく設定されているか確認"
        },
      ]
    },
  ]

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text)
    alert('URLをコピーしました！')
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 to-slate-100 p-4 md:p-8">
      <div className="max-w-6xl mx-auto space-y-6">
        {/* ヘッダー */}
        <Card>
          <CardHeader>
            <CardTitle className="text-3xl flex items-center gap-2">
              <Home className="w-8 h-8" />
              クイックリンク集
            </CardTitle>
            <CardDescription>
              システム内の主要ページへのリンク集です
            </CardDescription>
          </CardHeader>
        </Card>

        {/* リンク一覧 */}
        {links.map((category, idx) => (
          <Card key={idx}>
            <CardHeader>
              <CardTitle className="text-xl">{category.category}</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid gap-4 md:grid-cols-2">
                {category.items.map((item, itemIdx) => {
                  const Icon = item.icon
                  const fullUrl = `${currentUrl}${item.path}`
                  
                  return (
                    <div
                      key={itemIdx}
                      className={`${item.color} rounded-lg p-4 border border-gray-200 transition-all`}
                    >
                      <div className="flex items-start gap-3 mb-3">
                        <Icon className="w-6 h-6 flex-shrink-0 mt-1" />
                        <div className="flex-1">
                          <h3 className="font-semibold text-lg mb-1">{item.name}</h3>
                          <p className="text-sm text-muted-foreground mb-3">
                            {item.description}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Link href={item.path}>
                              <Button size="sm" className="gap-2">
                                <ExternalLink className="w-4 h-4" />
                                開く
                              </Button>
                            </Link>
                            <Button
                              size="sm"
                              variant="outline"
                              onClick={() => copyToClipboard(fullUrl)}
                            >
                              URLコピー
                            </Button>
                          </div>
                        </div>
                      </div>
                      <div className="mt-3 pt-3 border-t border-gray-300">
                        <p className="text-xs font-mono text-gray-600 break-all">
                          {item.path}
                        </p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </CardContent>
          </Card>
        ))}

        {/* ヒント */}
        <Card>
          <CardHeader>
            <CardTitle className="text-lg">💡 ヒント</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3 text-sm">
            <div>
              <strong>Android端末でホーム画面に追加:</strong>
              <ol className="list-decimal list-inside ml-2 mt-1 space-y-1">
                <li>Chromeで対象ページを開く</li>
                <li>メニュー（右上の3点）→「ホーム画面に追加」</li>
                <li>アイコンがホーム画面に追加されます</li>
              </ol>
            </div>
            <div>
              <strong>全画面表示:</strong>
              <p className="ml-2 mt-1">
                ホーム画面に追加したアイコンから起動すると、自動的に全画面表示になります
              </p>
            </div>
            <div>
              <strong>QRコード生成:</strong>
              <p className="ml-2 mt-1">
                URLをコピーして、QRコード生成サイト（
                <a href="https://www.qr-code-generator.com/" target="_blank" rel="noopener noreferrer" className="text-blue-600 underline">
                  qr-code-generator.com
                </a>
                ）でQRコードを作成できます
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

