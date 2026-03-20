import { Controller } from "@hotwired/stimulus"
import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d'
import * as THREE from 'three'

export default class extends Controller {
  static values = { urls: Array }
  static targets = [ "track", "prevBtn", "nextBtn" ]

  connect() {
    this.currentIndex = 0
    this.viewers = []
    this.initialCameraStates = {}
    this.buildSlides()
    this.updateButtons()
  }

  disconnect() {
    this.cleanup()
  }

  cleanup() {
    this.viewers.forEach(v => {
      if (v) v.dispose()
    })
    this.viewers = []
    if (this.hasTrackTarget) this.trackTarget.innerHTML = ""
  }

  buildSlides() {
    this.urlsValue.forEach((url, index) => {
      const slide = document.createElement('div')
      slide.className = 'splat-slide'
      this.trackTarget.appendChild(slide)

      const viewer = new GaussianSplats3D.Viewer({
        'rootElement': slide,
        'cameraUp': [0, 1, 0],
        'sharedMemoryForWorkers': false
      })

      viewer.addSplatScene(url, {
        'showLoadingUI': false,
        'rotation': [1, 0, 0, 0],
        'scale': [1, 1, 1]
      }).then(() => {
        viewer.start()
        this.frameViewer(viewer, index, slide)
      }).catch((error) => {
        console.error(error)
      })

      this.viewers.push(viewer)
    })
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
      }
    }
  }

  next() {
    if (this.currentIndex < this.urlsValue.length - 1) {
      this.currentIndex++
      this.slideTrack()
    }
  }

  prev() {
    if (this.currentIndex > 0) {
      this.currentIndex--
      this.slideTrack()
    }
  }

  slideTrack() {
    this.updateButtons()
    this.trackTarget.style.transform = `translateX(-${this.currentIndex * 100}vw)`
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