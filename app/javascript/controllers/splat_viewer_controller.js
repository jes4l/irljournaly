import { Controller } from "@hotwired/stimulus"
import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d'
import * as THREE from 'three'

export default class extends Controller {
  static values = { urls: Array, imageUrls: Array }
  static targets = [ "track", "prevBtn", "nextBtn" ]

  connect() {
    this.currentIndex = 0
    this.viewers = new Array(this.urlsValue.length).fill(null)
    this.loadingStates = new Array(this.urlsValue.length).fill(false)
    this.initialCameraStates = {}
    this.loadTimeout = null

    this.buildSlideDOM()
    this.updateButtons()

    this.keydownHandler = this.handleKeyDown.bind(this);
    document.addEventListener('keydown', this.keydownHandler, true);

    setTimeout(() => {
      this.settleAndLoad()
    }, 350)
  }

  disconnect() {
    this.cleanup()
    document.removeEventListener('keydown', this.keydownHandler, true);
  }

  handleKeyDown(event) {
    if (['INPUT', 'BUTTON', 'TEXTAREA', 'A'].includes(event.target.tagName) || event.target.isContentEditable) {
      return; 
    }
    
    if (!this.element.classList.contains('active')) return;

    const viewer = this.viewers[this.currentIndex];
    if (!viewer || !viewer.camera || !viewer.cameraControls) return;

    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(event.key)) {
      event.preventDefault();
      event.stopPropagation();
      return;
    }

    let moveAmount = 0;
    const zoomStep = 0.6; 

    if (['=', '+', 'i', 'I'].includes(event.key)) {
      moveAmount = zoomStep; 
    } else if (['-', '_', 'o', 'O'].includes(event.key)) {
      moveAmount = -zoomStep; 
    }

    if (moveAmount !== 0) {
      event.preventDefault();
      event.stopPropagation();
      const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(viewer.camera.quaternion);
      viewer.camera.position.addScaledVector(direction, moveAmount);
      viewer.cameraControls.target.addScaledVector(direction, moveAmount);
      viewer.cameraControls.update();
    }
  }

  cleanup() {
    this.viewers.forEach(v => {
      if (v) {
        try { v.dispose() } catch(e) {}
      }
    })
    this.viewers = []
    if (this.hasTrackTarget) this.trackTarget.innerHTML = ""
  }

  buildSlideDOM() {
    this.urlsValue.forEach((url, index) => {
      const slide = document.createElement('div')
      slide.className = 'splat-slide'
      slide.dataset.index = index
      slide.tabIndex = 0;
      slide.setAttribute("role", "application");
      slide.setAttribute("aria-label", "Interactive 3D Journal Viewer. Press the equals or I key to zoom in, and the minus or O key to zoom out. Click and drag your mouse to look around.");
      
      this.trackTarget.appendChild(slide)
      this.resetSlideDOM(index)
    })
  }

  resetSlideDOM(index) {
    const slide = this.trackTarget.children[index]
    if (!slide) return
    
    const imageUrl = this.imageUrlsValue && this.imageUrlsValue[index] ? this.imageUrlsValue[index] : "";

    slide.innerHTML = `
      <img src="${imageUrl}" style="width: 100%; height: 100%; object-fit: contain; position: absolute; top: 0; left: 0; z-index: -1; filter: blur(5px) brightness(0.7);" />
      <div class="position-absolute top-50 start-50 translate-middle text-white text-center loading-indicator">
        <div class="spinner-border mb-2" role="status" style="width: 3rem; height: 3rem;"></div>
        <div class="fw-bold" style="font-family: 'Patrick Hand', cursive; font-size: 1.5rem; text-shadow: 2px 2px 4px #000;">Loading splat...</div>
      </div>
    `
  }

  async settleAndLoad() {
    this.cleanupDistantViewers()
    this.viewers.forEach((v, i) => {
      if (v && i !== this.currentIndex) v.stop()
    })

    if (!this.viewers[this.currentIndex]) {
      await this.loadViewer(this.currentIndex)
    } else {
      this.viewers[this.currentIndex].start()
      setTimeout(() => { window.dispatchEvent(new Event('resize')) }, 50)
    }

    if (this.currentIndex + 1 < this.urlsValue.length && !this.viewers[this.currentIndex + 1]) {
      this.loadViewer(this.currentIndex + 1)
    }
  }

  cleanupDistantViewers() {
    this.viewers.forEach((v, i) => {
      if (Math.abs(i - this.currentIndex) > 1) {
        if (v) {
          try { v.dispose() } catch(e) {}
          this.viewers[i] = null
        }
        this.loadingStates[i] = false
        this.resetSlideDOM(i)
      }
    })
  }

  async loadViewer(index) {
    if (this.viewers[index] || this.loadingStates[index]) return;

    this.loadingStates[index] = true;
    const slide = this.trackTarget.children[index];
    const url = this.urlsValue[index];

    const loader = slide.querySelector('.loading-indicator');
    if (loader) loader.style.display = 'block';

    const viewer = new GaussianSplats3D.Viewer({
      'rootElement': slide,
      'cameraUp': [0, 1, 0],
      'halfPrecisionCovariancesOnGPU': true,
      'devicePixelRatio': 1, 
      'antialias': false     
    });

    this.viewers[index] = viewer;

    try {
      await viewer.addSplatScene(url, {
        'showLoadingUI': false,
        'rotation': [1, 0, 0, 0],
        'scale': [1, 1, 1],
        'splatAlphaRemovalThreshold': 20, 
        'sphericalHarmonicsDegree': 0 
      });

      if (!this.viewers[index]) return;

      this.frameViewer(viewer, index, slide);
      
      if (index === this.currentIndex) {
        viewer.start();
        setTimeout(() => { window.dispatchEvent(new Event('resize')) }, 50);
      }
      
      if (loader) loader.style.display = 'none';
      const img = slide.querySelector('img');
      if (img) img.style.display = 'none';
      
    } catch (error) {
      if (this.viewers[index]) {
        if (loader) loader.innerHTML = `<div class="text-danger fw-bold" style="text-shadow: 1px 1px 2px #000;">Failed</div>`;
        this.viewers[index] = null;
      }
    } finally {
      this.loadingStates[index] = false;
    }
  }

  frameViewer(viewer, index, slide) {
    if (!viewer.splatMesh) return
    
    let box = new THREE.Box3()
    if (typeof viewer.splatMesh.getBoundingBox === 'function') {
      box = viewer.splatMesh.getBoundingBox()
    } else {
      box.setFromObject(viewer.splatMesh)
    }
    
    const center = new THREE.Vector3()
    box.getCenter(center)
    const size = new THREE.Vector3()
    box.getSize(size)
    const maxDim = Math.min(Math.max(size.x, size.y, size.z), 30)
    const distance = maxDim > 0 ? maxDim * 0.8 : 5
    
    viewer.camera.position.set(center.x, center.y, center.z + distance)
    viewer.camera.near = 0.01
    viewer.camera.updateProjectionMatrix()
    
    if (viewer.cameraControls) {
      viewer.cameraControls.target.copy(center)
      viewer.cameraControls.enableZoom = false
      
      slide.addEventListener('wheel', (event) => {
        event.preventDefault()
        const zoomSpeed = 0.005 
        const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(viewer.camera.quaternion)
        const moveAmount = event.deltaY * zoomSpeed

        viewer.camera.position.addScaledVector(direction, -moveAmount)
        viewer.cameraControls.target.addScaledVector(direction, -moveAmount)
        viewer.cameraControls.update()
      }, { passive: false })

      let initialPinchDistance = null;

      slide.addEventListener('touchstart', (event) => {
        if (event.touches.length === 2) {
          const dx = event.touches[0].pageX - event.touches[1].pageX;
          const dy = event.touches[0].pageY - event.touches[1].pageY;
          initialPinchDistance = Math.hypot(dx, dy);
        }
      }, { passive: false });

      slide.addEventListener('touchmove', (event) => {
        if (event.touches.length === 2) {
          event.preventDefault();
          const dx = event.touches[0].pageX - event.touches[1].pageX;
          const dy = event.touches[0].pageY - event.touches[1].pageY;
          const currentPinchDistance = Math.hypot(dx, dy);

          if (initialPinchDistance) {
            const pinchDelta = initialPinchDistance - currentPinchDistance;
            const pinchSpeed = 0.02; 
            const moveAmount = pinchDelta * pinchSpeed;

            const direction = new THREE.Vector3(0, 0, -1).applyQuaternion(viewer.camera.quaternion);
            viewer.camera.position.addScaledVector(direction, -moveAmount);
            viewer.cameraControls.target.addScaledVector(direction, -moveAmount);
            viewer.cameraControls.update();
          }
          initialPinchDistance = currentPinchDistance;
        }
      }, { passive: false });

      slide.addEventListener('touchend', (event) => {
        if (event.touches.length < 2) {
          initialPinchDistance = null;
        }
      }, { passive: false });
    }

    this.initialCameraStates[index] = {
      position: viewer.camera.position.clone(),
      target: viewer.cameraControls ? viewer.cameraControls.target.clone() : center.clone()
    }
  }

  resetCamera() {
    const currentViewer = this.viewers[this.currentIndex]
    const initialState = this.initialCameraStates[this.currentIndex]
    if (currentViewer && initialState) {
      currentViewer.camera.position.copy(initialState.position)
      if (currentViewer.cameraControls) {
        currentViewer.cameraControls.target.copy(initialState.target)
        currentViewer.cameraControls.update()
      }
    }
  }

  async next() {
    if (this.currentIndex < this.urlsValue.length - 1) {
      this.currentIndex++
      this.slideTrack()
    }
  }

  async prev() {
    if (this.currentIndex > 0) {
      this.currentIndex--
      this.slideTrack()
    }
  }

  slideTrack() {
    this.updateButtons()
    this.trackTarget.style.transform = `translateX(-${this.currentIndex * 100}vw)`
    this.viewers.forEach((v) => {
      if (v) v.stop()
    })

    clearTimeout(this.loadTimeout)

    this.loadTimeout = setTimeout(() => {
      this.settleAndLoad()
    }, 300)
  }

  updateButtons() {
    if (this.hasPrevBtnTarget) {
      this.prevBtnTarget.style.display = this.currentIndex === 0 ? 'none' : 'flex'
    }
    if (this.hasNextBtnTarget) {
      this.nextBtnTarget.style.display = this.currentIndex === this.urlsValue.length - 1 ? 'none' : 'flex'
    }
  }
}