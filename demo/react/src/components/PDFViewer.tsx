import { useEffect, useRef, useState } from 'react';
import { PrettyPDFViewer } from '../../../../dist/index.esm.js';
import '../../../../dist/styles.css';

interface PDFViewerProps {
  pdfUrl: string;
}

function PDFViewer({ pdfUrl }: PDFViewerProps) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<PrettyPDFViewer | null>(null);
  const [status, setStatus] = useState<'loading' | 'loaded' | 'error'>('loading');
  const [error, setError] = useState<string>('');

  useEffect(() => {
    console.log('🚀 PDFViewer 컴포넌트 마운트');
    console.log('📂 PDF URL:', pdfUrl);

    if (containerRef.current && !viewerRef.current) {
      try {
        console.log('📦 PrettyPDFViewer 인스턴스 생성 중...');
        
        viewerRef.current = new PrettyPDFViewer(containerRef.current, {
          animationDuration: 800,
          pageQuality: 3,
          onLoad: () => {
            console.log('✅ PDF 로드 완료!');
            setStatus('loaded');
          },
          onPageChange: (page, total) => {
            console.log(`📄 페이지 변경: ${page}/${total}`);
          },
          onError: (err) => {
            console.error('❌ PDF 로드 에러:', err);
            setStatus('error');
            setError(err.message);
          },
        });

        console.log('🔄 PDF 로드 시작...');
        viewerRef.current.load(pdfUrl).catch((err) => {
          console.error('❌ PDF 로드 실패:', err);
          setStatus('error');
          setError(err.message);
        });
      } catch (err) {
        console.error('❌ 뷰어 생성 실패:', err);
        setStatus('error');
        setError(err instanceof Error ? err.message : String(err));
      }
    }

    return () => {
      console.log('🧹 PDFViewer 컴포넌트 언마운트');
      if (viewerRef.current) {
        viewerRef.current.destroy();
        viewerRef.current = null;
      }
    };
  }, [pdfUrl]);

  return (
    <div style={{ width: '100%', height: '100vh', position: 'relative' }}>
      {status === 'loading' && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          zIndex: 1000,
        }}>
          <div style={{ fontSize: '24px', marginBottom: '10px' }}>📄</div>
          <div>PDF 로드 중...</div>
        </div>
      )}
      
      {status === 'error' && (
        <div style={{
          position: 'absolute',
          top: '50%',
          left: '50%',
          transform: 'translate(-50%, -50%)',
          textAlign: 'center',
          color: 'red',
          zIndex: 1000,
        }}>
          <div style={{ fontSize: '48px', marginBottom: '10px' }}>❌</div>
          <div style={{ fontSize: '18px', marginBottom: '10px' }}>PDF 로드 실패</div>
          <div style={{ fontSize: '14px', color: '#666' }}>{error}</div>
        </div>
      )}

      <div 
        ref={containerRef} 
        style={{ 
          width: '100%', 
          height: '100%',
          background: '#f0f0f0'
        }}
      />
    </div>
  );
}

export default PDFViewer;
