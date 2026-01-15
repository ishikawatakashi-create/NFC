"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Badge } from "@/components/ui/badge";
import {
  Loader2,
  CheckCircle2,
  XCircle,
  CreditCard,
  Smartphone,
  QrCode as QrCodeIcon,
  ArrowRight,
  Users,
  User,
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

export default function ParentRegisterPage() {
  const router = useRouter();
  const [isScanning, setIsScanning] = useState(false);
  const [isNfcSupported, setIsNfcSupported] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [cardId, setCardId] = useState<string | null>(null);
  const [student, setStudent] = useState<Student | null>(null);
  const [parents, setParents] = useState<Parent[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [qrCodeUrl, setQrCodeUrl] = useState<string | null>(null);
  const [showQRCode, setShowQRCode] = useState(false);

  useEffect(() => {
    // Web NFC APIのサポート確認
    if ("NDEFReader" in window) {
      setIsNfcSupported(true);
    } else {
      setIsNfcSupported(false);
    }

    // iOS判定
    const userAgent = window.navigator.userAgent.toLowerCase();
    const isIOSDevice = /iphone|ipad|ipod/.test(userAgent);
    setIsIOS(isIOSDevice);
  }, []);

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

  // NFCカード読み取り
  const handleScanNFC = async () => {
    if (!isNfcSupported) {
      setError("このデバイスはNFCをサポートしていません。QRコード方式をご利用ください。");
      return;
    }

    setIsScanning(true);
    setError(null);
    setCardId(null);
    setStudent(null);
    setParents([]);
    setShowQRCode(false);

    try {
      // @ts-ignore - Web NFC API
      const ndef = new NDEFReader();

      let isProcessing = false;

      const processCard = async (serialNumber: string) => {
        if (isProcessing) return;
        isProcessing = true;

        try {
          if (!serialNumber) {
            setError("カードのシリアル番号を読み取れませんでした。");
            setIsScanning(false);
            return;
          }

          const cardSerial = serialNumber.trim().toLowerCase();
          setCardId(cardSerial);

          // カードから生徒情報を取得
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

          // Androidの場合、自動的にLIFFに遷移
          if (!isIOS) {
            // 親御さんが1人の場合は自動遷移
            if (parentData.parents.length === 1) {
              const liffUrl = `/parent-link?studentId=${studentData.id}`;
              window.location.href = liffUrl;
            } else {
              // 複数親御さんの場合は選択画面を表示
              setIsScanning(false);
            }
          } else {
            // iOSの場合はQRコードを生成
            await generateQRCode(studentData.id);
            setIsScanning(false);
          }
        } catch (err: any) {
          console.error("Error processing card:", err);
          setError(err?.message || "カードの処理中にエラーが発生しました。");
          setIsScanning(false);
        }
      };

      // シリアル番号を読み取る
      await ndef.scan();

      ndef.addEventListener("readingerror", () => {
        console.error("NFC reading error");
        setError("カードの読み取りに失敗しました。もう一度お試しください。");
        setIsScanning(false);
      });

      ndef.addEventListener("reading", (event: any) => {
        const serialNumber = event.serialNumber;
        if (serialNumber) {
          processCard(serialNumber);
        }
      });
    } catch (err: any) {
      console.error("NFC scan error:", err);
      setError(err?.message || "NFCの読み取りを開始できませんでした。");
      setIsScanning(false);
    }
  };

  // QRコード方式で登録
  const handleShowQRCode = async () => {
    if (!student) {
      setError("先にNFCカードを読み取ってください。");
      return;
    }

    await generateQRCode(student.id);
  };

  // LIFFページに遷移
  const handleGoToLIFF = (studentId: string) => {
    const liffUrl = `/parent-link?studentId=${studentId}`;
    window.location.href = liffUrl;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-green-50 to-blue-50 p-4 py-8">
      <div className="mx-auto max-w-2xl">
        <Card className="shadow-lg">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-xl">
              <Users className="h-6 w-6 text-green-600" />
              LINE通知連携 - 親御さん登録
            </CardTitle>
            <CardDescription>
              お子様のNFCカードを読み取って、LINE通知を設定してください
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* デバイス情報 */}
            <Alert className="border-blue-200 bg-blue-50">
              <AlertDescription className="text-sm text-blue-900">
                {isNfcSupported ? (
                  <>
                    <strong>✓ NFC対応デバイス</strong>
                    <br />
                    {isIOS
                      ? "iOSデバイスのため、カード読み取り後にQRコードが表示されます。"
                      : "Androidデバイスのため、カードを読み取ると自動的に連携が開始されます。"}
                  </>
                ) : (
                  <>
                    <strong>⚠ NFC非対応デバイス</strong>
                    <br />
                    QRコード方式をご利用ください。管理画面でQRコードを生成できます。
                  </>
                )}
              </AlertDescription>
            </Alert>

            {/* エラー表示 */}
            {error && (
              <Alert variant="destructive">
                <XCircle className="h-4 w-4" />
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            {/* NFCカード読み取りボタン */}
            {!student && (
              <div className="space-y-4">
                <div className="rounded-lg border-2 border-dashed border-green-300 bg-green-50 p-8 text-center">
                  <CreditCard className="mx-auto h-16 w-16 text-green-600 mb-4" />
                  <h3 className="text-lg font-semibold text-gray-900 mb-2">
                    NFCカードを読み取る
                  </h3>
                  <p className="text-sm text-gray-600 mb-4">
                    お子様のNFCカードをスマートフォンにタップしてください
                  </p>
                  <Button
                    onClick={handleScanNFC}
                    disabled={isScanning}
                    size="lg"
                    className="w-full max-w-xs"
                  >
                    {isScanning ? (
                      <>
                        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
                        読み取り中... カードをタップしてください
                      </>
                    ) : (
                      <>
                        <Smartphone className="mr-2 h-5 w-5" />
                        NFCカードを読み取る
                      </>
                    )}
                  </Button>
                </div>

                {!isNfcSupported && (
                  <div className="rounded-lg border border-amber-200 bg-amber-50 p-4">
                    <p className="text-sm text-amber-900">
                      <strong>NFCが利用できない場合:</strong>
                      <br />
                      管理画面で生成したQRコードを使用するか、運営にお問い合わせください。
                    </p>
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

                {/* 親御さん情報 */}
                {parents.length > 0 && (
                  <div className="space-y-3">
                    <h3 className="text-sm font-semibold text-gray-900">
                      連携する親御さんを選択してください
                    </h3>
                    {parents.map((parent) => (
                      <div
                        key={parent.id}
                        className="rounded-lg border-2 border-gray-200 bg-white p-4 hover:border-green-300 transition-all"
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
                            {parent.lineConnected && (
                              <p className="mt-1 text-xs text-green-600">
                                ✓ 既に連携済み
                                {parent.lineDisplayName && ` (${parent.lineDisplayName})`}
                              </p>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* アクションボタン */}
                <div className="space-y-3">
                  {isIOS || showQRCode ? (
                    // iOSまたはQRコード表示の場合
                    <>
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
                          <p className="text-xs text-gray-600">
                            LINEアプリでQRコードをスキャンすると、自動的に連携が完了します。
                          </p>
                        </div>
                      )}
                      {!showQRCode && (
                        <Button
                          onClick={handleShowQRCode}
                          className="w-full"
                          size="lg"
                          variant="outline"
                        >
                          <QrCodeIcon className="mr-2 h-5 w-5" />
                          QRコードを表示
                        </Button>
                      )}
                    </>
                  ) : (
                    // Androidの場合
                    <Button
                      onClick={() => handleGoToLIFF(student.id)}
                      className="w-full"
                      size="lg"
                    >
                      <ArrowRight className="mr-2 h-5 w-5" />
                      LINE通知を開始する
                    </Button>
                  )}

                  <Button
                    onClick={() => {
                      setStudent(null);
                      setParents([]);
                      setCardId(null);
                      setError(null);
                      setShowQRCode(false);
                      setQrCodeUrl(null);
                    }}
                    variant="outline"
                    className="w-full"
                  >
                    別のカードを読み取る
                  </Button>
                </div>
              </div>
            )}

            {/* 使い方ガイド */}
            <div className="rounded-lg border border-gray-200 bg-gray-50 p-4">
              <h3 className="mb-2 text-sm font-semibold text-gray-900">使い方</h3>
              <ol className="ml-4 list-decimal space-y-1 text-xs text-gray-600">
                <li>お子様のNFCカードをスマートフォンにタップ</li>
                <li>お子様の情報が表示されます</li>
                {isIOS ? (
                  <>
                    <li>QRコードが表示されます</li>
                    <li>LINEアプリでQRコードをスキャン</li>
                    <li>連携完了！</li>
                  </>
                ) : (
                  <>
                    <li>自動的にLINEアプリが開きます</li>
                    <li>連携完了！</li>
                  </>
                )}
              </ol>
            </div>
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
