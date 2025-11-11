import { PDFViewer as PrettyPDFViewer } from 'pretty-pdf-viewer';

interface PDFViewerProps {
  pdfUrl: string;
}

function PDFViewer({ pdfUrl }: PDFViewerProps) {
  return (
    <div style={{ width: '100%', height: '600px' }}>
      <PrettyPDFViewer
        pdfUrl={pdfUrl}
        options={{
          pageQuality: 3,
          onLoad: () => {
            console.log('✅ PDF 로드 완료!');
          },
          onPageChange: (page, total) => {
            console.log(`📄 페이지 변경: ${page}/${total}`);
          },
          onError: (err) => {
            console.error('❌ PDF 로드 에러:', err);
          },
        }}
        style={{ width: '100%', height: '100%' }}
      />
    </div>
  );
}

export default PDFViewer;
