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
        this.frameViewer(viewer, index)
      }).catch((error) => {
        console.error(error)
      })

      this.viewers.push(viewer)
    })
  }

  frameViewer(viewer, index) {
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
      const lookDirection = new THREE.Vector3(0, 0, -1).applyQuaternion(viewer.camera.quaternion)
      const farTarget = viewer.camera.position.clone().addScaledVector(lookDirection, 100000)
      
      viewer.cameraControls.target.copy(farTarget)
      viewer.cameraControls.minDistance = 0.00001
      viewer.cameraControls.maxDistance = 100000
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