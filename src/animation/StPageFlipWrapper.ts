import type { PDFDocument } from '../pdf/PDFParser';

// page-flip 모듈을 정적으로 import (Rollup이 번들링함)
// @ts-ignore - page-flip 모듈에 타입 정의가 없음
import { PageFlip as PageFlipClass } from 'page-flip';

// PageFlip 타입 정의
interface PageFlipSettings {
  width: number;
  height: number;
  size?: 'fixed' | 'stretch';
  minWidth?: number;
  maxWidth?: number;
  minHeight?: number;
  maxHeight?: number;
  drawShadow?: boolean;
  flippingTime?: number;
  usePortrait?: boolean;
  startZIndex?: number;
  startPage?: number;
  autoSize?: boolean;
  maxShadowOpacity?: number;
  showCover?: boolean;
  mobileScrollSupport?: boolean;
  swipeDistance?: number;
  clickEventForward?: boolean;
  useMouseEvents?: boolean;
  disableFlipByClick?: boolean;
}

interface PageFlipEvent {
  data: number | string;
  object: any;
}

interface PageFlip {
  on(
    event: 'flip' | 'changeOrientation' | 'changeState' | 'init' | 'update',
    callback: (e: PageFlipEvent) => void
  ): void;
  loadFromImages(images: string[]): Promise<void>;
  loadFromHtml(items: NodeListOf<HTMLElement> | HTMLElement[]): void;
  updateFromHtml(items: NodeListOf<HTMLElement> | HTMLElement[]): void;
  updateFromImages(images: string[]): Promise<void>;
  getPageCount(): number;
  getOrientation(): 'portrait' | 'landscape';
  getCurrentPageIndex(): number;
  turnToPage(pageNum: number): void;
  turnToNextPage(): void;
  turnToPrevPage(): void;
  flipNext(corner?: 'top' | 'bottom'): void;
  flipPrev(corner?: 'top' | 'bottom'): void;
  flip(pageNum: number, corner?: 'top' | 'bottom'): void;
  destroy(): void;
}

/**
 * StPageFlip을 사용한 페이지 넘김 애니메이션 래퍼 클래스
 */
export class StPageFlipWrapper {
  private pageFlip: PageFlip | null = null;
  private container: HTMLElement;
  private pageFlipContainer: HTMLElement | null = null;
  private pageImages: string[] = [];
  private currentPageIndex: number = 0;
  private totalPages: number = 0;
  private currentZoom: number = 1.0;
  private onPageChangeCallback?: (page: number, total: number) => void;
  private onZoomChangeCallback?: (zoom: number) => void;

  // 드래그 관련 변수
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private translateX: number = 0;
  private translateY: number = 0;
  private dragHandlers: {
    mousedown?: (e: MouseEvent) => void;
    mousemove?: (e: MouseEvent) => void;
    mouseup?: (e: MouseEvent) => void;
    touchstart?: (e: TouchEvent) => void;
    touchmove?: (e: TouchEvent) => void;
    touchend?: (e: TouchEvent) => void;
  } = {};

  constructor(container: HTMLElement) {
    this.container = container;
  }

  /**
   * StPageFlip 초기화
   */
  async initialize(
    pdfDoc: PDFDocument,
    pageCanvases: HTMLCanvasElement[],
    options: {
      width?: number;
      height?: number;
      startPage?: number;
      initialZoom?: number;
      onPageChange?: (page: number, total: number) => void;
    } = {}
  ): Promise<void> {
    this.totalPages = pdfDoc.totalPages;
    this.onPageChangeCallback = options.onPageChange;
    this.currentPageIndex = (options.startPage ?? 1) - 1; // StPageFlip은 0부터 시작
    this.currentZoom = options.initialZoom ?? 1.0;

    // ControlBar를 임시로 저장 (컨테이너 초기화 전)
    const controlBar = this.container.querySelector('.pdf-control-bar') as HTMLElement | null;
    const controlBarParent = controlBar?.parentElement;

    // 컨테이너 초기화 (StPageFlip이 내부에 DOM을 생성함)
    // StPageFlip이 사용할 서브 컨테이너 생성
    const pageFlipContainer = document.createElement('div');
    pageFlipContainer.className = 'st-page-flip-container';
    pageFlipContainer.style.cssText = `
      position: absolute;
      top: 0;
      left: 0;
      width: 100%;
      height: 100%;
      z-index: 1;
      overflow: visible;
      transform-origin: center center;
      transition: transform 0.3s ease;
    `;
    this.pageFlipContainer = pageFlipContainer;
    this.container.innerHTML = '';
    this.container.appendChild(pageFlipContainer);

    // ControlBar 다시 추가 (z-index가 높아서 위에 표시됨)
    if (controlBar && controlBarParent) {
      this.container.appendChild(controlBar);
    }

    // Canvas를 이미지 URL로 변환
    this.pageImages = pageCanvases.map((canvas) => canvas.toDataURL('image/png'));

    // 첫 페이지의 크기를 기준으로 설정
    const firstCanvas = pageCanvases[0];
    const pageWidth = options.width ?? firstCanvas.width;
    const pageHeight = options.height ?? firstCanvas.height;

    // 컨테이너 크기에 맞춰 페이지 크기 조정 (가로형 PDF 지원)
    const containerWidth = this.container.clientWidth || window.innerWidth;
    const containerHeight = this.container.clientHeight || window.innerHeight;

    // 양면 보기를 위한 최적 크기 계산
    const maxPageWidth = Math.floor(containerWidth * 0.9); // 컨테이너의 90%
    const maxPageHeight = Math.floor(containerHeight * 0.85); // 컨테이너의 85%

    // 페이지 비율 유지하면서 크기 조정
    const pageAspectRatio = pageWidth / pageHeight;
    let adjustedWidth = pageWidth;
    let adjustedHeight = pageHeight;

    if (pageWidth > maxPageWidth || pageHeight > maxPageHeight) {
      const widthScale = maxPageWidth / pageWidth;
      const heightScale = maxPageHeight / pageHeight;
      const scale = Math.min(widthScale, heightScale);
      adjustedWidth = Math.floor(pageWidth * scale);
      adjustedHeight = Math.floor(pageHeight * scale);
    }

    // 단일 페이지인지 확인
    const isSinglePage = this.totalPages === 1;

    if (isSinglePage) {
      // 단일 페이지는 StPageFlip 없이 직접 표시
      const img = document.createElement('img');
      img.src = this.pageImages[0];
      img.style.cssText = `
        max-width: 90%;
        max-height: 90%;
        object-fit: contain;
        display: block;
        margin: auto;
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
      `;

      pageFlipContainer.style.cssText = `
        position: absolute;
        top: 0;
        left: 0;
        width: 100%;
        height: 100%;
        z-index: 1;
        display: flex;
        align-items: center;
        justify-content: center;
        overflow: auto;
        transform-origin: center center;
        transition: transform 0.3s ease;
      `;

      this.pageFlipContainer = pageFlipContainer;
      pageFlipContainer.appendChild(img);

      // 페이지 변경 콜백 호출
      this.onPageChangeCallback?.(1, 1);
    } else {
      // 다중 페이지는 StPageFlip 사용
      // StPageFlip 인스턴스 생성 (양면 보기 모드)
      this.pageFlip = new PageFlipClass(pageFlipContainer, {
        width: adjustedWidth,
        height: adjustedHeight,
        size: 'stretch',
        minWidth: Math.floor(adjustedWidth * 0.3), // 최소 크기 더 작게
        maxWidth: Math.floor(adjustedWidth * 2), // 최대 크기 더 크게 (가로형 PDF 지원)
        minHeight: Math.floor(adjustedHeight * 0.3),
        maxHeight: Math.floor(adjustedHeight * 2),
        maxShadowOpacity: 0.5,
        showCover: false, // 표지 단독 표시 비활성화 (양면 보기)
        startPage: this.currentPageIndex,
        usePortrait: false, // 세로 모드 비활성화 (양면 보기 모드)
        autoSize: true,
        disableFlipByClick: false, // 초기에는 페이지 넘김 활성화
      });

      // 이벤트 리스너 등록
      this.pageFlip.on('flip', (e: PageFlipEvent) => {
        const pageNum = (e.data as number) + 1; // 0-based to 1-based
        this.currentPageIndex = e.data as number;
        this.onPageChangeCallback?.(pageNum, this.totalPages);
      });

      // 이미지로 페이지 로드
      await this.pageFlip.loadFromImages(this.pageImages);

      // StPageFlip이 생성한 실제 DOM 요소 찾기 (stf__parent 클래스)
      const stPageFlipParent = pageFlipContainer.querySelector('.stf__parent') as HTMLElement;
      if (stPageFlipParent) {
        // StPageFlip의 실제 컨테이너에 줌 적용
        this.pageFlipContainer = stPageFlipParent;
        stPageFlipParent.style.transformOrigin = 'center center';
        stPageFlipParent.style.transition = 'transform 0.3s ease';
      }

      // stf__wrapper의 padding-bottom 제거 (불필요한 여백 제거)
      const stfWrapper = pageFlipContainer.querySelector('.stf__wrapper') as HTMLElement;
      if (stfWrapper) {
        stfWrapper.style.paddingBottom = '0';
      }

      // PDF 페이지 요소에 그림자 효과 추가
      setTimeout(() => {
        const pageItems = pageFlipContainer.querySelectorAll('.stf__item');
        pageItems.forEach((item) => {
          const element = item as HTMLElement;
          if (!element.style.boxShadow) {
            element.style.boxShadow = '0 4px 12px rgba(0, 0, 0, 0.15)';
          }
        });
      }, 200);
    }

    // 드래그 핸들러 설정
    this.setupDragHandlers();

    // 초기 줌 적용
    if (this.currentZoom !== 1.0 && this.pageFlipContainer) {
      this.pageFlipContainer.style.transform = `scale(${this.currentZoom}) translate(${this.translateX}px, ${this.translateY}px)`;
      // 다중 페이지인 경우에만 페이지 넘김 상호작용 업데이트
      if (!isSinglePage) {
        this.updatePageFlipInteraction();
      }
    }

    // 시작 페이지로 이동 (다중 페이지이고 0이 아니면)
    if (!isSinglePage && this.currentPageIndex > 0) {
      // 약간의 지연 후 페이지 이동 (초기화 완료 대기)
      setTimeout(() => {
        if (this.pageFlip) {
          this.pageFlip.flip(this.currentPageIndex, 'bottom');
        }
      }, 100);
    }
  }

  /**
   * 다음 페이지로 넘기기
   */
  flipNext(): void {
    // 단일 페이지는 페이지 넘김 불가
    if (this.totalPages === 1) return;

    if (this.pageFlip && this.currentPageIndex < this.totalPages - 1) {
      this.pageFlip.flipNext('bottom');
    }
  }

  /**
   * 이전 페이지로 넘기기
   */
  flipPrev(): void {
    // 단일 페이지는 페이지 넘김 불가
    if (this.totalPages === 1) return;

    if (this.pageFlip && this.currentPageIndex > 0) {
      this.pageFlip.flipPrev('bottom');
    }
  }

  /**
   * 특정 페이지로 이동
   */
  flipToPage(pageNum: number): void {
    // 단일 페이지는 페이지 넘김 불가
    if (this.totalPages === 1) return;

    if (this.pageFlip && pageNum >= 1 && pageNum <= this.totalPages) {
      const index = pageNum - 1; // 1-based to 0-based
      this.pageFlip.flip(index, 'bottom');
    }
  }

  /**
   * 현재 페이지 번호 가져오기 (1-based)
   */
  getCurrentPage(): number {
    return this.currentPageIndex + 1;
  }

  /**
   * 전체 페이지 수 가져오기
   */
  getTotalPages(): number {
    return this.totalPages;
  }

  /**
   * 드래그 핸들러 설정
   */
  private setupDragHandlers(): void {
    // 마우스 이벤트
    this.dragHandlers.mousedown = (e: MouseEvent) => {
      if (this.currentZoom > 1.0) {
        this.isDragging = true;
        this.dragStartX = e.clientX - this.translateX;
        this.dragStartY = e.clientY - this.translateY;
        if (this.pageFlipContainer) {
          this.pageFlipContainer.style.cursor = 'grabbing';
        }
        // StPageFlip의 페이지 넘김 이벤트 막기
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };

    this.dragHandlers.mousemove = (e: MouseEvent) => {
      if (this.isDragging && this.currentZoom > 1.0) {
        this.translateX = e.clientX - this.dragStartX;
        this.translateY = e.clientY - this.dragStartY;

        // 드래그 범위 제한 (줌된 크기만큼만 이동 가능)
        const maxTranslateX =
          ((this.pageFlipContainer?.clientWidth || 0) * (this.currentZoom - 1)) / 2;
        const maxTranslateY =
          ((this.pageFlipContainer?.clientHeight || 0) * (this.currentZoom - 1)) / 2;

        this.translateX = Math.max(-maxTranslateX, Math.min(maxTranslateX, this.translateX));
        this.translateY = Math.max(-maxTranslateY, Math.min(maxTranslateY, this.translateY));

        if (this.pageFlipContainer) {
          this.pageFlipContainer.style.transform = `scale(${this.currentZoom}) translate(${this.translateX}px, ${this.translateY}px)`;
        }
        // StPageFlip의 페이지 넘김 이벤트 막기
        e.preventDefault();
        e.stopPropagation();
        e.stopImmediatePropagation();
      }
    };

    this.dragHandlers.mouseup = () => {
      if (this.isDragging) {
        this.isDragging = false;
        if (this.pageFlipContainer) {
          this.pageFlipContainer.style.cursor = this.currentZoom > 1.0 ? 'grab' : 'default';
        }
      }
    };

    // 터치 이벤트
    this.dragHandlers.touchstart = (e: TouchEvent) => {
      if (this.currentZoom > 1.0 && e.touches.length === 1) {
        const touch = e.touches[0];
        this.isDragging = true;
        this.dragStartX = touch.clientX - this.translateX;
        this.dragStartY = touch.clientY - this.translateY;
        e.preventDefault();
        e.stopPropagation();
      }
    };

    this.dragHandlers.touchmove = (e: TouchEvent) => {
      if (this.isDragging && this.currentZoom > 1.0 && e.touches.length === 1) {
        const touch = e.touches[0];
        this.translateX = touch.clientX - this.dragStartX;
        this.translateY = touch.clientY - this.dragStartY;

        const maxTranslateX =
          ((this.pageFlipContainer?.clientWidth || 0) * (this.currentZoom - 1)) / 2;
        const maxTranslateY =
          ((this.pageFlipContainer?.clientHeight || 0) * (this.currentZoom - 1)) / 2;

        this.translateX = Math.max(-maxTranslateX, Math.min(maxTranslateX, this.translateX));
        this.translateY = Math.max(-maxTranslateY, Math.min(maxTranslateY, this.translateY));

        if (this.pageFlipContainer) {
          this.pageFlipContainer.style.transform = `scale(${this.currentZoom}) translate(${this.translateX}px, ${this.translateY}px)`;
        }
        e.preventDefault();
        e.stopPropagation();
      }
    };

    this.dragHandlers.touchend = () => {
      this.isDragging = false;
    };

    // 이벤트 리스너 등록
    if (this.pageFlipContainer) {
      this.pageFlipContainer.addEventListener('mousedown', this.dragHandlers.mousedown!);
      document.addEventListener('mousemove', this.dragHandlers.mousemove!);
      document.addEventListener('mouseup', this.dragHandlers.mouseup!);
      this.pageFlipContainer.addEventListener('touchstart', this.dragHandlers.touchstart!);
      this.pageFlipContainer.addEventListener('touchmove', this.dragHandlers.touchmove!);
      this.pageFlipContainer.addEventListener('touchend', this.dragHandlers.touchend!);
    }
  }

  /**
   * 페이지 넘김 상호작용 업데이트 (줌 상태에 따라)
   */
  private updatePageFlipInteraction(): void {
    // 줌이 1.0보다 크면 페이지 넘김 비활성화, 아니면 활성화
    if (this.pageFlipContainer) {
      if (this.currentZoom > 1.0) {
        // 줌이 적용된 상태에서는 드래그로 이동 가능하도록 설정
        this.pageFlipContainer.style.cursor = 'grab';
        // StPageFlip의 페이지 넘김을 막기 위해 이벤트 캡처 단계에서 처리
        this.pageFlipContainer.style.userSelect = 'none';
      } else {
        // 줌이 1.0일 때는 페이지 넘김 활성화
        this.pageFlipContainer.style.cursor = 'default';
        this.pageFlipContainer.style.userSelect = 'auto';
        // 드래그 위치 초기화
        this.translateX = 0;
        this.translateY = 0;
      }
    }

    // StPageFlip의 페이지 넘김을 막기 위해 컨테이너에 이벤트 리스너 추가
    if (this.currentZoom > 1.0) {
      // 줌이 적용된 상태에서는 페이지 넘김을 막기 위해 이벤트 캡처
      const preventFlip = (e: Event) => {
        if (this.isDragging) {
          e.preventDefault();
          e.stopPropagation();
          e.stopImmediatePropagation();
        }
      };

      // StPageFlip이 생성한 모든 페이지 요소에 이벤트 리스너 추가
      if (this.pageFlipContainer) {
        const pages = this.pageFlipContainer.querySelectorAll('.stf__item');
        pages.forEach((page) => {
          page.addEventListener('mousedown', preventFlip, true);
          page.addEventListener('touchstart', preventFlip, true);
        });
      }
    }
  }

  /**
   * 줌 레벨 설정
   */
  setZoom(level: number): void {
    this.currentZoom = Math.max(0.5, Math.min(3.0, level));

    // pageFlipContainer가 없으면 다시 찾기
    if (!this.pageFlipContainer) {
      // 단일 페이지인 경우
      if (this.totalPages === 1) {
        this.pageFlipContainer = this.container.querySelector(
          '.st-page-flip-container'
        ) as HTMLElement;
      } else {
        // 다중 페이지인 경우 StPageFlip 요소 찾기
        const stPageFlipParent = this.container.querySelector('.stf__parent') as HTMLElement;
        if (stPageFlipParent) {
          this.pageFlipContainer = stPageFlipParent;
          stPageFlipParent.style.transformOrigin = 'center center';
          stPageFlipParent.style.transition = 'transform 0.3s ease';
        }
      }
    }

    if (this.pageFlipContainer) {
      // 줌이 1.0으로 돌아가면 드래그 위치 초기화
      if (this.currentZoom === 1.0) {
        this.translateX = 0;
        this.translateY = 0;
      }

      this.pageFlipContainer.style.transform = `scale(${this.currentZoom}) translate(${this.translateX}px, ${this.translateY}px)`;

      // 다중 페이지인 경우에만 페이지 넘김 상호작용 업데이트
      if (this.totalPages > 1) {
        this.updatePageFlipInteraction();
      }

      this.onZoomChangeCallback?.(this.currentZoom);
    } else {
      console.error('pageFlipContainer not found for zoom');
    }
  }

  /**
   * 줌 인
   */
  zoomIn(): void {
    console.log(
      'zoomIn called, currentZoom:',
      this.currentZoom,
      'container:',
      this.pageFlipContainer
    );
    const newZoom = Math.min(this.currentZoom + 0.2, 3.0);
    this.setZoom(newZoom);
  }

  /**
   * 줌 아웃
   */
  zoomOut(): void {
    console.log(
      'zoomOut called, currentZoom:',
      this.currentZoom,
      'container:',
      this.pageFlipContainer
    );
    const newZoom = Math.max(this.currentZoom - 0.2, 0.5);
    this.setZoom(newZoom);
  }

  /**
   * 현재 줌 레벨 가져오기
   */
  getZoom(): number {
    return this.currentZoom;
  }

  /**
   * 줌 변경 콜백 설정
   */
  setOnZoomChange(callback: (zoom: number) => void): void {
    this.onZoomChangeCallback = callback;
  }

  /**
   * 리사이즈 처리
   */
  resize(): void {
    // StPageFlip은 자동으로 리사이즈를 처리합니다
    // 하지만 줌이 적용된 경우 transform을 유지해야 합니다
    if (this.pageFlipContainer && this.currentZoom !== 1.0) {
      this.pageFlipContainer.style.transform = `scale(${this.currentZoom})`;
    }
  }

  /**
   * 리소스 정리
   */
  dispose(): void {
    // 드래그 이벤트 리스너 제거
    if (this.pageFlipContainer) {
      if (this.dragHandlers.mousedown) {
        this.pageFlipContainer.removeEventListener('mousedown', this.dragHandlers.mousedown);
      }
      if (this.dragHandlers.mousemove) {
        document.removeEventListener('mousemove', this.dragHandlers.mousemove);
      }
      if (this.dragHandlers.mouseup) {
        document.removeEventListener('mouseup', this.dragHandlers.mouseup);
      }
      if (this.dragHandlers.touchstart) {
        this.pageFlipContainer.removeEventListener('touchstart', this.dragHandlers.touchstart);
      }
      if (this.dragHandlers.touchmove) {
        this.pageFlipContainer.removeEventListener('touchmove', this.dragHandlers.touchmove);
      }
      if (this.dragHandlers.touchend) {
        this.pageFlipContainer.removeEventListener('touchend', this.dragHandlers.touchend);
      }
    }

    if (this.pageFlip) {
      this.pageFlip.destroy();
      this.pageFlip = null;
    }
    this.pageImages = [];
  }
}
