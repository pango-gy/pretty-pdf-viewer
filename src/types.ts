/**
 * Pretty PDF Viewer 옵션
 */
export interface PrettyPDFViewerOptions {
  /** PDF 파일 (File 또는 Blob 객체) */
  pdfFile?: File | Blob;
  
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
  
  /** 애니메이션 지속 시간 (ms, 기본값: 800) */
  animationDuration?: number;
  
  /** 페이지 품질 (기본값: 4, 높을수록 선명하지만 무거움) */
  pageQuality?: number;
  
  /** Three.js 페이지 플립 애니메이션 사용 여부 (기본값: true) */
  useThreeJS?: boolean;
}

/**
 * PDF Viewer 인스턴스 인터페이스
 */
export interface PDFViewerInstance {
  /** 특정 페이지로 이동 */
  goToPage(page: number): Promise<void>;
  
  /** 다음 페이지로 이동 */
  nextPage(): Promise<void>;
  
  /** 이전 페이지로 이동 */
  previousPage(): Promise<void>;
  
  /** 줌 인 */
  zoomIn(): Promise<void>;
  
  /** 줌 아웃 */
  zoomOut(): Promise<void>;
  
  /** 줌 레벨 설정 */
  setZoom(level: number): Promise<void>;
  
  /** PDF 로드 */
  load(source: string | File | Blob): Promise<void>;
  
  /** 뷰어 제거 */
  destroy(): void;
}
