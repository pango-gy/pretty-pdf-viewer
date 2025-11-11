/**
 * PDF Viewer 옵션 (React 컴포넌트용)
 */
export interface PDFViewerOptions {
  /** 초기 페이지 번호 (기본값: 1) */
  initialPage?: number;
  
  /** 초기 줌 레벨 (기본값: 1.0) */
  initialZoom?: number;
  
  /** PDF 로드 완료 콜백 */
  onLoad?: () => void;
  
  /** 페이지 변경 콜백 */
  onPageChange?: (page: number, totalPages: number) => void;
  
  /** 에러 콜백 */
  onError?: (error: Error) => void;
  
  /** 페이지 품질 (기본값: 4, 높을수록 선명하지만 무거움) */
  pageQuality?: number;
  
  /** 기본 로딩 인디케이터 표시 여부 (기본값: true) */
  showLoadingIndicator?: boolean;
}
