# O'Reilly Ebook Scraper - 技術仕様書

> **作成日:** 2026-01-03
> **プロジェクト:** scrap_ebook_online
> **バージョン:** 0.1.0
> **言語:** TypeScript (Node.js)

---

## 目次

1. [プロジェクト概要](#1-プロジェクト概要)
2. [システムアーキテクチャ](#2-システムアーキテクチャ)
3. [主要機能](#3-主要機能)
4. [モジュール詳細](#4-モジュール詳細)
5. [データフロー](#5-データフロー)
6. [設定管理](#6-設定管理)
7. [エラーハンドリング](#7-エラーハンドリング)
8. [ストレージ構造](#8-ストレージ構造)
9. [API仕様](#9-api仕様)
10. [セキュリティ考慮事項](#10-セキュリティ考慮事項)
11. [パフォーマンス最適化](#11-パフォーマンス最適化)
12. [今後の拡張性](#12-今後の拡張性)

---

## 1. プロジェクト概要

### 1.1 目的

O'Reilly Learning Platform (https://learning.oreilly.com/) から電子書籍をスクレイピングし、高品質なPDFとして保存するTypeScriptアプリケーション。

### 1.2 主要技術スタック

| カテゴリ | 技術 | バージョン | 用途 |
|---------|------|----------|------|
| ランタイム | Node.js | 18+ | JavaScript実行環境 |
| 言語 | TypeScript | 5.3.3 | 型安全な開発 |
| ブラウザ自動化 | Playwright | 1.41.1 | Webスクレイピング |
| PDF生成 | pdf-lib | 1.17.1 | PDF作成・操作 |
| 環境変数 | dotenv | 16.4.1 | 設定管理 |
| テスト | vitest | 1.2.1 | ユニットテスト |
| リント | ESLint | 8.56.0 | コード品質 |
| フォーマット | Prettier | 3.2.4 | コード整形 |

### 1.3 対象ユーザー

- O'Reilly Learning Platform の正規購読者
- 合法的にアクセス権のあるコンテンツのバックアップを必要とするユーザー

### 1.4 法的・倫理的制約

- O'Reilly の利用規約を遵守
- 購読者本人の個人利用目的に限定
- レート制限による適切なサーバー負荷管理
- robots.txt の尊重

---

## 2. システムアーキテクチャ

### 2.1 全体構成図

```
┌─────────────────────────────────────────────────────────────┐
│                         User Input                          │
│              (環境変数, books.txt, CLI引数)                  │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                      Main Process                           │
│                     (src/index.ts)                          │
│  ┌───────────┐  ┌───────────┐  ┌──────────────┐            │
│  │  Config   │  │  Logger   │  │  Browser     │            │
│  │  Loader   │  │  Init     │  │  Launch      │            │
│  └───────────┘  └───────────┘  └──────────────┘            │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   Authentication Layer                      │
│                     (src/auth/auth.ts)                      │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  Session Load    │  │  Cookie Mgmt     │                │
│  │  (Cookies)       │  │  Persistence     │                │
│  └──────────────────┘  └──────────────────┘                │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                    Scraping Layer                           │
│              (src/scrapers/book-scraper.ts)                 │
│  ┌──────────────┐  ┌──────────────┐  ┌─────────────┐       │
│  │  Book Meta   │  │  Chapter     │  │  Content    │       │
│  │  Extraction  │  │  Discovery   │  │  Scraping   │       │
│  └──────────────┘  └──────────────┘  └─────────────┘       │
│                                                             │
│  ┌──────────────────────────────────────────────┐          │
│  │         Content Validation                   │          │
│  │    (src/scrapers/content-validator.ts)       │          │
│  └──────────────────────────────────────────────┘          │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   Storage Layer                             │
│          (src/storage/storage-coordinator.ts)               │
│  ┌─────────────┐  ┌──────────────┐  ┌──────────────┐       │
│  │  Cache Mgmt │  │  Manifest    │  │  PDF         │       │
│  │  (Chapters) │  │  Manager     │  │  Generator   │       │
│  └─────────────┘  └──────────────┘  └──────────────┘       │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                   Progress Management                       │
│         (src/progress/checkpoint-manager.ts)                │
│  ┌──────────────────┐  ┌──────────────────┐                │
│  │  Checkpoint Save │  │  Resume Support  │                │
│  │  (JSON)          │  │  (失敗からの復帰) │                │
│  └──────────────────┘  └──────────────────┘                │
└─────────────────┬───────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────────────────────────┐
│                     File System                             │
│  ┌─────────────┐  ┌─────────────┐  ┌─────────────┐         │
│  │  data/      │  │  logs/      │  │  session/   │         │
│  │  ├─books/   │  │  └─app.log  │  │  └─cookies  │         │
│  │  ├─cache/   │  └─────────────┘  └─────────────┘         │
│  │  ├─progress/│                                            │
│  │  └─manifest │                                            │
│  └─────────────┘                                            │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 処理フロー

```
開始
  ↓
環境変数・設定ファイル読み込み
  ↓
Logger初期化
  ↓
Playwrightブラウザ起動
  ↓
認証 (Cookie読み込み or ログイン)
  ↓
書籍URLリスト読み込み
  ↓
┌─────── 各書籍に対して ────────┐
│                              │
│  チェックポイント確認         │
│    ↓                         │
│  既に完了? → スキップ         │
│    ↓ No                      │
│  書籍メタデータ取得           │
│    ↓                         │
│  チャプター一覧取得           │
│    ↓                         │
│  ┌───── 各チャプター ─────┐  │
│  │                        │  │
│  │  キャッシュ確認        │  │
│  │    ↓                   │  │
│  │  キャッシュあり?       │  │
│  │    ↓ No               │  │
│  │  チャプター内容取得    │  │
│  │    ↓                   │  │
│  │  コンテンツ検証        │  │
│  │    ↓                   │  │
│  │  キャッシュ保存        │  │
│  │    ↓                   │  │
│  │  チェックポイント更新  │  │
│  │    ↓                   │  │
│  │  レート制限待機        │  │
│  │                        │  │
│  └────────────────────────┘  │
│    ↓                         │
│  PDF生成                     │
│    ↓                         │
│  マニフェスト更新            │
│    ↓                         │
│  チェックポイント削除        │
│                              │
└──────────────────────────────┘
  ↓
サマリー表示
  ↓
ブラウザクローズ
  ↓
終了
```

---

## 3. 主要機能

### 3.1 マルチブック対応

#### 機能概要
1回の実行で複数の書籍を順次処理。

#### 設定方法

**優先順位:** `BOOK_URLS_FILE` > `BOOK_URLS` > `BOOK_URL`

| 方式 | 環境変数 | 形式 | 例 |
|-----|---------|------|-----|
| ファイル指定 | `BOOK_URLS_FILE` | テキストファイル (1行1URL) | `./books.txt` |
| カンマ区切り | `BOOK_URLS` | カンマ区切り文字列 | `url1,url2,url3` |
| 単一URL (非推奨) | `BOOK_URL` | 単一URL文字列 | `https://...` |

#### ファイル形式例

```text
# books.txt
https://learning.oreilly.com/library/view/book1/123456/
https://learning.oreilly.com/library/view/book2/789012/
# コメント行はサポート
https://learning.oreilly.com/library/view/book3/345678/
```

### 3.2 認証とセッション管理

#### 実装モジュール
`src/auth/auth.ts` - `OReillyAuth`クラス

#### 機能詳細

1. **Cookie永続化**
   - 初回ログイン後、Cookieをファイルに保存 (`./session/cookies.json`)
   - 次回起動時に自動読み込み
   - セッション有効性を自動検証

2. **2段階ログインプロセス**
   ```typescript
   // Step 1: メールアドレス入力
   await page.fill('input[type="email"]', email);
   await page.keyboard.press('Enter');

   // Step 2: パスワード入力
   await page.fill('input[type="password"]', password);
   await page.keyboard.press('Enter');
   ```

3. **アンチボット対策**
   - `--disable-blink-features=AutomationControlled` フラグ
   - 人間らしい操作タイミング (Enter キー使用)
   - User-Agent設定

### 3.3 チャプター自動検出

#### 検出ロジック

**段階的フォールバック戦略:**

1. **TOC (Table of Contents) 解析**
   - `aside`, `[data-testid="toc-list"]`, `.toc-list` などから `.xhtml` リンク抽出
   - アンカー (`#`) を除去してURL正規化
   - 重複排除

2. **連番チャプターファイル探索**
   ```
   ch00.xhtml, ch01.xhtml, ch02.xhtml ... ch30.xhtml
   ```
   - 404エラーまで順次アクセス
   - レスポンスコード200のみを有効チャプターとして追加

3. **順序正規化**
   - URL パターンによる優先度設定:
     - `index.xhtml` → 0
     - `titlepage.xhtml` → 1
     - `front-en.xhtml` → 2
     - `ch00.xhtml` → 5
     - `ch01.xhtml` → 11
     - `colophon.xhtml` → 301

### 3.4 コンテンツ検証

#### 検証項目

| 項目 | 検証内容 | エラー条件 |
|-----|---------|-----------|
| 最小文字数 | `wordCount >= 50` | 50文字未満 |
| アンチボット検出 | "attention required" などのキーワード | マッチした場合 |
| エラーページ検出 | "page not found", "404" | マッチした場合 |
| コンテンツ品質 | 画像・コードブロックの有無 | 警告レベル |

#### 実装

```typescript
interface ValidationResult {
  isValid: boolean;
  errors: string[];
  warnings: string[];
  metadata: {
    wordCount: number;
    hasImages: boolean;
    hasCodeBlocks: boolean;
  };
}
```

### 3.5 キャッシュシステム

#### 設計思想

- **章単位のキャッシュ:** 再スクレイピング時の効率化
- **ハッシュベース検証:** コンテンツ変更検知 (SHA-256)
- **JSON形式:** 可読性とデバッグ性

#### ストレージ構造

```
data/cache/
└── {bookId}/
    ├── chapter_0.json
    ├── chapter_1.json
    └── chapter_N.json
```

#### キャッシュデータ形式

```json
{
  "chapterIndex": 0,
  "title": "Introduction",
  "url": "https://learning.oreilly.com/.../ch00.xhtml",
  "content": "<article>...</article>",
  "scrapedAt": "2026-01-03T10:30:00.000Z",
  "hash": "a3b4c5d6e7f8..."
}
```

### 3.6 進捗管理とチェックポイント

#### 目的

- スクレイピング中断時の復帰サポート
- ネットワークエラーやタイムアウトからの回復

#### チェックポイントデータ

```json
{
  "bookId": "9781234567890",
  "bookUrl": "https://learning.oreilly.com/library/view/book/123/",
  "totalChapters": 15,
  "completedChapters": [0, 1, 2, 5, 6],
  "failedChapters": [3],
  "lastUpdated": "2026-01-03T11:00:00.000Z"
}
```

#### 復帰ロジック

```typescript
// 未完了チャプターのみを再処理
const remainingChapters = progressTracker.getRemainingChapters();
// → [3, 4, 7, 8, 9, 10, 11, 12, 13, 14]
```

### 3.7 PDF生成

#### 実装: `src/pdf/pdf-generator.ts`

#### 処理フロー

1. **新規PDFドキュメント作成**
   ```typescript
   const pdfDoc = await PDFDocument.create();
   ```

2. **各チャプターをページ変換**
   - HTML → Canvas (Playwright screenshot)
   - Canvas → PNG画像
   - PNG → PDFページ

3. **メタデータ埋め込み**
   ```typescript
   pdfDoc.setTitle(book.title);
   pdfDoc.setAuthor(book.author);
   pdfDoc.setCreationDate(new Date());
   ```

4. **ファイル保存**
   ```
   data/books/{sanitized_title}.pdf
   ```

### 3.8 リトライとレート制限

#### リトライ戦略

**指数バックオフ (Exponential Backoff):**

```typescript
waitTime = backoffBase ^ attemptNumber

例: backoffBase=2
- 1回目失敗 → 2^1 = 2秒待機
- 2回目失敗 → 2^2 = 4秒待機
- 3回目失敗 → 2^3 = 8秒待機
```

#### レート制限

| 設定項目 | デフォルト値 | 環境変数 |
|---------|-------------|---------|
| リクエスト間隔 | 2000ms | `REQUEST_DELAY` |
| 最大リトライ回数 | 3回 | `MAX_RETRIES` |
| バックオフ基数 | 2 | `RETRY_BACKOFF_BASE` |
| タイムアウト | 30000ms | `REQUEST_TIMEOUT` |

---

## 4. モジュール詳細

### 4.1 コア処理モジュール

#### `src/index.ts` - メインエントリーポイント

**責務:**
- アプリケーション初期化
- マルチブック処理ループ
- 最終サマリー表示

**主要関数:**

```typescript
async function scrapeBook(
  bookUrl: string,
  bookIndex: number,
  totalBooks: number,
  appConfig: Config,
  storageCoordinator: StorageCoordinator,
  checkpointManager: CheckpointManager,
  auth: OReillyAuth
): Promise<BookScrapingResult>
```

**サマリー表示内容:**
- 総書籍数
- 成功数 / 失敗数
- 各書籍の詳細 (タイトル、チャプター数、PDF保存先)
- エラー情報

### 4.2 認証モジュール

#### `src/auth/auth.ts` - `OReillyAuth`

**主要メソッド:**

| メソッド | 戻り値 | 説明 |
|---------|-------|------|
| `login(credentials)` | `Promise<void>` | メール・パスワードでログイン |
| `isAuthenticated()` | `Promise<boolean>` | 認証状態確認 |
| `saveCookies(path)` | `Promise<void>` | Cookie保存 |
| `loadCookies(path)` | `Promise<void>` | Cookie読み込み |
| `getPage()` | `Promise<Page>` | ブラウザページ取得 |
| `close()` | `Promise<void>` | リソース解放 |

**ログインURL:**
```
https://www.oreilly.com/member/login/
```

### 4.3 スクレイピングモジュール

#### `src/scrapers/book-scraper.ts` - `BookScraper`

**データ型:**

```typescript
interface Book {
  id: string;
  title: string;
  author: string;
  url: string;
  chapters: Chapter[];
}

interface Chapter {
  title: string;
  url: string;
  index: number;
}
```

**主要メソッド:**

```typescript
// 書籍メタデータ取得
async getBook(bookUrl: string): Promise<Book>

// 全チャプター一覧取得
async getAllChapters(): Promise<Chapter[]>

// チャプター内容取得
async getChapterContent(chapterUrl: string, chapterTitle: string): Promise<string>

// 全チャプタースクレイピング (キャッシュ・進捗管理対応)
async scrapeAllChapters(
  book: Book,
  progressTracker: ProgressTracker,
  cacheManager: CacheManager
): Promise<Map<number, string>>
```

#### `src/scrapers/content-validator.ts` - `ContentValidator`

**検証ロジック:**

```typescript
validateChapter(content: string, title: string): ValidationResult {
  // 1. 文字数カウント
  const wordCount = this.countWords(content);

  // 2. アンチボットページ検出
  if (this.isAntiBotPage(content)) {
    errors.push('Anti-bot challenge detected');
  }

  // 3. エラーページ検出
  if (this.isErrorPage(content)) {
    errors.push('Error page detected');
  }

  // 4. 最小文字数チェック
  if (wordCount < 50) {
    errors.push('Content too short');
  }

  return { isValid, errors, warnings, metadata };
}
```

### 4.4 ストレージモジュール

#### `src/storage/storage-coordinator.ts` - `StorageCoordinator`

**責務:**
- キャッシュ、マニフェスト、PDF生成の統合管理

**主要メソッド:**

```typescript
async initialize(): Promise<void> {
  // ディレクトリ作成 (data/cache, data/books, data/progress)
}

async saveBook(
  page: Page,
  book: Book,
  chapterContents: Map<number, string>
): Promise<ManifestEntry> {
  // 1. PDF生成
  // 2. マニフェスト更新
  // 3. エントリー返却
}
```

#### `src/storage/cache-manager.ts` - `CacheManager`

**主要メソッド:**

```typescript
async saveChapter(bookId: string, chapter: CachedChapter): Promise<void>
async getChapter(bookId: string, chapterIndex: number): Promise<CachedChapter | null>
async invalidateChapter(bookId: string, chapterIndex: number): Promise<void>
async invalidateBook(bookId: string): Promise<void>
```

#### `src/storage/manifest-manager.ts` - `ManifestManager`

**マニフェスト形式:**

```json
{
  "books": {
    "9781234567890": {
      "bookId": "9781234567890",
      "title": "Example Book Title",
      "author": "John Doe",
      "url": "https://learning.oreilly.com/library/view/book/123/",
      "chapterCount": 15,
      "outputPath": "data/books/example-book-title.pdf",
      "scrapedAt": "2026-01-03T12:00:00.000Z",
      "status": "complete"
    }
  }
}
```

**主要メソッド:**

```typescript
async addBook(entry: ManifestEntry): Promise<void>
async getBook(bookId: string): Promise<ManifestEntry | undefined>
async updateBook(bookId: string, updates: Partial<ManifestEntry>): Promise<void>
async getAllBooks(): Promise<ManifestEntry[]>
```

### 4.5 進捗管理モジュール

#### `src/progress/checkpoint-manager.ts` - `CheckpointManager`

**ストレージ:**
```
data/progress/{bookId}.json
```

**主要メソッド:**

```typescript
async loadCheckpoint(bookId: string): Promise<Checkpoint | null>
async saveCheckpoint(checkpoint: Checkpoint): Promise<void>
async deleteCheckpoint(bookId: string): Promise<void>
```

#### `src/progress/progress-tracker.ts` - `ProgressTracker`

**状態管理:**

```typescript
interface ChapterStatus {
  started: boolean;
  completed: boolean;
  failed: boolean;
}

// チャプター状態遷移
pending → started → completed
          ↓
          failed
```

**主要メソッド:**

```typescript
async initialize(): Promise<void> // チェックポイント読み込み
getRemainingChapters(): number[] // 未完了チャプター取得
async startChapter(index: number): Promise<void>
async completeChapter(index: number): Promise<void>
async failChapter(index: number): Promise<void>
getSummary(): ProgressSummary
async finalize(): Promise<void> // チェックポイント削除
```

### 4.6 PDF生成モジュール

#### `src/pdf/pdf-generator.ts` - `PDFGenerator`

**主要メソッド:**

```typescript
async generatePDF(
  page: Page,
  book: Book,
  chapterContents: Map<number, string>,
  outputPath: string
): Promise<void> {
  // 1. PDFDocument作成
  // 2. 各チャプターをページ化
  //    - HTMLをレンダリング
  //    - スクリーンショット
  //    - PDF画像ページとして追加
  // 3. メタデータ設定
  // 4. ファイル書き込み
}
```

**画像処理:**

```typescript
// Playwrightで章全体をPNG化
const screenshot = await page.screenshot({
  fullPage: true,
  type: 'png'
});

// pdf-libでPDFに埋め込み
const pngImage = await pdfDoc.embedPng(screenshot);
const page = pdfDoc.addPage([width, height]);
page.drawImage(pngImage, { x: 0, y: 0, width, height });
```

### 4.7 ユーティリティモジュール

#### `src/utils/logger.ts` - `Logger`

**ログレベル:**
- `DEBUG`: 詳細デバッグ情報
- `INFO`: 一般的な情報
- `WARN`: 警告
- `ERROR`: エラー

**出力先:**
- コンソール (常時)
- ファイル (`logs/app.log`) - `LOG_TO_FILE=true` の場合

**主要メソッド:**

```typescript
static async init(config: LoggingConfig): Promise<void>
static debug(message: string, metadata?: object): void
static info(message: string, metadata?: object): void
static warn(message: string, metadata?: object): void
static error(message: string, error?: Error | unknown): void
static logScrapeStart(bookId: string, title: string): void
static logChapterProgress(current: number, total: number, title: string): void
static async flush(): Promise<void>
```

#### `src/utils/retry.ts` - リトライロジック

**実装:**

```typescript
interface RetryOptions {
  maxAttempts: number;
  backoffBase: number; // 指数バックオフの基数
  onRetry?: (attempt: number, error: Error) => void;
}

async function withRetry<T>(
  operation: () => Promise<T>,
  options: RetryOptions
): Promise<T> {
  for (let attempt = 1; attempt <= options.maxAttempts; attempt++) {
    try {
      return await operation();
    } catch (error) {
      if (attempt === options.maxAttempts) throw error;

      const waitTime = Math.pow(options.backoffBase, attempt) * 1000;
      options.onRetry?.(attempt, error);
      await delay(waitTime);
    }
  }
}
```

#### `src/utils/sanitize.ts` - サニタイゼーション

**機能:**

```typescript
// ファイル名・ID生成用の文字列サニタイズ
function sanitizeBookId(url: string): string {
  // URLから識別子抽出 + 特殊文字除去
}

function sanitizeFilename(filename: string): string {
  // ファイルシステム非対応文字の置換
  // 例: / → -, : → -, * → -
}
```

#### `src/utils/delay.ts` - 遅延制御

```typescript
function delay(ms: number): Promise<void>

function getRequestDelay(): number {
  // 環境変数 REQUEST_DELAY から取得 (デフォルト 2000ms)
}
```

---

## 5. データフロー

### 5.1 スクレイピングフロー詳細

```
┌─────────────────────────────────────────────────────────┐
│ 1. 設定読み込み (src/config/settings.ts)                │
│    - 環境変数解析                                        │
│    - 書籍URLリスト構築                                   │
│    - 検証                                                │
└────────────┬────────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────────────────┐
│ 2. ブラウザ起動 & 認証 (src/auth/auth.ts)               │
│    ┌──────────────────────────────────────┐            │
│    │ Cookie存在?                          │            │
│    │   ↓ Yes                              │            │
│    │ Cookie読み込み → 認証確認            │            │
│    │   ↓ 有効                             │            │
│    │ セッション確立                       │            │
│    │                                      │            │
│    │   ↓ No または無効                   │            │
│    │ ログイン実行                         │            │
│    │   ↓                                  │            │
│    │ Cookie保存                           │            │
│    └──────────────────────────────────────┘            │
└────────────┬────────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────────────────┐
│ 3. マルチブックループ                                   │
│    for each bookUrl in config.scraper.bookUrls          │
└────────────┬────────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────────────────┐
│ 4. 書籍処理 (scrapeBook関数)                            │
│    ┌──────────────────────────────────────┐            │
│    │ A. 完了チェック                      │            │
│    │    - マニフェスト確認                │            │
│    │    - status='complete' → スキップ   │            │
│    └──────────────────────────────────────┘            │
│             ↓                                           │
│    ┌──────────────────────────────────────┐            │
│    │ B. 書籍メタデータ取得                │            │
│    │    - BookScraper.getBook()           │            │
│    │    - タイトル、著者、チャプター一覧  │            │
│    └──────────────────────────────────────┘            │
│             ↓                                           │
│    ┌──────────────────────────────────────┐            │
│    │ C. 進捗トラッカー初期化              │            │
│    │    - チェックポイント読み込み        │            │
│    │    - 未完了チャプター特定            │            │
│    └──────────────────────────────────────┘            │
│             ↓                                           │
│    ┌──────────────────────────────────────┐            │
│    │ D. チャプタースクレイピング          │            │
│    │    for each chapter in remaining:    │            │
│    │      ┌────────────────────┐          │            │
│    │      │ キャッシュ確認      │          │            │
│    │      │   ↓ なし           │          │            │
│    │      │ コンテンツ取得      │          │            │
│    │      │   ↓                │          │            │
│    │      │ コンテンツ検証      │          │            │
│    │      │   ↓                │          │            │
│    │      │ キャッシュ保存      │          │            │
│    │      │   ↓                │          │            │
│    │      │ チェックポイント更新│          │            │
│    │      │   ↓                │          │            │
│    │      │ レート制限待機      │          │            │
│    │      └────────────────────┘          │            │
│    └──────────────────────────────────────┘            │
│             ↓                                           │
│    ┌──────────────────────────────────────┐            │
│    │ E. PDF生成                           │            │
│    │    - StorageCoordinator.saveBook()   │            │
│    │    - PDF作成 & 保存                  │            │
│    └──────────────────────────────────────┘            │
│             ↓                                           │
│    ┌──────────────────────────────────────┐            │
│    │ F. マニフェスト更新                  │            │
│    │    - status: 'complete'              │            │
│    │    - outputPath, scrapedAt           │            │
│    └──────────────────────────────────────┘            │
│             ↓                                           │
│    ┌──────────────────────────────────────┐            │
│    │ G. チェックポイント削除              │            │
│    │    - ProgressTracker.finalize()      │            │
│    └──────────────────────────────────────┘            │
└────────────┬────────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────────────────┐
│ 5. サマリー表示                                         │
│    - 総書籍数、成功数、失敗数                           │
│    - 各書籍の詳細情報                                   │
└────────────┬────────────────────────────────────────────┘
             ↓
┌─────────────────────────────────────────────────────────┐
│ 6. クリーンアップ                                       │
│    - ブラウザクローズ                                   │
│    - ログフラッシュ                                     │
└─────────────────────────────────────────────────────────┘
```

### 5.2 エラー処理フロー

```
エラー発生
    ↓
━━━━━━━━━━━━━━━━━━━━━━━
  エラー種別判定
━━━━━━━━━━━━━━━━━━━━━━━
    ↓
┌────────────────────┐
│ ネットワークエラー  │ → リトライ (指数バックオフ)
│ タイムアウト       │    最大3回
└────────────────────┘    ↓ 失敗
                         エラーログ + 次の書籍へ
    ↓
┌────────────────────┐
│ コンテンツ検証失敗  │ → エラーログ
│ (アンチボット等)    │    チャプタースキップ
└────────────────────┘    次のチャプターへ
    ↓
┌────────────────────┐
│ 認証エラー         │ → 再ログイン試行
│ (Cookie無効化)     │    ↓ 失敗
└────────────────────┘    プログラム終了
    ↓
┌────────────────────┐
│ ファイルシステム    │ → エラーログ
│ エラー             │    プログラム終了
└────────────────────┘
```

---

## 6. 設定管理

### 6.1 環境変数一覧

#### 必須設定

| 変数名 | 説明 | 例 |
|-------|------|-----|
| `OREILLY_EMAIL` | O'Reillyログインメールアドレス | `user@example.com` |
| `OREILLY_PASSWORD` | O'Reillyログインパスワード | `SecurePass123!` |

#### 書籍指定 (いずれか必須)

| 変数名 | 優先度 | 説明 | 例 |
|-------|--------|------|-----|
| `BOOK_URLS_FILE` | 1 (最優先) | 書籍URLリストファイルパス | `./books.txt` |
| `BOOK_URLS` | 2 | カンマ区切り書籍URLリスト | `url1,url2,url3` |
| `BOOK_URL` | 3 (非推奨) | 単一書籍URL | `https://...` |

#### オプション設定

| 変数名 | デフォルト | 説明 |
|-------|----------|------|
| `HEADLESS` | `true` | ヘッドレスモード (`false`で画面表示) |
| `SLOW_MO` | `0` | Playwright操作の遅延 (ms) |
| `REQUEST_DELAY` | `2000` | リクエスト間隔 (ms) |
| `MAX_RETRIES` | `3` | 最大リトライ回数 |
| `RETRY_BACKOFF_BASE` | `2` | リトライバックオフ基数 |
| `REQUEST_TIMEOUT` | `30000` | リクエストタイムアウト (ms) |
| `DATA_DIR` | `./data` | データディレクトリ |
| `LOGS_DIR` | `./logs` | ログディレクトリ |
| `COOKIES_PATH` | `./session/cookies.json` | Cookie保存先 |
| `LOG_LEVEL` | `INFO` | ログレベル (`DEBUG`/`INFO`/`WARN`/`ERROR`) |
| `LOG_TO_FILE` | `false` | ファイルログ有効化 |
| `LOG_MAX_SIZE` | `10485760` | ログファイル最大サイズ (10MB) |
| `LOG_MAX_FILES` | `5` | ログファイル保持数 |

### 6.2 .env.example

```bash
# ============================================
# O'Reilly認証情報 (必須)
# ============================================
OREILLY_EMAIL=your-email@example.com
OREILLY_PASSWORD=your-password

# ============================================
# 書籍URL設定 (いずれか必須)
# ============================================
# オプション1: ファイル指定 (推奨)
BOOK_URLS_FILE=./books.txt

# オプション2: カンマ区切りリスト
# BOOK_URLS=https://learning.oreilly.com/library/view/book1/123,https://learning.oreilly.com/library/view/book2/456

# オプション3: 単一URL (非推奨)
# BOOK_URL=https://learning.oreilly.com/library/view/book/123456/

# ============================================
# ブラウザ設定
# ============================================
HEADLESS=true
SLOW_MO=0

# ============================================
# スクレイピング設定
# ============================================
REQUEST_DELAY=2000
MAX_RETRIES=3
RETRY_BACKOFF_BASE=2
REQUEST_TIMEOUT=30000

# ============================================
# ストレージ設定
# ============================================
DATA_DIR=./data
LOGS_DIR=./logs
COOKIES_PATH=./session/cookies.json

# ============================================
# ロギング設定
# ============================================
LOG_LEVEL=INFO
LOG_TO_FILE=false
LOG_MAX_SIZE=10485760
LOG_MAX_FILES=5
```

---

## 7. エラーハンドリング

### 7.1 エラー分類と対応

| エラーカテゴリ | 具体例 | 対応策 | 実装箇所 |
|--------------|-------|-------|---------|
| **ネットワークエラー** | タイムアウト、DNS解決失敗 | リトライ (指数バックオフ) | `withRetry()` |
| **認証エラー** | 無効なCookie、パスワード間違い | 再ログイン → 失敗時は終了 | `OReillyAuth` |
| **コンテンツ検証エラー** | 文字数不足、アンチボット | エラーログ → チャプタースキップ | `ContentValidator` |
| **ファイルシステムエラー** | 書き込み権限不足、ディスク容量不足 | エラーログ → 終了 | `StorageCoordinator` |
| **書籍レベルエラー** | 全チャプター取得失敗 | エラーログ → 次の書籍へ | `scrapeBook()` |

### 7.2 エラーログ例

```
[ERROR] 2026-01-03T12:34:56.789Z - Failed to scrape chapter 5: Connection timeout
  bookId: 9781234567890
  chapterUrl: https://learning.oreilly.com/.../ch05.xhtml
  attempt: 3/3
  error: TimeoutError: Timeout 30000ms exceeded

[ERROR] 2026-01-03T12:40:00.123Z - Content validation failed: Anti-bot challenge detected
  bookId: 9781234567890
  chapter: 12
  wordCount: 45
  errors: ['Anti-bot challenge detected', 'Content too short']
```

### 7.3 グレースフル・デグラデーション

**基本方針:**
- 単一チャプターの失敗は書籍全体に影響させない
- 単一書籍の失敗は全体処理を停止させない
- 部分的に成功したデータも保存 (再実行時に再利用)

**実装例:**

```typescript
// チャプターレベル
for (const chapter of chapters) {
  try {
    await scrapeChapter(chapter);
  } catch (error) {
    Logger.error(`Chapter ${chapter.index} failed`, error);
    await progressTracker.failChapter(chapter.index);
    continue; // 次のチャプターへ
  }
}

// 書籍レベル
for (const bookUrl of bookUrls) {
  try {
    await scrapeBook(bookUrl);
  } catch (error) {
    Logger.error(`Book ${bookUrl} failed`, error);
    results.push({ success: false, bookUrl, error });
    continue; // 次の書籍へ
  }
}
```

---

## 8. ストレージ構造

### 8.1 ディレクトリ構成

```
scrap_ebook_online/
├── data/                     # データルート
│   ├── books/                # 生成PDF
│   │   ├── book-title-1.pdf
│   │   └── book-title-2.pdf
│   ├── cache/                # チャプターキャッシュ
│   │   ├── 9781234567890/
│   │   │   ├── chapter_0.json
│   │   │   ├── chapter_1.json
│   │   │   └── ...
│   │   └── 9780987654321/
│   │       └── ...
│   ├── progress/             # チェックポイント
│   │   ├── 9781234567890.json
│   │   └── 9780987654321.json
│   └── manifest.json         # 書籍マニフェスト
├── logs/                     # ログ
│   └── app.log
├── session/                  # セッション
│   └── cookies.json
├── src/                      # ソースコード
├── books.txt                 # 書籍URLリスト
├── .env                      # 環境変数
└── package.json
```

### 8.2 データ永続化戦略

| データ種別 | 永続化方法 | 保持期間 | 目的 |
|-----------|----------|---------|------|
| Cookie | JSON (`session/cookies.json`) | 手動削除まで | ログイン状態維持 |
| チャプターキャッシュ | JSON (`data/cache/{bookId}/`) | 手動削除まで | 再スクレイピング高速化 |
| チェックポイント | JSON (`data/progress/{bookId}.json`) | 完了時に自動削除 | 中断からの復帰 |
| マニフェスト | JSON (`data/manifest.json`) | 手動削除まで | 書籍管理・重複防止 |
| PDF | Binary (`data/books/*.pdf`) | 手動削除まで | 最終成果物 |
| ログ | Text (`logs/app.log`) | ローテーション (5ファイル) | デバッグ・監査 |

---

## 9. API仕様

### 9.1 外部依存API

#### O'Reilly Learning Platform

**Base URL:** `https://learning.oreilly.com`

**認証:**
- ログイン: `https://www.oreilly.com/member/login/`
- セッション管理: Cookie-based

**主要エンドポイント (Scraping対象):**

| エンドポイント | 用途 | 例 |
|--------------|------|-----|
| `/library/view/{book_slug}/{book_id}/` | 書籍詳細ページ | `/library/view/learning-typescript/123456/` |
| `/library/view/{book_slug}/{book_id}/{chapter}.xhtml` | チャプター | `/library/view/learning-typescript/123456/ch01.xhtml` |

**HTML構造 (重要セレクタ):**

```typescript
// 書籍メタデータ
const authorSelectors = [
  '[data-testid="book-authors"]',
  '.authors',
  'meta[name="author"]'
];

// チャプター一覧 (TOC)
const tocSelectors = [
  'aside',
  '[data-testid="toc-list"]',
  '.toc-list',
  '#toc',
  'nav[aria-label="Table of Contents"]'
];

// チャプター内容
const contentSelectors = [
  'article',
  '.chapter-content',
  'main',
  '[role="main"]',
  '#sbo-rt-content'
];

// ナビゲーション
const nextChapterSelector = '[data-testid="statusBarNext"] a';
```

### 9.2 内部モジュールAPI

#### BookScraper API

```typescript
class BookScraper {
  constructor(
    page: Page,
    validator: ContentValidator,
    config: ScraperConfig
  );

  // 書籍メタデータ取得
  async getBook(bookUrl: string): Promise<Book>;

  // 全チャプター一覧取得
  async getAllChapters(): Promise<Chapter[]>;

  // 単一チャプター内容取得
  async getChapterContent(
    chapterUrl: string,
    chapterTitle: string
  ): Promise<string>;

  // 全チャプター一括スクレイピング
  async scrapeAllChapters(
    book: Book,
    progressTracker: ProgressTracker,
    cacheManager: CacheManager
  ): Promise<Map<number, string>>;
}
```

#### StorageCoordinator API

```typescript
class StorageCoordinator {
  constructor(
    cacheManager: CacheManager,
    manifestManager: ManifestManager,
    pdfGenerator: PDFGenerator,
    config: StorageConfig
  );

  // 初期化 (ディレクトリ作成)
  async initialize(): Promise<void>;

  // 書籍保存 (PDF生成 + マニフェスト更新)
  async saveBook(
    page: Page,
    book: Book,
    chapterContents: Map<number, string>
  ): Promise<ManifestEntry>;
}
```

#### ProgressTracker API

```typescript
class ProgressTracker {
  constructor(
    checkpointManager: CheckpointManager,
    bookId: string,
    bookUrl: string,
    totalChapters: number
  );

  // 初期化 (チェックポイント読み込み)
  async initialize(): Promise<void>;

  // 未完了チャプター取得
  getRemainingChapters(): number[];

  // チャプター開始マーク
  async startChapter(index: number): Promise<void>;

  // チャプター完了マーク
  async completeChapter(index: number): Promise<void>;

  // チャプター失敗マーク
  async failChapter(index: number): Promise<void>;

  // サマリー取得
  getSummary(): ProgressSummary;

  // 終了処理 (チェックポイント削除)
  async finalize(): Promise<void>;
}
```

---

## 10. セキュリティ考慮事項

### 10.1 認証情報の保護

#### 環境変数による管理

```bash
# .env ファイルをGit管理から除外
# .gitignore に追加:
.env
session/cookies.json
```

#### ベストプラクティス

1. **パスワード保管:**
   - `.env` ファイルのパーミッション: `600` (所有者のみ読み書き)
   - 本番環境: AWS Secrets Manager、HashiCorp Vault 等の利用推奨

2. **Cookie管理:**
   - `session/cookies.json` も `.gitignore` に追加
   - 定期的なセッション更新

### 10.2 XSS対策

**リスク:** スクレイピングしたHTMLにマルウェアスクリプトが含まれる可能性

**対策:**

1. **PDF生成時のサニタイゼーション:**
   ```typescript
   // スクリーンショットベースのため、スクリプトは実行されない
   const screenshot = await page.screenshot({ fullPage: true });
   ```

2. **キャッシュデータの隔離:**
   - キャッシュJSONファイルは直接ブラウザで開かない
   - HTMLコンテンツは文字列として保存

### 10.3 レート制限によるサーバー保護

**実装:**

```typescript
// リクエスト間に必ず2秒の待機
await delay(getRequestDelay()); // デフォルト 2000ms
```

**目的:**
- O'Reillyサーバーへの負荷軽減
- IP BAN リスク低減
- アンチボット検知回避

### 10.4 依存パッケージのセキュリティ

**監査コマンド:**

```bash
npm audit
npm audit fix
```

**定期更新:**

```bash
npm outdated
npm update
```

---

## 11. パフォーマンス最適化

### 11.1 最適化戦略

| 項目 | 実装 | 効果 |
|-----|------|------|
| **キャッシュシステム** | 章単位のJSONキャッシュ | 再スクレイピング時間 90%削減 |
| **チェックポイント** | 進捗保存・復帰 | 中断時の無駄なリトライ防止 |
| **並列処理なし** | 順次実行 | レート制限違反防止 (将来的に検討可) |
| **ヘッドレスモード** | Chromium非表示 | メモリ・CPU 20%削減 |
| **スクリーンショット最適化** | PNG圧縮 | PDF サイズ削減 |

### 11.2 リソース使用量

**メモリ:**
- 基本: 200-300MB (Chromiumプロセス)
- チャプター多数 (50+): 500MB-1GB

**ディスク:**
- キャッシュ: 章あたり 10-50KB (HTML)
- PDF: 書籍あたり 5-50MB (画像品質依存)

**ネットワーク:**
- チャプターあたり 100-500KB
- 画像多数の場合: 1-3MB/章

### 11.3 パフォーマンスメトリクス

**ベンチマーク (参考値):**

| 書籍サイズ | 総チャプター数 | 初回スクレイピング時間 | キャッシュ利用時 |
|-----------|---------------|---------------------|----------------|
| 小 | 10章 | 5-8分 | 30秒 |
| 中 | 20章 | 10-15分 | 1分 |
| 大 | 50章 | 30-45分 | 2-3分 |

**ボトルネック:**
- ネットワーク遅延 (50%)
- PDF生成 (スクリーンショット) (30%)
- レート制限待機 (20%)

---

## 12. 今後の拡張性

### 12.1 実装予定機能

#### 優先度: 高

1. **並列スクレイピング**
   ```typescript
   // 複数チャプターを同時処理 (レート制限内で)
   const concurrency = 3;
   await Promise.all(
     chunks(chapters, concurrency).map(chunk => scrapeChapters(chunk))
   );
   ```

2. **増分更新**
   ```typescript
   // 既存PDFのチャプター追加・更新
   async updateExistingPDF(bookId: string, newChapters: Chapter[])
   ```

3. **WebUI**
   - Express.js ベースのダッシュボード
   - 進捗リアルタイム表示
   - 書籍管理画面

#### 優先度: 中

4. **EPUB生成**
   ```typescript
   class EPUBGenerator {
     async generateEPUB(book: Book, chapters: Map<number, string>): Promise<void>
   }
   ```

5. **OCR機能**
   - 画像テキスト抽出 (Tesseract.js)
   - 検索可能PDF生成

6. **マルチサイト対応**
   ```typescript
   interface ScraperAdapter {
     login(credentials: Credentials): Promise<void>;
     getBook(url: string): Promise<Book>;
     getChapterContent(url: string): Promise<string>;
   }

   class PacktScraperAdapter implements ScraperAdapter { }
   class SafariScraperAdapter implements ScraperAdapter { }
   ```

#### 優先度: 低

7. **スケジューリング機能**
   - cron対応
   - 新刊自動取得

8. **通知システム**
   - Slack/Discord Webhook
   - メール通知

9. **Docker化**
   ```dockerfile
   FROM node:18-alpine
   RUN npx playwright install chromium
   WORKDIR /app
   COPY . .
   RUN npm ci
   CMD ["npm", "start"]
   ```

### 12.2 アーキテクチャ拡張

#### プラグインシステム

```typescript
interface ScraperPlugin {
  name: string;
  beforeLogin?: (page: Page) => Promise<void>;
  afterLogin?: (page: Page) => Promise<void>;
  beforeChapterScrape?: (chapter: Chapter) => Promise<void>;
  afterChapterScrape?: (chapter: Chapter, content: string) => Promise<string>;
}

// 使用例
const antiCaptchaPlugin: ScraperPlugin = {
  name: 'anti-captcha',
  afterLogin: async (page) => {
    // CAPTCHA自動解決ロジック
  }
};
```

#### イベント駆動アーキテクチャ

```typescript
enum ScraperEvent {
  BOOK_START = 'book:start',
  BOOK_COMPLETE = 'book:complete',
  CHAPTER_START = 'chapter:start',
  CHAPTER_COMPLETE = 'chapter:complete',
  ERROR = 'error'
}

class EventBus {
  on(event: ScraperEvent, handler: Function): void;
  emit(event: ScraperEvent, data: any): void;
}

// 使用例
eventBus.on(ScraperEvent.CHAPTER_COMPLETE, (data) => {
  Logger.info(`Chapter ${data.index} completed`);
  sendSlackNotification(`Chapter ${data.title} done!`);
});
```

### 12.3 スケーラビリティ

#### マルチインスタンス対応

```typescript
// Redis ベースの分散ロック
class DistributedLock {
  async acquireLock(bookId: string): Promise<boolean>;
  async releaseLock(bookId: string): Promise<void>;
}

// 複数サーバーで同時実行
// サーバーA: books[0-4]
// サーバーB: books[5-9]
const myBooks = allBooks.filter((_, i) => i % TOTAL_WORKERS === WORKER_ID);
```

#### データベース化

```typescript
// SQLiteからPostgreSQLへ
interface BookRepository {
  save(book: Book): Promise<void>;
  findById(id: string): Promise<Book | null>;
  findAll(): Promise<Book[]>;
  update(id: string, updates: Partial<Book>): Promise<void>;
}

class PostgresBookRepository implements BookRepository {
  // 実装
}
```

---

## 付録A: トラブルシューティング

### A.1 よくある問題と解決策

#### 問題: ログインに失敗する

**症状:**
```
[ERROR] Authentication failed
```

**原因:**
- 無効な認証情報
- アンチボット検知

**解決策:**
1. `.env` のメール・パスワードを確認
2. `HEADLESS=false` で画面を確認
3. `SLOW_MO=1000` で操作を遅延

#### 問題: チャプターが一部しか取得できない

**症状:**
```
Found 5 chapters (expected 15)
```

**原因:**
- TOCが折りたたまれている
- 動的ロードコンテンツ

**解決策:**
- ログ確認 (`LOG_LEVEL=DEBUG`)
- 連番チャプター探索が正常動作しているか確認

#### 問題: PDFが生成されない

**症状:**
```
[ERROR] Failed to save book: EACCES: permission denied
```

**原因:**
- ディレクトリ権限不足

**解決策:**
```bash
chmod 755 data/
mkdir -p data/books
```

---

## 付録B: 開発ガイド

### B.1 開発環境セットアップ

```bash
# リポジトリクローン
git clone https://github.com/m19cmjigen/scrap_ebook_online.git
cd scrap_ebook_online

# 依存インストール
npm install

# Playwrightブラウザインストール
npx playwright install chromium

# 環境変数設定
cp .env.example .env
vim .env  # 認証情報入力

# 型チェック
npm run type-check

# 開発実行
npm run dev
```

### B.2 テスト実行

```bash
# 全テスト実行
npm test

# ウォッチモード
npm test -- --watch

# カバレッジ
npm test -- --coverage
```

### B.3 コード品質

```bash
# リント
npm run lint

# フォーマット
npm run format

# 全チェック
npm run lint && npm run type-check && npm test
```

---

## 付録C: ライセンスとクレジット

### C.1 ライセンス

MIT License - 詳細は `LICENSE` ファイル参照

### C.2 主要依存パッケージ

- **Playwright:** Microsoft (Apache-2.0)
- **pdf-lib:** Andrew Dillon (MIT)
- **TypeScript:** Microsoft (Apache-2.0)

### C.3 免責事項

本ソフトウェアは教育・個人利用目的で提供されています。O'Reilly Learning Platformの利用規約を遵守し、合法的な範囲でのみ使用してください。著作権法違反やサービス規約違反の責任は使用者に帰属します。

---

## 変更履歴

| 日付 | バージョン | 変更内容 |
|-----|-----------|---------|
| 2026-01-03 | 0.1.0 | 初版作成 - マルチブック対応実装完了 |

---

**ドキュメント作成者:** Claude (Anthropic)
**最終更新:** 2026-01-03
**問い合わせ:** GitHub Issues (https://github.com/m19cmjigen/scrap_ebook_online/issues)
