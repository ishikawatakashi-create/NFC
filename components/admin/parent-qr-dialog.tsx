"use client";

import { useEffect, useRef, useState } from "react";
import QRCode from "qrcode";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { Download, QrCode as QrCodeIcon, Share2, Copy, Check } from "lucide-react";
import { Badge } from "@/components/ui/badge";

interface Student {
  id: string;
  name: string;
}

interface ParentQRDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  parent: {
    id: string;
    name: string;
    students?: Student[];
  } | null;
}

export function ParentQRDialog({ open, onOpenChange, parent }: ParentQRDialogProps) {
  const [qrCodes, setQrCodes] = useState<Map<string, string>>(new Map());
  const [copiedUrl, setCopiedUrl] = useState<string | null>(null);
  const canvasRefs = useRef<Map<string, HTMLCanvasElement>>(new Map());

  const baseUrl = typeof window !== "undefined" ? window.location.origin : "";

  useEffect(() => {
    if (!open || !parent || !parent.students || parent.students.length === 0) {
      setQrCodes(new Map());
      return;
    }

    const generateQRCodes = async () => {
      const newQrCodes = new Map<string, string>();

      for (const student of parent.students || []) {
        // LIFF URLを生成（実際のLIFF URLに置き換える必要があります）
        const liffUrl = `${baseUrl}/parent-link?studentId=${student.id}`;

        try {
          // QRコードを生成
          const dataUrl = await QRCode.toDataURL(liffUrl, {
            width: 300,
            margin: 2,
            color: {
              dark: "#000000",
              light: "#FFFFFF",
            },
          });
          newQrCodes.set(student.id, dataUrl);
        } catch (error) {
          console.error(`Failed to generate QR code for student ${student.id}:`, error);
        }
      }

      setQrCodes(newQrCodes);
    };

    generateQRCodes();
  }, [open, parent, baseUrl]);

  const handleDownloadQRCode = (studentId: string, studentName: string) => {
    const dataUrl = qrCodes.get(studentId);
    if (!dataUrl) return;

    const link = document.createElement("a");
    link.href = dataUrl;
    link.download = `qr_${parent?.name}_${studentName}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const handleCopyUrl = async (studentId: string) => {
    const url = `${baseUrl}/parent-link?studentId=${studentId}`;
    try {
      await navigator.clipboard.writeText(url);
      setCopiedUrl(studentId);
      setTimeout(() => setCopiedUrl(null), 2000);
    } catch (error) {
      console.error("Failed to copy URL:", error);
    }
  };

  const handleShareUrl = async (studentId: string, studentName: string) => {
    const url = `${baseUrl}/parent-link?studentId=${studentId}`;
    const text = `${studentName}さんのLINE通知連携用リンクです`;

    if (navigator.share) {
      try {
        await navigator.share({
          title: "LINE通知連携",
          text: text,
          url: url,
        });
      } catch (error) {
        console.error("Failed to share:", error);
      }
    } else {
      // Web Share APIが使えない場合はクリップボードにコピー
      handleCopyUrl(studentId);
    }
  };

  if (!parent || !parent.students || parent.students.length === 0) {
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>LINE連携用QRコード</DialogTitle>
            <DialogDescription>
              この親御さんには生徒が紐づけられていません
            </DialogDescription>
          </DialogHeader>
          <Alert>
            <AlertDescription>
              先に生徒を紐づけてから、QRコードを生成してください。
            </AlertDescription>
          </Alert>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <QrCodeIcon className="h-5 w-5 text-green-600" />
            {parent.name}様 - LINE連携用QRコード
          </DialogTitle>
          <DialogDescription>
            以下のQRコードを{parent.name}様に送信してください。QRコードをスマートフォンで読み取ると、自動的にLINE連携が完了します。
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-6">
          <Alert className="border-blue-200 bg-blue-50">
            <AlertDescription className="text-sm text-blue-900">
              <strong>使い方:</strong>
              <ol className="mt-2 ml-4 list-decimal space-y-1">
                <li>QRコードを画像として保存し、LINEやメールで親御さんに送信</li>
                <li>または、URLをコピーして送信</li>
                <li>親御さんがスマートフォンでQRコードを読み取る、またはURLを開く</li>
                <li>LINE内で自動的に連携が完了します</li>
              </ol>
            </AlertDescription>
          </Alert>

          <div className="grid gap-6 md:grid-cols-2">
            {parent.students.map((student) => {
              const qrCodeDataUrl = qrCodes.get(student.id);
              const url = `${baseUrl}/parent-link?studentId=${student.id}`;
              const isCopied = copiedUrl === student.id;

              return (
                <Card key={student.id} className="overflow-hidden">
                  <CardHeader className="bg-gradient-to-br from-green-50 to-blue-50">
                    <CardTitle className="flex items-center justify-between text-lg">
                      <span>{student.name}</span>
                      <Badge variant="outline">生徒</Badge>
                    </CardTitle>
                    <CardDescription>
                      {student.name}さん専用のQRコード
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-4 pt-6">
                    {/* QRコード画像 */}
                    <div className="flex justify-center">
                      {qrCodeDataUrl ? (
                        <div className="rounded-lg border-4 border-gray-200 p-4 bg-white">
                          <img
                            src={qrCodeDataUrl}
                            alt={`${student.name}のQRコード`}
                            className="w-64 h-64"
                          />
                        </div>
                      ) : (
                        <div className="flex h-64 w-64 items-center justify-center rounded-lg border-4 border-gray-200 bg-gray-50">
                          <p className="text-sm text-gray-500">生成中...</p>
                        </div>
                      )}
                    </div>

                    {/* URL表示 */}
                    <div className="rounded-lg border border-gray-200 bg-gray-50 p-3">
                      <p className="text-xs text-gray-600 mb-1">連携URL:</p>
                      <p className="text-xs font-mono text-gray-900 break-all">
                        {url}
                      </p>
                    </div>

                    {/* アクションボタン */}
                    <div className="grid grid-cols-3 gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleDownloadQRCode(student.id, student.name)}
                        disabled={!qrCodeDataUrl}
                        className="w-full"
                      >
                        <Download className="mr-1 h-4 w-4" />
                        保存
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleCopyUrl(student.id)}
                        className="w-full"
                      >
                        {isCopied ? (
                          <>
                            <Check className="mr-1 h-4 w-4" />
                            完了
                          </>
                        ) : (
                          <>
                            <Copy className="mr-1 h-4 w-4" />
                            URL
                          </>
                        )}
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleShareUrl(student.id, student.name)}
                        className="w-full"
                      >
                        <Share2 className="mr-1 h-4 w-4" />
                        共有
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              );
            })}
          </div>

          <Alert className="border-amber-200 bg-amber-50">
            <AlertDescription className="text-sm text-amber-900">
              <strong>注意事項:</strong>
              <ul className="mt-2 ml-4 list-disc space-y-1">
                <li>1つのQRコードは1人の生徒専用です</li>
                <li>QRコードは有効期限がありません（いつでも使用可能）</li>
                <li>既にLINE連携済みの場合、再度読み取っても問題ありません</li>
                <li>セキュリティのため、QRコードは親御さん本人にのみ送信してください</li>
              </ul>
            </AlertDescription>
          </Alert>
        </div>
      </DialogContent>
    </Dialog>
  );
}
