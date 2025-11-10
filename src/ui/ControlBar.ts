/**
 * DearFlip 스타일의 하단 컨트롤 바
 */
export class ControlBar {
  private container: HTMLElement;
  private controlBar: HTMLDivElement;
  private currentPage: number = 1;
  private totalPages: number = 0;

  // 콜백 함수들
  private onPrevPage: (() => void) | null = null;
  private onNextPage: (() => void) | null = null;
  private onZoomIn: (() => void) | null = null;
  private onZoomOut: (() => void) | null = null;
  private onFullscreen: (() => void) | null = null;

  constructor(container: HTMLElement) {
    this.container = container;
    this.controlBar = this.createControlBar();
    this.container.appendChild(this.controlBar);
  }

  /**
   * 컨트롤 바 생성
   */
  private createControlBar(): HTMLDivElement {
    const bar = document.createElement('div');
    bar.className = 'pretty-pdf-control-bar';
    bar.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(0, 0, 0, 0.75);
      backdrop-filter: blur(10px);
      border-radius: 30px;
      padding: 12px 24px;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
      z-index: 1000;
      transition: opacity 0.3s ease;
    `;

    // 이전 페이지 버튼
    const prevBtn = this.createButton('◀', '이전 페이지', () => {
      if (this.onPrevPage) this.onPrevPage();
    });

    // 페이지 정보
    const pageInfo = document.createElement('span');
    pageInfo.className = 'pretty-pdf-page-info';
    pageInfo.style.cssText = `
      color: white;
      font-size: 14px;
      font-weight: 500;
      padding: 0 16px;
      min-width: 80px;
      text-align: center;
    `;
    pageInfo.textContent = '1 / 1';

    // 다음 페이지 버튼
    const nextBtn = this.createButton('▶', '다음 페이지', () => {
      if (this.onNextPage) this.onNextPage();
    });

    // 구분선
    const separator = document.createElement('div');
    separator.style.cssText = `
      width: 1px;
      height: 24px;
      background: rgba(255, 255, 255, 0.3);
      margin: 0 8px;
    `;

    // 축소 버튼
    const zoomOutBtn = this.createButton('−', '축소', () => {
      if (this.onZoomOut) this.onZoomOut();
    });

    // 확대 버튼
    const zoomInBtn = this.createButton('+', '확대', () => {
      if (this.onZoomIn) this.onZoomIn();
    });

    // 전체화면 버튼
    const fullscreenBtn = this.createButton('⛶', '전체화면', () => {
      if (this.onFullscreen) this.onFullscreen();
    });

    bar.appendChild(prevBtn);
    bar.appendChild(pageInfo);
    bar.appendChild(nextBtn);
    bar.appendChild(separator);
    bar.appendChild(zoomOutBtn);
    bar.appendChild(zoomInBtn);
    bar.appendChild(fullscreenBtn);

    return bar;
  }

  /**
   * 버튼 생성
   */
  private createButton(icon: string, title: string, onClick: () => void): HTMLButtonElement {
    const btn = document.createElement('button');
    btn.textContent = icon;
    btn.title = title;
    btn.style.cssText = `
      background: transparent;
      border: none;
      color: white;
      font-size: 18px;
      width: 40px;
      height: 40px;
      border-radius: 50%;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
    `;

    btn.addEventListener('mouseenter', () => {
      btn.style.background = 'rgba(255, 255, 255, 0.2)';
    });

    btn.addEventListener('mouseleave', () => {
      btn.style.background = 'transparent';
    });

    btn.addEventListener('click', onClick);

    return btn;
  }

  /**
   * 페이지 정보 업데이트
   * @param current 현재 페이지 번호 또는 스프레드 정보 (예: "2-3")
   * @param total 전체 페이지 수
   */
  updatePageInfo(current: number | string, total: number): void {
    if (typeof current === 'number') {
      this.currentPage = current;
    }
    this.totalPages = total;

    const pageInfo = this.controlBar.querySelector('.pretty-pdf-page-info');
    if (pageInfo) {
      pageInfo.textContent = `${current} / ${total}`;
    }
  }

  /**
   * 콜백 등록
   */
  setPrevPageCallback(callback: () => void): void {
    this.onPrevPage = callback;
  }

  setNextPageCallback(callback: () => void): void {
    this.onNextPage = callback;
  }

  setZoomInCallback(callback: () => void): void {
    this.onZoomIn = callback;
  }

  setZoomOutCallback(callback: () => void): void {
    this.onZoomOut = callback;
  }

  setFullscreenCallback(callback: () => void): void {
    this.onFullscreen = callback;
  }

  /**
   * 컨트롤 바 표시/숨김
   */
  show(): void {
    this.controlBar.style.opacity = '1';
  }

  hide(): void {
    this.controlBar.style.opacity = '0';
  }

  /**
   * 정리
   */
  dispose(): void {
    this.controlBar.remove();
  }
}

