export interface PrettyPDFViewerOptions {
  container: HTMLElement | string;
  pdfUrl?: string;
  pdfFile?: File | Blob;
  theme?: 'light' | 'dark' | 'auto';
  showToolbar?: boolean;
  showSidebar?: boolean;
  enableZoom?: boolean;
  defaultZoom?: number;
  enableDownload?: boolean;
  enablePrint?: boolean;
  onPageChange?: (page: number, totalPages: number) => void;
  onLoad?: () => void;
  onError?: (error: Error) => void;
}

export interface PDFViewerInstance {
  load: (url: string | File | Blob) => Promise<void>;
  goToPage: (page: number) => Promise<void>;
  nextPage: () => Promise<void>;
  previousPage: () => Promise<void>;
  zoomIn: () => Promise<void>;
  zoomOut: () => Promise<void>;
  setZoom: (zoom: number) => Promise<void>;
  getCurrentPage: () => number;
  getTotalPages: () => number;
  destroy: () => void;
}

