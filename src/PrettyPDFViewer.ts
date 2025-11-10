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
      pageQuality: options.pageQuality ?? 3, // 3배 해상도 (고화질)
    };

    // 컴포넌트 초기화
    this.pdfParser = new PDFParser();
    this.pageRenderer = new PageRenderer();
    this.bookLayout = new BookLayout(this.container);
    this.flipAnimation = new FlipAnimation(this.container, this.options.animationDuration);
    this.controlBar = new ControlBar(this.container);

    // 컨트롤 바 콜백 등록
    this.controlBar.setPrevPageCallback(() => this.previousPage());
    this.controlBar.setNextPageCallback(() => this.nextPage());
    this.controlBar.setZoomInCallback(() => this.zoomIn());
    this.controlBar.setZoomOutCallback(() => this.zoomOut());
    this.controlBar.setFullscreenCallback(() => this.toggleFullscreen());

    // 초기 로드
    if (this.options.pdfFile) {
      this.load(this.options.pdfFile).catch(this.options.onError);
    }
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
      this.controlBar.updatePageInfo(`${spread.left}-${spread.right}`, this.totalPages);
    } else if (spread.left !== null) {
      // 단일 페이지: "1 / 4" 또는 마지막 페이지가 단독인 경우 "4 / 4"
      this.controlBar.updatePageInfo(spread.left, this.totalPages);
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

    // 일단 애니메이션 없이 단순 전환
    this.currentPage = page;
    await this.renderCurrentSpread();
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
      await this.goToPage(nextPageNum, false);
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
      await this.goToPage(prevPageNum, false);
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
   * 줌 레벨 설정
   */
  async setZoom(level: number): Promise<void> {
    this.currentZoom = Math.max(0.5, Math.min(3.0, level));
    
    // CSS transform scale로 즉시 적용
    this.bookLayout.setScale(this.currentZoom);
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
   * 뷰어를 제거합니다
   */
  destroy(): void {
    this.flipAnimation.dispose();
    this.bookLayout.dispose();
    this.controlBar.dispose();
    this.pageRenderer.clearCache();
    this.pageCache.clear();
  }
}
