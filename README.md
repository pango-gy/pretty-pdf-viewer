# 📚 Pretty PDF Viewer

Three.js와 PDF.js를 사용한 아름다운 3D PDF 뷰어 라이브러리입니다. 실제 책처럼 페이지를 넘기는 경험을 제공합니다.

[![License: MIT](https://img.shields.io/badge/License-MIT-yellow.svg)](https://opensource.org/licenses/MIT)
[![TypeScript](https://img.shields.io/badge/TypeScript-Ready-blue.svg)](https://www.typescriptlang.org/)

## ✨ 특징

- 📖 **실제 책 같은 경험**: 양면 보기와 자연스러운 페이지 전환
- 🎨 **아름다운 UI**: DearFlip 스타일의 통합 컨트롤 바
- 🔍 **확대/축소**: 드래그로 원하는 위치 확인 가능
- ⚡ **고성능**: Canvas 캐싱과 최적화된 렌더링
- 📱 **반응형**: 다양한 화면 크기 지원
- ⌨️ **키보드 단축키**: 화살표 키, +/- 키 지원
- 🎯 **TypeScript 지원**: 완벽한 타입 정의
- 🔧 **프레임워크 호환**: React, Next.js, Vue 등 모든 환경에서 사용 가능

## 📦 설치

```bash
npm install pretty-pdf-viewer
```

또는

```bash
yarn add pretty-pdf-viewer
```

## 🚀 빠른 시작

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

    const viewer = new PrettyPDFViewer('#viewer', {
      animationDuration: 800,
      pageQuality: 3,
      onLoad: () => console.log('PDF 로드 완료'),
      onPageChange: (page, total) => console.log(`페이지: ${page}/${total}`),
    });

    // PDF 로드
    viewer.load('./sample.pdf');
  </script>
</body>
</html>
```

### React

```tsx
import { useEffect, useRef } from 'react';
import { PrettyPDFViewer } from 'pretty-pdf-viewer';
import 'pretty-pdf-viewer/dist/styles.css';

function PDFViewerComponent({ pdfUrl }: { pdfUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<PrettyPDFViewer | null>(null);

  useEffect(() => {
    if (containerRef.current && !viewerRef.current) {
      viewerRef.current = new PrettyPDFViewer(containerRef.current, {
        animationDuration: 800,
        pageQuality: 3,
        onLoad: () => console.log('PDF 로드 완료'),
        onPageChange: (page, total) => console.log(`${page}/${total}`),
      });

      viewerRef.current.load(pdfUrl);
    }

    return () => {
      viewerRef.current?.destroy();
      viewerRef.current = null;
    };
  }, [pdfUrl]);

  return (
    <div 
      ref={containerRef} 
      style={{ width: '100%', height: '100vh' }}
    />
  );
}

export default PDFViewerComponent;
```

### Next.js (App Router)

```tsx
'use client';

import { useEffect, useRef } from 'react';
import type { PrettyPDFViewer as PrettyPDFViewerType } from 'pretty-pdf-viewer';

export default function PDFViewer({ pdfUrl }: { pdfUrl: string }) {
  const containerRef = useRef<HTMLDivElement>(null);
  const viewerRef = useRef<PrettyPDFViewerType | null>(null);

  useEffect(() => {
    // 동적 import (SSR 방지)
    import('pretty-pdf-viewer').then(({ PrettyPDFViewer }) => {
      import('pretty-pdf-viewer/dist/styles.css');

      if (containerRef.current && !viewerRef.current) {
        viewerRef.current = new PrettyPDFViewer(containerRef.current, {
          animationDuration: 800,
          pageQuality: 3,
        });

        viewerRef.current.load(pdfUrl);
      }
    });

    return () => {
      viewerRef.current?.destroy();
    };
  }, [pdfUrl]);

  return (
    <div 
      ref={containerRef} 
      style={{ width: '100%', height: '100vh' }}
    />
  );
}
```

### Next.js (Pages Router)

```tsx
import dynamic from 'next/dynamic';

// SSR 비활성화
const PDFViewer = dynamic(() => import('../components/PDFViewer'), {
  ssr: false,
});

export default function Home() {
  return <PDFViewer pdfUrl="/sample.pdf" />;
}
```

## 📖 API

### Constructor

```typescript
new PrettyPDFViewer(container: HTMLElement | string, options?: PrettyPDFViewerOptions)
```

#### Options

| 옵션 | 타입 | 기본값 | 설명 |
|------|------|--------|------|
| `pdfFile` | `string \| File \| Blob` | - | 초기 로드할 PDF |
| `initialPage` | `number` | `1` | 초기 페이지 번호 |
| `initialZoom` | `number` | `1.0` | 초기 줌 레벨 |
| `animationDuration` | `number` | `800` | 애니메이션 지속 시간 (ms) |
| `pageQuality` | `number` | `3` | 페이지 렌더링 품질 (1-5) |
| `onLoad` | `() => void` | - | PDF 로드 완료 콜백 |
| `onPageChange` | `(page: number, total: number) => void` | - | 페이지 변경 콜백 |
| `onError` | `(error: Error) => void` | - | 에러 발생 콜백 |

### Methods

```typescript
// PDF 로드
await viewer.load(source: string | File | Blob): Promise<void>

// 페이지 이동
await viewer.nextPage(): Promise<void>
await viewer.previousPage(): Promise<void>
await viewer.goToPage(page: number): Promise<void>

// 줌
await viewer.zoomIn(): Promise<void>
await viewer.zoomOut(): Promise<void>
await viewer.setZoom(level: number): Promise<void>

// 정리
viewer.destroy(): void
```

## 🎮 키보드 단축키

| 키 | 동작 |
|---|------|
| `←` | 이전 페이지 |
| `→` | 다음 페이지 |
| `+` / `=` | 확대 |
| `-` | 축소 |

## 🎨 UI 컨트롤

라이브러리에 통합된 하단 컨트롤 바:
- ◀ 이전 페이지
- 페이지 정보 (예: `2-3 / 10`)
- ▶ 다음 페이지
- − 축소
- \+ 확대
- ⛶ 전체화면

## 🔧 기술 스택

- **Three.js**: 3D 렌더링 및 애니메이션
- **PDF.js**: PDF 파싱 및 렌더링
- **TypeScript**: 타입 안전성
- **Rollup**: 번들링 (CommonJS & ESM)

## 📁 프로젝트 구조

```
pretty-pdf-viewer/
├── src/
│   ├── index.ts                    # 메인 진입점
│   ├── PrettyPDFViewer.ts         # 메인 클래스
│   ├── types.ts                    # 타입 정의
│   ├── pdf/                        # PDF 관련
│   │   └── PDFParser.ts
│   ├── renderer/                   # 렌더링
│   │   └── PageRenderer.ts
│   ├── layout/                     # 레이아웃
│   │   └── BookLayout.ts
│   ├── animation/                  # 애니메이션
│   │   └── FlipAnimation.ts
│   ├── ui/                         # UI 컴포넌트
│   │   └── ControlBar.ts
│   └── styles.css                  # 스타일
├── demo/                           # 데모 예제
│   ├── vanilla/                    # Vanilla JS 예제
│   └── react/                      # React 예제
└── dist/                           # 빌드 결과물
```

## 🚀 개발

```bash
# 설치
npm install

# 빌드
npm run build

# 개발 서버 (Vanilla 데모)
cd demo/vanilla
python3 -m http.server 8000
# http://localhost:8000 접속
```

## 📄 라이선스

MIT License - 자유롭게 사용하세요!

## 🤝 기여

이슈와 PR을 환영합니다!

## 📧 문의

이슈를 통해 문의해주세요.

---

Made with ❤️ using Three.js and PDF.js
