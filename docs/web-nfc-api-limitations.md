# Web NFC APIの制限について

## 🤔 なぜNFC Toolsでは取得できるのに、Web NFC APIでは取得できないのか？

### 技術的な違い

#### NFC Tools（ネイティブAndroidアプリ）

```
NFC Tools（Androidアプリ）
  ↓
Android NFC API（低レベルAPI）
  ↓
NFCハードウェア（直接アクセス）
  ↓
✅ FeliCaカード（Suica等）からシリアル番号を取得可能
```

**特徴:**
- ✅ AndroidのネイティブNFC APIに直接アクセス
- ✅ 低レベルのNFCプロトコル（NFC-A、NFC-B、FeliCa等）にアクセス可能
- ✅ セキュリティ制限が少ない
- ✅ すべてのNFCカードタイプに対応

#### Web NFC API（ブラウザ経由）

```
Web NFC API（ブラウザ）
  ↓
ブラウザのセキュリティ層
  ↓
Android NFC API（制限付きアクセス）
  ↓
NFCハードウェア
  ↓
❌ FeliCaカード（Suica等）からシリアル番号を取得不可
```

**特徴:**
- ⚠️ ブラウザのセキュリティ制限がある
- ⚠️ NDEF（NFC Data Exchange Format）対応カードのみ読み取り可能
- ⚠️ FeliCaカード（Suica等）はNDEF非対応のため読み取れない
- ⚠️ セキュリティ上の理由で低レベルAPIへのアクセスが制限されている

---

## 📋 詳細な比較

| 項目 | NFC Tools（ネイティブ） | Web NFC API（ブラウザ） |
|------|------------------------|------------------------|
| **アクセスレベル** | 低レベルAPI（直接アクセス） | 高レベルAPI（制限付き） |
| **対応カード** | すべてのNFCカード | NDEF対応カードのみ |
| **FeliCa対応** | ✅ 対応 | ❌ 非対応 |
| **セキュリティ** | アプリの権限に依存 | ブラウザのセキュリティ制限 |
| **シリアル番号取得** | ✅ 可能（すべてのカード） | ⚠️ NDEF対応カードのみ |
| **実装方法** | Android SDK | Web標準API |

---

## 🔍 なぜこの制限があるのか？

### セキュリティ上の理由

1. **プライバシー保護**
   - Web NFC APIは、Webページが任意のNFCカードを読み取ることを制限
   - ユーザーの個人情報（Suicaの残額、マイナンバーカードの情報等）を保護

2. **標準化**
   - Web NFC APIは、NDEFという標準フォーマットに基づいている
   - すべてのNFCカードタイプに対応するのは技術的に困難

3. **クロスプラットフォーム対応**
   - Web標準として、異なるOSやデバイスで動作する必要がある
   - 低レベルAPIはOS依存のため、Web標準化が困難

---

## 🎯 具体的な例

### Suicaカードの場合

#### NFC Tools（ネイティブアプリ）
```java
// Android NFC API（低レベル）
Tag tag = intent.getParcelableExtra(NfcAdapter.EXTRA_TAG);
byte[] id = tag.getId(); // ← シリアル番号を直接取得可能
String uid = bytesToHex(id); // "04:1a:2b:3c:4d:5e:6f"
```

#### Web NFC API（ブラウザ）
```javascript
// Web NFC API
ndef.addEventListener("readingerror", (event) => {
  // ❌ event.serialNumber は undefined
  // FeliCaカードはNDEF非対応のため、シリアル番号が取得できない
});
```

---

## 💡 解決策

### 1. NDEF対応カードを使用（推奨）

**NTAG213 / NTAG215 / NTAG216**
- ✅ Web NFC APIで自動読み取り可能
- ✅ シリアル番号を取得できる
- ✅ 安価（10枚で約1,000円）

### 2. ネイティブアプリを開発

Android/iOSのネイティブアプリを開発すれば、NFC Toolsと同様にすべてのNFCカードからシリアル番号を取得できます。

**メリット:**
- ✅ すべてのNFCカードに対応
- ✅ 低レベルAPIにアクセス可能

**デメリット:**
- ⚠️ 開発コストが高い
- ⚠️ アプリの配布が必要

### 3. 手動登録で対応（現状）

NFC Toolsで取得したシリアル番号を手動で登録する方法。

**メリット:**
- ✅ すぐに使用可能
- ✅ 追加の開発が不要

**デメリット:**
- ⚠️ 入口画面での自動認証は不可
- ⚠️ 手動登録が必要

---

## 📚 参考資料

- [Web NFC API仕様](https://w3c.github.io/web-nfc/)
- [Android NFC API](https://developer.android.com/guide/topics/connectivity/nfc)
- [NDEF仕様](https://nfc-forum.org/our-work/specifications-and-application-documents/specifications/nfc-forum-ndef/)

---

## 🎓 まとめ

**NFC Toolsで取得できるのに、Web NFC APIで取得できない理由:**

1. **アクセスレベルの違い**
   - NFC Tools: 低レベルAPI（直接アクセス）
   - Web NFC API: 高レベルAPI（制限付き）

2. **セキュリティ制限**
   - Web NFC APIはブラウザのセキュリティ制限により、NDEF対応カードのみ読み取り可能

3. **標準化の違い**
   - NFC Tools: Android専用、すべてのカードタイプに対応
   - Web NFC API: Web標準、NDEF対応カードのみ

**結論:**
- Web NFC APIは、セキュリティと標準化のため、NDEF対応カードのみをサポート
- FeliCaカード（Suica等）はNDEF非対応のため、Web NFC APIでは読み取れない
- ネイティブアプリを開発するか、NDEF対応カードを使用する必要がある




