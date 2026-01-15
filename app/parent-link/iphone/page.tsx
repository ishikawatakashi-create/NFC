"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import liff from "@line/liff";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  CreditCard,
  QrCode as QrCodeIcon,
  ArrowRight,
  Users,
  User,
  Keyboard,
} from "lucide-react";
import QRCode from "qrcode";

type Student = {
  id: string;
  name: string;
  grade: string | null;
  class: string | null;
};

type Parent = {
  id: string;
  name: string;
  phoneNumber: string | null;
  email: string | null;
  relationship: string | null;
  isPrimary: boolean;
  lineConnected: boolean;
  lineDisplayName: string | null;
};

export default function ParentLinkIPhonePage() {
  const router = useRouter();
  const [loading, setLoading] = useState(true);
  const [liffInitialized, setLiffInitialized] = useState(false);
  const [liffError, setLiffError] = useState<string | null>(null);
  const [lineUserId, setLineUserId] = useState<string | null>(null);
  const [lineDisplayName, setLineDisplayName] = useState<string | null>(null);
  const [isScanning, setIsScanning] = useState(false);
  const [cardId, setCardId] = useState<string>("");
  const [manualInput, setManualInput] = useState(false);
  const [student, setStudent] = useState<Student | null>(null);
  const [parents, setParents] = useState<Parent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);
  const [selectedParentId, setSelectedParentId] = useState<string | null>(null);
  const [connecting, setConnecting] = useState(false);
  const [connectSuccess, setConnectSuccess] = useState(false);

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
          liff.login();
          return;
        }

        // LINEユーザー情報を取得
        const profile = await liff.getProfile();
        setLineUserId(profile.userId);
        setLineDisplayName(profile.displayName);

        setLoading(false);
      } catch (err: any) {
        console.error("[ParentLinkIPhone] LIFF initialization error:", err);
        setLiffError(err?.message || "LINEの初期化に失敗しました");
        setLoading(false);
      }
    };

    initializeLiff();
  }, []);

  // カードIDから生徒情報を取得
  const fetchStudentInfo = async (cardSerial: string) => {
    setError(null);
    setIsScanning(true);

    try {
      const verifyRes = await fetch("/api/cards/verify", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ serialNumber: cardSerial }),
      });

      const verifyData = await verifyRes.json();

      if (!verifyRes.ok || !verifyData?.ok) {
        setError(verifyData?.error || "このカードは登録されていません。");
        setIsScanning(false);
        return;
      }

      const studentData = verifyData.student;
      setStudent(studentData);

      // 親御さん情報を取得
      const parentRes = await fetch(`/api/parent-link/verify?studentId=${studentData.id}`);
      const parentData = await parentRes.json();

      if (!parentRes.ok || !parentData?.ok) {
        setError(parentData?.error || "親御さん情報の取得に失敗しました。");
        setIsScanning(false);
        return;
      }

      setParents(parentData.parents);
      setIsScanning(false);

      // QRコードを生成
      await generateQRCode(studentData.id);
    } catch (err: any) {
      console.error("Error fetching student info:", err);
      setError(err?.message || "エラーが発生しました。");
      setIsScanning(false);
    }
  };

  // NFCカード読み取り（試行）
  const handleScanNFC = async () => {
    setIsScanning(true);
    setError(null);
    setCardId("");
    setStudent(null);
    setParents([]);
    setShowQRCode(false);

    try {
      // @ts-ignore - Web NFC API
      if ("NDEFReader" in window) {
        const ndef = new NDEFReader();
        
        let isProcessing = false;

        const processCard = async (serialNumber: string) => {
          if (isProcessing) return;
          isProcessing = true;

          if (!serialNumber) {
            setError("カードのシリアル番号を読み取れませんでした。手動入力に切り替えてください。");
            setIsScanning(false);
            setManualInput(true);
            return;
          }

          const cardSerial = serialNumber.trim().toLowerCase();
          setCardId(cardSerial);
          await fetchStudentInfo(cardSerial);
        };

        await ndef.scan();

        ndef.addEventListener("readingerror", () => {
          console.error("NFC reading error");
          setError("NFC読み取りに失敗しました。カードIDを手動で入力してください。");
          setIsScanning(false);
          setManualInput(true);
        });

        ndef.addEventListener("reading", (event: any) => {
          const serialNumber = event.serialNumber;
          if (serialNumber) {
            processCard(serialNumber);
          }
        });
      } else {
        // Web NFC APIが使えない場合
        setError("このデバイスはNFC読み取りに対応していません。カードIDを手動で入力してください。");
        setIsScanning(false);
        setManualInput(true);
      }
    } catch (err: any) {
      console.error("NFC scan error:", err);
      setError("NFC読み取りを開始できませんでした。カードIDを手動で入力してください。");
      setIsScanning(false);
      setManualInput(true);
    }
  };

  // 手動入力でカードIDを送信
  const handleManualSubmit = async () => {
    if (!cardId.trim()) {
      setError("カードIDを入力してください。");
      return;
    }

    const cardSerial = cardId.trim().toLowerCase();
    await fetchStudentInfo(cardSerial);
  };

  // QRコード生成
  const generateQRCode = async (studentId: string) => {
    try {
      const baseUrl = window.location.origin;
      const liffUrl = `${baseUrl}/parent-link?studentId=${studentId}`;
      const dataUrl = await QRCode.toDataURL(liffUrl, {
        width: 300,
        margin: 2,
        color: {
          dark: "#000000",
          light: "#FFFFFF",
        },
      });
      setQrCodeUrl(dataUrl);
      setShowQRCode(true);
    } catch (err) {
      console.error("Failed to generate QR code:", err);
      setError("QRコードの生成に失敗しました");
    }
  };

  // LINE連携実行
  const handleConnect = async (parentId: string, studentId: string) => {
    if (!lineUserId || !student) {
      return;
    }

    setConnecting(true);
    setError(null);

    try {
      const response = await fetch("/api/parent-link/connect", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          lineUserId,
          lineDisplayName,
          parentId,
          studentId,
        }),
      });

      const data = await response.json();

      if (!data.ok) {
        setError(data.error || "LINE連携に失敗しました");
        setConnecting(false);
        return;
      }

      setConnectSuccess(true);
      setConnecting(false);

      // 3秒後にLIFFウィンドウを閉じる
      setTimeout(() => {
        if (liff.isInClient()) {
          liff.closeWindow();
        }
      }, 3000);
    } catch (err: any) {
      console.error("Error connecting LINE account:", err);
      setError(err?.message || "エラーが発生しました");
      setConnecting(false);
    }
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

  // 連携成功
  if (connectSuccess) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-green-50 to-blue-50 p-4">
        <Card className="w-full max-w-md">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-6 w-6" />
              連携完了
            </CardTitle>
          </CardHeader>
          <CardContent>
            <Alert className="border-green-200 bg-green-50">
              <AlertDescription className="text-green-800">
                LINE通知連携が完了しました！
                <br />
                今後、お子様の入退室時に通知が届きます。
              </AlertDescription>
            </Alert>
            <p className="mt-4 text-center text-sm text-gray-600">
              このウィンドウは自動的に閉じます...
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  // メインコンテンツ
  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4 py-8">
      <div className="mx-auto max-w-2xl">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <QrCodeIcon className="h-6 w-6 text-blue-600" />
              iPhone - LINE通知連携
            </CardTitle>
            <CardDescription>
              お子様のNFCカードを読み取って、QRコードを生成します
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* エラー表示 */}
            {error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* カード読み取り / 手動入力 */}
            {!student && (
              <div className="space-y-4">
                {!manualInput ? (
                  <div className="rounded-lg border-2 border-dashed border-blue-300 bg-blue-50 p-8 text-center">
                    <CreditCard className="mx-auto h-16 w-16 text-blue-600 mb-4" />
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      NFCカードを読み取る
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      iPhoneではNFC読み取りができない場合があります。
                      <br />
                      読み取れない場合は、手動入力に切り替えてください。
                    </p>
                    <Button
                      onClick={handleScanNFC}
                      disabled={isScanning}
                      size="lg"
                      className="w-full max-w-xs mb-2"
                    >
                      {isScanning ? (
                        <>
                          <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                          読み取り中...
                        </>
                      ) : (
                        <>
                          <CreditCard className="mr-2 h-5 w-5" />
                          NFCカードを読み取る
                        </>
                      )}
                    </Button>
                    <Button
                      onClick={() => setManualInput(true)}
                      variant="outline"
                      size="sm"
                    >
                      <Keyboard className="mr-2 h-4 w-4" />
                      カードIDを手動で入力
                    </Button>
                  </div>
                ) : (
                  <div className="rounded-lg border-2 border-blue-300 bg-blue-50 p-6">
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">
                      カードIDを入力
                    </h3>
                    <p className="text-sm text-gray-600 mb-4">
                      お子様のNFCカードのIDを入力してください。
                      <br />
                      （管理画面で確認できます）
                    </p>
                    <div className="space-y-3">
                      <Input
                        placeholder="カードID（例: 04:1a:2b:3c:4d:5e:6f）"
                        value={cardId}
                        onChange={(e) => setCardId(e.target.value)}
                        disabled={isScanning}
                      />
                      <div className="flex gap-2">
                        <Button
                          onClick={handleManualSubmit}
                          disabled={isScanning || !cardId.trim()}
                          className="flex-1"
                        >
                          {isScanning ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              確認中...
                            </>
                          ) : (
                            <>
                              <ArrowRight className="mr-2 h-4 w-4" />
                              確認
                            </>
                          )}
                        </Button>
                        <Button
                          onClick={() => {
                            setManualInput(false);
                            setCardId("");
                            setError(null);
                          }}
                          variant="outline"
                        >
                          戻る
                        </Button>
                      </div>
                    </div>
                  </div>
                )}
              </div>
            )}

            {/* 生徒情報表示 */}
            {student && (
              <div className="space-y-4">
                <div className="rounded-lg border border-blue-200 bg-blue-50 p-4">
                  <h3 className="mb-2 text-sm font-semibold text-blue-900">お子様情報</h3>
                  <div className="flex items-center gap-3">
                    <User className="h-8 w-8 text-blue-600" />
                    <div>
                      <p className="font-semibold text-gray-900">{student.name}</p>
                      {student.grade && (
                        <p className="text-sm text-gray-600">
                          {student.grade}
                          {student.class ? ` ${student.class}` : ""}
                        </p>
                      )}
                    </div>
                  </div>
                </div>

                {/* QRコード表示 */}
                {showQRCode && qrCodeUrl && (
                  <div className="rounded-lg border-2 border-green-200 bg-green-50 p-6 text-center">
                    <h3 className="mb-4 text-sm font-semibold text-green-900">
                      QRコードをスキャンしてください
                    </h3>
                    <div className="flex justify-center mb-4">
                      <div className="rounded-lg border-4 border-gray-200 bg-white p-4">
                        <img
                          src={qrCodeUrl}
                          alt="LINE連携用QRコード"
                          className="w-64 h-64"
                        />
                      </div>
                    </div>
                    <p className="text-xs text-gray-600 mb-4">
                      LINEアプリでQRコードをスキャンすると、自動的に連携が完了します。
                    </p>
                    
                    {/* 親御さん選択（複数いる場合） */}
                    {parents.length > 1 && (
                      <div className="mt-4 space-y-3">
                        <h4 className="text-sm font-semibold text-gray-900">
                          連携する親御さんを選択してください
                        </h4>
                        {parents.map((parent) => (
                          <button
                            key={parent.id}
                            onClick={() => setSelectedParentId(parent.id)}
                            className={`w-full rounded-lg border-2 p-3 text-left transition-all ${
                              selectedParentId === parent.id
                                ? "border-green-500 bg-green-50"
                                : "border-gray-200 bg-white hover:border-green-300"
                            }`}
                          >
                            <div className="flex items-start justify-between">
                              <div>
                                <p className="font-semibold text-gray-900">
                                  {parent.name}
                                  {parent.isPrimary && (
                                    <Badge variant="outline" className="ml-2">
                                      主連絡先
                                    </Badge>
                                  )}
                                </p>
                                {parent.relationship && (
                                  <p className="text-sm text-gray-600">
                                    {getRelationshipLabel(parent.relationship)}
                                  </p>
                                )}
                              </div>
                              {selectedParentId === parent.id && (
                                <CheckCircle2 className="h-5 w-5 text-green-600" />
                              )}
                            </div>
                          </button>
                        ))}
                        <Button
                          onClick={() => {
                            const targetParentId = selectedParentId || parents[0]?.id;
                            if (targetParentId && student) {
                              handleConnect(targetParentId, student.id);
                            }
                          }}
                          disabled={!selectedParentId && parents.length > 1 || connecting}
                          className="w-full"
                        >
                          {connecting ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              連携中...
                            </>
                          ) : (
                            <>
                              <ArrowRight className="mr-2 h-4 w-4" />
                              LINE通知を開始する
                            </>
                          )}
                        </Button>
                      </div>
                    )}

                    {parents.length === 1 && (
                      <Button
                        onClick={() => handleConnect(parents[0].id, student.id)}
                        disabled={connecting}
                        className="w-full mt-4"
                      >
                        {connecting ? (
                          <>
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                            連携中...
                          </>
                        ) : (
                          <>
                            <ArrowRight className="mr-2 h-4 w-4" />
                            LINE通知を開始する
                          </>
                        )}
                      </Button>
                    )}
                  </div>
                )}

                <Button
                  onClick={() => {
                    setStudent(null);
                    setParents([]);
                    setCardId("");
                    setError(null);
                    setShowQRCode(false);
                    setQrCodeUrl(null);
                    setSelectedParentId(null);
                    setManualInput(false);
                  }}
                  variant="outline"
                  className="w-full"
                >
                  別のカードを読み取る
                </Button>
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}

function getRelationshipLabel(relationship: string): string {
  switch (relationship) {
    case "mother":
      return "母親";
    case "father":
      return "父親";
    case "guardian":
      return "保護者";
    case "other":
      return "その他";
    default:
      return relationship;
  }
}
