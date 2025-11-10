import React, { useEffect, useRef } from 'react';
import { PrettyPDFViewer } from '../PrettyPDFViewer';
import type { PrettyPDFViewerOptions } from '../types';

interface PDFViewerProps {
  pdfUrl: string;
  options?: Omit<PrettyPDFViewerOptions, 'pdfFile'>;
  style?: React.CSSProperties;
}

/**
 * React용 PDF Viewer 컴포넌트
 * 
 * @example
 * <PDFViewer pdfUrl="/sample.pdf" />
 */
export function PDFViewer({ pdfUrl, options, style }: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<PrettyPDFViewer | null>(null);

  useEffect(() => {
    if (containerRef.current && !viewerRef.current) {
      viewerRef.current = new PrettyPDFViewer(containerRef.current, options);
      viewerRef.current.load(pdfUrl);
    }

    return () => {
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [pdfUrl, options]);

  return (
    <div 
      ref={containerRef} 
      style={{ 
        width: '100%', 
        height: '100vh',
        ...style 
      }}
    />
  );
}

export default PDFViewer;

