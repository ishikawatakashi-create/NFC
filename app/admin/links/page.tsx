"use client"

import { useState } from "react"
import Link from "next/link"
import { ExternalLink, Copy } from "lucide-react"

import { Button } from "@/components/ui/button"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

export default function QuickLinksPage() {
  const [copiedPath, setCopiedPath] = useState<string | null>(null)
  const currentUrl = typeof window !== "undefined" ? window.location.origin : ""

  const links = [
    {
      category: "キオスク画面（入退室記録）",
      items: [
        {
          name: "入室画面",
          path: "/kiosk/entry",
          description: "教室の入口に設置。生徒がカードをタッチして入室を記録",
        },
        {
          name: "退室画面",
          path: "/kiosk/exit",
          description: "教室の出口に設置。生徒がカードをタッチして退室を記録",
        },
      ],
    },
    {
      category: "管理画面",
      items: [
        {
          name: "生徒管理",
          path: "/admin/students",
          description: "生徒の追加・編集・削除、カード登録",
        },
        {
          name: "入退室ログ",
          path: "/admin/access-logs",
          description: "入退室の履歴確認、検索、フィルタリング",
        },
        {
          name: "ポイント管理",
          path: "/admin/points",
          description: "ポイント設定、ランキング、一括付与、ボーナス設定",
        },
        {
          name: "管理ユーザー管理",
          path: "/admin/admins",
          description: "管理ユーザーの追加・編集・削除",
        },
        {
          name: "設定",
          path: "/admin/settings",
          description: "システム設定、開放時間設定",
        },
      ],
    },
    {
      category: "教室用表示（管理者ログイン前提）",
      items: [
        {
          name: "ポイント一覧",
          path: "/students",
          description: "教室サイネージ向けポイント一覧（管理者ログイン前提）",
        },
      ],
    },
    {
      category: "テスト・デバッグ",
      items: [
        {
          name: "NFCテストページ",
          path: "/nfc-test",
          description: "NFCカードの読み取りテスト、デバッグ",
        },
        {
          name: "環境変数確認",
          path: "/envcheck",
          description: "環境変数が正しく設定されているか確認",
        },
        {
          name: "テストページ",
          path: "/test",
          description: "Supabase接続テスト、開発用デバッグページ",
        },
      ],
    },
  ]

  const copyToClipboard = async (text: string, path: string) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedPath(path)
      window.setTimeout(() => {
        setCopiedPath((prev) => (prev === path ? null : prev))
      }, 1500)
    } catch (error) {
      console.error("Failed to copy:", error)
    }
  }

  return (
    <div className="min-h-screen bg-muted">
      <div className="border-b border-sidebar-border bg-sidebar text-sidebar-foreground">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-4 py-3">
          <div className="flex items-center gap-2 text-sm font-semibold">
            <span className="inline-flex h-2 w-2 rounded-full bg-primary" />
            ロボ団一宮校 入退室管理
          </div>
          <span className="text-xs text-sidebar-foreground/70">Quick Links</span>
        </div>
        <div className="h-0.5 bg-primary" />
      </div>
      <div className="mx-auto max-w-6xl space-y-8 p-4 md:p-6">
        <div className="border-b border-border pb-4">
          <h1>クイックリンク集</h1>
          <p className="text-sm text-muted-foreground">
            システム内の主要ページへのリンク集です（管理者専用）
          </p>
        </div>

        {links.map((category) => (
          <section key={category.category} className="space-y-3">
            <h2 className="text-[16px] font-semibold">{category.category}</h2>
            <div className="rounded-md border border-border bg-card">
              <div className="grid grid-cols-1 lg:grid-cols-2">
                {category.items.map((item, index) => {
                  const fullUrl = `${currentUrl}${item.path}`
                  const isCopied = copiedPath === item.path

                  return (
                    <div
                      key={`${item.path}-${index}`}
                      className="flex items-start justify-between gap-4 border-b border-border px-4 py-3 last:border-b-0 hover:bg-accent/80 lg:odd:border-r"
                    >
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-foreground">
                          {item.name}
                        </p>
                        <p className="mt-1 text-xs text-muted-foreground">
                          {item.description}
                        </p>
                        <p className="mt-1 text-xs font-mono text-muted-foreground break-all">
                          {item.path}
                        </p>
                      </div>
                      <div className="flex items-center gap-2">
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              asChild
                              size="icon-sm"
                              variant="secondary"
                              aria-label="開く"
                            >
                              <Link href={item.path} target="_blank" rel="noopener noreferrer">
                                <ExternalLink className="h-4 w-4" />
                              </Link>
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">開く</TooltipContent>
                        </Tooltip>
                        <Tooltip>
                          <TooltipTrigger asChild>
                            <Button
                              size="icon-sm"
                              variant="secondary"
                              aria-label="URLをコピー"
                              onClick={() => copyToClipboard(fullUrl, item.path)}
                            >
                              <Copy className="h-4 w-4" />
                            </Button>
                          </TooltipTrigger>
                          <TooltipContent side="top">コピー</TooltipContent>
                        </Tooltip>
                        {isCopied && (
                          <span className="text-[11px] text-muted-foreground">
                            コピー済み
                          </span>
                        )}
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          </section>
        ))}

        <section className="space-y-2 border-t border-border pt-4">
          <h2 className="text-[16px] font-semibold">運用メモ</h2>
          <div className="space-y-2 text-sm text-muted-foreground">
            <div>
              <p className="font-medium text-foreground">Android端末でホーム画面に追加</p>
              <ol className="list-decimal list-inside ml-3 mt-1 space-y-1">
                <li>Chromeで対象ページを開く</li>
                <li>メニュー（右上の3点）→「ホーム画面に追加」</li>
                <li>アイコンがホーム画面に追加されます</li>
              </ol>
            </div>
            <div>
              <p className="font-medium text-foreground">全画面表示</p>
              <p className="ml-3 mt-1">
                ホーム画面に追加したアイコンから起動すると、自動的に全画面表示になります
              </p>
            </div>
            <div>
              <p className="font-medium text-foreground">QRコード生成</p>
              <p className="ml-3 mt-1">
                URLをコピーして、QRコード生成サイト（
                <a
                  href="https://www.qr-code-generator.com/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-accent"
                >
                  qr-code-generator.com
                </a>
                ）でQRコードを作成できます
              </p>
            </div>
          </div>
        </section>
      </div>
    </div>
  )
}
