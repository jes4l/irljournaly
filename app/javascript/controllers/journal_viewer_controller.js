import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  connect() {
    this.element.querySelectorAll('.canvas-img-container').forEach(container => {
      const imageId = container.dataset.imageId;
      if (!imageId) return;
      if (container.querySelector('.img-hover-overlay')) return;

      container.style.position = 'relative';

      const overlay = document.createElement('div');
      overlay.className = 'img-hover-overlay d-flex flex-column gap-2 justify-content-center align-items-center position-absolute top-0 start-0 w-100 h-100 rounded';
      overlay.style.background = 'rgba(0,0,0,0.6)';
      overlay.style.opacity = '0';
      overlay.style.transition = 'opacity 0.2s';
      overlay.style.zIndex = '20';

      overlay.innerHTML = `
        <button data-action="click->journal-viewer#share" data-image-id="${imageId}" class="btn btn-primary btn-sm rounded-pill fw-bold shadow w-75 hover-scale" title="Post to Community Gallery">
          <i class="bi bi-globe"></i> Share to Community
        </button>
      `;

      container.addEventListener('mouseenter', () => overlay.style.opacity = '1');
      container.addEventListener('mouseleave', () => overlay.style.opacity = '0');

      container.appendChild(overlay);
    });
  }

  async share(event) {
    const btn = event.currentTarget;
    const imageId = btn.dataset.imageId;
    const originalHtml = btn.innerHTML;
    
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
    btn.disabled = true;

    try {
      const response = await fetch('/community_posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': document.querySelector('meta[name="csrf-token"]').content,
          'Accept': 'application/json'
        },
        body: JSON.stringify({ image_id: imageId })
      });
      
      if(response.ok) {
        btn.innerHTML = '<i class="bi bi-check-circle-fill"></i> Posted!';
        btn.classList.replace('btn-primary', 'btn-success');
      } else {
        btn.innerHTML = '<i class="bi bi-x-circle"></i> Failed';
        setTimeout(() => { btn.innerHTML = originalHtml; btn.disabled = false; }, 2000);
      }
    } catch(e) {
      btn.innerHTML = '<i class="bi bi-x-circle"></i> Failed';
      setTimeout(() => { btn.innerHTML = originalHtml; btn.disabled = false; }, 2000);
    }
  }
}