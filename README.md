# Pretty PDF Viewer

이 프로젝트는 [팡고링고](https://pango-lingo.com/) 서비스에서 사용하기 위해 개발된 PDF 뷰어입니다.

PDF.js를 사용한 아름다운 PDF 뷰어 라이브러리입니다. React와 Next.js에서 사용할 수 있습니다.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

## 특징

- **실제 책 같은 경험**: 양면 보기와 부드러운 페이지 전환
- **세련된 UI**: 하단 통합 컨트롤 바 (이전/다음, 확대/축소, 전체화면)
- **확대/축소**: 드래그로 원하는 위치 확인 가능
- **고성능**: Canvas 캐싱과 최적화된 렌더링
- **반응형**: 다양한 화면 크기 지원
- **키보드 단축키**: 화살표 키, +/- 키 지원
- **TypeScript 지원**: 완벽한 타입 정의
- **React/Next.js 전용**: React와 Next.js에서 완벽하게 동작

## 설치

```bash
npm install pretty-pdf-viewer
```

## 사용법

### React

```tsx
import { PDFViewer } from 'pretty-pdf-viewer';

function App() {
  return <PDFViewer pdfUrl="https://yoururl.com/sample.pdf" />;
}
```

### Next.js

```tsx
'use client';

import { PDFViewer } from 'pretty-pdf-viewer';

export default function Page() {
  return <PDFViewer pdfUrl="https://yoururl.com/sample.pdf" />;
}
```

## 옵션

```typescript
<PDFViewer
  pdfUrl="/sample.pdf"
  options={{
    pageQuality: 3, // 페이지 품질 (1-5)
    initialPage: 1, // 시작 페이지
    initialZoom: 1.0, // 초기 줌 레벨
    onLoad: () => {}, // 로드 완료 콜백
    onPageChange: (page, total) => {}, // 페이지 변경 콜백
    onError: (error) => {}, // 에러 콜백
  }}
/>
```

## UI 컨트롤

라이브러리에 통합된 하단 컨트롤 바:

- 이전 페이지
- **페이지 정보** (예: `2-3 / 10`)
- 다음 페이지
- 축소
- 확대
- 전체화면

## 기술 스택

- **PDF.js**: PDF 파싱
- **TypeScript**: 타입 안전성

## 라이선스

MIT License

## 기여

이슈와 PR을 환영합니다!

GitHub: https://github.com/pango-gy/pretty-pdf-viewer

---

Made with ❤️ by pango-gy
