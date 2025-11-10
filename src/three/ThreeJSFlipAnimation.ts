import * as THREE from 'three';
import TWEEN from '@tweenjs/tween.js';

interface PageTextures {
  front: THREE.Texture;
  back: THREE.Texture;
}

export class ThreeJSFlipAnimation {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  private container: HTMLElement;
  private animationDuration: number;
  
  // 페이지 메쉬들
  private leftPageMesh: THREE.Mesh | null = null;
  private rightPageMesh: THREE.Mesh | null = null;
  private flippingPageMesh: THREE.Mesh | null = null;
  
  // 조명
  private ambientLight: THREE.AmbientLight;
  private directionalLight: THREE.DirectionalLight;
  private pointLight: THREE.PointLight;
  
  // 애니메이션 상태
  private isAnimating: boolean = false;
  private animationFrame: number | null = null;
  
  // 페이지 크기
  private pageWidth: number;
  private pageHeight: number;
  
  constructor(container: HTMLElement, duration: number = 1200) {
    this.container = container;
    this.animationDuration = duration;
    
    // Three.js 씬 초기화
    this.scene = new THREE.Scene();
    this.scene.background = new THREE.Color(0xffffff);
    
    // 카메라 설정
    const aspect = container.clientWidth / container.clientHeight;
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 1000);
    this.camera.position.set(0, 0, 5);
    this.camera.lookAt(0, 0, 0);
    
    // 렌더러 설정
    this.renderer = new THREE.WebGLRenderer({ 
      antialias: true,
      alpha: true
    });
    this.renderer.setSize(container.clientWidth, container.clientHeight);
    this.renderer.shadowMap.enabled = true;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    
    // 페이지 크기 설정 (A4 비율)
    this.pageWidth = 2.1;
    this.pageHeight = 2.97;
    
    // 조명 설정
    this.ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
    this.scene.add(this.ambientLight);
    
    this.directionalLight = new THREE.DirectionalLight(0xffffff, 0.4);
    this.directionalLight.position.set(5, 5, 5);
    this.directionalLight.castShadow = true;
    this.directionalLight.shadow.camera.near = 0.1;
    this.directionalLight.shadow.camera.far = 20;
    this.directionalLight.shadow.camera.left = -5;
    this.directionalLight.shadow.camera.right = 5;
    this.directionalLight.shadow.camera.top = 5;
    this.directionalLight.shadow.camera.bottom = -5;
    this.directionalLight.shadow.mapSize.width = 2048;
    this.directionalLight.shadow.mapSize.height = 2048;
    this.scene.add(this.directionalLight);
    
    // 포인트 라이트 (페이지 굴곡 강조)
    this.pointLight = new THREE.PointLight(0xffffff, 0.3);
    this.pointLight.position.set(0, 0, 2);
    this.scene.add(this.pointLight);
    
    // 렌더러를 컨테이너에 추가
    container.appendChild(this.renderer.domElement);
    this.renderer.domElement.style.position = 'absolute';
    this.renderer.domElement.style.top = '0';
    this.renderer.domElement.style.left = '0';
    this.renderer.domElement.style.zIndex = '1000';
    this.renderer.domElement.style.pointerEvents = 'none';
  }
  
  /**
   * Canvas를 Three.js 텍스처로 변환
   */
  private canvasToTexture(canvas: HTMLCanvasElement): THREE.Texture {
    const texture = new THREE.CanvasTexture(canvas);
    texture.minFilter = THREE.LinearFilter;
    texture.magFilter = THREE.LinearFilter;
    texture.generateMipmaps = false;
    return texture;
  }
  
  /**
   * 페이지 메쉬 생성
   */
  private createPageMesh(frontTexture: THREE.Texture, backTexture?: THREE.Texture): THREE.Mesh {
    // 커스텀 셰이더 머티리얼로 양면 텍스처 처리
    const materials = [
      new THREE.MeshPhongMaterial({ 
        map: frontTexture,
        side: THREE.FrontSide,
        transparent: false,
        shininess: 30,
        specular: new THREE.Color(0x222222)
      }),
      new THREE.MeshPhongMaterial({ 
        map: backTexture || frontTexture,
        side: THREE.BackSide,
        transparent: false,
        shininess: 30,
        specular: new THREE.Color(0x222222)
      })
    ];
    
    // 얇은 박스 지오메트리로 페이지 표현
    const geometry = new THREE.BoxGeometry(this.pageWidth, this.pageHeight, 0.01);
    
    // 양면 렌더링을 위한 그룹
    const group = new THREE.Group();
    materials.forEach((material, index) => {
      const mesh = new THREE.Mesh(geometry, material);
      mesh.castShadow = true;
      mesh.receiveShadow = true;
      group.add(mesh);
    });
    
    // 단일 메쉬로 반환
    const mesh = new THREE.Mesh(geometry, materials[0]);
    mesh.castShadow = true;
    mesh.receiveShadow = true;
    
    return mesh;
  }
  
  /**
   * 페이지 플립을 위한 곡선 지오메트리 생성
   */
  private createFlipPageGeometry(): THREE.BufferGeometry {
    const segments = 50; // 세그먼트 수 (곡선의 부드러움)
    const vertices: number[] = [];
    const normals: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    
    // 페이지를 세로 세그먼트로 나누어 곡선 효과 생성
    for (let i = 0; i <= segments; i++) {
      const t = i / segments;
      const x = -this.pageWidth / 2 + this.pageWidth * t;
      
      // 위쪽 정점
      vertices.push(x, this.pageHeight / 2, 0);
      normals.push(0, 0, 1);
      uvs.push(t, 1);
      
      // 아래쪽 정점
      vertices.push(x, -this.pageHeight / 2, 0);
      normals.push(0, 0, 1);
      uvs.push(t, 0);
    }
    
    // 인덱스 생성 (삼각형 구성)
    for (let i = 0; i < segments; i++) {
      const a = i * 2;
      const b = i * 2 + 1;
      const c = i * 2 + 2;
      const d = i * 2 + 3;
      
      // 두 개의 삼각형으로 사각형 구성
      indices.push(a, b, c);
      indices.push(b, d, c);
    }
    
    const geometry = new THREE.BufferGeometry();
    geometry.setAttribute('position', new THREE.Float32BufferAttribute(vertices, 3));
    geometry.setAttribute('normal', new THREE.Float32BufferAttribute(normals, 3));
    geometry.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geometry.setIndex(indices);
    
    return geometry;
  }
  
  /**
   * 페이지 플립 애니메이션 수행
   */
  async flipForward(
    currentLeftCanvas: HTMLCanvasElement,
    currentRightCanvas: HTMLCanvasElement,
    nextLeftCanvas: HTMLCanvasElement,
    nextRightCanvas: HTMLCanvasElement | null
  ): Promise<void> {
    if (this.isAnimating) return;
    this.isAnimating = true;
    
    // 기존 메쉬 제거
    this.clearScene();
    
    // 텍스처 생성
    const currentLeftTexture = this.canvasToTexture(currentLeftCanvas);
    const currentRightTexture = this.canvasToTexture(currentRightCanvas);
    const nextLeftTexture = this.canvasToTexture(nextLeftCanvas);
    const nextRightTexture = nextRightCanvas ? this.canvasToTexture(nextRightCanvas) : null;
    
    // 왼쪽 페이지 (고정)
    this.leftPageMesh = this.createPageMesh(currentLeftTexture);
    this.leftPageMesh.position.x = -this.pageWidth / 2;
    this.scene.add(this.leftPageMesh);
    
    // 오른쪽 페이지 (넘길 페이지)
    const flipGeometry = this.createFlipPageGeometry();
    const flipMaterial = new THREE.ShaderMaterial({
      uniforms: {
        frontTexture: { value: currentRightTexture },
        backTexture: { value: nextLeftTexture },
        flipProgress: { value: 0.0 },
        curlAmount: { value: 0.15 }
      },
      vertexShader: `
        uniform float flipProgress;
        uniform float curlAmount;
        varying vec2 vUv;
        varying float vFlipAmount;
        
        void main() {
          vUv = uv;
          vec3 pos = position;
          
          // 플립 진행도에 따른 x 위치
          float flipX = mix(0.0, -1.0, flipProgress);
          
          // 페이지 컬링 효과
          float curlFactor = smoothstep(0.0, 1.0, vUv.x);
          float curl = sin(flipProgress * 3.14159) * curlAmount * curlFactor;
          
          // 회전 각도 계산
          float angle = flipProgress * 3.14159 * vUv.x;
          
          // 3D 변환
          pos.x = pos.x * cos(angle) + flipX;
          pos.z = pos.x * sin(angle) + curl;
          
          vFlipAmount = flipProgress;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D frontTexture;
        uniform sampler2D backTexture;
        uniform float flipProgress;
        varying vec2 vUv;
        varying float vFlipAmount;
        
        void main() {
          vec2 uv = vUv;
          
          // 뒤집힘 정도에 따라 앞면/뒷면 텍스처 선택
          vec4 color;
          if (vFlipAmount < 0.5) {
            color = texture2D(frontTexture, uv);
          } else {
            // 뒷면은 좌우 반전
            uv.x = 1.0 - uv.x;
            color = texture2D(backTexture, uv);
          }
          
          // 그림자 효과 추가
          float shadow = 1.0 - abs(vFlipAmount - 0.5) * 0.4;
          color.rgb *= shadow;
          
          gl_FragColor = color;
        }
      `,
      side: THREE.DoubleSide
    });
    
    this.flippingPageMesh = new THREE.Mesh(flipGeometry, flipMaterial);
    this.flippingPageMesh.position.x = this.pageWidth / 2;
    this.scene.add(this.flippingPageMesh);
    
    // 애니메이션
    const flipAnimation = new TWEEN.Tween({ progress: 0 })
      .to({ progress: 1 }, this.animationDuration)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate((obj) => {
        if (flipMaterial.uniforms) {
          flipMaterial.uniforms.flipProgress.value = obj.progress;
        }
      })
      .onComplete(() => {
        // 애니메이션 완료 후 정리
        this.clearScene();
        
        // 최종 페이지 표시
        if (nextRightTexture) {
          this.leftPageMesh = this.createPageMesh(nextLeftTexture);
          this.leftPageMesh.position.x = -this.pageWidth / 2;
          this.scene.add(this.leftPageMesh);
          
          this.rightPageMesh = this.createPageMesh(nextRightTexture);
          this.rightPageMesh.position.x = this.pageWidth / 2;
          this.scene.add(this.rightPageMesh);
        }
        
        this.isAnimating = false;
      })
      .start();
    
    // 애니메이션 루프
    return new Promise((resolve) => {
      const animate = () => {
        if (!this.isAnimating) {
          resolve();
          return;
        }
        
        this.animationFrame = requestAnimationFrame(animate);
        TWEEN.update();
        this.renderer.render(this.scene, this.camera);
      };
      animate();
    });
  }
  
  /**
   * 뒤로 페이지 플립
   */
  async flipBackward(
    currentLeftCanvas: HTMLCanvasElement,
    currentRightCanvas: HTMLCanvasElement,
    prevLeftCanvas: HTMLCanvasElement,
    prevRightCanvas: HTMLCanvasElement | null
  ): Promise<void> {
    if (this.isAnimating) return;
    this.isAnimating = true;
    
    // 기존 메쉬 제거
    this.clearScene();
    
    // 텍스처 생성
    const currentLeftTexture = this.canvasToTexture(currentLeftCanvas);
    const currentRightTexture = this.canvasToTexture(currentRightCanvas);
    const prevLeftTexture = this.canvasToTexture(prevLeftCanvas);
    const prevRightTexture = prevRightCanvas ? this.canvasToTexture(prevRightCanvas) : null;
    
    // 오른쪽 페이지 (고정)
    this.rightPageMesh = this.createPageMesh(currentRightTexture);
    this.rightPageMesh.position.x = this.pageWidth / 2;
    this.scene.add(this.rightPageMesh);
    
    // 왼쪽 페이지 (넘길 페이지) - 뒤에서 앞으로
    const flipGeometry = this.createFlipPageGeometry();
    const flipMaterial = new THREE.ShaderMaterial({
      uniforms: {
        frontTexture: { value: prevRightTexture ?? currentLeftTexture },
        backTexture: { value: currentLeftTexture },
        flipProgress: { value: 0.0 },
        curlAmount: { value: 0.15 }
      },
      vertexShader: `
        uniform float flipProgress;
        uniform float curlAmount;
        varying vec2 vUv;
        varying float vFlipAmount;
        
        void main() {
          vUv = uv;
          vec3 pos = position;
          
          // 반대 방향 플립
          float flipX = mix(-1.0, 0.0, flipProgress);
          
          // 페이지 컬링 효과 (반대)
          float curlFactor = smoothstep(1.0, 0.0, vUv.x);
          float curl = sin(flipProgress * 3.14159) * curlAmount * curlFactor;
          
          // 회전 각도 계산 (반대)
          float angle = (1.0 - flipProgress) * 3.14159 * (1.0 - vUv.x);
          
          // 3D 변환
          pos.x = pos.x * cos(angle) + flipX;
          pos.z = -pos.x * sin(angle) + curl;
          
          vFlipAmount = 1.0 - flipProgress;
          
          gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
        }
      `,
      fragmentShader: `
        uniform sampler2D frontTexture;
        uniform sampler2D backTexture;
        uniform float flipProgress;
        varying vec2 vUv;
        varying float vFlipAmount;
        
        void main() {
          vec2 uv = vUv;
          
          // 뒤집힘 정도에 따라 앞면/뒷면 텍스처 선택
          vec4 color;
          if (vFlipAmount > 0.5) {
            color = texture2D(backTexture, uv);
          } else {
            // 뒷면은 좌우 반전
            uv.x = 1.0 - uv.x;
            color = texture2D(frontTexture, uv);
          }
          
          // 그림자 효과 추가
          float shadow = 1.0 - abs(vFlipAmount - 0.5) * 0.4;
          color.rgb *= shadow;
          
          gl_FragColor = color;
        }
      `,
      side: THREE.DoubleSide
    });
    
    this.flippingPageMesh = new THREE.Mesh(flipGeometry, flipMaterial);
    this.flippingPageMesh.position.x = -this.pageWidth / 2;
    this.scene.add(this.flippingPageMesh);
    
    // 애니메이션
    const flipAnimation = new TWEEN.Tween({ progress: 0 })
      .to({ progress: 1 }, this.animationDuration)
      .easing(TWEEN.Easing.Cubic.InOut)
      .onUpdate((obj) => {
        if (flipMaterial.uniforms) {
          flipMaterial.uniforms.flipProgress.value = obj.progress;
        }
      })
      .onComplete(() => {
        // 애니메이션 완료 후 정리
        this.clearScene();
        
        // 최종 페이지 표시
        if (prevRightTexture) {
          this.leftPageMesh = this.createPageMesh(prevLeftTexture);
          this.leftPageMesh.position.x = -this.pageWidth / 2;
          this.scene.add(this.leftPageMesh);
          
          this.rightPageMesh = this.createPageMesh(prevRightTexture);
          this.rightPageMesh.position.x = this.pageWidth / 2;
          this.scene.add(this.rightPageMesh);
        }
        
        this.isAnimating = false;
      })
      .start();
    
    // 애니메이션 루프
    return new Promise((resolve) => {
      const animate = () => {
        if (!this.isAnimating) {
          resolve();
          return;
        }
        
        this.animationFrame = requestAnimationFrame(animate);
        TWEEN.update();
        this.renderer.render(this.scene, this.camera);
      };
      animate();
    });
  }
  
  /**
   * 씬 정리
   */
  private clearScene(): void {
    if (this.leftPageMesh) {
      this.scene.remove(this.leftPageMesh);
      this.leftPageMesh = null;
    }
    if (this.rightPageMesh) {
      this.scene.remove(this.rightPageMesh);
      this.rightPageMesh = null;
    }
    if (this.flippingPageMesh) {
      this.scene.remove(this.flippingPageMesh);
      this.flippingPageMesh = null;
    }
  }
  
  /**
   * 화면 크기 조정
   */
  resize(): void {
    const width = this.container.clientWidth;
    const height = this.container.clientHeight;
    
    this.camera.aspect = width / height;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
  }
  
  /**
   * 리소스 정리
   */
  dispose(): void {
    if (this.animationFrame) {
      cancelAnimationFrame(this.animationFrame);
    }
    
    this.clearScene();
    this.renderer.dispose();
    
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
  
  /**
   * 애니메이션 상태 확인
   */
  getIsAnimating(): boolean {
    return this.isAnimating;
  }
}