import PDFViewer from './components/PDFViewer';

function App() {
  return (
    <div
      style={{
        maxWidth: '1200px',
        margin: '0 auto',
        padding: '40px 20px',
        fontFamily: 'Georgia, serif',
        lineHeight: '1.8',
        color: '#333',
      }}
    >
      {/* 기사 헤더 */}
      <header
        style={{
          marginBottom: '40px',
          borderBottom: '2px solid #ddd',
          paddingBottom: '20px',
        }}
      >
        <h1
          style={{
            fontSize: '2.5rem',
            marginBottom: '10px',
            fontWeight: 'bold',
          }}
        >
          PDF 뷰어 데모
        </h1>
        <p
          style={{
            fontSize: '1.1rem',
            color: '#666',
            fontStyle: 'italic',
          }}
        >
          아래에서 PDF 문서를 확인하실 수 있습니다.
        </p>
      </header>

      {/* 기사 본문 */}
      <article>
        <p style={{ marginBottom: '20px' }}>
          이 문서는 PDF 뷰어 라이브러리의 데모입니다. 아래에 표시된 PDF는 실제 문서처럼 페이지를
          넘기며 확인할 수 있습니다.
        </p>

        {/* PDF 뷰어 컨테이너 */}
        <div
          style={{
            margin: '40px 0',
            border: '1px solid #ddd',
            borderRadius: '8px',
            overflow: 'hidden',
            boxShadow: '0 4px 6px rgba(0, 0, 0, 0.1)',
            backgroundColor: '#fff',
          }}
        >
          <PDFViewer pdfUrl="https://ontheline.trincoll.edu/images/bookdown/sample-local-pdf.pdf" />
        </div>

        <p style={{ marginTop: '20px' }}>
          PDF 뷰어는 페이지 넘김, 확대/축소, 전체화면 등의 기능을 제공합니다. 키보드 화살표 키를
          사용하여 페이지를 이동할 수 있습니다.
        </p>
      </article>
    </div>
  );
}

export default App;
