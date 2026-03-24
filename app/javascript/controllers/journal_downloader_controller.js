import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    if (this.element.dataset.refresh === "true") {
      this.refreshTimer = setTimeout(() => {
        if (window.location.pathname.match(/^\/entries\/\d+$/)) {
          window.location.reload();
        }
      }, 10000);
    }
  }

  disconnect() {
    if (this.refreshTimer) clearTimeout(this.refreshTimer);
  }

  async download(event) {
    event.preventDefault();
    const target = document.getElementById('journal-book-download-target') || this.element.querySelector('.journal-book');
    if (!target) return;

    const btn = event.currentTarget;
    const originalHTML = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>...';
    btn.disabled = true;
    
    try {
      const containerWidth = 1000;
      
      const wrapper = document.createElement('div');
      wrapper.style.position = 'absolute';
      wrapper.style.top = '-9999px';
      wrapper.style.left = '-9999px';
      wrapper.style.width = `${containerWidth}px`;
      wrapper.style.setProperty('--journal-scale', '1');
      wrapper.style.backgroundColor = '#fdfbf7';
      wrapper.style.fontFamily = "'Patrick Hand', cursive";
      wrapper.style.zIndex = '-1';
      
      const page = document.createElement('div');
      page.style.width = '100%';
      page.style.position = 'relative';
      page.style.backgroundImage = 'linear-gradient(#e5e5e5 1px, transparent 1px)';
      page.style.backgroundSize = '100% 40px';
      
      let maxBottom = 400;

      const originalSticker = target.querySelector('.journal-sticker');
      if (originalSticker) {
        const clonedSticker = originalSticker.cloneNode(true);
        clonedSticker.style.position = 'absolute';
        clonedSticker.style.top = '20px';
        clonedSticker.style.left = '20px';
        page.appendChild(clonedSticker);
      }

      const elements = target.querySelectorAll('.canvas-element');
      elements.forEach(el => {
        const clone = el.cloneNode(true);
        clone.querySelectorAll('.delete-btn-overlay, .drag-handle, .resize-handle, .community-overlay').forEach(e => e.remove());
        
        const x = parseFloat(el.dataset.x || 0) * 10;
        const y = parseFloat(el.dataset.y || 0) * 10;
        const w = parseFloat(el.dataset.w || 30) * 10;
        
        clone.style.left = `${x}px`;
        clone.style.top = `${y}px`;
        clone.style.width = `${w}px`;
        clone.style.transform = 'none';
        
        let h = 0;
        const content = clone.querySelector('.canvas-content');
        if (content) {
          content.style.border = 'none';
          content.style.background = 'transparent';
          if (el.dataset.h) {
            h = parseFloat(el.dataset.h) * 10;
          } else {
            const origContent = el.querySelector('.canvas-content');
            h = origContent ? origContent.scrollHeight * (1000 / target.clientWidth) : 100;
          }
          content.style.height = `${h}px`;
        } else {
          const img = el.querySelector('img');
          if (img && img.naturalWidth) {
            h = (w / img.naturalWidth) * img.naturalHeight;
          } else if (el.dataset.h) {
            h = parseFloat(el.dataset.h) * 10;
          } else {
            h = w;
          }
        }
        
        maxBottom = Math.max(maxBottom, y + h);
        page.appendChild(clone);
      });

      page.style.height = `${maxBottom + 150}px`;
      wrapper.appendChild(page);
      document.body.appendChild(wrapper);

      await new Promise(resolve => setTimeout(resolve, 300));

      const isMobile = window.innerWidth < 768;
      const canvas = await window.html2canvas(wrapper, {
        scale: isMobile ? 1 : 2,
        useCORS: true,
        backgroundColor: '#fdfbf7',
        windowWidth: containerWidth,
        windowHeight: maxBottom + 150,
        scrollY: 0,
        scrollX: 0
      });
      
      wrapper.remove();
      
      const link = document.createElement('a');
      link.download = `journal-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch(e) {
      alert("Failed to download image.");
    } finally {
      btn.innerHTML = originalHTML;
      btn.disabled = false;
    }
  }
}