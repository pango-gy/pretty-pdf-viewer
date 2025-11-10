/**
 * DearFlip 스타일의 하단 컨트롤 바
 */
export class ControlBar {
  private container: HTMLElement;
  private controlBar: HTMLDivElement;
  private pageInfo: HTMLSpanElement;
  private currentPageInput: HTMLInputElement;
  
  // 콜백 함수들
  private prevPageCallback?: () => void;
  private nextPageCallback?: () => void;
  private zoomInCallback?: () => void;
  private zoomOutCallback?: () => void;
  private fullscreenCallback?: () => void;
  private printCallback?: () => void;
  private downloadCallback?: () => void;
  private shareCallback?: () => void;

  constructor(container: HTMLElement) {
    this.container = container;
    this.controlBar = document.createElement('div');
    this.controlBar.className = 'pdf-control-bar';
    
    this.pageInfo = document.createElement('span');
    this.currentPageInput = document.createElement('input');
    
    this.setupControlBar();
  }

  private setupControlBar(): void {
    // 스타일 설정
    this.controlBar.style.cssText = `
      position: absolute;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%);
      background: rgba(245, 245, 247, 0.95);
      backdrop-filter: blur(20px);
      -webkit-backdrop-filter: blur(20px);
      border-radius: 12px;
      padding: 8px 12px;
      display: flex;
      align-items: center;
      gap: 8px;
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.1), 0 0 0 0.5px rgba(0, 0, 0, 0.05);
      z-index: 1000;
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
      font-size: 14px;
      transition: all 0.3s ease;
      user-select: none;
    `;

    // 왼쪽 그룹 (페이지 네비게이션)
    const leftGroup = document.createElement('div');
    leftGroup.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
      padding-right: 8px;
      border-right: 1px solid rgba(0, 0, 0, 0.1);
    `;

    // 이전 페이지 버튼
    const prevBtn = this.createButton(
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="15 18 9 12 15 6"></polyline></svg>',
      () => this.prevPageCallback?.(),
      '이전 페이지'
    );
    
    // 페이지 정보
    const pageContainer = document.createElement('div');
    pageContainer.style.cssText = `
      display: flex;
      align-items: center;
      gap: 4px;
      padding: 0 12px;
      color: #333;
      min-width: 100px;
      justify-content: center;
      font-size: 14px;
      font-weight: 500;
    `;
    
    // 현재 페이지를 span으로 변경
    const currentPageSpan = document.createElement('span');
    currentPageSpan.style.cssText = `
      color: #333;
      min-width: 40px;
      text-align: right;
    `;
    currentPageSpan.textContent = '1';
    currentPageSpan.id = 'current-page-display';
    
    const separator = document.createElement('span');
    separator.textContent = '/';
    separator.style.cssText = 'color: #999; padding: 0 4px;';
    
    this.pageInfo.style.cssText = `
      color: #666;
      min-width: 30px;
      text-align: left;
    `;
    this.pageInfo.textContent = '1';
    
    pageContainer.appendChild(currentPageSpan);
    pageContainer.appendChild(separator);
    pageContainer.appendChild(this.pageInfo);
    
    // 입력 필드는 숨기거나 제거
    this.currentPageInput.style.display = 'none';
    
    // 다음 페이지 버튼
    const nextBtn = this.createButton(
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="9 18 15 12 9 6"></polyline></svg>',
      () => this.nextPageCallback?.(),
      '다음 페이지'
    );

    leftGroup.appendChild(prevBtn);
    leftGroup.appendChild(pageContainer);
    leftGroup.appendChild(nextBtn);

    // 중앙 그룹 (줌)
    const centerGroup = document.createElement('div');
    centerGroup.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
      padding: 0 8px;
      border-right: 1px solid rgba(0, 0, 0, 0.1);
    `;

    const zoomOutBtn = this.createButton(
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
      () => this.zoomOutCallback?.(),
      '축소'
    );
    
    const zoomLevel = document.createElement('span');
    zoomLevel.style.cssText = `
      font-size: 13px;
      color: #666;
      min-width: 45px;
      text-align: center;
    `;
    zoomLevel.textContent = '100%';
    zoomLevel.id = 'zoom-level';
    
    const zoomInBtn = this.createButton(
      '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="5" x2="12" y2="19"></line><line x1="5" y1="12" x2="19" y2="12"></line></svg>',
      () => this.zoomInCallback?.(),
      '확대'
    );

    centerGroup.appendChild(zoomOutBtn);
    centerGroup.appendChild(zoomLevel);
    centerGroup.appendChild(zoomInBtn);

    // 오른쪽 그룹 (도구들)
    const rightGroup = document.createElement('div');
    rightGroup.style.cssText = `
      display: flex;
      align-items: center;
      gap: 6px;
      padding-left: 8px;
    `;

    // 공유 버튼
    const shareBtn = this.createButton(
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"/><circle cx="6" cy="12" r="3"/><circle cx="18" cy="19" r="3"/><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"/><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"/></svg>',
      () => this.shareCallback?.(),
      '공유'
    );

    // 프린트 버튼
    const printBtn = this.createButton(
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect x="6" y="14" width="12" height="8"/></svg>',
      () => this.printCallback?.(),
      '인쇄'
    );

    // 다운로드 버튼
    const downloadBtn = this.createButton(
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>',
      () => this.downloadCallback?.(),
      '다운로드'
    );

    // 전체화면 버튼
    const fullscreenBtn = this.createButton(
      '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="15 3 21 3 21 9"/><polyline points="9 21 3 21 3 15"/><line x1="21" y1="3" x2="14" y2="10"/><line x1="3" y1="21" x2="10" y2="14"/></svg>',
      () => this.fullscreenCallback?.(),
      '전체화면'
    );

    rightGroup.appendChild(shareBtn);
    rightGroup.appendChild(printBtn);
    rightGroup.appendChild(downloadBtn);
    rightGroup.appendChild(fullscreenBtn);

    // 컨트롤 바에 그룹들 추가
    this.controlBar.appendChild(leftGroup);
    this.controlBar.appendChild(centerGroup);
    this.controlBar.appendChild(rightGroup);
    
    // 컨테이너에 추가
    this.container.appendChild(this.controlBar);


  }

  private createButton(content: string, onClick: () => void, title: string): HTMLButtonElement {
    const button = document.createElement('button');
    button.innerHTML = content;
    button.title = title;
    button.onclick = onClick;
    button.style.cssText = `
      background: transparent;
      border: none;
      color: #333;
      cursor: pointer;
      padding: 0;
      border-radius: 6px;
      display: flex;
      align-items: center;
      justify-content: center;
      transition: all 0.2s ease;
      outline: none;
      font-size: 16px;
      font-weight: 500;
      min-width: 32px;
      height: 32px;
      line-height: 32px;
      vertical-align: middle;
    `;

    // 호버 효과
    button.addEventListener('mouseenter', () => {
      button.style.background = 'rgba(0, 0, 0, 0.06)';
    });

    button.addEventListener('mouseleave', () => {
      button.style.background = 'transparent';
    });

    // 클릭 효과
    button.addEventListener('mousedown', () => {
      button.style.transform = 'scale(0.95)';
    });

    button.addEventListener('mouseup', () => {
      button.style.transform = 'scale(1)';
    });

    return button;
  }

  // 페이지 정보 업데이트
  updatePageInfo(current: number | string, total: number): void {
    const currentPageDisplay = document.getElementById('current-page-display');
    if (currentPageDisplay) {
      // current가 문자열이면 (예: "2-3") 그대로 사용
      if (typeof current === 'string') {
        currentPageDisplay.textContent = current;
      } else {
        currentPageDisplay.textContent = current.toString();
      }
    }
    this.pageInfo.textContent = total.toString();
  }

  // 줌 레벨 업데이트
  updateZoomLevel(level: number): void {
    const zoomElement = this.controlBar.querySelector('#zoom-level');
    if (zoomElement) {
      zoomElement.textContent = `${Math.round(level * 100)}%`;
    }
  }

  // 콜백 설정 메서드들
  setPrevPageCallback(callback: () => void): void {
    this.prevPageCallback = callback;
  }

  setNextPageCallback(callback: () => void): void {
    this.nextPageCallback = callback;
  }

  setZoomInCallback(callback: () => void): void {
    this.zoomInCallback = callback;
  }

  setZoomOutCallback(callback: () => void): void {
    this.zoomOutCallback = callback;
  }

  setFullscreenCallback(callback: () => void): void {
    this.fullscreenCallback = callback;
  }

  setPrintCallback(callback: () => void): void {
    this.printCallback = callback;
  }

  setDownloadCallback(callback: () => void): void {
    this.downloadCallback = callback;
  }

  setShareCallback(callback: () => void): void {
    this.shareCallback = callback;
  }

  setPageChangeCallback(callback: (page: number) => void): void {
    // 페이지 직접 입력 기능 제거됨
  }

  // 컨트롤 바 표시/숨기기
  show(): void {
    this.controlBar.style.opacity = '1';
    this.controlBar.style.pointerEvents = 'auto';
  }

  hide(): void {
    this.controlBar.style.opacity = '0';
    this.controlBar.style.pointerEvents = 'none';
  }

  // 리소스 정리
  dispose(): void {
    this.controlBar.remove();
  }
}

