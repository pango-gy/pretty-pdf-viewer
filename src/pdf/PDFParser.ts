import * as pdfjsLib from 'pdfjs-dist';

// PDF.js worker 설정
// 브라우저 환경에서 자동으로 worker 경로 감지
if (typeof window !== 'undefined') {
  // CDN 사용 (가장 안정적)
  pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdn.jsdelivr.net/npm/pdfjs-dist@${pdfjsLib.version}/build/pdf.worker.min.mjs`;
}

export interface PDFDocument {
  totalPages: number;
  getPage(pageNumber: number): Promise<PDFPage>;
}

export interface PDFPage {
  pageNumber: number;
  page: pdfjsLib.PDFPageProxy; // 원본 페이지 객체 노출
  getViewport(scale: number): { width: number; height: number };
  render(canvas: HTMLCanvasElement, scale: number): Promise<void>;
}

/**
 * PDF 파서 클래스
 */
export class PDFParser {
  private pdfDoc: pdfjsLib.PDFDocumentProxy | null = null;

  /**
   * PDF 파일을 로드합니다
   */
  async loadPDF(source: string | File | Blob): Promise<void> {
    let data: ArrayBuffer;

    if (typeof source === 'string') {
      // URL에서 로드
      const response = await fetch(source);
      data = await response.arrayBuffer();
    } else {
      // File 또는 Blob에서 로드
      data = await source.arrayBuffer();
    }

    const loadingTask = pdfjsLib.getDocument({ data });
    this.pdfDoc = await loadingTask.promise;
  }

  /**
   * PDF 문서를 파싱하여 반환합니다
   */
  async parse(): Promise<PDFDocument> {
    if (!this.pdfDoc) {
      throw new Error('PDF가 로드되지 않았습니다');
    }

    const totalPages = this.pdfDoc.numPages;

    return {
      totalPages,
      getPage: async (pageNumber: number): Promise<PDFPage> => {
        if (!this.pdfDoc) {
          throw new Error('PDF가 로드되지 않았습니다');
        }

        const page = await this.pdfDoc.getPage(pageNumber);

        return {
          pageNumber,
          page, // 원본 페이지 객체 추가
          getViewport: (scale: number) => {
            const viewport = page.getViewport({ scale });
            return {
              width: viewport.width,
              height: viewport.height,
            };
          },
          render: async (canvas: HTMLCanvasElement, scale: number): Promise<void> => {
            const viewport = page.getViewport({ scale });
            const context = canvas.getContext('2d');

            if (!context) {
              throw new Error('Canvas context를 가져올 수 없습니다');
            }

            canvas.width = viewport.width;
            canvas.height = viewport.height;

            await page.render({
              canvasContext: context,
              viewport,
            }).promise;
          },
        };
      },
    };
  }
}
