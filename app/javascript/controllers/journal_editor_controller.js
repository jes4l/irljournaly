import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [ 
    "canvas", "form", "contentInput", "imageInput",
    "sizeInput", "fontInput", "boldBtn", "italicBtn", "underlineBtn"
  ]

  connect() {
    this.dragging = null
    this.offsetX = 0
    this.offsetY = 0

    this.canvasTarget.querySelectorAll('.canvas-content').forEach(el => {
      el.setAttribute('contenteditable', 'true')
    })

    this.canvasTarget.querySelectorAll('.canvas-element').forEach(el => {
      if (!el.querySelector('.btn-danger')) {
        el.insertAdjacentHTML('beforeend', '<button class="btn btn-sm btn-danger position-absolute top-0 end-0 m-2" data-action="click->journal-editor#deleteElement" style="z-index: 10;"><i class="bi bi-trash"></i></button>')
      }
    })

    this.selectionHandler = this.checkFormatting.bind(this)
    document.addEventListener("selectionchange", this.selectionHandler)
  }

  disconnect() {
    document.removeEventListener("selectionchange", this.selectionHandler)
  }

  checkFormatting() {
    const selection = window.getSelection()
    if (!selection.rangeCount) return
    const node = selection.anchorNode
    if (!this.canvasTarget.contains(node)) return
    if (this.hasBoldBtnTarget) this.boldBtnTarget.classList.toggle("bg-secondary", document.queryCommandState("bold"))
    if (this.hasItalicBtnTarget) this.italicBtnTarget.classList.toggle("bg-secondary", document.queryCommandState("italic"))
    if (this.hasUnderlineBtnTarget) this.underlineBtnTarget.classList.toggle("bg-secondary", document.queryCommandState("underline"))
    if (this.hasSizeInputTarget) {
      let fontSize = document.queryCommandValue("fontSize")
      if (fontSize) this.sizeInputTarget.value = fontSize
    }
    if (this.hasFontInputTarget) {
      let fontName = document.queryCommandValue("fontName")
      if (fontName) {
        fontName = fontName.replace(/['"]/g, "")
        Array.from(this.fontInputTarget.options).forEach(opt => {
          if (opt.value.replace(/['"]/g, "").includes(fontName)) {
            this.fontInputTarget.value = opt.value
          }
        })
      }
    }
  }

  addText() {
    const wrapper = document.createElement("div")
    wrapper.className = "canvas-element canvas-text"
    wrapper.style.left = "50px"
    wrapper.style.top = "150px"
    wrapper.innerHTML = `
      <div class="drag-handle" data-action="mousedown->journal-editor#dragStart"><i class="bi bi-grip-horizontal"></i></div>
      <button class="btn btn-sm btn-danger position-absolute top-0 end-0 m-2" data-action="click->journal-editor#deleteElement" style="z-index: 10;"><i class="bi bi-trash"></i></button>
      <div class="canvas-content" contenteditable="true">Type here...</div>
    `
    this.canvasTarget.appendChild(wrapper)
  }

  triggerImage() {
    this.imageInputTarget.click()
  }

  async handleImage(event) {
    const files = event.target.files
    if (!files.length) return
    Array.from(files).forEach(async (file) => {
      const wrapper = document.createElement("div")
      wrapper.className = "canvas-element canvas-img-container"
      wrapper.style.left = "50px"
      wrapper.style.top = "150px"
      wrapper.innerHTML = `
        <div class="drag-handle" data-action="mousedown->journal-editor#dragStart"><i class="bi bi-arrows-move"></i></div>
        <button class="btn btn-sm btn-danger position-absolute top-0 end-0 m-2 d-none" data-action="click->journal-editor#deleteElement" style="z-index: 10;"><i class="bi bi-trash"></i></button>
        <div class="canvas-img-wrapper" style="width: 250px; height: 150px; display: flex; align-items: center; justify-content: center; background: rgba(0,0,0,0.05);">
          <div class="spinner-border text-dark" role="status"></div>
        </div>
      `
      this.canvasTarget.appendChild(wrapper)
      const formData = new FormData()
      formData.append("image", file)
      try {
        const response = await fetch("/entries/upload_image", {
          method: "POST",
          body: formData,
          headers: {
            "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]').content,
            "Accept": "application/json"
          }
        })
        const data = await response.json()
        if (data.success) {
          wrapper.dataset.imageId = data.image_id
          wrapper.querySelector('.canvas-img-wrapper').innerHTML = `<img src="${data.image_url}" draggable="false" style="width: 100%; height: 100%; object-fit: cover;">`
          wrapper.querySelector('.btn-danger').classList.remove('d-none')
          const img = wrapper.querySelector('img')
          img.onload = () => {
            wrapper.querySelector('.canvas-img-wrapper').style.height = "auto"
            wrapper.querySelector('.canvas-img-wrapper').style.aspectRatio = `${img.naturalWidth} / ${img.naturalHeight}`
          }
        } else {
          wrapper.remove()
        }
      } catch (e) {
        wrapper.remove()
      }
    })
    event.target.value = ""
  }

  async deleteElement(event) {
    const wrapper = event.target.closest('.canvas-element')
    const imageId = wrapper.dataset.imageId
    wrapper.remove()
    if (imageId) {
      await fetch(`/entries/delete_image/${imageId}`, {
        method: "DELETE",
        headers: {
          "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]').content,
          "Accept": "application/json"
        }
      })
    }
  }

  format(event) {
    document.execCommand(event.currentTarget.dataset.command, false, null)
    this.checkFormatting()
  }

  changeFont(event) {
    document.execCommand('fontName', false, event.target.value)
    this.checkFormatting()
  }

  changeSize(event) {
    document.execCommand('fontSize', false, event.target.value)
    this.checkFormatting()
  }

  save() {
    const canvasClone = this.canvasTarget.cloneNode(true)
    canvasClone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'))
    canvasClone.querySelectorAll('.btn-danger').forEach(el => el.remove())
    this.contentInputTarget.value = canvasClone.innerHTML
    this.formTarget.submit()
  }

  dragStart(e) {
    const handle = e.target.closest('.drag-handle')
    if (handle) {
      this.dragging = handle.closest('.canvas-element')
      const rect = this.dragging.getBoundingClientRect()
      this.offsetX = e.clientX - rect.left
      this.offsetY = e.clientY - rect.top
    }
  }

  drag(e) {
    if (this.dragging) {
      const canvasRect = this.canvasTarget.getBoundingClientRect()
      let newLeft = e.clientX - canvasRect.left - this.offsetX
      let newTop = e.clientY - canvasRect.top - this.offsetY
      this.dragging.style.left = `${newLeft}px`
      this.dragging.style.top = `${newTop}px`
    }
  }

  dragEnd() {
    this.dragging = null
  }
}