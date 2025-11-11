declare module 'page-flip' {
  export interface PageFlipSettings {
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

  export interface PageFlipEvent {
    data: number | string;
    object: PageFlip;
  }

  export class PageFlip {
    constructor(container: HTMLElement, settings: PageFlipSettings);
    
    on(event: 'flip' | 'changeOrientation' | 'changeState' | 'init' | 'update', callback: (e: PageFlipEvent) => void): void;
    
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
}

