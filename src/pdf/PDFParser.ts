/**
 * PDF 파서 클래스
 * PDF.js를 사용하여 PDF 파일을 파싱합니다.
 */
import * as pdfjsLib from 'pdfjs-dist';

// PDF.js worker 설정
pdfjsLib.GlobalWorkerOptions.workerSrc = `https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js`;

export interface PDFPage {
  pageNumber: number;
  width: number;
  height: number;
  viewport: any;
  page: any;
}

export interface PDFDocument {
  pages: PDFPage[];
  totalPages: number;
  pdfDoc: any;
  metadata?: {
    title?: string;
    author?: string;
    subject?: string;
  };
}

export class PDFParser {
  private pdfDoc: any = null;

  /**
   * PDF 파일을 로드합니다.
   */
  async loadPDF(source: string | File | Blob): Promise<void> {
    let data: ArrayBuffer | Uint8Array;

    if (typeof source === 'string') {
      // URL에서 로드
      const loadingTask = pdfjsLib.getDocument(source);
      this.pdfDoc = await loadingTask.promise;
    } else {
      // File 또는 Blob에서 로드
      const arrayBuffer = await source.arrayBuffer();
      data = new Uint8Array(arrayBuffer);
      const loadingTask = pdfjsLib.getDocument({ data });
      this.pdfDoc = await loadingTask.promise;
    }
  }

  /**
   * PDF 문서를 파싱하여 문서 객체를 반환합니다.
   */
  async parse(): Promise<PDFDocument> {
    if (!this.pdfDoc) {
      throw new Error('PDF가 로드되지 않았습니다. loadPDF()를 먼저 호출하세요.');
    }

    const totalPages = this.pdfDoc.numPages;
    const pages: PDFPage[] = [];

    // 메타데이터 추출
    let metadata: PDFDocument['metadata'] = {};
    try {
      const pdfMetadata = await this.pdfDoc.getMetadata();
      if (pdfMetadata.info) {
        metadata = {
          title: pdfMetadata.info.Title || undefined,
          author: pdfMetadata.info.Author || undefined,
          subject: pdfMetadata.info.Subject || undefined,
        };
      }
    } catch (error) {
      console.warn('메타데이터 추출 실패:', error);
    }

    // 페이지 정보 추출 (지연 로딩을 위해 페이지 객체만 저장)
    for (let i = 1; i <= totalPages; i++) {
      const page = await this.pdfDoc.getPage(i);
      const viewport = page.getViewport({ scale: 1.0 });

      pages.push({
        pageNumber: i,
        width: viewport.width,
        height: viewport.height,
        viewport,
        page,
      });
    }

    return {
      pages,
      totalPages,
      pdfDoc: this.pdfDoc,
      metadata,
    };
  }

  /**
   * PDF 문서 객체를 반환합니다.
   */
  getPDFDoc(): any {
    return this.pdfDoc;
  }
}
