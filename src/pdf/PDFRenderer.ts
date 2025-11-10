import { PDFPage } from './PDFParser';

/**
 * PDF 렌더러 클래스
 * PDF 페이지를 Canvas에 렌더링합니다.
 */
export class PDFRenderer {
  private canvas: HTMLCanvasElement;
  private ctx: CanvasRenderingContext2D;
  private currentPage: PDFPage | null = null;
  private currentScale: number = 1.0;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas 2D context를 가져올 수 없습니다.');
    }
    this.ctx = context;
  }

  /**
   * PDF 페이지를 Canvas에 렌더링합니다.
   */
  async renderPage(page: PDFPage, zoom: number = 1.0): Promise<void> {
    this.currentPage = page;
    this.currentScale = zoom;

    // 뷰포트 설정
    const viewport = page.page.getViewport({ scale: zoom });
    const displayWidth = viewport.width;
    const displayHeight = viewport.height;

    // 고해상도 디스플레이 지원
    const dpr = window.devicePixelRatio || 1;
    this.canvas.width = displayWidth * dpr;
    this.canvas.height = displayHeight * dpr;
    this.canvas.style.width = `${displayWidth}px`;
    this.canvas.style.height = `${displayHeight}px`;

    // Context 변환 설정
    this.ctx.setTransform(dpr, 0, 0, dpr, 0, 0);

    // 배경색 설정 (흰색)
    this.ctx.fillStyle = '#FFFFFF';
    this.ctx.fillRect(0, 0, displayWidth, displayHeight);

    // PDF 페이지 렌더링
    const renderContext = {
      canvasContext: this.ctx,
      viewport: viewport,
    };

    try {
      await page.page.render(renderContext).promise;
    } catch (error) {
      console.error('페이지 렌더링 오류:', error);
      // 오류 메시지 표시
      this.ctx.fillStyle = '#666666';
      this.ctx.font = '16px Arial';
      this.ctx.textAlign = 'center';
      this.ctx.textBaseline = 'middle';
      this.ctx.fillText(
        '페이지를 렌더링할 수 없습니다',
        displayWidth / 2,
        displayHeight / 2
      );
    }
  }

  /**
   * Canvas를 지웁니다.
   */
  clear(): void {
    this.ctx.clearRect(0, 0, this.canvas.width, this.canvas.height);
    this.currentPage = null;
  }

  /**
   * 현재 렌더링된 페이지를 반환합니다.
   */
  getCurrentPage(): PDFPage | null {
    return this.currentPage;
  }

  /**
   * 현재 스케일을 반환합니다.
   */
  getCurrentScale(): number {
    return this.currentScale;
  }
}
