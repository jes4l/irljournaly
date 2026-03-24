import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["book"]

  async download(event) {
    event.preventDefault(); 
    
    const btn = event.currentTarget;
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
    btn.disabled = true;

    try {
      const book = this.bookTarget;
      const page = book.querySelector('.journal-page');

      const origScrollTop = page.scrollTop;
      
      let maxHeight = page.clientHeight; 
      page.querySelectorAll('.canvas-element').forEach(el => {
        let bottom = el.offsetTop + el.offsetHeight;
        if (bottom > maxHeight) maxHeight = bottom;
      });
      maxHeight += 100;
      const origBookHeight = book.style.height;
      const origBookOverflow = book.style.overflow;
      const origPageHeight = page.style.height;
      const origPageOverflow = page.style.overflow;
      const origPagePos = page.style.position;
      const origPagePad = page.style.paddingBottom;

      page.scrollTop = 0;
      book.style.height = `${maxHeight}px`;
      book.style.overflow = 'visible';
      page.style.height = `${maxHeight}px`;
      page.style.overflow = 'visible';
      page.style.position = 'relative';
      page.style.paddingBottom = '0px';

      await new Promise(r => setTimeout(r, 150)); 

      const canvas = await html2canvas(book, {
        scale: 2, 
        useCORS: true,
        backgroundColor: "#fdfbf7",
        windowWidth: book.scrollWidth,
        windowHeight: maxHeight
      });

      book.style.height = origBookHeight;
      book.style.overflow = origBookOverflow;
      page.style.height = origPageHeight;
      page.style.overflow = origPageOverflow;
      page.style.position = origPagePos;
      page.style.paddingBottom = origPagePad;
      page.scrollTop = origScrollTop;

      const link = document.createElement("a");
      link.download = `my_journal_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      btn.innerHTML = '<i class="bi bi-check-lg"></i>';
      setTimeout(() => { btn.innerHTML = originalHtml; btn.disabled = false; }, 2000);
    } catch (e) {
      console.error(e);
      btn.innerHTML = '<i class="bi bi-x-lg"></i>';
      setTimeout(() => { btn.innerHTML = originalHtml; btn.disabled = false; }, 2000);
    }
  }
}