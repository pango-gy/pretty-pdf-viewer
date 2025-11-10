import type { PDFPage } from '../pdf/PDFParser';

/**
 * PDF 페이지를 Canvas에 고해상도로 렌더링하는 클래스
 */
export class PageRenderer {
  private renderCache: Map<number, HTMLCanvasElement> = new Map();

  /**
   * PDF 페이지를 Canvas에 렌더링
   */
  async renderPage(page: PDFPage, scale: number = 4): Promise<HTMLCanvasElement> {
    // 캐시 확인
    const cached = this.renderCache.get(page.pageNumber);
    if (cached) return cached;

    // 새 Canvas 생성
    const canvas = document.createElement('canvas');
    const viewport = page.page.getViewport({ scale });

    canvas.width = viewport.width;
    canvas.height = viewport.height;

    const context = canvas.getContext('2d');
    if (!context) {
      throw new Error('Canvas context를 가져올 수 없습니다');
    }

    // 고품질 렌더링을 위한 설정
    context.imageSmoothingEnabled = false; // 픽셀 완벽 렌더링
    context.imageSmoothingQuality = 'high';

    // 안티앨리어싱 개선
    canvas.style.imageRendering = 'crisp-edges';

    // PDF 페이지를 Canvas에 렌더링
    await page.page.render({
      canvasContext: context,
      viewport,
      intent: 'display', // 화면 표시용 렌더링
    }).promise;

    // 캐시에 저장
    this.renderCache.set(page.pageNumber, canvas);

    return canvas;
  }

  /**
   * 캐시 정리
   */
  clearCache(): void {
    this.renderCache.clear();
  }

  /**
   * 특정 페이지 캐시 삭제
   */
  removePage(pageNumber: number): void {
    this.renderCache.delete(pageNumber);
  }
}

