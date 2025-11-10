/**
 * 3D 페이지 넘김 애니메이션 클래스
 * CSS 3D Transform을 사용하여 책 넘김 효과를 구현합니다.
 */
export interface PageFlipOptions {
  duration?: number; // 애니메이션 지속 시간 (ms)
  easing?: string; // CSS easing 함수
  perspective?: number; // 3D 원근감
}

export class PageFlipAnimation {
  private container: HTMLElement;
  private currentPage: HTMLElement | null = null;
  private nextPage: HTMLElement | null = null;
  private isAnimating: boolean = false;
  private options: Required<PageFlipOptions>;

  constructor(container: HTMLElement, options: PageFlipOptions = {}) {
    this.container = container;
    this.options = {
      duration: options.duration || 600,
      easing: options.easing || 'cubic-bezier(0.4, 0.0, 0.2, 1)', // 더 자연스러운 easing
      perspective: options.perspective || 2500,
    };

    this.setupContainer();
  }

  /**
   * 컨테이너에 3D 스타일 설정
   */
  private setupContainer(): void {
    this.container.style.perspective = `${this.options.perspective}px`;
    this.container.style.perspectiveOrigin = 'center center';
    this.container.style.transformStyle = 'preserve-3d';
  }

  /**
   * 페이지 넘김 애니메이션 시작
   */
  async flipPage(
    currentPageElement: HTMLElement,
    nextPageElement: HTMLElement,
    direction: 'next' | 'prev'
  ): Promise<void> {
    if (this.isAnimating) {
      return;
    }

    this.isAnimating = true;
    this.currentPage = currentPageElement;
    this.nextPage = nextPageElement;

    // 초기 상태 설정
    this.preparePages(direction);

    // 애니메이션 시작
    await this.animateFlip(direction);

    // 애니메이션 완료 후 정리
    this.cleanup();
    this.isAnimating = false;
  }

  /**
   * 페이지 준비 (초기 상태 설정)
   */
  private preparePages(direction: 'next' | 'prev'): void {
    if (!this.currentPage || !this.nextPage) return;

    // 현재 페이지 스타일 설정
    this.currentPage.style.transformOrigin = direction === 'next' ? 'left center' : 'right center';
    this.currentPage.style.transition = `transform ${this.options.duration}ms ${this.options.easing}, box-shadow ${this.options.duration}ms ${this.options.easing}`;
    this.currentPage.style.backfaceVisibility = 'hidden';
    this.currentPage.style.willChange = 'transform';

    // 다음 페이지 스타일 설정
    this.nextPage.style.transformOrigin = direction === 'next' ? 'right center' : 'left center';
    this.nextPage.style.transition = `transform ${this.options.duration}ms ${this.options.easing}, box-shadow ${this.options.duration}ms ${this.options.easing}`;
    this.nextPage.style.backfaceVisibility = 'hidden';
    this.nextPage.style.willChange = 'transform';

    if (direction === 'next') {
      // 다음 페이지를 오른쪽에 배치하고 뒤집어서 숨김
      this.nextPage.style.transform = 'rotateY(-180deg)';
      this.nextPage.style.zIndex = '1';
      this.currentPage.style.zIndex = '2';
    } else {
      // 이전 페이지를 왼쪽에 배치하고 뒤집어서 숨김
      this.nextPage.style.transform = 'rotateY(180deg)';
      this.nextPage.style.zIndex = '2';
      this.currentPage.style.zIndex = '1';
    }
  }

  /**
   * 페이지 넘김 애니메이션 실행
   */
  private async animateFlip(direction: 'next' | 'prev'): Promise<void> {
    return new Promise((resolve) => {
      if (!this.currentPage || !this.nextPage) {
        resolve();
        return;
      }

      // 애니메이션 완료 이벤트 리스너
      const onTransitionEnd = () => {
        this.currentPage?.removeEventListener('transitionend', onTransitionEnd);
        this.nextPage?.removeEventListener('transitionend', onTransitionEnd);
        resolve();
      };

      this.currentPage.addEventListener('transitionend', onTransitionEnd);
      this.nextPage.addEventListener('transitionend', onTransitionEnd);

      // 애니메이션 시작
      requestAnimationFrame(() => {
        if (direction === 'next') {
          // 현재 페이지를 왼쪽으로 넘김
          this.currentPage!.style.transform = 'rotateY(-180deg)';
          // 다음 페이지를 펼침
          this.nextPage!.style.transform = 'rotateY(0deg)';
        } else {
          // 현재 페이지를 오른쪽으로 넘김
          this.currentPage!.style.transform = 'rotateY(180deg)';
          // 이전 페이지를 펼침
          this.nextPage!.style.transform = 'rotateY(0deg)';
        }
      });

      // 타임아웃 설정 (안전장치)
      setTimeout(() => {
        resolve();
      }, this.options.duration + 100);
    });
  }

  /**
   * 애니메이션 완료 후 정리
   */
  private cleanup(): void {
    if (!this.currentPage || !this.nextPage) return;

    // 스타일 초기화
    this.currentPage.style.transform = '';
    this.currentPage.style.transition = '';
    this.currentPage.style.zIndex = '';
    this.currentPage.style.backfaceVisibility = '';
    this.currentPage.style.transformOrigin = '';
    this.currentPage.style.willChange = 'auto';

    this.nextPage.style.transform = '';
    this.nextPage.style.transition = '';
    this.nextPage.style.zIndex = '';
    this.nextPage.style.backfaceVisibility = '';
    this.nextPage.style.transformOrigin = '';
    this.nextPage.style.willChange = 'auto';

    this.currentPage = null;
    this.nextPage = null;
  }

  /**
   * 스프레드 뷰(양면 보기)를 위한 페이지 넘김 애니메이션
   * 실제 책처럼 오른쪽 페이지가 왼쪽으로 넘어가는 효과
   */
  async flipSpread(
    leftPage: HTMLElement | null,
    rightPage: HTMLElement | null,
    newLeftPage: HTMLElement | null,
    newRightPage: HTMLElement | null,
    direction: 'next' | 'prev'
  ): Promise<void> {
    if (this.isAnimating) {
      return;
    }

    this.isAnimating = true;

    // 다음 페이지로 넘길 때: 오른쪽 페이지가 왼쪽으로 넘어감
    if (direction === 'next') {
      // 오른쪽 페이지가 있으면 그것을 넘기고, 없으면 왼쪽 페이지를 넘김
      const pageToFlip = rightPage || leftPage;
      const newPageToShow = newRightPage || newLeftPage;
      
      if (pageToFlip && newPageToShow) {
        await this.flipRightToLeft(pageToFlip, newPageToShow);
      }
      // 새 왼쪽 페이지도 표시
      if (newLeftPage && newLeftPage !== newPageToShow) {
        newLeftPage.style.display = 'block';
        newLeftPage.classList.add('pretty-pdf-viewer__page--left');
      }
    }
    // 이전 페이지로 넘길 때: 왼쪽 페이지가 오른쪽으로 넘어감
    else if (direction === 'prev') {
      const pageToFlip = leftPage || rightPage;
      const newPageToShow = newLeftPage || newRightPage;
      
      if (pageToFlip && newPageToShow) {
        await this.flipLeftToRight(pageToFlip, newPageToShow);
      }
      // 새 오른쪽 페이지도 표시
      if (newRightPage && newRightPage !== newPageToShow) {
        newRightPage.style.display = 'block';
        newRightPage.classList.add('pretty-pdf-viewer__page--right');
      }
    }

    this.isAnimating = false;
  }

  /**
   * 오른쪽 페이지를 왼쪽으로 넘기는 애니메이션
   * 실제 책처럼 오른쪽 페이지가 왼쪽으로 넘어가면서 새 페이지가 나타남
   */
  private async flipRightToLeft(
    rightPage: HTMLElement,
    newRightPage: HTMLElement
  ): Promise<void> {
    return new Promise((resolve) => {
      // 오른쪽 페이지 설정 (넘어갈 페이지)
      rightPage.style.transformOrigin = 'left center';
      rightPage.style.transition = `transform ${this.options.duration}ms ${this.options.easing}`;
      rightPage.style.zIndex = '10';
      rightPage.style.willChange = 'transform';
      rightPage.style.backfaceVisibility = 'hidden';
      rightPage.style.position = 'relative';

      // 새 오른쪽 페이지 설정 (뒤에서 나타날 페이지)
      newRightPage.style.transformOrigin = 'right center';
      newRightPage.style.transform = 'rotateY(-180deg)';
      newRightPage.style.transition = `transform ${this.options.duration}ms ${this.options.easing}`;
      newRightPage.style.zIndex = '5';
      newRightPage.style.willChange = 'transform';
      newRightPage.style.backfaceVisibility = 'hidden';
      newRightPage.style.position = 'relative';
      newRightPage.style.display = 'block';

      let transitionEndCount = 0;
      const totalTransitions = 2;

      const onTransitionEnd = () => {
        transitionEndCount++;
        if (transitionEndCount >= totalTransitions) {
          rightPage.removeEventListener('transitionend', onTransitionEnd);
          newRightPage.removeEventListener('transitionend', onTransitionEnd);
          
          // 스타일 정리
          rightPage.style.transform = '';
          rightPage.style.transition = '';
          rightPage.style.zIndex = '';
          rightPage.style.willChange = 'auto';
          rightPage.style.backfaceVisibility = '';
          rightPage.style.transformOrigin = '';
          rightPage.style.position = '';

          newRightPage.style.transform = '';
          newRightPage.style.transition = '';
          newRightPage.style.zIndex = '';
          newRightPage.style.willChange = 'auto';
          newRightPage.style.backfaceVisibility = '';
          newRightPage.style.transformOrigin = '';
          newRightPage.style.position = '';

          resolve();
        }
      };

      rightPage.addEventListener('transitionend', onTransitionEnd);
      newRightPage.addEventListener('transitionend', onTransitionEnd);

      // 애니메이션 시작
      requestAnimationFrame(() => {
        rightPage.style.transform = 'rotateY(-180deg)';
        newRightPage.style.transform = 'rotateY(0deg)';
      });

      // 타임아웃 안전장치
      setTimeout(() => {
        if (transitionEndCount < totalTransitions) {
          resolve();
        }
      }, this.options.duration + 100);
    });
  }

  /**
   * 왼쪽 페이지를 오른쪽으로 넘기는 애니메이션
   */
  private async flipLeftToRight(
    leftPage: HTMLElement,
    newLeftPage: HTMLElement
  ): Promise<void> {
    return new Promise((resolve) => {
      // 왼쪽 페이지 설정
      leftPage.style.transformOrigin = 'right center';
      leftPage.style.transition = `transform ${this.options.duration}ms ${this.options.easing}`;
      leftPage.style.zIndex = '10';
      leftPage.style.willChange = 'transform';
      leftPage.style.backfaceVisibility = 'hidden';

      // 새 왼쪽 페이지 설정
      newLeftPage.style.transformOrigin = 'left center';
      newLeftPage.style.transform = 'rotateY(180deg)';
      newLeftPage.style.transition = `transform ${this.options.duration}ms ${this.options.easing}`;
      newLeftPage.style.zIndex = '5';
      newLeftPage.style.willChange = 'transform';
      newLeftPage.style.backfaceVisibility = 'hidden';

      const onTransitionEnd = () => {
        leftPage.removeEventListener('transitionend', onTransitionEnd);
        newLeftPage.removeEventListener('transitionend', onTransitionEnd);
        
        // 스타일 정리
        leftPage.style.transform = '';
        leftPage.style.transition = '';
        leftPage.style.zIndex = '';
        leftPage.style.willChange = 'auto';
        leftPage.style.backfaceVisibility = '';
        leftPage.style.transformOrigin = '';

        newLeftPage.style.transform = '';
        newLeftPage.style.transition = '';
        newLeftPage.style.zIndex = '';
        newLeftPage.style.willChange = 'auto';
        newLeftPage.style.backfaceVisibility = '';
        newLeftPage.style.transformOrigin = '';

        resolve();
      };

      leftPage.addEventListener('transitionend', onTransitionEnd);
      newLeftPage.addEventListener('transitionend', onTransitionEnd);

      // 애니메이션 시작
      requestAnimationFrame(() => {
        leftPage.style.transform = 'rotateY(180deg)';
        newLeftPage.style.transform = 'rotateY(0deg)';
      });

      // 타임아웃 안전장치
      setTimeout(() => {
        resolve();
      }, this.options.duration + 100);
    });
  }

  /**
   * 애니메이션 중인지 확인
   */
  getIsAnimating(): boolean {
    return this.isAnimating;
  }
}

