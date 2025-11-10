/**
 * 책 레이아웃을 관리하는 클래스
 */
export class BookLayout {
  private container: HTMLElement;
  private bookContainer: HTMLDivElement;
  private leftPageContainer: HTMLDivElement;
  private rightPageContainer: HTMLDivElement;
  private currentSpread: { left: number | null; right: number | null } = { left: null, right: null };
  private currentScale: number = 1.0;
  private isDragging: boolean = false;
  private dragStartX: number = 0;
  private dragStartY: number = 0;
  private translateX: number = 0;
  private translateY: number = 0;

  constructor(container: HTMLElement) {
    this.container = container;

    // 메인 컨테이너 스타일
    this.container.style.cssText = `
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background: #f0f0f0;
      display: flex;
      align-items: center;
      justify-content: center;
    `;

    // 책 컨테이너 생성
    this.bookContainer = document.createElement('div');
    this.bookContainer.className = 'pretty-pdf-book-container';
    this.bookContainer.style.cssText = `
      position: relative;
      display: flex;
      align-items: center;
      justify-content: center;
      perspective: 2000px;
      transform-style: preserve-3d;
    `;

    // 왼쪽 페이지 컨테이너
    this.leftPageContainer = document.createElement('div');
    this.leftPageContainer.className = 'pretty-pdf-left-page';
    this.leftPageContainer.style.cssText = `
      position: relative;
      transform-style: preserve-3d;
      transform-origin: right center;
    `;

    // 오른쪽 페이지 컨테이너
    this.rightPageContainer = document.createElement('div');
    this.rightPageContainer.className = 'pretty-pdf-right-page';
    this.rightPageContainer.style.cssText = `
      position: relative;
      transform-style: preserve-3d;
      transform-origin: left center;
    `;

    this.bookContainer.appendChild(this.leftPageContainer);
    this.bookContainer.appendChild(this.rightPageContainer);
    this.container.appendChild(this.bookContainer);

    // 드래그 이벤트 리스너 추가
    this.setupDragListeners();
  }

  /**
   * 드래그 기능 설정
   */
  private setupDragListeners(): void {
    this.container.addEventListener('mousedown', this.handleMouseDown.bind(this));
    this.container.addEventListener('mousemove', this.handleMouseMove.bind(this));
    this.container.addEventListener('mouseup', this.handleMouseUp.bind(this));
    this.container.addEventListener('mouseleave', this.handleMouseUp.bind(this));
  }

  private handleMouseDown(e: MouseEvent): void {
    // 줌이 1.0보다 클 때만 드래그 가능
    if (this.currentScale > 1.0) {
      this.isDragging = true;
      this.dragStartX = e.clientX - this.translateX;
      this.dragStartY = e.clientY - this.translateY;
      this.container.style.cursor = 'grabbing';
      e.preventDefault();
    }
  }

  private handleMouseMove(e: MouseEvent): void {
    if (this.isDragging) {
      this.translateX = e.clientX - this.dragStartX;
      this.translateY = e.clientY - this.dragStartY;
      this.updateTransform();
      e.preventDefault();
    }
  }

  private handleMouseUp(): void {
    if (this.isDragging) {
      this.isDragging = false;
      this.container.style.cursor = this.currentScale > 1.0 ? 'grab' : 'default';
    }
  }

  /**
   * Transform 업데이트 (scale + translate)
   */
  private updateTransform(): void {
    this.bookContainer.style.transform = 
      `translate(${this.translateX}px, ${this.translateY}px) scale(${this.currentScale})`;
  }

  /**
   * 왼쪽 페이지 설정
   */
  setLeftPage(canvas: HTMLCanvasElement | null): void {
    // 모든 컨테이너 정리
    this.clearAll();
    
    if (canvas) {
      canvas.style.cssText = `
        display: block;
        max-width: 100%;
        max-height: 80vh;
        box-shadow: -2px 0 10px rgba(0,0,0,0.2);
      `;
      this.leftPageContainer.appendChild(canvas);
    }
  }

  /**
   * 오른쪽 페이지 설정
   */
  setRightPage(canvas: HTMLCanvasElement | null): void {
    this.rightPageContainer.innerHTML = '';
    if (canvas) {
      canvas.style.cssText = `
        display: block;
        max-width: 100%;
        max-height: 80vh;
        box-shadow: 2px 0 10px rgba(0,0,0,0.2);
      `;
      this.rightPageContainer.appendChild(canvas);
    }
  }

  /**
   * 단일 페이지 표시 (표지)
   */
  setSinglePage(canvas: HTMLCanvasElement): void {
    // 모든 컨테이너 정리
    this.clearAll();
    
    canvas.style.cssText = `
      display: block;
      max-width: 100%;
      max-height: 80vh;
      box-shadow: 0 0 20px rgba(0,0,0,0.3);
    `;
    
    this.leftPageContainer.appendChild(canvas);
  }

  /**
   * 모든 페이지 정리
   */
  private clearAll(): void {
    this.leftPageContainer.innerHTML = '';
    this.rightPageContainer.innerHTML = '';
  }

  /**
   * 현재 스프레드 정보 업데이트
   */
  updateCurrentSpread(left: number | null, right: number | null): void {
    this.currentSpread = { left, right };
  }

  getSpreadForPage(page: number, totalPages: number): { left: number | null, right: number | null } {
    if (page === 1) {
      return { left: 1, right: 2 };
    } else if (page === totalPages && totalPages % 2 === 1) {
      return { left: totalPages, right: null };
    } else {
      if (page % 2 === 0) {
        return { left: page, right: page + 1 };
      } else {
        return { left: page - 1, right: page };
      }
    }
  }

  /**
   * 줌 레벨 설정
   */
  setScale(scale: number): void {
    this.currentScale = scale;
    
    // 줌이 1.0 이하면 위치 리셋
    if (scale <= 1.0) {
      this.translateX = 0;
      this.translateY = 0;
      this.container.style.cursor = 'default';
    } else {
      this.container.style.cursor = 'grab';
    }
    
    this.bookContainer.style.transition = 'transform 0.3s ease';
    this.updateTransform();
    
    // 트랜지션 후 원복
    setTimeout(() => {
      this.bookContainer.style.transition = '';
    }, 300);
  }

  /**
   * 현재 스프레드 정보 가져오기
   */
  getCurrentSpread(): { left: number | null; right: number | null } {
    return this.currentSpread;
  }

  /**
   * 레이아웃 정리
   */
  dispose(): void {
    this.container.innerHTML = '';
  }

  /**
   * 컨테이너 가져오기
   */
  getBookContainer(): HTMLDivElement {
    return this.bookContainer;
  }

  getLeftPageContainer(): HTMLDivElement {
    return this.leftPageContainer;
  }

  getRightPageContainer(): HTMLDivElement {
    return this.rightPageContainer;
  }

  hidePages(): void {
    this.leftPageContainer.style.visibility = 'hidden';
    this.rightPageContainer.style.visibility = 'hidden';
  }

  showPages(): void {
    this.leftPageContainer.style.visibility = 'visible';
    this.rightPageContainer.style.visibility = 'visible';
  }

  createEmptyCanvas(): HTMLCanvasElement {
    const canvas = document.createElement('canvas');
    const pageContainer = this.leftPageContainer.firstChild || this.rightPageContainer.firstChild;
    if (pageContainer && pageContainer instanceof HTMLCanvasElement) {
        canvas.width = pageContainer.width;
        canvas.height = pageContainer.height;
    } else {
        canvas.width = this.container.clientWidth / 2;
        canvas.height = this.container.clientHeight;
    }
    const ctx = canvas.getContext('2d');
    if (ctx) {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvas.width, canvas.height);
    }
    return canvas;
  }
}

