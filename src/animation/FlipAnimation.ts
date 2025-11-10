/**
 * CSS 3D Transform 기반 페이지 넘김 애니메이션
 * 실제 책처럼 페이지가 회전하면서 넘어가는 효과
 */
import { ThreeJSFlipAnimation } from '../three/ThreeJSFlipAnimation';

export class FlipAnimation {
  private container: HTMLElement;
  private animationDuration: number;
  private flipContainer: HTMLDivElement | null = null;
  private threeJSAnimation: ThreeJSFlipAnimation | null = null;
  private useThreeJS: boolean;

  constructor(container: HTMLElement, duration: number = 800, useThreeJS: boolean = true) {
    this.container = container;
    this.animationDuration = duration;
    this.useThreeJS = useThreeJS;
    
    // Three.js 애니메이션 초기화
    if (this.useThreeJS) {
      this.threeJSAnimation = new ThreeJSFlipAnimation(container, duration);
    }
  }

  /**
   * 앞으로 페이지 넘김 (오른쪽에서 왼쪽으로)
   */
  async flipForward(
    currentLeftCanvas: HTMLCanvasElement,
    currentRightCanvas: HTMLCanvasElement,
    nextLeftCanvas: HTMLCanvasElement,
    nextRightCanvas: HTMLCanvasElement | null
  ): Promise<void> {
    if (this.useThreeJS && this.threeJSAnimation) {
      return this.threeJSAnimation.flipForward(
        currentLeftCanvas,
        currentRightCanvas,
        nextLeftCanvas,
        nextRightCanvas
      );
    } else {
      // 기존 CSS 애니메이션 사용
      return this.performFlip(currentRightCanvas, nextLeftCanvas, nextRightCanvas, 'forward');
    }
  }

  /**
   * 뒤로 페이지 넘김 (왼쪽에서 오른쪽으로)
   */
  async flipBackward(
    currentLeftCanvas: HTMLCanvasElement,
    currentRightCanvas: HTMLCanvasElement,
    prevLeftCanvas: HTMLCanvasElement,
    prevRightCanvas: HTMLCanvasElement | null
  ): Promise<void> {
    if (this.useThreeJS && this.threeJSAnimation) {
      return this.threeJSAnimation.flipBackward(
        currentLeftCanvas,
        currentRightCanvas,
        prevLeftCanvas,
        prevRightCanvas
      );
    } else {
      // 기존 CSS 애니메이션 사용
      return this.performFlip(currentLeftCanvas, prevLeftCanvas, prevRightCanvas, 'backward');
    }
  }
  

  /**
   * 기존 CSS 기반 페이지 넘김 애니메이션 실행
   */
  private async performFlip(
    flipPageCanvas: HTMLCanvasElement,
    targetLeftCanvas: HTMLCanvasElement,
    targetRightCanvas: HTMLCanvasElement | null,
    direction: 'forward' | 'backward'
  ): Promise<void> {
    return new Promise((resolve) => {
      // 플립 컨테이너 생성
      this.flipContainer = document.createElement('div');
      this.flipContainer.style.cssText = `
        position: absolute;
        top: 50%;
        ${direction === 'forward' ? 'right' : 'left'}: 50%;
        transform: translate(${direction === 'forward' ? '0' : '0'}, -50%);
        perspective: 2000px;
        z-index: 100;
        pointer-events: none;
      `;

      // 플립되는 페이지
      const flipPage = document.createElement('div');
      flipPage.style.cssText = `
        position: relative;
        transform-style: preserve-3d;
        transform-origin: ${direction === 'forward' ? 'left' : 'right'} center;
        transition: transform ${this.animationDuration}ms cubic-bezier(0.645, 0.045, 0.355, 1);
        width: ${flipPageCanvas.width / 2}px;
        height: ${flipPageCanvas.height / 2}px;
      `;

      // 앞면
      const frontFace = document.createElement('div');
      frontFace.style.cssText = `
        position: absolute;
        width: 100%;
        height: 100%;
        backface-visibility: hidden;
        transform: rotateY(0deg);
      `;
      const frontImg = document.createElement('img');
      frontImg.src = flipPageCanvas.toDataURL();
      frontImg.style.cssText = `
        width: 100%;
        height: 100%;
        display: block;
      `;
      frontFace.appendChild(frontImg);

      // 뒷면 (다음 페이지의 왼쪽)
      const backFace = document.createElement('div');
      backFace.style.cssText = `
        position: absolute;
        width: 100%;
        height: 100%;
        backface-visibility: hidden;
        transform: rotateY(180deg);
      `;
      const backImg = document.createElement('img');
      backImg.src = targetLeftCanvas.toDataURL();
      backImg.style.cssText = `
        width: 100%;
        height: 100%;
        display: block;
        transform: scaleX(-1);
      `;
      backFace.appendChild(backImg);

      flipPage.appendChild(frontFace);
      flipPage.appendChild(backFace);
      this.flipContainer.appendChild(flipPage);
      this.container.appendChild(this.flipContainer);

      // 애니메이션 시작
      requestAnimationFrame(() => {
        if (direction === 'forward') {
          flipPage.style.transform = 'rotateY(-180deg)';
        } else {
          flipPage.style.transform = 'rotateY(180deg)';
        }
      });

      // 애니메이션 완료 대기
      setTimeout(() => {
        if (this.flipContainer) {
          this.flipContainer.remove();
          this.flipContainer = null;
        }
        resolve();
      }, this.animationDuration);
    });
  }

  /**
   * 리소스 정리
   */
  dispose(): void {
    if (this.flipContainer) {
      this.flipContainer.remove();
      this.flipContainer = null;
    }
    
    if (this.threeJSAnimation) {
      this.threeJSAnimation.dispose();
      this.threeJSAnimation = null;
    }
  }
  
  /**
   * 화면 크기 조정
   */
  resize(): void {
    if (this.threeJSAnimation) {
      this.threeJSAnimation.resize();
    }
  }
  
  /**
   * Three.js 사용 여부 설정
   */
  setUseThreeJS(useThreeJS: boolean): void {
    if (this.useThreeJS === useThreeJS) return;
    
    this.useThreeJS = useThreeJS;
    
    if (useThreeJS && !this.threeJSAnimation) {
      this.threeJSAnimation = new ThreeJSFlipAnimation(this.container, this.animationDuration);
    } else if (!useThreeJS && this.threeJSAnimation) {
      this.threeJSAnimation.dispose();
      this.threeJSAnimation = null;
    }
  }
}
