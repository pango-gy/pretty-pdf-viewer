# 📚 Pretty PDF Viewer

Three.js와 PDF.js를 사용한 아름다운 3D PDF 뷰어 라이브러리입니다. 실제 책처럼 페이지를 넘기는 경험을 제공합니다.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

## ✨ 특징

- 📖 **실제 책 같은 경험**: 양면 보기와 부드러운 페이지 전환
- 🎨 **세련된 UI**: 하단 통합 컨트롤 바 (이전/다음, 확대/축소, 전체화면)
- 🔍 **확대/축소**: 드래그로 원하는 위치 확인 가능
- ⚡ **고성능**: Canvas 캐싱과 최적화된 렌더링
- 📱 **반응형**: 다양한 화면 크기 지원
- ⌨️ **키보드 단축키**: 화살표 키, +/- 키 지원
- 🎯 **TypeScript 지원**: 완벽한 타입 정의
- 🔧 **프레임워크 호환**: React, Next.js, Vue 등 모든 환경

## 📦 설치

```bash
npm install pretty-pdf-viewer
```

## 🚀 사용법

### Vanilla JavaScript

```html
<!DOCTYPE html>
<html>
<head>
  <link rel="stylesheet" href="node_modules/pretty-pdf-viewer/dist/styles.css">
</head>
<body>
  <div id="viewer" style="width: 100%; height: 100vh;"></div>

  <script type="module">
    import { PrettyPDFViewer } from 'pretty-pdf-viewer';

    const viewer = new PrettyPDFViewer('#viewer');
    viewer.load('./sample.pdf');
  </script>
</body>
</html>
```

### React

```tsx
import { PDFViewer } from 'pretty-pdf-viewer';
import 'pretty-pdf-viewer/dist/styles.css';

function App() {
  return <PDFViewer pdfUrl="/sample.pdf" />;
}
```

### Next.js

```tsx
'use client';

import { PDFViewer } from 'pretty-pdf-viewer';
import 'pretty-pdf-viewer/dist/styles.css';

export default function Page() {
  return <PDFViewer pdfUrl="/sample.pdf" />;
}
```

## ⚙️ 옵션

```typescript
new PrettyPDFViewer(container, {
  animationDuration: 800,    // 애니메이션 지속 시간 (ms)
  pageQuality: 3,             // 페이지 품질 (1-5)
  initialPage: 1,             // 시작 페이지
  initialZoom: 1.0,           // 초기 줌 레벨
  onLoad: () => {},           // 로드 완료 콜백
  onPageChange: (page, total) => {},  // 페이지 변경 콜백
  onError: (error) => {},     // 에러 콜백
});
```

## 📖 API

```typescript
// PDF 로드
viewer.load(url: string | File | Blob): Promise<void>

// 페이지 이동
viewer.nextPage(): Promise<void>
viewer.previousPage(): Promise<void>
viewer.goToPage(page: number): Promise<void>

// 줌
viewer.zoomIn(): Promise<void>
viewer.zoomOut(): Promise<void>
viewer.setZoom(level: number): Promise<void>

// 정리
viewer.destroy(): void
```

## ⌨️ 키보드 단축키

| 키 | 동작 |
|---|------|
| `←` | 이전 페이지 |
| `→` | 다음 페이지 |
| `+` / `=` | 확대 |
| `-` | 축소 |

## 🎮 UI 컨트롤

라이브러리에 통합된 하단 컨트롤 바:
- **◀** 이전 페이지
- **페이지 정보** (예: `2-3 / 10`)
- **▶** 다음 페이지
- **−** 축소
- **+** 확대
- **⛶** 전체화면

## 🔧 기술 스택

- **Three.js**: 3D 렌더링
- **PDF.js**: PDF 파싱
- **TypeScript**: 타입 안전성

## 📄 라이선스

MIT License

## 🤝 기여

이슈와 PR을 환영합니다!

GitHub: https://github.com/pango-gy/pretty-pdf-viewer

---

Made with ❤️ by pango-gy
