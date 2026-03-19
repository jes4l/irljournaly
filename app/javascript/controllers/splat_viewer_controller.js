import { Controller } from "@hotwired/stimulus"
import * as GaussianSplats3D from '@mkkellogg/gaussian-splats-3d'

export default class extends Controller {
  static values = { url: String }

  connect() {
    this.initialized = false
    this.modal = this.element.closest('.modal')

    if (this.modal) {
      this.modal.addEventListener('shown.bs.modal', () => {
        if (!this.initialized) {
          this.initViewer()
          this.initialized = true
        }
      })

      this.modal.addEventListener('hidden.bs.modal', () => {
        this.cleanup()
      })
    } else {
      this.initViewer()
      this.initialized = true
    }
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
    this.initialized = false
  }

  initViewer() {
    this.viewer = new GaussianSplats3D.Viewer({
      'rootElement': this.element,
      'cameraUp': [0, -1, 0],
      'initialCameraPosition': [0, 0, 3],
      'initialCameraLookAt': [0, 0, 0],
      'sharedMemoryForWorkers': false
    })

    this.viewer.addSplatScene(this.urlValue, {
      'showLoadingUI': true,
      'scale': [-1, -1, 1]
    })
    .then(() => {
        this.viewer.start()
    })
    .catch((error) => {
        console.error("Error loading splat:", error)
    })
  }
}