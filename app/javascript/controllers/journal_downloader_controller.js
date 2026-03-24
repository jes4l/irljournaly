import { Controller } from "@hotwired/stimulus"
import html2canvas from "html2canvas"

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

    const originalHTML = event.currentTarget.innerHTML;
    event.currentTarget.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span>...';
    
    try {
      const page = target.querySelector('.journal-page');
      const oldOverflow = page.style.overflow;
      const oldHeight = page.style.height;
      page.style.overflow = 'visible';
      page.style.height = 'max-content';

      const isMobile = window.innerWidth < 768;
      const canvas = await html2canvas(target, {
        scale: isMobile ? 1 : 2,
        useCORS: true,
        backgroundColor: '#fdfbf7'
      });
      
      page.style.overflow = oldOverflow;
      page.style.height = oldHeight;
      
      const link = document.createElement('a');
      link.download = `journal-${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL('image/png');
      link.click();
    } catch(e) {
      alert("Failed to download image.");
    } finally {
      event.currentTarget.innerHTML = originalHTML;
    }
  }
}