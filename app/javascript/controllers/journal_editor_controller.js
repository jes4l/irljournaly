import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [ "canvas", "form", "contentInput", "imageInput", "sizeInput", "fontInput", "boldBtn", "italicBtn", "underlineBtn", "moodBadge" ]

  connect() {
    document.body.classList.add('journal-active');
    this.dragging = null;
    this.resizingElement = null;
    this.offsetX = 0;
    this.offsetY = 0;
    this.isUploading = false; 
    this.autoScrollFrame = null;
    this.scrollSpeed = 0;
    this.lastClientX = 0;
    this.lastClientY = 0;

    this.resizeHandler = this.applyMathScaling.bind(this);
    window.addEventListener('resize', this.resizeHandler);
    
    setTimeout(() => {
      this.initCanvasElements();
      this.applyMathScaling();
      this.analyzeOverallSentiment();
    }, 50);
  }

  disconnect() {
    document.body.classList.remove('journal-active');
    window.removeEventListener('resize', this.resizeHandler);
    if (this.autoScrollFrame) cancelAnimationFrame(this.autoScrollFrame);
  }

  initCanvasElements() {
    this.canvasTarget.querySelectorAll('.canvas-content').forEach(el => {
      el.setAttribute('contenteditable', 'true');
      el.setAttribute('data-placeholder', 'Type here...');
      if (el.innerText.trim() === "Type here...") el.innerText = "";
      
      el.addEventListener('keydown', (e) => { e.stopPropagation(); });
      
      el.addEventListener('focusout', () => {
        if (el.innerText.trim() === '') el.closest('.canvas-element')?.remove();
        this.analyzeOverallSentiment();
      });
      
      el.addEventListener('input', () => {
        el.style.height = 'auto';
        el.style.height = `${el.scrollHeight}px`;
        this.updateElementMath(el.closest('.canvas-element'));
        
        clearTimeout(this.analyzeTimeout);
        this.analyzeTimeout = setTimeout(() => this.analyzeOverallSentiment(), 500);
      });
    });

    this.canvasTarget.querySelectorAll('.canvas-element').forEach(el => {
      if (!el.querySelector('.drag-handle')) el.insertAdjacentHTML('afterbegin', '<div class="drag-handle" data-action="mousedown->journal-editor#dragStart touchstart->journal-editor#dragStart"><i class="bi bi-arrows-move"></i></div>');
      if (!el.querySelector('.delete-btn-overlay')) el.insertAdjacentHTML('beforeend', '<button class="btn btn-sm position-absolute top-0 end-0 m-1 delete-btn-overlay" data-action="click->journal-editor#deleteElement" style="z-index: 10;"><i class="bi bi-trash"></i></button>');
      if (!el.querySelector('.resize-handle')) el.insertAdjacentHTML('beforeend', '<div class="resize-handle" data-action="mousedown->journal-editor#resizeStart touchstart->journal-editor#resizeStart"><i class="bi bi-arrows-angle-expand"></i></div>');
    });
  }

  applyMathScaling() {
    cancelAnimationFrame(this.mathFrame);
    this.mathFrame = requestAnimationFrame(() => {
      const containerWidth = this.canvasTarget.clientWidth;
      if (!containerWidth) return;

      const scaleFactor = containerWidth / 1000;
      this.element.style.setProperty('--journal-scale', scaleFactor);

      this.canvasTarget.querySelectorAll('.canvas-element').forEach(el => {
        if (!el.hasAttribute('data-x')) {
          el.dataset.x = (parseFloat(el.style.left) || 50) / containerWidth * 100;
          el.dataset.y = (parseFloat(el.style.top) || 50) / containerWidth * 100;
          el.dataset.w = (parseFloat(el.style.width) || 300) / containerWidth * 100;
          const content = el.querySelector('.canvas-content');
          if (content) el.dataset.h = (parseFloat(content.style.height) || 150) / containerWidth * 100;
        }

        el.style.left = `${parseFloat(el.dataset.x) / 100 * containerWidth}px`;
        el.style.top = `${parseFloat(el.dataset.y) / 100 * containerWidth}px`;
        el.style.width = `${parseFloat(el.dataset.w) / 100 * containerWidth}px`;

        const content = el.querySelector('.canvas-content');
        if (content) {
          if (el.classList.contains('canvas-text')) {
            content.style.height = 'auto';
            content.style.height = `${content.scrollHeight}px`;
            el.dataset.h = (content.scrollHeight / containerWidth) * 100;
          } else if (el.dataset.h) {
            content.style.height = `${parseFloat(el.dataset.h) / 100 * containerWidth}px`;
          }
        }
      });
    });
  }

  updateElementMath(el) {
    if (!el) return;
    const containerWidth = this.canvasTarget.clientWidth;
    el.dataset.x = parseFloat(el.style.left) / containerWidth * 100;
    el.dataset.y = parseFloat(el.style.top) / containerWidth * 100;
    el.dataset.w = parseFloat(el.style.width) / containerWidth * 100;

    const content = el.querySelector('.canvas-content');
    if (content) el.dataset.h = parseFloat(content.style.height) / containerWidth * 100;
  }

  async analyzeOverallSentiment() {
    if (!this.hasMoodBadgeTarget) return;
    let allText = Array.from(this.canvasTarget.querySelectorAll('.canvas-content')).map(el => el.innerText).join('\n').trim();
    if (!allText) {
       this.moodBadgeTarget.className = "mt-2 badge bg-secondary text-white border border-dark sticker-mood";
       this.moodBadgeTarget.innerText = "Mood: Neutral";
       return;
    }
    try {
      const response = await fetch('/analyse/sentiment', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content, 'Accept': 'application/json' },
        body: JSON.stringify({ text: allText })
      });
      const data = await response.json();
      let bgClass = data.mood === 'Good' ? "bg-success" : (data.mood === 'Bad' ? "bg-danger" : "bg-secondary");
      this.moodBadgeTarget.className = `mt-2 badge ${bgClass} text-white border border-dark sticker-mood`;
      this.moodBadgeTarget.innerText = `Mood: ${data.mood}`;
    } catch (e) {}
  }

  addText() {
    const wrapper = document.createElement("div");
    wrapper.className = "canvas-element canvas-text";
    
    const scrollTop = this.canvasTarget.scrollTop;
    const visibleHeight = this.canvasTarget.clientHeight;
    const targetTop = scrollTop + (visibleHeight / 2) - 50;
    
    wrapper.style.left = "50px";
    wrapper.style.top = `${targetTop}px`;
    wrapper.style.width = "300px";
    wrapper.innerHTML = `
      <div class="drag-handle" data-action="mousedown->journal-editor#dragStart touchstart->journal-editor#dragStart"><i class="bi bi-arrows-move"></i></div>
      <button class="btn btn-sm position-absolute top-0 end-0 m-1 delete-btn-overlay" data-action="click->journal-editor#deleteElement" style="z-index: 10;"><i class="bi bi-trash"></i></button>
      <div class="canvas-content" contenteditable="true" data-placeholder="Type here..." style="height: auto; min-height: 50px;"></div>
      <div class="resize-handle" data-action="mousedown->journal-editor#resizeStart touchstart->journal-editor#resizeStart"><i class="bi bi-arrows-angle-expand"></i></div>
    `;
    this.canvasTarget.appendChild(wrapper);
    this.initCanvasElements();
    this.updateElementMath(wrapper); 
    wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' }); 
  }

  triggerImage() {
    if (this.isUploading) { alert("Please wait for images to finish uploading."); return; }
    this.imageInputTarget.click();
  }

  async handleImage(event) {
    const files = Array.from(event.target.files).filter(f => !f.type.startsWith('video/'));
    event.target.value = ""; 
    if (!files.length) return;
    if (files.length > 5) { alert("Maximum 5 images."); return; }
    this.isUploading = true; 
    try {
      for (const file of files) await this.uploadSingleImage(file);
    } finally { this.isUploading = false; }
  }

  async uploadSingleImage(file) {
    const wrapper = document.createElement("div");
    wrapper.className = "canvas-element canvas-img-container";
    
    const scrollTop = this.canvasTarget.scrollTop;
    const visibleHeight = this.canvasTarget.clientHeight;
    const targetTop = scrollTop + (visibleHeight / 2) - 50;
    
    wrapper.style.left = "50px";
    wrapper.style.top = `${targetTop}px`;
    wrapper.style.width = "300px";
    wrapper.innerHTML = `<div class="spinner-border text-dark m-4" role="status"></div>`;
    this.canvasTarget.appendChild(wrapper);
    wrapper.scrollIntoView({ behavior: 'smooth', block: 'center' });
    
    const formData = new FormData();
    formData.append("image", file);
    
    try {
      const response = await fetch("/entries/upload_image", { method: "POST", body: formData, headers: { "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]').content, "Accept": "application/json" } });
      const data = await response.json();
      if (data.success) {
        wrapper.dataset.imageId = data.image_id;
        wrapper.classList.add(`image-id-${data.image_id}`);
        wrapper.innerHTML = `
          <div class="drag-handle" data-action="mousedown->journal-editor#dragStart touchstart->journal-editor#dragStart"><i class="bi bi-arrows-move"></i></div>
          <button class="btn btn-sm position-absolute top-0 end-0 m-1 delete-btn-overlay" data-action="click->journal-editor#deleteElement" style="z-index: 10;"><i class="bi bi-trash"></i></button>
          <img src="${data.image_url}" draggable="false" alt="Journal image">
          <div class="resize-handle" data-action="mousedown->journal-editor#resizeStart touchstart->journal-editor#resizeStart"><i class="bi bi-arrows-angle-expand"></i></div>
        `;
        this.updateElementMath(wrapper); 
      } else { wrapper.remove(); }
    } catch (e) { wrapper.remove(); }
  }

  async deleteElement(event) {
    const wrapper = event.target.closest('.canvas-element');
    const imageId = wrapper.dataset.imageId;
    wrapper.remove();
    if (imageId) await fetch(`/entries/delete_image/${imageId}`, { method: "DELETE", headers: { "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]').content, "Accept": "application/json" } });
    this.analyzeOverallSentiment();
  }

  format(event) { document.execCommand(event.currentTarget.dataset.command, false, null); }
  changeFont(event) { document.execCommand('fontName', false, event.target.value); }
  changeSize(event) { document.execCommand('fontSize', false, event.target.value); }

  save() {
    this.canvasTarget.querySelectorAll('.canvas-element').forEach(el => this.updateElementMath(el));

    const canvasClone = this.canvasTarget.cloneNode(true);
    canvasClone.querySelectorAll('[contenteditable]').forEach(el => el.removeAttribute('contenteditable'));
    canvasClone.querySelectorAll('.delete-btn-overlay, .drag-handle, .resize-handle').forEach(el => el.remove());
    canvasClone.querySelectorAll('.journal-sticker').forEach(el => el.remove());
    
    this.contentInputTarget.value = canvasClone.innerHTML;
    this.formTarget.submit();
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
      this.lastClientX = clientX; this.lastClientY = clientY;
      this.scrollSpeed = 0; this.startAutoScroll();
    }
  }

  resizeStart(e) {
    e.preventDefault(); e.stopPropagation()
    const handle = e.target.closest('.resize-handle')
    if (handle) {
      this.resizingElement = handle.closest('.canvas-element')
      this.isImage = !!this.resizingElement.querySelector('img')
      this.targetNode = this.isImage ? this.resizingElement : this.resizingElement.querySelector('.canvas-content')
      this.resizeData = {
        startX: e.touches ? e.touches[0].clientX : e.clientX,
        startY: e.touches ? e.touches[0].clientY : e.clientY,
        startWidth: parseFloat(getComputedStyle(this.resizingElement).width),
        startHeight: parseFloat(getComputedStyle(this.targetNode).height)
      }
    }
  }

  handleMove(e) {
    if (this.dragging) {
      if (e.cancelable && e.type === 'touchmove') e.preventDefault();
      const canvasRect = this.canvasTarget.getBoundingClientRect()
      const clientX = e.touches ? e.touches[0].clientX : e.clientX
      const clientY = e.touches ? e.touches[0].clientY : e.clientY
      this.lastClientX = clientX; this.lastClientY = clientY;

      const edgeThreshold = 60;
      if (clientY > canvasRect.bottom - edgeThreshold) this.scrollSpeed = 15;
      else if (clientY < canvasRect.top + edgeThreshold) this.scrollSpeed = -15;
      else this.scrollSpeed = 0;
      
      const elRect = this.dragging.getBoundingClientRect();
      let newLeft = Math.max(0, Math.min(clientX - canvasRect.left - this.offsetX + this.canvasTarget.scrollLeft, canvasRect.width - elRect.width));
      let newTop = Math.max(0, clientY - canvasRect.top - this.offsetY + this.canvasTarget.scrollTop); 
      
      this.dragging.style.left = `${newLeft}px`;
      this.dragging.style.top = `${newTop}px`;
    }
    
    if (this.resizingElement) {
      if (e.cancelable && e.type === 'touchmove') e.preventDefault();
      const dx = (e.touches ? e.touches[0].clientX : e.clientX) - this.resizeData.startX;
      const dy = (e.touches ? e.touches[0].clientY : e.clientY) - this.resizeData.startY;
      
      let newWidth = Math.max(50, Math.min(this.resizeData.startWidth + dx, this.canvasTarget.getBoundingClientRect().width - this.resizingElement.offsetLeft - 10));
      this.resizingElement.style.width = `${newWidth}px`;
      
      if (!this.isImage) {
        this.targetNode.style.height = `${Math.max(50, this.resizeData.startHeight + dy)}px`;
      }
    }
  }

  handleEnd() {
    if (this.dragging || this.resizingElement) {
       this.updateElementMath(this.dragging || this.resizingElement); 
    }
    this.dragging = null; this.resizingElement = null; this.scrollSpeed = 0;
    if (this.autoScrollFrame) { cancelAnimationFrame(this.autoScrollFrame); this.autoScrollFrame = null; }
  }

  handleKeydown(e) {
    if (['ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.key)) {
      const element = e.target.closest('.canvas-element');
      if (element) {
         this.updateElementMath(element);
      }
    }
  }
}