import type { PrettyPDFViewerOptions, PDFViewerInstance } from './types';
import { PDFParser, type PDFDocument } from './pdf/PDFParser';
import { PageRenderer } from './renderer/PageRenderer';
import { BookLayout } from './layout/BookLayout';
import { FlipAnimation } from './animation/FlipAnimation';
import { ControlBar } from './ui/ControlBar';

/**
 * Pretty PDF Viewer 메인 클래스
 * 
 * 새로운 아키텍처:
 * - PDF.js: PDF 파싱 및 고해상도 Canvas 렌더링
 * - HTML/CSS: 실제 페이지 표시 (원본 화질 유지)
 * - Three.js: 페이지 넘김 애니메이션만 담당
 */
export class PrettyPDFViewer implements PDFViewerInstance {
  private container: HTMLElement;
  private options: Omit<Required<PrettyPDFViewerOptions>, 'pdfFile'> & { pdfFile?: File | Blob };
  
  private pdfParser: PDFParser;
  private pageRenderer: PageRenderer;
  private bookLayout: BookLayout;
  private flipAnimation: FlipAnimation;
  private controlBar: ControlBar;
  
  private pdfDoc: PDFDocument | null = null;
  private currentPage: number = 1;
  private totalPages: number = 0;
  
  private pageCache: Map<number, HTMLCanvasElement> = new Map();
  private currentZoom: number = 1.0;
  private isAnimating: boolean = false;

  constructor(container: HTMLElement | string, options: PrettyPDFViewerOptions = {}) {
    // Container 설정
    if (typeof container === 'string') {
      const el = document.querySelector(container);
      if (!el) {
        throw new Error(`Container not found: ${container}`);
      }
      this.container = el as HTMLElement;
    } else {
      this.container = container;
    }

    // 옵션 설정
    this.options = {
      pdfFile: options.pdfFile,
      initialPage: options.initialPage ?? 1,
      initialZoom: options.initialZoom ?? 1.0,
      onLoad: options.onLoad ?? (() => {}),
      onPageChange: options.onPageChange ?? (() => {}),
      onError: options.onError ?? (() => {}),
      animationDuration: options.animationDuration ?? 800,
      pageQuality: options.pageQuality ?? 4, // 4배 해상도 (최고화질)
      useThreeJS: options.useThreeJS ?? true, // 기본적으로 Three.js 사용
    };

    // 컴포넌트 초기화
    this.pdfParser = new PDFParser();
    this.pageRenderer = new PageRenderer();
    this.bookLayout = new BookLayout(this.container);
    this.flipAnimation = new FlipAnimation(this.container, this.options.animationDuration, this.options.useThreeJS);
    this.controlBar = new ControlBar(this.container);

    // 컨트롤 바 콜백 등록
    this.controlBar.setPrevPageCallback(() => this.previousPage());
    this.controlBar.setNextPageCallback(() => this.nextPage());
    this.controlBar.setZoomInCallback(() => this.zoomIn());
    this.controlBar.setZoomOutCallback(() => this.zoomOut());
    this.controlBar.setFullscreenCallback(() => this.toggleFullscreen());
    this.controlBar.setPrintCallback(() => this.print());
    this.controlBar.setDownloadCallback(() => this.download());
    this.controlBar.setShareCallback(() => this.share());
    this.controlBar.setPageChangeCallback((page) => this.goToPage(page));

    // 초기 로드
    if (this.options.pdfFile) {
      this.load(this.options.pdfFile).catch(this.options.onError);
    }
    
    // 리사이즈 핸들러 등록
    this.setupResizeHandler();
  }

  /**
   * PDF를 로드합니다
   */
  async load(source: string | File | Blob): Promise<void> {
    try {
      // PDF 파싱
      await this.pdfParser.loadPDF(source);
      this.pdfDoc = await this.pdfParser.parse();
      this.totalPages = this.pdfDoc.totalPages;
      this.currentPage = this.options.initialPage;
      
      // PDF를 Blob으로 저장 (다운로드용)
      if (source instanceof File || source instanceof Blob) {
        this.pdfBlob = source;
        this.options.pdfFile = source;
      } else if (typeof source === 'string') {
        // URL인 경우 나중에 필요할 때 fetch
        this.options.pdfFile = source;
      }

      // 첫 페이지 렌더링
      await this.renderCurrentSpread();

      this.options.onLoad();
    } catch (error) {
      this.options.onError(error as Error);
      throw error;
    }
  }

  /**
   * 현재 스프레드를 렌더링합니다
   */
  private async renderCurrentSpread(): Promise<void> {
    if (!this.pdfDoc) return;

    // 페이지 1 (표지): 단독 표시
    if (this.currentPage === 1) {
      const canvas = await this.getOrRenderPage(1);
      this.bookLayout.setSinglePage(canvas);
      this.bookLayout.updateCurrentSpread(1, null);
    }
    // 마지막 페이지가 홀수이고 현재 마지막 페이지: 단독 표시
    else if (this.totalPages % 2 === 1 && this.currentPage === this.totalPages) {
      const canvas = await this.getOrRenderPage(this.totalPages);
      this.bookLayout.setSinglePage(canvas);
      this.bookLayout.updateCurrentSpread(this.totalPages, null);
    }
    // 양면 보기
    else {
      let leftPageNum: number, rightPageNum: number;
      
      // 짝수 페이지면 왼쪽, 홀수 페이지면 오른쪽
      if (this.currentPage % 2 === 0) {
        leftPageNum = this.currentPage;
        rightPageNum = this.currentPage + 1;
      } else {
        leftPageNum = this.currentPage - 1;
        rightPageNum = this.currentPage;
      }

      const leftCanvas = await this.getOrRenderPage(leftPageNum);
      const rightCanvas = rightPageNum <= this.totalPages 
        ? await this.getOrRenderPage(rightPageNum)
        : null;

      this.bookLayout.setLeftPage(leftCanvas);
      this.bookLayout.setRightPage(rightCanvas);
      this.bookLayout.updateCurrentSpread(leftPageNum, rightPageNum);
    }

    this.options.onPageChange(this.currentPage, this.totalPages);
    
    // 페이지 정보 업데이트 (스프레드 모드 지원)
    const spread = this.bookLayout.getCurrentSpread();
    if (spread.left !== null && spread.right !== null && spread.right <= this.totalPages) {
      // 양면 보기: "2-3 / 4" (오른쪽 페이지가 존재하는 경우만)
      // 스프레드 뷰일 때 두 페이지 표시
      if (spread.right && spread.right <= this.totalPages) {
        this.controlBar.updatePageInfo(`${spread.left}-${spread.right}`, this.totalPages);
      } else {
        this.controlBar.updatePageInfo(spread.left, this.totalPages);
      }
    } else if (spread.left !== null) {
      // 단일 페이지: "1 / 4" 또는 마지막 페이지가 단독인 경우 "4 / 4"
      // 스프레드 뷰일 때 두 페이지 표시
      if (spread.right && spread.right <= this.totalPages) {
        this.controlBar.updatePageInfo(`${spread.left}-${spread.right}`, this.totalPages);
      } else {
        this.controlBar.updatePageInfo(spread.left, this.totalPages);
      }
    }
  }

  /**
   * 페이지를 렌더링하거나 캐시에서 가져옵니다
   */
  private async getOrRenderPage(pageNumber: number): Promise<HTMLCanvasElement> {
    // 캐시 확인
    const cached = this.pageCache.get(pageNumber);
    if (cached) return cached;

    // 새로 렌더링
    if (!this.pdfDoc) throw new Error('PDF가 로드되지 않았습니다');
    
    const pdfPage = await this.pdfDoc.getPage(pageNumber);
    const canvas = await this.pageRenderer.renderPage(pdfPage, this.options.pageQuality);
    
    // 캐시에 저장
    this.pageCache.set(pageNumber, canvas);
    
    return canvas;
  }

  /**
   * 특정 페이지로 이동합니다
   */
  async goToPage(page: number, animate: boolean = false): Promise<void> {
    if (page < 1 || page > this.totalPages || page === this.currentPage || this.isAnimating) {
      return;
    }

    if (!animate || !this.options.useThreeJS) {
      this.currentPage = page;
      await this.renderCurrentSpread();
      return;
    }

    this.isAnimating = true;
    const oldPage = this.currentPage;
    const direction = page > oldPage ? 'forward' : 'backward';

    try {
      this.bookLayout.hidePages();

      const currentSpread = this.bookLayout.getCurrentSpread();
      const targetSpread = this.bookLayout.getSpreadForPage(page, this.totalPages);

      const canvases = {
        currentLeft: currentSpread.left ? await this.getOrRenderPage(currentSpread.left) : this.bookLayout.createEmptyCanvas(),
        currentRight: currentSpread.right ? await this.getOrRenderPage(currentSpread.right) : this.bookLayout.createEmptyCanvas(),
        targetLeft: targetSpread.left ? await this.getOrRenderPage(targetSpread.left) : this.bookLayout.createEmptyCanvas(),
        targetRight: targetSpread.right ? await this.getOrRenderPage(targetSpread.right) : this.bookLayout.createEmptyCanvas(),
      };

      if (direction === 'forward') {
        await this.flipAnimation.flipForward(
          canvases.currentLeft,
          canvases.currentRight,
          canvases.targetLeft,
          canvases.targetRight
        );
      } else {
        await this.flipAnimation.flipBackward(
          canvases.currentLeft,
          canvases.currentRight,
          canvases.targetLeft,
          canvases.targetRight
        );
      }

      this.currentPage = page;
      await this.renderCurrentSpread();

    } catch (error) {
      console.error("Animation failed, reverting to previous page.", error);
      this.currentPage = oldPage;
      await this.renderCurrentSpread();
    } finally {
      this.isAnimating = false;
      this.bookLayout.showPages();
    }
  }

  /**
   * 다음 페이지로 이동합니다
   */
  async nextPage(): Promise<void> {
    if (this.currentPage >= this.totalPages) return;

    let nextPageNum: number;
    
    if (this.currentPage === 1) {
      nextPageNum = 2;
    } else {
      nextPageNum = this.currentPage % 2 === 0 ? this.currentPage + 2 : this.currentPage + 1;
    }

    if (nextPageNum <= this.totalPages) {
      await this.goToPage(nextPageNum, true);
    }
  }

  /**
   * 이전 페이지로 이동합니다
   */
  async previousPage(): Promise<void> {
    if (this.currentPage <= 1) return;

    let prevPageNum: number;
    
    if (this.currentPage === 2 || this.currentPage === 3) {
      prevPageNum = 1;
    } else {
      prevPageNum = this.currentPage % 2 === 0 ? this.currentPage - 2 : this.currentPage - 3;
    }

    if (prevPageNum >= 1) {
      await this.goToPage(prevPageNum, true);
    }
  }

  /**
   * 줌 인
   */
  async zoomIn(): Promise<void> {
    const newZoom = Math.min(this.currentZoom + 0.2, 3.0); // 최대 3배
    await this.setZoom(newZoom);
  }

  /**
   * 줌 아웃
   */
  async zoomOut(): Promise<void> {
    const newZoom = Math.max(this.currentZoom - 0.2, 0.5); // 최소 0.5배
    await this.setZoom(newZoom);
  }

  /**
   * 리사이즈 핸들러 설정
   */
  private setupResizeHandler(): void {
    const resizeHandler = () => {
      this.flipAnimation.resize();
      this.renderCurrentSpread();
    };
    
    window.addEventListener('resize', resizeHandler);
    
    // cleanup 시 제거를 위한 참조 저장
    (this as any).resizeHandler = resizeHandler;
  }

  /**
   * 줌 레벨 설정
   */
  async setZoom(level: number): Promise<void> {
    this.currentZoom = Math.max(0.5, Math.min(3.0, level));
    
    // CSS transform scale로 즉시 적용
    this.bookLayout.setScale(this.currentZoom);
    
    // 컨트롤 바 줌 레벨 업데이트
    this.controlBar.updateZoomLevel(this.currentZoom);
  }

  /**
   * 전체화면 토글
   */
  private toggleFullscreen(): void {
    if (!document.fullscreenElement) {
      this.container.requestFullscreen().catch((err) => {
        console.error('전체화면 전환 실패:', err);
      });
    } else {
      document.exitFullscreen();
    }
  }

  /**
   * 현재 페이지 인쇄
   */
  async print(): Promise<void> {
    if (!this.pdfDoc) return;
    
    // 프린트용 iframe 생성
    const printFrame = document.createElement('iframe');
    printFrame.style.position = 'absolute';
    printFrame.style.width = '0';
    printFrame.style.height = '0';
    printFrame.style.border = 'none';
    document.body.appendChild(printFrame);
    
    const printWindow = printFrame.contentWindow;
    if (!printWindow) return;
    
    // 현재 페이지 렌더링
    const canvas = await this.getOrRenderPage(this.currentPage);
    
    // 프린트 문서 작성
    printWindow.document.write(`
      <!DOCTYPE html>
      <html>
      <head>
        <title>Print PDF - Page ${this.currentPage}</title>
        <style>
          body { margin: 0; padding: 0; }
          img { 
            max-width: 100%; 
            max-height: 100vh; 
            display: block; 
            margin: 0 auto;
          }
          @media print {
            @page { margin: 0; }
            body { margin: 0; }
          }
        </style>
      </head>
      <body>
        <img src="${canvas.toDataURL()}" />
      </body>
      </html>
    `);
    
    printWindow.document.close();
    
    // 이미지 로드 후 프린트
    setTimeout(() => {
      printWindow.focus();
      printWindow.print();
      setTimeout(() => {
        document.body.removeChild(printFrame);
      }, 100);
    }, 250);
  }
  
  /**
   * PDF 다운로드
   */
  private pdfBlob: Blob | null = null;
  
  async download(): Promise<void> {
    try {
      let blob: Blob;
      
      // 이미 저장된 blob이 있으면 사용
      if (this.pdfBlob) {
        blob = this.pdfBlob;
      } else if (this.options.pdfFile) {
        if (this.options.pdfFile instanceof File || this.options.pdfFile instanceof Blob) {
          blob = this.options.pdfFile;
          this.pdfBlob = blob;
        } else {
          // URL인 경우 fetch
          const response = await fetch(this.options.pdfFile as string);
          blob = await response.blob();
          this.pdfBlob = blob;
        }
      } else {
        console.error('No PDF file available for download');
        return;
      }
      
      // 다운로드 링크 생성
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `document-${new Date().toISOString().split('T')[0]}.pdf`;
      a.style.display = 'none';
      document.body.appendChild(a);
      a.click();
      
      // 정리
      setTimeout(() => {
        document.body.removeChild(a);
        URL.revokeObjectURL(url);
      }, 100);
      
      this.showNotification('다운로드 시작됨');
    } catch (error) {
      console.error('Failed to download PDF:', error);
      this.showNotification('다운로드 실패');
    }
  }

  /**
   * 공유 기능
   */
  async share(): Promise<void> {
    const shareData = {
      title: 'PDF Document',
      text: `Check out this PDF - Page ${this.currentPage} of ${this.totalPages}`,
      url: window.location.href
    };
    
    // Web Share API 지원 여부 확인
    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (error) {
        console.log('Share cancelled or failed:', error);
      }
    } else {
      // Web Share API를 지원하지 않는 경우 클립보드에 복사
      const shareText = `${shareData.title}\n${shareData.text}\n${shareData.url}`;
      if (navigator.clipboard) {
        await navigator.clipboard.writeText(shareText);
        this.showNotification('링크가 클립보드에 복사되었습니다');
      }
    }
  }
  
  /**
   * 알림 메시지 표시
   */
  private showNotification(message: string): void {
    const notification = document.createElement('div');
    notification.textContent = message;
    notification.style.cssText = `
      position: absolute;
      top: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.8);
      color: white;
      padding: 12px 24px;
      border-radius: 8px;
      font-size: 14px;
      z-index: 2000;
      animation: slideDown 0.3s ease;
    `;
    
    // 애니메이션 스타일 추가
    const style = document.createElement('style');
    style.textContent = `
      @keyframes slideDown {
        from {
          transform: translateX(-50%) translateY(-20px);
          opacity: 0;
        }
        to {
          transform: translateX(-50%) translateY(0);
          opacity: 1;
        }
      }
    `;
    document.head.appendChild(style);
    
    this.container.appendChild(notification);
    
    setTimeout(() => {
      notification.style.opacity = '0';
      notification.style.transition = 'opacity 0.3s';
      setTimeout(() => {
        notification.remove();
        style.remove();
      }, 300);
    }, 2000);
  }

  /**
   * 뷰어를 제거합니다
   */
  destroy(): void {
    this.flipAnimation.dispose();
    this.bookLayout.dispose();
    this.controlBar.dispose();
    this.pageRenderer.clearCache();
    this.pageCache.clear();
    
    // 리사이즈 핸들러 제거
    if ((this as any).resizeHandler) {
      window.removeEventListener('resize', (this as any).resizeHandler);
    }
  }
}
