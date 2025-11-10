import { PrettyPDFViewerOptions, PDFViewerInstance } from './types';
import { PDFParser, PDFDocument, PDFPage } from './pdf';
import { PDFRenderer } from './pdf/PDFRenderer';
import { PageFlipAnimation } from './animation';

interface PageElement {
  element: HTMLElement;
  canvas: HTMLCanvasElement;
  renderer: PDFRenderer;
  pageNumber: number;
}

interface PageSpread {
  leftPage: PageElement | null;
  rightPage: PageElement | null;
}

export class PrettyPDFViewer implements PDFViewerInstance {
  private container: HTMLElement;
  private contentContainer: HTMLElement | null = null;
  private options: Omit<Required<PrettyPDFViewerOptions>, 'pdfFile'> & { pdfFile?: File | Blob };
  private currentPage: number = 1;
  private totalPages: number = 0;
  private zoom: number = 1.0;
  private pdfDoc: PDFDocument | null = null;
  private pdfParser: PDFParser;
  private pageElements: Map<number, PageElement> = new Map();
  private pageFlipAnimation: PageFlipAnimation | null = null;
  
  // 마우스/터치 인터랙션
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private dragThreshold: number = 50; // 드래그 임계값 (px)
  
  // 전체화면 모드
  private isFullscreen: boolean = false;
  
  // 이벤트 핸들러 바인딩 (제거를 위해 참조 저장)
  private boundHandleKeyDown = this.handleKeyDown.bind(this);
  private boundHandleFullscreenChange = this.handleFullscreenChange.bind(this);

  constructor(options: PrettyPDFViewerOptions) {
    // Container 설정
    if (typeof options.container === 'string') {
      const element = document.querySelector(options.container);
      if (!element) {
        throw new Error(`Container element not found: ${options.container}`);
      }
      this.container = element as HTMLElement;
    } else {
      this.container = options.container;
    }

    // 기본 옵션 설정
    this.options = {
      container: this.container,
      pdfUrl: options.pdfUrl || '',
      pdfFile: options.pdfFile,
      theme: options.theme || 'light',
      showToolbar: options.showToolbar !== false,
      showSidebar: options.showSidebar !== false,
      enableZoom: options.enableZoom !== false,
      defaultZoom: options.defaultZoom || 1.0,
      enableDownload: options.enableDownload !== false,
      enablePrint: options.enablePrint !== false,
      onPageChange: options.onPageChange || (() => {}),
      onLoad: options.onLoad || (() => {}),
      onError: options.onError || (() => {}),
    };

    this.zoom = this.options.defaultZoom;
    this.pdfParser = new PDFParser();
    this.init();
  }

  private init(): void {
    this.createViewer();
    
    // PDF 로드
    if (this.options.pdfUrl) {
      this.load(this.options.pdfUrl);
    } else if (this.options.pdfFile) {
      this.load(this.options.pdfFile);
    }
  }

  private createViewer(): void {
    this.container.innerHTML = '';
    this.container.className = `pretty-pdf-viewer pretty-pdf-viewer--${this.options.theme}`;
    
    const viewerHTML = `
      <div class="pretty-pdf-viewer__toolbar" style="display: ${this.options.showToolbar ? 'flex' : 'none'}">
        <div class="pretty-pdf-viewer__toolbar-group">
          <button class="pretty-pdf-viewer__btn pretty-pdf-viewer__btn--icon" id="prev-page" title="이전 페이지 (←)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M15 18l-6-6 6-6"/>
            </svg>
          </button>
          <button class="pretty-pdf-viewer__btn pretty-pdf-viewer__btn--icon" id="next-page" title="다음 페이지 (→)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
              <path d="M9 18l6-6-6-6"/>
            </svg>
          </button>
        </div>
        
        <div class="pretty-pdf-viewer__toolbar-group">
          <span class="pretty-pdf-viewer__page-info">
            <input type="number" class="pretty-pdf-viewer__page-input" id="page-input" min="1" value="1" />
            <span class="pretty-pdf-viewer__page-separator">/</span>
            <span id="total-pages">0</span>
          </span>
        </div>
        
        ${this.options.enableZoom ? `
          <div class="pretty-pdf-viewer__toolbar-group">
            <button class="pretty-pdf-viewer__btn pretty-pdf-viewer__btn--icon" id="zoom-out" title="줌 아웃 (-)">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
                <path d="M8 11h6"/>
              </svg>
            </button>
            <span class="pretty-pdf-viewer__zoom-info" id="zoom-level">100%</span>
            <button class="pretty-pdf-viewer__btn pretty-pdf-viewer__btn--icon" id="zoom-in" title="줌 인 (+)">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <circle cx="11" cy="11" r="8"/>
                <path d="M21 21l-4.35-4.35"/>
                <path d="M11 8v6M8 11h6"/>
              </svg>
            </button>
            <button class="pretty-pdf-viewer__btn pretty-pdf-viewer__btn--icon" id="zoom-reset" title="줌 리셋 (0)">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M1 4v6h6M23 20v-6h-6"/>
                <path d="M20.49 9A9 9 0 0 0 5.64 5.64L1 10m22 4l-4.64 4.36A9 9 0 0 1 3.51 15"/>
              </svg>
            </button>
          </div>
        ` : ''}
        
        <div class="pretty-pdf-viewer__toolbar-group pretty-pdf-viewer__toolbar-group--right">
          ${this.options.enableDownload ? `
            <button class="pretty-pdf-viewer__btn pretty-pdf-viewer__btn--icon" id="download" title="다운로드">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                <polyline points="7 10 12 15 17 10"/>
                <line x1="12" y1="15" x2="12" y2="3"/>
              </svg>
            </button>
          ` : ''}
          ${this.options.enablePrint ? `
            <button class="pretty-pdf-viewer__btn pretty-pdf-viewer__btn--icon" id="print" title="인쇄 (Ctrl+P)">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2">
                <polyline points="6 9 6 2 18 2 18 9"/>
                <path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/>
                <rect x="6" y="14" width="12" height="8"/>
              </svg>
            </button>
          ` : ''}
          <button class="pretty-pdf-viewer__btn pretty-pdf-viewer__btn--icon" id="fullscreen" title="전체화면 (F11)">
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" id="fullscreen-icon">
              <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
            </svg>
          </button>
        </div>
      </div>
      
      <div class="pretty-pdf-viewer__loading" id="loading-indicator" style="display: none;">
        <div class="pretty-pdf-viewer__spinner"></div>
        <div class="pretty-pdf-viewer__loading-text">PDF를 로드하는 중...</div>
      </div>
      
      <div class="pretty-pdf-viewer__error" id="error-message" style="display: none;">
        <div class="pretty-pdf-viewer__error-icon">⚠️</div>
        <div class="pretty-pdf-viewer__error-text"></div>
      </div>
      
      <div class="pretty-pdf-viewer__content" id="pdf-content">
        <!-- 페이지들이 여기에 동적으로 추가됩니다 -->
      </div>
    `;
    
    this.container.innerHTML = viewerHTML;
    
    // 콘텐츠 컨테이너 참조
    this.contentContainer = this.container.querySelector('#pdf-content') as HTMLElement;
    if (!this.contentContainer) {
      throw new Error('콘텐츠 컨테이너를 찾을 수 없습니다.');
    }
    
    // 페이지 넘김 애니메이션 초기화
    this.pageFlipAnimation = new PageFlipAnimation(this.contentContainer);
    
    this.attachEventListeners();
  }

  private attachEventListeners(): void {
    const prevBtn = this.container.querySelector('#prev-page');
    const nextBtn = this.container.querySelector('#next-page');
    const zoomInBtn = this.container.querySelector('#zoom-in');
    const zoomOutBtn = this.container.querySelector('#zoom-out');
    const zoomResetBtn = this.container.querySelector('#zoom-reset');
    const downloadBtn = this.container.querySelector('#download');
    const printBtn = this.container.querySelector('#print');
    const fullscreenBtn = this.container.querySelector('#fullscreen');
    const pageInput = this.container.querySelector('#page-input') as HTMLInputElement;

    prevBtn?.addEventListener('click', () => this.previousPage());
    nextBtn?.addEventListener('click', () => this.nextPage());
    zoomInBtn?.addEventListener('click', () => this.zoomIn());
    zoomOutBtn?.addEventListener('click', () => this.zoomOut());
    zoomResetBtn?.addEventListener('click', () => this.setZoom(1.0));
    downloadBtn?.addEventListener('click', () => this.download());
    printBtn?.addEventListener('click', () => this.print());
    fullscreenBtn?.addEventListener('click', () => this.toggleFullscreen());

    // 페이지 번호 입력
    pageInput?.addEventListener('change', (e) => {
      const page = parseInt((e.target as HTMLInputElement).value, 10);
      if (page >= 1 && page <= this.totalPages) {
        this.goToPage(page);
      } else {
        (e.target as HTMLInputElement).value = this.currentPage.toString();
      }
    });

    pageInput?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        (e.target as HTMLInputElement).blur();
      }
    });

    // 키보드 단축키
    document.addEventListener('keydown', this.boundHandleKeyDown);
    
    // 전체화면 변경 감지
    document.addEventListener('fullscreenchange', this.boundHandleFullscreenChange);
    document.addEventListener('webkitfullscreenchange', this.boundHandleFullscreenChange);
    document.addEventListener('mozfullscreenchange', this.boundHandleFullscreenChange);
    document.addEventListener('MSFullscreenChange', this.boundHandleFullscreenChange);

    // 마우스/터치 인터랙션
    if (this.contentContainer) {
      this.contentContainer.addEventListener('mousedown', this.handleMouseDown.bind(this));
      this.contentContainer.addEventListener('mousemove', this.handleMouseMove.bind(this));
      this.contentContainer.addEventListener('mouseup', this.handleMouseUp.bind(this));
      this.contentContainer.addEventListener('mouseleave', this.handleMouseUp.bind(this));
      
      // 터치 이벤트
      this.contentContainer.addEventListener('touchstart', this.handleTouchStart.bind(this), { passive: false });
      this.contentContainer.addEventListener('touchmove', this.handleTouchMove.bind(this), { passive: false });
      this.contentContainer.addEventListener('touchend', this.handleTouchEnd.bind(this));
    }
  }

  async load(source: string | File | Blob): Promise<void> {
    try {
      this.showLoading(true);
      this.hideError();
      
      // PDF 파일 로드
      await this.pdfParser.loadPDF(source);
      
      // PDF 파싱
      this.pdfDoc = await this.pdfParser.parse();
      this.totalPages = this.pdfDoc.totalPages;
      
      // 페이지 정보 업데이트
      this.updatePageInfo();
      
      // 페이지 컨테이너 초기화
      await this.initializePages();
      
      // 첫 페이지 렌더링 (스프레드 뷰)
      if (this.totalPages > 0) {
        this.currentPage = 1;
        console.log('[LOAD] Starting to render, currentPage:', this.currentPage, 'totalPages:', this.totalPages);
        await this.renderCurrentSpread();
        console.log('[LOAD] Render complete');
      }
      
      this.showLoading(false);
      this.options.onLoad();
    } catch (error) {
      this.showLoading(false);
      this.showError((error as Error).message);
      this.options.onError(error as Error);
      throw error;
    }
  }

  /**
   * 모든 페이지 컨테이너를 초기화합니다. (스프레드 뷰)
   */
  private async initializePages(): Promise<void> {
    if (!this.contentContainer || !this.pdfDoc) {
      return;
    }

    // 기존 페이지 제거
    this.pageElements.clear();
    this.contentContainer.innerHTML = '';

    // 스프레드 컨테이너 생성
    const spreadContainer = document.createElement('div');
    spreadContainer.className = 'pretty-pdf-viewer__spread-container';
    this.contentContainer.appendChild(spreadContainer);

    // 각 페이지에 대한 컨테이너 생성
    for (let i = 1; i <= this.totalPages; i++) {
      const pageElement = this.createPageElement(i);
      this.pageElements.set(i, pageElement);
      spreadContainer.appendChild(pageElement.element);
    }
  }

  /**
   * 페이지 요소를 생성합니다.
   */
  private createPageElement(pageNumber: number): PageElement {
    const pageDiv = document.createElement('div');
    pageDiv.className = 'pretty-pdf-viewer__page';
    pageDiv.dataset.pageNumber = pageNumber.toString();
    
    const canvas = document.createElement('canvas');
    canvas.className = 'pretty-pdf-viewer__page-canvas';
    pageDiv.appendChild(canvas);

    const renderer = new PDFRenderer(canvas);

    return {
      element: pageDiv,
      canvas,
      renderer,
      pageNumber,
    };
  }

  async goToPage(page: number, useAnimation: boolean = true): Promise<void> {
    if (page < 1 || page > this.totalPages || page === this.currentPage) {
      return;
    }

    const direction = page > this.currentPage ? 'next' : 'prev';
    const oldPage = this.currentPage;
    
    // 현재 스프레드의 페이지 찾기
    const getCurrentSpreadPages = (pageNum: number) => {
      if (pageNum === 1) {
        return { left: null, right: this.pageElements.get(1) };
      }
      let leftNum: number, rightNum: number;
      if (pageNum % 2 === 0) {
        leftNum = pageNum;
        rightNum = pageNum + 1;
      } else {
        leftNum = pageNum - 1;
        rightNum = pageNum;
      }
      return {
        left: leftNum >= 1 && leftNum <= this.totalPages ? this.pageElements.get(leftNum) : null,
        right: rightNum >= 1 && rightNum <= this.totalPages ? this.pageElements.get(rightNum) : null,
      };
    };

    const oldSpread = getCurrentSpreadPages(oldPage);
    this.currentPage = page;
    const newSpread = getCurrentSpreadPages(page);

    if (useAnimation && this.pageFlipAnimation && !this.pageFlipAnimation.getIsAnimating()) {
      // 새 페이지들을 먼저 렌더링 (아직 보이지 않음)
      if (newSpread.left) {
        const leftPageNum = parseInt(newSpread.left.element.dataset.pageNumber || '0', 10);
        await this.renderPageToElement(leftPageNum, newSpread.left);
      }
      if (newSpread.right) {
        const rightPageNum = parseInt(newSpread.right.element.dataset.pageNumber || '0', 10);
        await this.renderPageToElement(rightPageNum, newSpread.right);
      }

      // 애니메이션 실행
      await this.pageFlipAnimation.flipSpread(
        oldSpread.left?.element || null,
        oldSpread.right?.element || null,
        newSpread.left?.element || null,
        newSpread.right?.element || null,
        direction
      );

      // 애니메이션 완료 후 이전 페이지 숨기기 및 새 페이지 표시
      if (oldSpread.left && oldSpread.left !== newSpread.left) {
        oldSpread.left.element.style.display = 'none';
        oldSpread.left.element.classList.remove('pretty-pdf-viewer__page--left');
      }
      if (oldSpread.right && oldSpread.right !== newSpread.right) {
        oldSpread.right.element.style.display = 'none';
        oldSpread.right.element.classList.remove('pretty-pdf-viewer__page--right');
      }

      // 새 페이지 표시 (애니메이션에서 이미 표시했을 수도 있지만 확실히)
      if (newSpread.left) {
        newSpread.left.element.style.display = 'block';
        newSpread.left.element.classList.add('pretty-pdf-viewer__page--left');
      }
      if (newSpread.right) {
        newSpread.right.element.style.display = 'block';
        newSpread.right.element.classList.add('pretty-pdf-viewer__page--right');
      }
    } else {
      // 애니메이션 없이 페이지 전환
      await this.renderCurrentSpread();
    }

    this.updatePageInfo();
    this.options.onPageChange(this.currentPage, this.totalPages);
  }

  async nextPage(): Promise<void> {
    if (this.currentPage >= this.totalPages) {
      return;
    }

    let nextPageNum: number;
    
    // 페이지 1 (표지)에서 다음으로
    if (this.currentPage === 1) {
      nextPageNum = 2;
    }
    // 양면 보기에서 다음 스프레드로 (2페이지씩 이동)
    else {
      if (this.currentPage % 2 === 0) {
        // 짝수 페이지(왼쪽)면 +2
        nextPageNum = this.currentPage + 2;
      } else {
        // 홀수 페이지(오른쪽)면 +1 (다음 스프레드의 왼쪽)
        nextPageNum = this.currentPage + 1;
      }
    }

    if (nextPageNum <= this.totalPages) {
      await this.goToPage(nextPageNum);
    }
  }

  async previousPage(): Promise<void> {
    if (this.currentPage <= 1) {
      return;
    }

    let prevPageNum: number;
    
    // 페이지 2-3 (첫 스프레드)에서 이전으로
    if (this.currentPage === 2 || this.currentPage === 3) {
      prevPageNum = 1;
    }
    // 양면 보기에서 이전 스프레드로 (2페이지씩 이동)
    else {
      if (this.currentPage % 2 === 0) {
        // 짝수 페이지(왼쪽)면 -2
        prevPageNum = this.currentPage - 2;
      } else {
        // 홀수 페이지(오른쪽)면 -3 (이전 스프레드의 왼쪽)
        prevPageNum = this.currentPage - 3;
      }
    }

    if (prevPageNum >= 1) {
      await this.goToPage(prevPageNum);
    }
  }

  /**
   * 3D 애니메이션으로 페이지를 넘깁니다.
   */
  private async flipPageWithAnimation(
    oldPage: number,
    newPage: number,
    direction: 'next' | 'prev'
  ): Promise<void> {
    if (!this.pageFlipAnimation || !this.contentContainer) {
      return;
    }

    const oldPageElement = this.pageElements.get(oldPage);
    const newPageElement = this.pageElements.get(newPage);

    if (!oldPageElement || !newPageElement) {
      return;
    }

    // 새 페이지 렌더링 (아직 보이지 않음)
    await this.renderPageToElement(newPage, newPageElement);

    // 페이지 표시
    oldPageElement.element.style.display = 'block';
    newPageElement.element.style.display = 'block';

    // 애니메이션 실행
    await this.pageFlipAnimation.flipPage(
      oldPageElement.element,
      newPageElement.element,
      direction
    );

    // 이전 페이지 숨김
    oldPageElement.element.style.display = 'none';
  }

  async zoomIn(): Promise<void> {
    await this.setZoom(this.zoom + 0.25);
  }

  async zoomOut(): Promise<void> {
    await this.setZoom(Math.max(0.25, this.zoom - 0.25));
  }

  async setZoom(zoom: number): Promise<void> {
    this.zoom = Math.max(0.25, Math.min(5.0, zoom));
    await this.renderCurrentSpread();
    this.updateZoomDisplay();
  }

  private updateZoomDisplay(): void {
    const zoomLevel = this.container.querySelector('#zoom-level');
    if (zoomLevel) {
      zoomLevel.textContent = `${Math.round(this.zoom * 100)}%`;
    }
  }

  /**
   * 현재 스프레드(2페이지)를 렌더링합니다.
   * 책 구조: 페이지1(표지, 오른쪽만), 페이지2-3(양면), 페이지4-5(양면)...
   */
  private async renderCurrentSpread(): Promise<void> {
    console.log('[renderCurrentSpread] Called with currentPage:', this.currentPage);
    
    // 모든 페이지 숨김 및 클래스 제거
    this.pageElements.forEach((el) => {
      el.element.style.display = 'none';
      el.element.classList.remove('pretty-pdf-viewer__page--left', 'pretty-pdf-viewer__page--right', 'pretty-pdf-viewer__page--cover');
    });

    // 페이지 1 (표지): 오른쪽에만 표시
    if (this.currentPage === 1) {
      console.log('[renderCurrentSpread] Rendering cover page');
      const coverPage = this.pageElements.get(1);
      if (coverPage) {
        coverPage.element.style.display = 'block';
        coverPage.element.classList.add('pretty-pdf-viewer__page--cover', 'pretty-pdf-viewer__page--right');
        await this.renderPageToElement(1, coverPage);
      }
    }
    // 페이지 2 이상: 양면 보기
    else {
      let leftPageNum: number;
      let rightPageNum: number;

      // 짝수 페이지인 경우 (2, 4, 6, 8...)
      if (this.currentPage % 2 === 0) {
        leftPageNum = this.currentPage;
        rightPageNum = this.currentPage + 1;
      }
      // 홀수 페이지인 경우 (3, 5, 7, 9...)
      else {
        leftPageNum = this.currentPage - 1;
        rightPageNum = this.currentPage;
      }

      console.log(`Rendering spread: left=${leftPageNum}, right=${rightPageNum}, current=${this.currentPage}`);

      // 왼쪽 페이지 렌더링
      if (leftPageNum >= 1 && leftPageNum <= this.totalPages) {
        const leftPage = this.pageElements.get(leftPageNum);
        if (leftPage) {
          leftPage.element.style.display = 'block';
          leftPage.element.classList.add('pretty-pdf-viewer__page--left');
          await this.renderPageToElement(leftPageNum, leftPage);
          console.log(`Rendered left page: ${leftPageNum}`);
        }
      }

      // 오른쪽 페이지 렌더링
      if (rightPageNum >= 1 && rightPageNum <= this.totalPages) {
        const rightPage = this.pageElements.get(rightPageNum);
        if (rightPage) {
          rightPage.element.style.display = 'block';
          rightPage.element.classList.add('pretty-pdf-viewer__page--right');
          await this.renderPageToElement(rightPageNum, rightPage);
          console.log(`Rendered right page: ${rightPageNum}`);
        }
      }
    }

    this.updatePageInfo();
    this.updateZoomDisplay();
  }

  /**
   * 특정 페이지를 특정 요소에 렌더링합니다.
   */
  private async renderPageToElement(pageNumber: number, pageElement: PageElement): Promise<void> {
    if (!this.pdfDoc) {
      return;
    }

    const page = this.pdfDoc.pages[pageNumber - 1];
    if (!page) {
      return;
    }

    await pageElement.renderer.renderPage(page, this.zoom);
  }

  private updatePageInfo(): void {
    const pageInput = this.container.querySelector('#page-input') as HTMLInputElement;
    const totalPagesEl = this.container.querySelector('#total-pages');
    const prevBtn = this.container.querySelector('#prev-page') as HTMLButtonElement;
    const nextBtn = this.container.querySelector('#next-page') as HTMLButtonElement;
    
    if (pageInput) {
      pageInput.value = this.currentPage.toString();
      pageInput.max = this.totalPages.toString();
    }
    if (totalPagesEl) {
      totalPagesEl.textContent = this.totalPages.toString();
    }
    
    // 버튼 활성/비활성 상태 업데이트
    if (prevBtn) {
      prevBtn.disabled = this.currentPage <= 1;
    }
    if (nextBtn) {
      nextBtn.disabled = this.currentPage >= this.totalPages;
    }
  }

  private showLoading(show: boolean): void {
    const loadingIndicator = this.container.querySelector('#loading-indicator') as HTMLElement;
    if (loadingIndicator) {
      loadingIndicator.style.display = show ? 'flex' : 'none';
    }
  }

  private showError(message: string): void {
    const errorMessage = this.container.querySelector('#error-message') as HTMLElement;
    const errorText = this.container.querySelector('.pretty-pdf-viewer__error-text') as HTMLElement;
    if (errorMessage && errorText) {
      errorText.textContent = message;
      errorMessage.style.display = 'flex';
    }
  }

  private hideError(): void {
    const errorMessage = this.container.querySelector('#error-message') as HTMLElement;
    if (errorMessage) {
      errorMessage.style.display = 'none';
    }
  }

  private handleKeyDown(event: KeyboardEvent): void {
    // 컨테이너가 포커스를 받지 않았거나 입력 필드에 포커스가 있으면 무시
    const target = event.target as HTMLElement;
    if (target.tagName === 'INPUT' || target.tagName === 'TEXTAREA') {
      return;
    }

    switch (event.key) {
      case 'ArrowLeft':
        event.preventDefault();
        this.previousPage();
        break;
      case 'ArrowRight':
        event.preventDefault();
        this.nextPage();
        break;
      case '+':
      case '=':
        if (!event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          this.zoomIn();
        }
        break;
      case '-':
        if (!event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          this.zoomOut();
        }
        break;
      case '0':
        if (!event.ctrlKey && !event.metaKey) {
          event.preventDefault();
          this.setZoom(1.0);
        }
        break;
      case 'f':
      case 'F':
        if (event.key === 'F' || event.key === 'f') {
          // F11은 브라우저 기본 동작이므로 f 키로 대체
          if (!event.ctrlKey && !event.metaKey && !event.altKey) {
            event.preventDefault();
            this.toggleFullscreen();
          }
        }
        break;
      case 'Escape':
        if (this.isFullscreen) {
          this.exitFullscreen();
        }
        break;
    }

    // Ctrl+P 또는 Cmd+P: 인쇄
    if ((event.ctrlKey || event.metaKey) && event.key === 'p') {
      event.preventDefault();
      this.print();
    }
  }

  private toggleFullscreen(): void {
    if (this.isFullscreen) {
      this.exitFullscreen();
    } else {
      this.enterFullscreen();
    }
  }

  private enterFullscreen(): void {
    const element = this.container;
    if (element.requestFullscreen) {
      element.requestFullscreen();
    } else if ((element as any).webkitRequestFullscreen) {
      (element as any).webkitRequestFullscreen();
    } else if ((element as any).mozRequestFullScreen) {
      (element as any).mozRequestFullScreen();
    } else if ((element as any).msRequestFullscreen) {
      (element as any).msRequestFullscreen();
    }
  }

  private exitFullscreen(): void {
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if ((document as any).webkitExitFullscreen) {
      (document as any).webkitExitFullscreen();
    } else if ((document as any).mozCancelFullScreen) {
      (document as any).mozCancelFullScreen();
    } else if ((document as any).msExitFullscreen) {
      (document as any).msExitFullscreen();
    }
  }

  private handleFullscreenChange(): void {
    const isFullscreenNow = !!(
      document.fullscreenElement ||
      (document as any).webkitFullscreenElement ||
      (document as any).mozFullScreenElement ||
      (document as any).msFullscreenElement
    );
    
    this.isFullscreen = isFullscreenNow;
    this.updateFullscreenIcon();
  }

  private updateFullscreenIcon(): void {
    const icon = this.container.querySelector('#fullscreen-icon') as SVGElement;
    if (!icon) return;

    if (this.isFullscreen) {
      // 전체화면 종료 아이콘
      icon.innerHTML = `
        <path d="M8 3v3a2 2 0 0 1-2 2H3m18 0h-3a2 2 0 0 1-2-2V3m0 18v-3a2 2 0 0 1 2-2h3M3 16h3a2 2 0 0 1 2 2v3"/>
      `;
    } else {
      // 전체화면 진입 아이콘
      icon.innerHTML = `
        <path d="M8 3H5a2 2 0 0 0-2 2v3m18 0V5a2 2 0 0 0-2-2h-3m0 18h3a2 2 0 0 0 2-2v-3M3 16v3a2 2 0 0 0 2 2h3"/>
      `;
    }
  }

  private download(): void {
    // TODO: 다운로드 기능 구현
  }

  private print(): void {
    window.print();
  }

  getCurrentPage(): number {
    return this.currentPage;
  }

  getTotalPages(): number {
    return this.totalPages;
  }

  // 마우스 이벤트 핸들러
  private handleMouseDown(event: MouseEvent): void {
    if (this.pageFlipAnimation?.getIsAnimating()) {
      return;
    }
    this.isDragging = true;
    this.dragStartX = event.clientX;
    this.dragStartY = event.clientY;
    event.preventDefault();
  }

  private handleMouseMove(event: MouseEvent): void {
    if (!this.isDragging) {
      return;
    }
    event.preventDefault();
  }

  private handleMouseUp(event: MouseEvent): void {
    if (!this.isDragging) {
      return;
    }

    const deltaX = event.clientX - this.dragStartX;
    const deltaY = Math.abs(event.clientY - this.dragStartY);

    // 수평 드래그가 수직 드래그보다 크고 임계값을 넘으면 페이지 넘김
    if (Math.abs(deltaX) > this.dragThreshold && Math.abs(deltaX) > deltaY) {
      if (deltaX > 0 && this.currentPage > 1) {
        // 오른쪽으로 드래그 -> 이전 페이지
        this.previousPage();
      } else if (deltaX < 0 && this.currentPage < this.totalPages) {
        // 왼쪽으로 드래그 -> 다음 페이지
        this.nextPage();
      }
    }

    this.isDragging = false;
  }

  // 터치 이벤트 핸들러
  private handleTouchStart(event: TouchEvent): void {
    if (this.pageFlipAnimation?.getIsAnimating()) {
      return;
    }
    const touch = event.touches[0];
    if (touch) {
      this.isDragging = true;
      this.dragStartX = touch.clientX;
      this.dragStartY = touch.clientY;
    }
  }

  private handleTouchMove(event: TouchEvent): void {
    if (!this.isDragging) {
      return;
    }
    // 스크롤 방지
    event.preventDefault();
  }

  private handleTouchEnd(event: TouchEvent): void {
    if (!this.isDragging) {
      return;
    }

    const touch = event.changedTouches[0];
    if (!touch) {
      this.isDragging = false;
      return;
    }

    const deltaX = touch.clientX - this.dragStartX;
    const deltaY = Math.abs(touch.clientY - this.dragStartY);

    // 수평 스와이프가 수직 스와이프보다 크고 임계값을 넘으면 페이지 넘김
    if (Math.abs(deltaX) > this.dragThreshold && Math.abs(deltaX) > deltaY) {
      if (deltaX > 0 && this.currentPage > 1) {
        // 오른쪽으로 스와이프 -> 이전 페이지
        this.previousPage();
      } else if (deltaX < 0 && this.currentPage < this.totalPages) {
        // 왼쪽으로 스와이프 -> 다음 페이지
        this.nextPage();
      }
    }

    this.isDragging = false;
  }

  destroy(): void {
    // 키보드 이벤트 리스너 제거
    document.removeEventListener('keydown', this.boundHandleKeyDown);
    document.removeEventListener('fullscreenchange', this.boundHandleFullscreenChange);
    document.removeEventListener('webkitfullscreenchange', this.boundHandleFullscreenChange);
    document.removeEventListener('mozfullscreenchange', this.boundHandleFullscreenChange);
    document.removeEventListener('MSFullscreenChange', this.boundHandleFullscreenChange);

    // 전체화면 모드 종료
    if (this.isFullscreen) {
      this.exitFullscreen();
    }

    // 모든 렌더러 정리
    this.pageElements.forEach((pageElement) => {
      pageElement.renderer.clear();
    });
    this.pageElements.clear();

    this.container.innerHTML = '';
    this.contentContainer = null;
    this.pdfDoc = null;
    this.pageFlipAnimation = null;
  }
}

