import React, { useEffect, useRef } from 'react';
import { PDFParser, type PDFDocument } from '../pdf/PDFParser';
import { PageRenderer } from '../renderer/PageRenderer';
import { StPageFlipWrapper } from '../animation/StPageFlipWrapper';
import { ControlBar } from '../ui/ControlBar';
import type { PDFViewerOptions } from '../types';

// CSS를 런타임에 자동으로 주입
const injectStyles = (): void => {
  if (document.getElementById('pretty-pdf-viewer-styles')) return;

  const style = document.createElement('style');
  style.id = 'pretty-pdf-viewer-styles';
  style.textContent = `
    .pretty-pdf-viewer {
      position: relative;
      width: 100%;
      height: 100%;
      overflow: hidden;
      background-color: #f0f0f0;
    }
    .pretty-pdf-viewer canvas {
      display: block;
      width: 100%;
      height: 100%;
    }
    /* StPageFlip이 생성하는 wrapper의 padding-bottom 제거 */
    .pretty-pdf-viewer .stf__wrapper {
      padding-bottom: 0 !important;
    }
    /* PDF 페이지에 그림자 효과 추가 */
    .pretty-pdf-viewer .stf__item {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15) !important;
    }
    /* 단일 페이지 이미지에도 그림자 효과 */
    .pretty-pdf-viewer .st-page-flip-container img {
      box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
    }
  `;
  document.head.appendChild(style);
};

export interface PDFViewerProps {
  pdfUrl: string;
  options?: PDFViewerOptions;
  style?: React.CSSProperties;
}

/**
 * React용 PDF Viewer 컴포넌트 (StPageFlip 사용)
 *
 * @example
 * <PDFViewer pdfUrl="/sample.pdf" />
 */
export function PDFViewer({ pdfUrl, options, style }: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  // 내부 상태 관리
  const pdfParserRef = useRef<PDFParser | null>(null);
  const pageRendererRef = useRef<PageRenderer | null>(null);
  const stPageFlipRef = useRef<StPageFlipWrapper | null>(null);
  const controlBarRef = useRef<ControlBar | null>(null);

  const pdfDocRef = useRef<PDFDocument | null>(null);
  const totalPagesRef = useRef<number>(0);
  const pageCacheRef = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const pdfBlobRef = useRef<Blob | null>(null);
  const currentZoomRef = useRef<number>(options?.initialZoom ?? 1.0);
  const isLoadingRef = useRef<boolean>(true);

  useEffect(() => {
    // CSS 자동 주입
    injectStyles();

    if (!containerRef.current) return;

    const container = containerRef.current;

    // 옵션 설정
    const opts = {
      initialPage: options?.initialPage ?? 1,
      initialZoom: options?.initialZoom ?? 1.0,
      onLoad: options?.onLoad ?? (() => {}),
      onPageChange: options?.onPageChange ?? (() => {}),
      onError: options?.onError ?? (() => {}),
      pageQuality: options?.pageQuality ?? 4,
      showLoadingIndicator: options?.showLoadingIndicator ?? true,
    };

    // 컴포넌트 초기화
    pdfParserRef.current = new PDFParser();
    pageRendererRef.current = new PageRenderer();

    // StPageFlip을 위한 컨테이너 설정
    container.style.cssText = `
      position: relative;
      width: 100%;
      height: 100%;
      overflow: auto;
      background: #f0f0f0;
    `;

    // 기본 로딩 인디케이터 생성 (옵션으로 제어 가능)
    if (opts.showLoadingIndicator) {
      const loadingIndicator = document.createElement('div');
      loadingIndicator.className = 'pretty-pdf-loading';
      loadingIndicator.style.cssText = `
        position: absolute;
        top: 50%;
        left: 50%;
        transform: translate(-50%, -50%);
        z-index: 1000;
        display: flex;
        align-items: center;
        justify-content: center;
      `;

      // 스피너 생성
      const spinner = document.createElement('div');
      spinner.className = 'pretty-pdf-spinner';
      spinner.style.cssText = `
        width: 48px;
        height: 48px;
        border: 4px solid rgba(0, 0, 0, 0.1);
        border-top-color: #007AFF;
        border-radius: 50%;
        animation: pretty-pdf-spin 1s linear infinite;
      `;

      loadingIndicator.appendChild(spinner);
      container.appendChild(loadingIndicator);

      // 스피너 애니메이션 스타일 추가
      if (!document.getElementById('pretty-pdf-spinner-style')) {
        const style = document.createElement('style');
        style.id = 'pretty-pdf-spinner-style';
        style.textContent = `
          @keyframes pretty-pdf-spin {
            from { transform: rotate(0deg); }
            to { transform: rotate(360deg); }
          }
        `;
        document.head.appendChild(style);
      }
    }

    // 컨트롤 바는 StPageFlip 위에 표시되도록 설정 (z-index로 위에 표시)
    controlBarRef.current = new ControlBar(container);

    const controlBar = controlBarRef.current;
    const pageRenderer = pageRendererRef.current;
    const pdfParser = pdfParserRef.current;

    // 컨트롤 바 콜백 등록
    controlBar.setPrevPageCallback(() => previousPage());
    controlBar.setNextPageCallback(() => nextPage());
    controlBar.setZoomInCallback(() => zoomIn());
    controlBar.setZoomOutCallback(() => zoomOut());
    controlBar.setFullscreenCallback(() => toggleFullscreen());
    controlBar.setPrintCallback(() => print());
    controlBar.setDownloadCallback(() => download());
    controlBar.setShareCallback(() => share());
    controlBar.setPageChangeCallback((page) => goToPage(page));

    // 페이지 렌더링
    const renderAllPages = async (): Promise<HTMLCanvasElement[]> => {
      const pdfDoc = pdfDocRef.current;
      const pageRenderer = pageRendererRef.current;
      const pageCache = pageCacheRef.current;
      const opts = options || {};

      if (!pdfDoc || !pageRenderer) {
        throw new Error('PDF가 로드되지 않았습니다');
      }

      const canvases: HTMLCanvasElement[] = [];
      const totalPages = pdfDoc.totalPages;

      // 모든 페이지 렌더링
      for (let i = 1; i <= totalPages; i++) {
        // 캐시 확인
        let canvas = pageCache.get(i);

        if (!canvas) {
          const pdfPage = await pdfDoc.getPage(i);
          canvas = await pageRenderer.renderPage(pdfPage, opts.pageQuality ?? 4);
          pageCache.set(i, canvas);
        }

        canvases.push(canvas);
      }

      return canvases;
    };

    // 다음 페이지로 이동
    const nextPage = (): void => {
      if (stPageFlipRef.current) {
        stPageFlipRef.current.flipNext();
      }
    };

    // 이전 페이지로 이동
    const previousPage = (): void => {
      if (stPageFlipRef.current) {
        stPageFlipRef.current.flipPrev();
      }
    };

    // 특정 페이지로 이동
    const goToPage = (page: number): void => {
      if (stPageFlipRef.current) {
        stPageFlipRef.current.flipToPage(page);
      }
    };

    // 줌 인 (StPageFlip은 줌을 직접 지원하지 않으므로 CSS transform 사용)
    const zoomIn = (): void => {
      console.log('Zoom in called', { stPageFlip: stPageFlipRef.current });
      if (stPageFlipRef.current) {
        stPageFlipRef.current.zoomIn();
        const zoom = stPageFlipRef.current.getZoom();
        currentZoomRef.current = zoom;
        controlBar.updateZoomLevel(zoom);
      } else {
        console.warn('StPageFlip is not initialized yet');
      }
    };

    // 줌 아웃
    const zoomOut = (): void => {
      console.log('Zoom out called', { stPageFlip: stPageFlipRef.current });
      if (stPageFlipRef.current) {
        stPageFlipRef.current.zoomOut();
        const zoom = stPageFlipRef.current.getZoom();
        currentZoomRef.current = zoom;
        controlBar.updateZoomLevel(zoom);
      } else {
        console.warn('StPageFlip is not initialized yet');
      }
    };

    // 전체화면 토글
    const toggleFullscreen = (): void => {
      if (!container) return;

      if (!document.fullscreenElement) {
        container.requestFullscreen().catch((err) => {
          console.error('전체화면 전환 실패:', err);
        });
      } else {
        document.exitFullscreen();
      }
    };

    // 현재 페이지 인쇄
    const print = async (): Promise<void> => {
      const pdfDoc = pdfDocRef.current;
      const stPageFlip = stPageFlipRef.current;

      if (!pdfDoc || !stPageFlip) return;

      const currentPage = stPageFlip.getCurrentPage();
      const canvas = pageCacheRef.current.get(currentPage);

      if (!canvas) return;

      // 프린트용 iframe 생성
      const printFrame = document.createElement('iframe');
      printFrame.style.position = 'absolute';
      printFrame.style.width = '0';
      printFrame.style.height = '0';
      printFrame.style.border = 'none';
      document.body.appendChild(printFrame);

      const printWindow = printFrame.contentWindow;
      if (!printWindow) return;

      // 프린트 문서 작성
      printWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>Print PDF - Page ${currentPage}</title>
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
    };

    // PDF 다운로드
    const download = async (): Promise<void> => {
      try {
        let blob: Blob;

        // 이미 저장된 blob이 있으면 사용
        if (pdfBlobRef.current) {
          blob = pdfBlobRef.current;
        } else {
          // URL인 경우 fetch
          const response = await fetch(pdfUrl);
          blob = await response.blob();
          pdfBlobRef.current = blob;
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

        showNotification('다운로드 시작됨');
      } catch (error) {
        console.error('Failed to download PDF:', error);
        showNotification('다운로드 실패');
      }
    };

    // 공유 기능
    const share = async (): Promise<void> => {
      const stPageFlip = stPageFlipRef.current;
      const totalPages = totalPagesRef.current;

      if (!stPageFlip) return;

      const currentPage = stPageFlip.getCurrentPage();

      const shareData = {
        title: 'PDF Document',
        text: `Check out this PDF - Page ${currentPage} of ${totalPages}`,
        url: window.location.href,
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
          showNotification('링크가 클립보드에 복사되었습니다');
        }
      }
    };

    // 알림 메시지 표시
    const showNotification = (message: string): void => {
      if (!container) return;

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

      container.appendChild(notification);

      setTimeout(() => {
        notification.style.opacity = '0';
        notification.style.transition = 'opacity 0.3s';
        setTimeout(() => {
          notification.remove();
          style.remove();
        }, 300);
      }, 2000);
    };

    // PDF 로드 및 StPageFlip 초기화
    const loadPDF = async (source: string | File | Blob): Promise<void> => {
      try {
        const pdfParser = pdfParserRef.current;
        if (!pdfParser) return;

        // PDF 파싱
        await pdfParser.loadPDF(source);
        const pdfDoc = await pdfParser.parse();
        pdfDocRef.current = pdfDoc;
        totalPagesRef.current = pdfDoc.totalPages;

        // PDF를 Blob으로 저장 (다운로드용)
        if (source instanceof File || source instanceof Blob) {
          pdfBlobRef.current = source;
        } else if (typeof source === 'string') {
          // URL인 경우 나중에 필요할 때 fetch
          const response = await fetch(source);
          pdfBlobRef.current = await response.blob();
        }

        // 모든 페이지 렌더링
        const canvases = await renderAllPages();

        // StPageFlip 초기화
        stPageFlipRef.current = new StPageFlipWrapper(container);
        await stPageFlipRef.current.initialize(pdfDoc, canvases, {
          startPage: opts.initialPage,
          initialZoom: opts.initialZoom,
          onPageChange: (page, total) => {
            opts.onPageChange?.(page, total);
            controlBar.updatePageInfo(page, total);
          },
        });

        // 초기 줌 설정
        if (opts.initialZoom !== 1.0) {
          stPageFlipRef.current.setZoom(opts.initialZoom);
          currentZoomRef.current = opts.initialZoom;
          controlBar.updateZoomLevel(opts.initialZoom);
        }

        // 줌 변경 콜백 설정
        stPageFlipRef.current.setOnZoomChange((zoom) => {
          controlBar.updateZoomLevel(zoom);
        });

        // 초기 페이지 정보 업데이트
        const currentPage = stPageFlipRef.current.getCurrentPage();
        controlBar.updatePageInfo(currentPage, totalPagesRef.current);

        // 기본 로딩 인디케이터 제거 (표시된 경우에만)
        if (opts.showLoadingIndicator) {
          const loadingIndicator = container.querySelector('.pretty-pdf-loading');
          if (loadingIndicator) {
            loadingIndicator.remove();
          }
        }

        isLoadingRef.current = false;
        opts.onLoad();
      } catch (error) {
        // 에러 발생 시 기본 로딩 인디케이터 제거 (표시된 경우에만)
        if (opts.showLoadingIndicator) {
          const loadingIndicator = container.querySelector('.pretty-pdf-loading');
          if (loadingIndicator) {
            loadingIndicator.remove();
          }
        }
        opts.onError(error as Error);
        throw error;
      }
    };

    // PDF 로드
    loadPDF(pdfUrl).catch(opts.onError);

    // 정리 함수
    return () => {
      // 컴포넌트 정리
      stPageFlipRef.current?.dispose();
      controlBarRef.current?.dispose();
      pageRendererRef.current?.clearCache();
      pageCacheRef.current.clear();
    };
  }, [pdfUrl, options]);

  return (
    <div
      ref={containerRef}
      style={{
        width: '100%',
        height: '100vh',
        ...style,
      }}
    />
  );
}

export default PDFViewer;
