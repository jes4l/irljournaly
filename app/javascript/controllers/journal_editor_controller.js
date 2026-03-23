import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [ 
    "canvas", "form", "contentInput", "imageInput",
    "sizeInput", "fontInput", "boldBtn", "italicBtn", "underlineBtn",
    "moodBadge"
  ]

  connect() {
    this.dragging = null
    this.resizingElement = null
    this.offsetX = 0
    this.offsetY = 0
    this.isUploading = false 
    this.analyzeTimeout = null

    this.canvasTarget.querySelectorAll('.canvas-content').forEach(el => {
      el.setAttribute('contenteditable', 'true')
      el.setAttribute('data-placeholder', 'Type here...')
      if (el.innerText.trim() === "Type here...") {
        el.innerText = ""
      }
    })

    this.canvasTarget.querySelectorAll('.canvas-element').forEach(el => {
      if (!el.querySelector('.delete-btn-overlay')) {
        el.insertAdjacentHTML('beforeend', '<button class="btn btn-sm position-absolute top-0 end-0 m-1 delete-btn-overlay" data-action="click->journal-editor#deleteElement" style="z-index: 10;" aria-label="Delete element" tabindex="0"><i class="bi bi-trash"></i></button>')
      }
      if (!el.querySelector('.resize-handle')) {
        el.insertAdjacentHTML('beforeend', '<div class="resize-handle" data-action="mousedown->journal-editor#resizeStart touchstart->journal-editor#resizeStart" aria-label="Resize element" tabindex="0"><i class="bi bi-arrows-angle-expand"></i></div>')
      }
    })

    this.selectionHandler = this.checkFormatting.bind(this)
    document.addEventListener("selectionchange", this.selectionHandler)

    this.keydownHandler = (e) => {
      if (e.target.closest('.canvas-content')) {
        e.stopPropagation();
      }
    };
    this.element.addEventListener('keydown', this.keydownHandler, true);

    this.inputHandler = (e) => {
      if (e.target.closest('.canvas-content')) {
        clearTimeout(this.analyzeTimeout);
        this.analyzeTimeout = setTimeout(() => {
          this.analyzeOverallSentiment();
        }, 500);
      }
    };
    this.element.addEventListener('input', this.inputHandler, true);

    this.focusoutHandler = (e) => {
      const content = e.target.closest('.canvas-content');
      if (content) {
        if (content.innerText.trim() === '') {
          const wrapper = content.closest('.canvas-element');
          if (wrapper) wrapper.remove();
        }
        this.analyzeOverallSentiment();
      }
    };
    this.element.addEventListener('focusout', this.focusoutHandler, true);

    this.observer = new MutationObserver(() => {
      clearTimeout(this.analyzeTimeout);
      this.analyzeTimeout = setTimeout(() => {
        this.analyzeOverallSentiment();
      }, 500);
    });
    
    this.observer.observe(this.canvasTarget, { 
      childList: true, 
      subtree: true, 
      characterData: true 
    });

    this.analyzeOverallSentiment();
  }

  disconnect() {
    document.removeEventListener("selectionchange", this.selectionHandler)
    this.element.removeEventListener('keydown', this.keydownHandler, true);
    this.element.removeEventListener('focusout', this.focusoutHandler, true);
    this.element.removeEventListener('input', this.inputHandler, true);
    if (this.observer) this.observer.disconnect();
  }

  async analyzeOverallSentiment() {
    if (!this.hasMoodBadgeTarget) return;

    let allText = "";
    this.canvasTarget.querySelectorAll('.canvas-content').forEach(el => {
      allText += el.innerText + "\n";
    });

    allText = allText.trim();

    if (!allText) {
       this.moodBadgeTarget.className = "mt-2 badge bg-secondary text-white fs-6 shadow-sm border border-dark";
       this.moodBadgeTarget.innerText = "Mood: Neutral";
       return;
    }
    
    try {
      const response = await fetch('/analyse/sentiment', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content,
          'Accept': 'application/json'
        },
        body: JSON.stringify({ text: allText })
      });
      
      const data = await response.json();
      
      let bgClass = "bg-secondary";
      if (data.mood === 'Good') bgClass = "bg-success";
      else if (data.mood === 'Bad') bgClass = "bg-danger";

      this.moodBadgeTarget.className = `mt-2 badge ${bgClass} text-white fs-6 shadow-sm border border-dark`;
      this.moodBadgeTarget.innerText = `Mood: ${data.mood}`;
    } catch (e) {
    }
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
    const canvasRect = this.canvasTarget.getBoundingClientRect();
    const scrollTopPct = (this.canvasTarget.scrollTop / canvasRect.height) * 100;
    
    wrapper.style.left = "5%"
    wrapper.style.top = `${scrollTopPct + 10}%`
    wrapper.style.width = "40%"
    wrapper.innerHTML = `
      <div class="drag-handle" data-action="mousedown->journal-editor#dragStart touchstart->journal-editor#dragStart" tabindex="0" aria-label="Drag element"><i class="bi bi-arrows-move"></i></div>
      <button class="btn btn-sm position-absolute top-0 end-0 m-1 delete-btn-overlay" data-action="click->journal-editor#deleteElement" style="z-index: 10;" aria-label="Delete element" tabindex="0"><i class="bi bi-trash"></i></button>
      <div class="canvas-content" contenteditable="true" data-placeholder="Type here..." aria-label="Text entry" tabindex="0" style="width: 100%; min-height: 50px;"></div>
      <div class="resize-handle" data-action="mousedown->journal-editor#resizeStart touchstart->journal-editor#resizeStart" aria-label="Resize element" tabindex="0"><i class="bi bi-arrows-angle-expand"></i></div>
    `
    this.canvasTarget.appendChild(wrapper)
  }

  triggerImage() {
    if (this.isUploading) {
      alert("Please wait for the current images to finish uploading before adding more.");
      return;
    }
    this.imageInputTarget.click()
  }

  async convertToSupportedFormat(file) {
    const supportedTypes = ['image/jpeg', 'image/png', 'image/webp'];
    if (supportedTypes.includes(file.type)) return file;
    
    return new Promise((resolve) => {
      const url = URL.createObjectURL(file);
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        canvas.width = img.width;
        canvas.height = img.height;
        const ctx = canvas.getContext('2d');
        ctx.drawImage(img, 0, 0);
        
        canvas.toBlob((blob) => {
          URL.revokeObjectURL(url);
          const newName = file.name.replace(/\.[^/.]+$/, "") + ".png";
          const newFile = new File([blob], newName, { type: 'image/png' });
          resolve(newFile);
        }, 'image/png', 1.0);
      };
      img.onerror = () => {
        URL.revokeObjectURL(url);
        resolve(file); 
      };
      img.src = url;
    });
  }

  async handleImage(event) {
    const files = Array.from(event.target.files).filter(f => !f.type.startsWith('video/'));
    event.target.value = ""; 
    
    if (!files.length) return;

    if (files.length > 5) {
      alert("You can only upload a maximum of 5 images at a time.");
      return;
    }

    if (this.isUploading) {
      alert("Please wait for the current images to finish uploading before adding more.");
      return;
    }

    this.isUploading = true; 

    try {
      for (const originalFile of files) {
        const file = await this.convertToSupportedFormat(originalFile);
        const success = await this.uploadSingleImage(file);
        if (!success) break; 
      }
    } finally {
      this.isUploading = false;
    }
  }

  async uploadSingleImage(file) {
    const wrapper = document.createElement("div")
    wrapper.className = "canvas-element canvas-img-container"
    const canvasRect = this.canvasTarget.getBoundingClientRect();
    const scrollTopPct = (this.canvasTarget.scrollTop / canvasRect.height) * 100;
    
    wrapper.style.left = "5%"
    wrapper.style.top = `${scrollTopPct + 10}%`
    wrapper.style.width = "40%"
    wrapper.innerHTML = `
      <div class="drag-handle" data-action="mousedown->journal-editor#dragStart touchstart->journal-editor#dragStart" tabindex="0" aria-label="Drag element"><i class="bi bi-arrows-move"></i></div>
      <button class="btn btn-sm position-absolute top-0 end-0 m-1 d-none delete-btn-overlay" data-action="click->journal-editor#deleteElement" style="z-index: 10;" aria-label="Delete element" tabindex="0"><i class="bi bi-trash"></i></button>
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
      
      if (response.status === 429) {
        const data = await response.json()
        alert(data.error)
        wrapper.remove()
        return false; 
      }
      
      const data = await response.json()
      if (data.success) {
        wrapper.setAttribute('data-image-id', data.image_id)
        wrapper.dataset.imageId = data.image_id
        
        wrapper.innerHTML = `
          <div class="drag-handle" data-action="mousedown->journal-editor#dragStart touchstart->journal-editor#dragStart" tabindex="0" aria-label="Drag element"><i class="bi bi-arrows-move"></i></div>
          <button class="btn btn-sm position-absolute top-0 end-0 m-1 delete-btn-overlay" data-action="click->journal-editor#deleteElement" style="z-index: 10;" aria-label="Delete element" tabindex="0"><i class="bi bi-trash"></i></button>
          <img src="${data.image_url}" draggable="false" alt="Journal image" style="width: 100%; height: auto; display: block;">
          <div class="resize-handle" data-action="mousedown->journal-editor#resizeStart touchstart->journal-editor#resizeStart" aria-label="Resize element" tabindex="0"><i class="bi bi-arrows-angle-expand"></i></div>
        `
        return true;
      } else {
        wrapper.remove()
        return true; 
      }
    } catch (e) {
      wrapper.remove()
      return true;
    }
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
    
    this.analyzeOverallSentiment();
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
    canvasClone.querySelectorAll('.delete-btn-overlay').forEach(el => el.remove())
    
    canvasClone.querySelectorAll('.canvas-content').forEach(el => {
      el.classList.remove('mood-good', 'mood-bad', 'mood-neutral');
    });

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
      
      let newLeft = clientX - canvasRect.left - this.offsetX + this.canvasTarget.scrollLeft;
      let newTop = clientY - canvasRect.top - this.offsetY + this.canvasTarget.scrollTop;
      newLeft = Math.max(0, newLeft);
      newTop = Math.max(0, newTop); 
      
      let leftPct = (newLeft / canvasRect.width) * 100;
      let topPct = (newTop / canvasRect.height) * 100;

      this.dragging.style.left = `${leftPct}%`;
      this.dragging.style.top = `${topPct}%`;
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
      
      let newWidth = Math.max(50, Math.min(this.resizeData.startWidth + dx, maxWidth))
      let widthPct = (newWidth / canvasRect.width) * 100;
      
      this.resizingElement.style.width = `${widthPct}%`
      
      if (!this.isImage) {
        const maxHeight = canvasRect.height - elTop - 10
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

    let canvasRect = this.canvasTarget.getBoundingClientRect();
    let elRect = element.getBoundingClientRect();

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

        let maxLeftPct = Math.max(0, ((canvasRect.width - elRect.width) / canvasRect.width) * 100);

        left = Math.max(0, Math.min(left, maxLeftPct));
        top = Math.max(0, top);

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

        let leftOffset = parseFloat(element.style.left) || 0;
        let topOffset = parseFloat(element.style.top) || 0;

        width = Math.max(5, Math.min(width, 100 - leftOffset));
        element.style.width = `${width}%`;

        if (!isImage) {
          height = Math.max(5, Math.min(height, 100 - topOffset));
          targetNode.style.height = `${height}%`;
        }
      }
    }
  }
}