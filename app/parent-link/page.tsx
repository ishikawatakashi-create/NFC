"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import liff from "@line/liff";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Loader2, XCircle, Smartphone, CreditCard, QrCode } from "lucide-react";

export default function ParentLinkPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [liffInitialized, setLiffInitialized] = useState(false);
  const [liffError, setLiffError] = useState<string | null>(null);

  // LIFF初期化
  useEffect(() => {
    const initializeLiff = async () => {
      try {
        const liffId = process.env.NEXT_PUBLIC_LIFF_ID;
        
        if (!liffId) {
          setLiffError("LIFF IDが設定されていません。管理者にお問い合わせください。");
          setLoading(false);
          return;
        }

        await liff.init({ liffId });
        setLiffInitialized(true);

        if (!liff.isLoggedIn()) {
          // LINEログインしていない場合はログイン
          liff.login();
          return;
        }

        console.log("[ParentLink] LIFF initialized successfully");
        setLoading(false);
      } catch (err: any) {
        console.error("[ParentLink] LIFF initialization error:", err);
        setLiffError(err?.message || "LINEの初期化に失敗しました");
        setLoading(false);
      }
    };

    initializeLiff();
  }, []);

  const handleSelectDevice = (device: "android" | "iphone") => {
    router.push(`/parent-link/${device}`);
  };

  // ローディング中
  if (loading || !liffInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <Card className="w-full max-w-md">
          <CardContent className="flex flex-col items-center justify-center py-12">
            <Loader2 className="h-12 w-12 animate-spin text-green-600" />
            <p className="mt-4 text-gray-600">読み込み中...</p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // LIFF初期化エラー
  if (liffError) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-red-50 to-orange-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-red-600">
              <XCircle className="h-6 w-6" />
              エラー
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert variant="destructive">
              <AlertDescription>{liffError}</AlertDescription>
            </Alert>
          </CardContent>
        </Card>
      </div>
    );
  }

  // デバイス選択画面
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4 py-8">
      <div className="mx-auto max-w-2xl">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Smartphone className="h-6 w-6 text-green-600" />
              LINE通知連携
            </CardTitle>
            <CardDescription>
              お子様のNFCカードを読み取って、LINE通知を設定してください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            <Alert className="border-blue-200 bg-blue-50">
              <AlertDescription className="text-sm text-blue-900">
                お使いのスマートフォンの種類を選択してください。
              </AlertDescription>
            </Alert>

            <div className="grid gap-4 md:grid-cols-2">
              {/* Android */}
              <Card
                className="cursor-pointer border-2 border-green-200 bg-green-50 transition-all hover:border-green-400 hover:shadow-md"
                onClick={() => handleSelectDevice("android")}
              >
                <CardContent className="flex flex-col items-center p-6 text-center">
                  <div className="mb-4 rounded-full bg-green-100 p-4">
                    <Smartphone className="h-12 w-12 text-green-600" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-gray-900">Android</h3>
                  <p className="mb-4 text-sm text-gray-600">
                    NFCカードをタップするだけで自動連携
                  </p>
                  <Button className="w-full" variant="default">
                    選択する
                  </Button>
                </CardContent>
              </Card>

              {/* iPhone */}
              <Card
                className="cursor-pointer border-2 border-blue-200 bg-blue-50 transition-all hover:border-blue-400 hover:shadow-md"
                onClick={() => handleSelectDevice("iphone")}
              >
                <CardContent className="flex flex-col items-center p-6 text-center">
                  <div className="mb-4 rounded-full bg-blue-100 p-4">
                    <QrCode className="h-12 w-12 text-blue-600" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-gray-900">iPhone</h3>
                  <p className="mb-4 text-sm text-gray-600">
                    NFCカードをタップしてQRコードを表示
                  </p>
                  <Button className="w-full" variant="default">
                    選択する
                  </Button>
                </CardContent>
              </Card>
            </div>

            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-2 text-sm font-semibold text-gray-900">使い方</h3>
              <ol className="ml-4 list-decimal space-y-1 text-xs text-gray-600">
                <li>お使いのスマートフォンの種類を選択</li>
                <li>お子様のNFCカードをスマートフォンにタップ</li>
                <li>自動的にLINE通知連携が完了します</li>
              </ol>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
