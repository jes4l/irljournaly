import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [ 
    "canvas", "form", "contentInput", "imageInput",
    "sizeInput", "fontInput", "boldBtn", "italicBtn", "underlineBtn"
  ]

  connect() {
    this.dragging = null
    this.resizingElement = null
    this.offsetX = 0
    this.offsetY = 0

    this.canvasTarget.querySelectorAll('.canvas-content').forEach(el => {
      el.setAttribute('contenteditable', 'true')
      el.setAttribute('data-placeholder', 'Type here...')
      if (el.innerText.trim() === "Type here...") {
        el.innerText = ""
      }
    })

    this.canvasTarget.querySelectorAll('.canvas-element').forEach(el => {
      if (!el.querySelector('.btn-danger')) {
        el.insertAdjacentHTML('beforeend', '<button class="btn btn-sm btn-danger position-absolute top-0 end-0 m-1" data-action="click->journal-editor#deleteElement" style="z-index: 10;" aria-label="Delete element" tabindex="0"><i class="bi bi-trash"></i></button>')
      }
      if (!el.querySelector('.resize-handle')) {
        el.insertAdjacentHTML('beforeend', '<div class="resize-handle" data-action="mousedown->journal-editor#resizeStart touchstart->journal-editor#resizeStart" aria-label="Resize element" tabindex="0"><i class="bi bi-arrows-angle-expand"></i></div>')
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
    wrapper.style.left = "5%"
    wrapper.style.top = "10%"
    wrapper.style.width = "40%"
    wrapper.innerHTML = `
      <div class="drag-handle" data-action="mousedown->journal-editor#dragStart touchstart->journal-editor#dragStart" tabindex="0" aria-label="Drag element"><i class="bi bi-arrows-move"></i></div>
      <button class="btn btn-sm btn-danger position-absolute top-0 end-0 m-1" data-action="click->journal-editor#deleteElement" style="z-index: 10;" aria-label="Delete element" tabindex="0"><i class="bi bi-trash"></i></button>
      <div class="canvas-content" contenteditable="true" data-placeholder="Type here..." aria-label="Text entry" tabindex="0" style="width: 100%; min-height: 50px;"></div>
      <div class="resize-handle" data-action="mousedown->journal-editor#resizeStart touchstart->journal-editor#resizeStart" aria-label="Resize element" tabindex="0"><i class="bi bi-arrows-angle-expand"></i></div>
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
      wrapper.style.left = "5%"
      wrapper.style.top = "10%"
      wrapper.style.width = "40%"
      wrapper.innerHTML = `
        <div class="drag-handle" data-action="mousedown->journal-editor#dragStart touchstart->journal-editor#dragStart" tabindex="0" aria-label="Drag element"><i class="bi bi-arrows-move"></i></div>
        <button class="btn btn-sm btn-danger position-absolute top-0 end-0 m-1 d-none" data-action="click->journal-editor#deleteElement" style="z-index: 10;" aria-label="Delete element" tabindex="0"><i class="bi bi-trash"></i></button>
        <div class="spinner-border text-dark m-4" role="status"></div>
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
          wrapper.innerHTML = `
            <div class="drag-handle" data-action="mousedown->journal-editor#dragStart touchstart->journal-editor#dragStart" tabindex="0" aria-label="Drag element"><i class="bi bi-arrows-move"></i></div>
            <button class="btn btn-sm btn-danger position-absolute top-0 end-0 m-1" data-action="click->journal-editor#deleteElement" style="z-index: 10;" aria-label="Delete element" tabindex="0"><i class="bi bi-trash"></i></button>
            <img src="${data.image_url}" draggable="false" alt="Journal image" style="width: 100%; height: auto; display: block;">
            <div class="resize-handle" data-action="mousedown->journal-editor#resizeStart touchstart->journal-editor#resizeStart" aria-label="Resize element" tabindex="0"><i class="bi bi-arrows-angle-expand"></i></div>
          `
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
      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      const clientY = e.touches ? e.touches[0].clientY : e.clientY
      this.offsetX = clientX - rect.left
      this.offsetY = clientY - rect.top
    }
  }

  resizeStart(e) {
    e.preventDefault()
    e.stopPropagation()
    const handle = e.target.closest('.resize-handle')
    if (handle) {
      this.resizingElement = handle.closest('.canvas-element')
      this.isImage = !!this.resizingElement.querySelector('img')
      this.targetNode = this.isImage ? this.resizingElement : this.resizingElement.querySelector('.canvas-content')
      
      const startX = e.touches ? e.touches[0].clientX : e.clientX
      const startY = e.touches ? e.touches[0].clientY : e.clientY
      const startWidth = parseFloat(getComputedStyle(this.resizingElement).width)
      const startHeight = this.isImage ? 0 : parseFloat(getComputedStyle(this.targetNode).height)
      
      this.resizeData = { startX, startY, startWidth, startHeight }
    }
  }

  handleMove(e) {
    if (this.dragging) {
      if (e.cancelable && e.type === 'touchmove') e.preventDefault();
      const canvasRect = this.canvasTarget.getBoundingClientRect()
      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      const clientY = e.touches ? e.touches[0].clientY : e.clientY
      
      let newLeft = clientX - canvasRect.left - this.offsetX
      let newTop = clientY - canvasRect.top - this.offsetY
      const elRect = this.dragging.getBoundingClientRect()
      
      newLeft = Math.max(0, Math.min(newLeft, canvasRect.width - elRect.width))
      newTop = Math.max(0, Math.min(newTop, canvasRect.height - elRect.height))
      
      let leftPct = (newLeft / canvasRect.width) * 100;
      let topPct = (newTop / canvasRect.height) * 100;

      this.dragging.style.left = `${leftPct}%`
      this.dragging.style.top = `${topPct}%`
    }
    
    if (this.resizingElement) {
      if (e.cancelable && e.type === 'touchmove') e.preventDefault();
      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      const clientY = e.touches ? e.touches[0].clientY : e.clientY
      
      const dx = clientX - this.resizeData.startX
      const dy = clientY - this.resizeData.startY
      
      const canvasRect = this.canvasTarget.getBoundingClientRect()
      const elLeft = this.resizingElement.offsetLeft
      const elTop = this.resizingElement.offsetTop
      
      const maxWidth = canvasRect.width - elLeft - 10 
      const maxHeight = canvasRect.height - elTop - 10
      
      let newWidth = Math.max(50, Math.min(this.resizeData.startWidth + dx, maxWidth))
      let widthPct = (newWidth / canvasRect.width) * 100;
      
      this.resizingElement.style.width = `${widthPct}%`
      
      if (!this.isImage) {
        let newHeight = Math.max(50, Math.min(this.resizeData.startHeight + dy, maxHeight))
        let heightPct = (newHeight / canvasRect.height) * 100;
        this.targetNode.style.height = `${heightPct}%`
      }
    }
  }

  handleEnd() {
    this.dragging = null
    this.resizingElement = null
  }

  handleKeydown(e) {
    const isDragHandle = e.target.closest('.drag-handle') === e.target;
    const isResizeHandle = e.target.closest('.resize-handle') === e.target;

    if (!isDragHandle && !isResizeHandle) return;

    const element = e.target.closest('.canvas-element');
    const step = e.shiftKey ? 5 : 1;

    if (isDragHandle) {
      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        
        let left = parseFloat(element.style.left) || 0;
        let top = parseFloat(element.style.top) || 0;

        switch(e.key) {
          case 'ArrowUp': top -= step; break;
          case 'ArrowDown': top += step; break;
          case 'ArrowLeft': left -= step; break;
          case 'ArrowRight': left += step; break;
        }

        left = Math.max(0, Math.min(left, 90));
        top = Math.max(0, Math.min(top, 90));

        element.style.left = `${left}%`;
        element.style.top = `${top}%`;
      }
    }

    if (isResizeHandle) {
      const isImage = !!element.querySelector('img');
      const targetNode = isImage ? element : element.querySelector('.canvas-content');

      if (e.key === 'Enter') {
        e.preventDefault();
        element.style.width = '40%';
        if (!isImage) targetNode.style.height = '15%';
        return;
      }

      if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
        e.preventDefault();
        let width = parseFloat(element.style.width) || 40;
        let height = isImage ? 0 : (parseFloat(targetNode.style.height) || 15);

        switch(e.key) {
          case 'ArrowUp':
            if (!isImage) height -= step;
            else width -= step;
            break;
          case 'ArrowDown':
            if (!isImage) height += step;
            else width += step;
            break;
          case 'ArrowLeft': width -= step; break;
          case 'ArrowRight': width += step; break;
        }

        width = Math.max(5, Math.min(width, 95));
        element.style.width = `${width}%`;

        if (!isImage) {
          height = Math.max(5, Math.min(height, 95));
          targetNode.style.height = `${height}%`;
        }
      }
    }
  }
}