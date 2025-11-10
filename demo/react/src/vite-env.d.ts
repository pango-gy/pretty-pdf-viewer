/// <reference types="vite/client" />

declare module '../../../../dist/index.esm.js' {
  export class PrettyPDFViewer {
    constructor(container: HTMLElement | string, options?: any);
    load(source: string | File | Blob): Promise<void>;
    nextPage(): Promise<void>;
    previousPage(): Promise<void>;
    goToPage(page: number): Promise<void>;
    zoomIn(): Promise<void>;
    zoomOut(): Promise<void>;
    setZoom(level: number): Promise<void>;
    destroy(): void;
  }
}

declare module '../../../../dist/styles.css' {
  const content: string;
  export default content;
}

