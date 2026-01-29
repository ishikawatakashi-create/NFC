"use client"

import type React from "react"

import { useState, useEffect } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Menu, X, Users, ClipboardList, Settings, LogOut, ChevronRight, Coins, UserCheck, Shield } from "lucide-react"
import { createBrowserSupabaseClient } from "@/lib/supabase-client-auth"

interface MenuItem {
  label: string
  href: string
  icon: React.ComponentType<{ className?: string }>
}

const menuItems: MenuItem[] = [
  { label: "ユーザー一覧", href: "/admin/students", icon: Users },
  { label: "親御さん管理", href: "/admin/parents", icon: UserCheck },
  { label: "入退室ログ", href: "/admin/access-logs", icon: ClipboardList },
  { label: "ポイント管理", href: "/admin/points", icon: Coins },
  { label: "管理ユーザー管理", href: "/admin/admins", icon: Shield },
  { label: "設定", href: "/admin/settings", icon: Settings },
]

interface AdminLayoutProps {
  children: React.ReactNode
  pageTitle: string
  breadcrumbs?: { label: string; href?: string }[]
  actions?: React.ReactNode
}

export function AdminLayout({ children, pageTitle, breadcrumbs, actions }: AdminLayoutProps) {
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [adminInfo, setAdminInfo] = useState<{ name: string; email: string } | null>(null)
  const [isLoading, setIsLoading] = useState(true)
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    async function loadAdminInfo() {
      try {
        const supabase = createBrowserSupabaseClient()
        const { data: { user } } = await supabase.auth.getUser()
        
        if (!user) {
          router.push("/admin/login")
          return
        }

        // API経由で管理者情報を取得
        const res = await fetch("/api/admin/info", {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        })

        if (res.ok) {
          const data = await res.json()
          if (data?.ok && data?.admin) {
            // 管理者名の表示を修正
            let displayName = ""
            const lastName = data.admin.lastName || ""
            const firstName = data.admin.firstName || ""
            
            // 既にスペースが含まれている場合や、重複している場合の処理
            if (lastName && firstName) {
              // 重複チェック（例: "石川石川" → "石川"）
              const cleanLastName = lastName.replace(/(.+)\1/, "$1")
              const cleanFirstName = firstName.replace(/(.+)\1/, "$1")
              displayName = `${cleanLastName} ${cleanFirstName}`
            } else if (lastName) {
              displayName = lastName
            } else if (firstName) {
              displayName = firstName
            }
            
            // 特定の名前の修正（データベースの値が間違っている場合の対応）
            if (displayName === "石川石川高志") {
              displayName = "石川 高志"
            } else if (displayName === "YamamotoHiroaki" || displayName === "yamamoto hiroaki" || displayName === "Yamamoto Hiroaki") {
              displayName = "山本 裕晃"
            }
            
            setAdminInfo({
              name: displayName,
              email: user.email || "",
            })
          }
        }
      } catch (error) {
        console.error("Failed to load admin info:", error)
      } finally {
        setIsLoading(false)
      }
    }

    loadAdminInfo()
  }, [router])

  const handleLogout = async () => {
    try {
      const supabase = createBrowserSupabaseClient()
      await supabase.auth.signOut()
      router.push("/admin/login")
      router.refresh()
    } catch (error) {
      console.error("Logout error:", error)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Mobile sidebar backdrop */}
      {sidebarOpen && (
        <div className="fixed inset-0 z-40 bg-black/50 lg:hidden" onClick={() => setSidebarOpen(false)} />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed left-0 top-0 z-50 h-full w-64 transform border-r border-sidebar-border bg-sidebar text-sidebar-foreground transition-transform duration-200 ease-in-out lg:translate-x-0",
          sidebarOpen ? "translate-x-0" : "-translate-x-full",
        )}
      >
        {/* Logo/Title */}
        <div className="flex h-16 items-center justify-between border-b border-sidebar-border px-6">
          <h1 className="text-lg font-semibold text-sidebar-foreground">ロボ団一宮校 入退室管理</h1>
          <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(false)}>
            <X className="h-5 w-5" />
          </Button>
        </div>

        {/* Navigation */}
        <nav className="space-y-1 p-4">
          {menuItems.map((item) => {
            const Icon = item.icon
            const isActive = pathname === item.href || pathname?.startsWith(item.href + "/")

            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setSidebarOpen(false)}
                className={cn(
                  "flex items-center gap-3 rounded-md px-3 py-2 text-sm font-medium transition-colors border-l-2",
                  isActive
                    ? "bg-sidebar-accent text-sidebar-foreground border-primary"
                    : "text-sidebar-foreground/70 border-transparent hover:bg-sidebar-accent hover:text-sidebar-foreground",
                )}
              >
                <Icon className="h-5 w-5" />
                {item.label}
              </Link>
            )
          })}
        </nav>
      </aside>

      {/* Main content */}
      <div className="lg:pl-64">
        {/* Header */}
        <header className="sticky top-0 z-30 flex h-16 items-center justify-between border-b border-border bg-card px-4 lg:px-6">
          <div className="flex items-center gap-4">
            {/* Mobile menu button */}
            <Button variant="ghost" size="icon" className="lg:hidden" onClick={() => setSidebarOpen(true)}>
              <Menu className="h-5 w-5" />
            </Button>

            {/* Breadcrumbs */}
            {breadcrumbs && breadcrumbs.length > 0 ? (
              <nav className="flex items-center gap-2 text-sm">
                {breadcrumbs.map((crumb, index) => (
                  <div key={index} className="flex items-center gap-2">
                    {index > 0 && <ChevronRight className="h-4 w-4 text-muted-foreground" />}
                    {crumb.href ? (
                      <Link href={crumb.href} className="text-muted-foreground hover:text-foreground">
                        {crumb.label}
                      </Link>
                    ) : (
                      <span className="font-medium text-foreground">{crumb.label}</span>
                    )}
                  </div>
                ))}
              </nav>
            ) : (
              <h2 className="text-[20px] font-semibold">{pageTitle}</h2>
            )}
          </div>

          {/* Right side: Actions + User + Logout */}
          <div className="flex items-center gap-3">
            {actions && <div className="flex items-center gap-2">{actions}</div>}

            <div className="hidden h-8 w-px bg-border sm:block" />

            <div className="flex items-center gap-3">
              {!isLoading && adminInfo && (
                <div className="hidden text-right sm:block">
                  <p className="text-sm font-medium">{adminInfo.name}</p>
                  <p className="text-xs text-muted-foreground">{adminInfo.email}</p>
                </div>
              )}

              <Button variant="ghost" size="sm" className="gap-2" onClick={handleLogout}>
                <LogOut className="h-4 w-4" />
                <span className="hidden sm:inline">ログアウト</span>
              </Button>
            </div>
          </div>
        </header>

        {/* Page content */}
        <main className="p-4 lg:p-6">{children}</main>
      </div>
    </div>
  )
}
