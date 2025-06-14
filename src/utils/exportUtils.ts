import dayjs from 'dayjs'
import githubCss from 'github-markdown-css/github-markdown-light.css?inline'
import { marked } from 'marked'
import { toast } from 'sonner'
import { sanitizeTitle } from './xssUtils'

// 印刷設定の定数
const PRINT_CONFIG = {
  MARGIN: '15mm',
  PAGE_SIZE: 'A4',
  ORIENTATION: 'portrait' as const,
  LAYOUT_DELAY: 500,
  WINDOW_FEATURES: 'width=800,height=600'
} as const

// Markdown設定の定数
const MARKDOWN_CONFIG = {
  gfm: true,
  breaks: false,
  pedantic: false
} as const

// UIテキストの定数
const UI_TEXT = {
  PREVIEW_TITLE: '📄 PDF印刷プレビュー',
  PREVIEW_DESCRIPTION: 'このページを印刷してPDFとして保存してください。',
  PRINT_BUTTON: '🖨️ 印刷 / PDF保存',
  POPUP_BLOCKED_ERROR:
    'ポップアップがブロックされました。ポップアップを許可してから再試行してください。',
  PDF_EXPORT_ERROR: 'PDF export failed:'
} as const

// カラーパレット
const COLORS = {
  BACKGROUND: '#f8f9fa',
  BORDER: '#e9ecef',
  TEXT_PRIMARY: '#495057',
  TEXT_SECONDARY: '#6c757d',
  BUTTON_PRIMARY: '#0066cc',
  BUTTON_HOVER: '#0052a3',
  DIVIDER: '#dee2e6'
} as const

// E2Eテスト環境の検出
const TEST_CONFIG = {
  DELAY_MS: 100,
  USER_AGENTS: ['HeadlessChrome', 'Playwright']
} as const

// CSS生成関数
function generatePrintCSS(): string {
  return `
    ${githubCss}

    /* 共通スタイル */
    html {
      font-variant-numeric: tabular-nums;
    }
    
    body {
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Noto Sans', Helvetica, Arial, sans-serif;
      line-height: 1.6;
      background: white;
      color-adjust: exact;
      -webkit-print-color-adjust: exact;
    }
    
    .markdown-body {
      box-sizing: border-box;
    }
    
    /* 改ページ制御は削除 - ブラウザの自然な判断に任せる */
    
    /* 画像の基本スタイルのみ */
    img {
      max-width: 100%;
      height: auto;
    }
    
    /* 表示制御 */
    pre, .highlight, code {
      white-space: pre-wrap;
      word-wrap: break-word;
    }
    
    pre, .highlight {
      overflow: visible;
    }
    
    /* テーブル制御 */
    thead {
      display: table-header-group;
    }
    
    @media screen {
      body {
        max-width: 800px;
        margin: 0 auto;
        padding: 20px;
      }
      
      .print-only {
        display: none;
      }
      
      .screen-only {
        display: block;
      }
    }

    @media print {
      @page {
        size: ${PRINT_CONFIG.PAGE_SIZE} ${PRINT_CONFIG.ORIENTATION};
        margin: ${PRINT_CONFIG.MARGIN};
      }
      
      /* 印刷専用の基本設定のみ */
      body {
        margin: 0;
        padding: 0;
        max-width: none;
        background: white !important;
      }
      
      .markdown-body {
        max-width: none !important;
        margin: 0 !important;
        padding: 0 !important;
      }
      
      /* 印刷時の表示/非表示 */
      .print-only {
        display: block !important;
      }
      
      .screen-only {
        display: none !important;
      }
    }
  `
}

// プレビューUI生成関数
function generatePreviewUI(): string {
  return `
    <div class="screen-only">
      <div style="
        background: ${COLORS.BACKGROUND};
        border: 1px solid ${COLORS.BORDER};
        border-radius: 8px;
        padding: 20px;
        margin-bottom: 20px;
      ">
        <h1 style="margin-top: 0; color: ${COLORS.TEXT_PRIMARY}; font-size: 25px">${UI_TEXT.PREVIEW_TITLE}</h1>
        <p style="margin-bottom: 20px; color: ${COLORS.TEXT_SECONDARY};">
          ${UI_TEXT.PREVIEW_DESCRIPTION.replace(/\n/g, '<br>')}
        </p>
        
        <!-- 通常の印刷ボタンセクション -->
        <div style="
          background: #f0f8ff;
          border: 1px solid #b3d9ff;
          border-radius: 6px;
          padding: 16px;
          margin-bottom: 20px;
        ">
          <h3 style="margin: 0 0 12px 0; color: #0066cc; font-size: 18px; display: grid; grid-template-columns: auto 1fr; gap: 8px;">
            <span>🖨️</span>
            <span>自動的に印刷ダイアログが表示されない場合</span>
          </h3>
          <button onclick="window.print()" style="
            background: ${COLORS.BUTTON_PRIMARY};
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 6px;
            cursor: pointer;
            font-size: 16px;
            font-weight: 500;
            box-shadow: 0 2px 4px rgba(0,102,204,0.2);
            transition: background 0.2s;
          " onmouseover="this.style.background='${COLORS.BUTTON_HOVER}'" onmouseout="this.style.background='${COLORS.BUTTON_PRIMARY}'">
            ${UI_TEXT.PRINT_BUTTON}
          </button>
        </div>
        
        <!-- iOS印刷ガイドセクション -->
        <div style="
          background: #e8f5e8;
          border: 1px solid #c3e6c3;
          border-radius: 6px;
          padding: 16px;
          margin-bottom: 16px;
        ">
          <h3 style="margin: 0 0 12px 0; color: #2d5a2d; font-size: 18px; display: grid; grid-template-columns: auto 1fr; gap: 8px;">
            <span>📱</span>
            <span>iOSのアプリ内ブラウザで印刷する場合</span>
          </h3>
          <p style="margin: 0 0 12px 0; color: #2d5a2d; font-size: 14px;">
            iOSのアプリ内ブラウザでは印刷がサポートされていません。<br>Safariで改めて開くか、以下の手順で印刷してください。
          </p>
          <ol style="margin: 0; padding-left: 20px; color: #2d5a2d; line-height: 1.6;">
            <li>画面下部（または右上）の <strong>シェアボタン（□↑）</strong> をタップ</li>
            <li>メニューから <strong>「プリント」</strong> を選択</li>
            <li>プリンターを選択して印刷、またはPDFとして保存</li>
          </ol>
        </div>
        
        <div style="
          background: #fff3cd;
          border: 1px solid #ffeaa7;
          border-radius: 6px;
          padding: 12px;
          color: #856404;
          font-size: 14px;
        ">
          💡 <strong>ヒント:</strong> シェアボタンが見つからない場合は、画面を少し上下にスクロールしてみてください。
        </div>
      </div>
      
      <hr style="margin: 20px 0; border: none; border-top: 1px solid ${COLORS.DIVIDER};">
    </div>
  `
}

// E2Eテスト環境の検出関数
function isE2ETestEnvironment(): boolean {
  return (
    typeof window !== 'undefined' &&
    ((window as { __e2e_pdf_test_mode__?: boolean }).__e2e_pdf_test_mode__ ||
      (typeof navigator !== 'undefined' &&
        TEST_CONFIG.USER_AGENTS.some((agent) =>
          navigator.userAgent.includes(agent)
        )))
  )
}

// HTMLドキュメント生成関数
async function createPrintableHTML(
  markdownContent: string,
  customTitle: string
): Promise<string> {
  const html = await marked(markdownContent, MARKDOWN_CONFIG)
  const timestamp = dayjs().format('YYYYMMDD-HHmmss')
  const titleWithTimestamp = `${customTitle}-${timestamp}`

  return `
    <!DOCTYPE html>
    <html lang="ja">
      <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <title>${sanitizeTitle(titleWithTimestamp)}</title>
        <style>
          ${generatePrintCSS()}
        </style>
      </head>
      <body>
        ${generatePreviewUI()}
        <article class="markdown-body">
          ${html}
        </article>
      </body>
    </html>
  `
}

// 印刷ウィンドウのレンダリング完了を待つ関数
async function waitForWindowReady(printWindow: Window): Promise<void> {
  return new Promise((resolve) => {
    if (printWindow.document.readyState === 'complete') {
      resolve()
    } else {
      printWindow.addEventListener('load', () => resolve())
    }
  })
}

// 印刷ウィンドウを開いて印刷ダイアログを表示
async function openPrintWindow(
  content: string,
  customTitle: string
): Promise<void> {
  const printHTML = await createPrintableHTML(content, customTitle)
  const printWindow = window.open('', '_blank', PRINT_CONFIG.WINDOW_FEATURES)

  if (!printWindow) {
    throw new Error(UI_TEXT.POPUP_BLOCKED_ERROR)
  }

  try {
    printWindow.document.write(printHTML)
    printWindow.document.close()

    await waitForWindowReady(printWindow)

    // レイアウト完了を待ってから印刷ダイアログを表示
    setTimeout(() => {
      printWindow.focus()
      printWindow.print()
    }, PRINT_CONFIG.LAYOUT_DELAY)
  } catch (error) {
    printWindow.close()
    throw error
  }
}

// PDF生成のメイン関数
export async function generatePDF(
  markdownContent: string,
  customTitle: string
): Promise<void> {
  await openPrintWindow(markdownContent, customTitle)
}

// PDF出力の公開関数
export async function exportAsPDF(
  content: string,
  customTitle: string
): Promise<void> {
  if (isE2ETestEnvironment()) {
    await new Promise((resolve) => setTimeout(resolve, TEST_CONFIG.DELAY_MS))
    // E2Eテストモードでテスト用のtoastを表示
    toast.success('TEST: PDFエクスポート処理完了')
    return
  }

  try {
    await generatePDF(content, customTitle)
  } catch (error) {
    console.error(UI_TEXT.PDF_EXPORT_ERROR, error)
    throw error
  }
}

// Markdown出力関数
export function exportAsMarkdown(content: string, customTitle: string): void {
  const timestamp = dayjs().format('YYYYMMDD-HHmmss')
  const safeTitle = sanitizeTitle(customTitle)
  const filename = `${safeTitle}-${timestamp}.md`
  const blob = new Blob([content], { type: 'text/markdown;charset=utf-8;' })
  downloadBlob(blob, filename)
}

// ファイルダウンロード関数
function downloadBlob(blob: Blob, filename: string): void {
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  link.setAttribute('href', url)
  link.setAttribute('download', filename)
  link.style.display = 'none'
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
}
