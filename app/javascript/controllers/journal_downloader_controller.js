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
      const page = target.querySelector('.journal-page');
      
      const oldTargetHeight = target.style.height;
      const oldTargetOverflow = target.style.overflow;
      const oldPageOverflow = page.style.overflow;
      const oldPageHeight = page.style.height;
      const oldPagePadding = page.style.paddingBottom;
      const oldPagePosition = page.style.position;
      const oldScrollY = window.scrollY;
      const oldPageScrollY = page.scrollTop;

      window.scrollTo(0, 0);
      page.scrollTop = 0;

      target.style.height = 'auto';
      target.style.overflow = 'visible';
      page.style.position = 'relative'; 
      page.style.overflow = 'visible';
      page.style.height = 'auto';
      page.style.paddingBottom = '20px';

      const isMobile = window.innerWidth < 768;
      
      await new Promise(resolve => setTimeout(resolve, 300));

      const canvas = await window.html2canvas(target, {
        scale: isMobile ? 1 : 2,
        useCORS: true,
        backgroundColor: '#fdfbf7',
        windowHeight: target.scrollHeight,
        scrollY: 0,
        scrollX: 0
      });
      
      target.style.height = oldTargetHeight;
      target.style.overflow = oldTargetOverflow;
      page.style.position = oldPagePosition;
      page.style.overflow = oldPageOverflow;
      page.style.height = oldPageHeight;
      page.style.paddingBottom = oldPagePadding;
      window.scrollTo(0, oldScrollY);
      page.scrollTop = oldPageScrollY;
      
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