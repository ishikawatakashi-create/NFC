import { NextResponse } from "next/server";
import QRCode from "qrcode";

/**
 * QRコード生成API
 * LINEメッセージで使用するQRコードを動的に生成
 */
export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const url = searchParams.get("url");

    if (!url) {
      return NextResponse.json(
        { ok: false, error: "urlパラメータが必要です" },
        { status: 400 }
      );
    }

    // QRコードを生成（PNG形式、Base64）
    const qrCodeDataUrl = await QRCode.toDataURL(url, {
      width: 400,
      margin: 2,
      color: {
        dark: "#000000",
        light: "#FFFFFF",
      },
    });

    // Base64データをBufferに変換
    const base64Data = qrCodeDataUrl.replace(/^data:image\/png;base64,/, "");
    const buffer = Buffer.from(base64Data, "base64");

    // PNG画像として返す
    return new NextResponse(buffer, {
      headers: {
        "Content-Type": "image/png",
        "Cache-Control": "public, max-age=3600", // 1時間キャッシュ
      },
    });
  } catch (error: any) {
    console.error("[QRCode] Error generating QR code:", error);
    return NextResponse.json(
      { ok: false, error: error?.message || "QRコードの生成に失敗しました" },
      { status: 500 }
    );
  }
}
