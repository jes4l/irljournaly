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
    this.accumulatedFiles = new DataTransfer()

    this.canvasTarget.querySelectorAll('.canvas-content').forEach(el => {
      el.setAttribute('contenteditable', 'true')
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
      <div class="canvas-content" contenteditable="true">Type here...</div>
    `
    this.canvasTarget.appendChild(wrapper)
  }

  triggerImage() {
    this.imageInputTarget.click()
  }

  handleImage(event) {
    const files = event.target.files
    if (!files.length) return

    Array.from(files).forEach(file => {
      this.accumulatedFiles.items.add(file)

      const reader = new FileReader()
      reader.onload = (e) => {
        const img = new Image()
        img.src = e.target.result
        
        img.onload = () => {
          const wrapper = document.createElement("div")
          wrapper.className = "canvas-element canvas-img-container"
          wrapper.style.left = "50px"
          wrapper.style.top = "150px"

          wrapper.innerHTML = `
            <div class="drag-handle" data-action="mousedown->journal-editor#dragStart"><i class="bi bi-arrows-move"></i></div>
            <div class="canvas-img-wrapper" style="aspect-ratio: ${img.naturalWidth} / ${img.naturalHeight}; width: 250px; height: auto;">
              <img src="${e.target.result}" draggable="false">
            </div>
          `
          this.canvasTarget.appendChild(wrapper)
        }
      }
      reader.readAsDataURL(file)
    })

    this.imageInputTarget.files = this.accumulatedFiles.files
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