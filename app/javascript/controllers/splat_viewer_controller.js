import { Controller } from "@hotwired/stimulus"
import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d'

export default class extends Controller {
  static values = { urls: Array }

  connect() {
    this.initViewer()
  }

  disconnect() {
    this.cleanup()
  }

  cleanup() {
    if (this.viewer) {
      this.viewer.dispose()
      this.viewer = null
    }
    this.element.innerHTML = ""
  }

  initViewer() {
    const spacing = 15;
    const totalWidth = (this.urlsValue.length - 1) * spacing;
    const centerX = totalWidth / 2;
    const cameraZ = 15 + (this.urlsValue.length * 5);

    this.viewer = new GaussianSplats3D.Viewer({
      'rootElement': this.element,
      'cameraUp': [0, 1, 0],
      'initialCameraPosition': [centerX, 0, cameraZ],
      'initialCameraLookAt': [centerX, 0, 0],
      'sharedMemoryForWorkers': false
    })

    const scenes = this.urlsValue.map((url, index) => {
      return {
        'path': url,
        'rotation': [1, 0, 0, 0], 
        'scale': [1, 1, 1],
        'position': [index * spacing, 0, 0] 
      }
    })

    this.viewer.addSplatScenes(scenes, false)
      .then(() => {
          this.viewer.start()

          if (this.viewer.cameraControls) {
             this.viewer.cameraControls.minDistance = 0.01
          }
      })
      .catch((error) => {
          console.error("Error loading splats:", error)
      })
  }
}