import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["canvas"]

  connect() {
    document.body.classList.add('journal-active');
    this.resizeHandler = this.applyMathScaling.bind(this);
    window.addEventListener('resize', this.resizeHandler);
    
    setTimeout(() => {
      this.applyMathScaling();
      this.injectCommunityButtons();
    }, 50);
  }

  disconnect() {
    document.body.classList.remove('journal-active');
    window.removeEventListener('resize', this.resizeHandler);
  }

  applyMathScaling() {
    cancelAnimationFrame(this.mathFrame);
    this.mathFrame = requestAnimationFrame(() => {
      const containerWidth = this.element.clientWidth;
      if (!containerWidth) return;

      const scaleFactor = containerWidth / 1000;
      this.element.style.setProperty('--journal-scale', scaleFactor);

      this.element.querySelectorAll('.canvas-element').forEach(el => {
        if (el.dataset.x) {
          el.style.left = `${parseFloat(el.dataset.x) / 100 * containerWidth}px`;
          el.style.top = `${parseFloat(el.dataset.y) / 100 * containerWidth}px`;
          el.style.width = `${parseFloat(el.dataset.w) / 100 * containerWidth}px`;

          const content = el.querySelector('.canvas-content');
          if (content) {
            if (el.classList.contains('canvas-text')) {
              content.style.height = 'auto';
              content.style.height = `${content.scrollHeight}px`;
            } else if (el.dataset.h) {
              content.style.height = `${parseFloat(el.dataset.h) / 100 * containerWidth}px`;
            }
          }
        }
      });
    });
  }

  injectCommunityButtons() {
    this.element.querySelectorAll('.canvas-img-container').forEach(container => {
      const classList = Array.from(container.classList);
      const idClass = classList.find(c => c.startsWith('image-id-'));
      const imageId = idClass ? idClass.replace('image-id-', '') : container.dataset.imageId;

      if (!container.querySelector('.community-overlay') && imageId) {
        container.setAttribute('tabindex', '0'); 
        container.style.cursor = 'pointer'; 

        const overlay = document.createElement('div');
        overlay.className = "community-overlay position-absolute top-0 start-0 w-100 h-100 d-flex justify-content-center align-items-center";
        overlay.style.zIndex = "20";
        overlay.style.borderRadius = "inherit";
        overlay.style.backgroundColor = "rgba(255, 255, 255, 0.4)";
        overlay.style.backdropFilter = "blur(2px)";
        
        overlay.innerHTML = `
          <button type="button" class="btn btn-primary btn-sm rounded-pill shadow fw-bold" data-action="click->journal-viewer#postToCommunity" data-image-id="${imageId}">
            <i class="bi bi-globe me-1"></i> Post to Community
          </button>
        `;
        container.appendChild(overlay);

        container.addEventListener('click', (e) => {
          if (!overlay.classList.contains('show-overlay') && window.innerWidth < 768) {
            e.preventDefault();
            document.querySelectorAll('.community-overlay.show-overlay').forEach(o => o.classList.remove('show-overlay'));
            overlay.classList.add('show-overlay');
          }
        });
      }
    });
  }

  async postToCommunity(event) {
    event.preventDefault();
    event.stopPropagation();
    
    const button = event.currentTarget;
    const imageId = button.dataset.imageId;
    const csrfToken = document.querySelector('meta[name="csrf-token"]')?.content;
    
    const originalText = button.innerHTML;
    button.innerHTML = '<span class="spinner-border spinner-border-sm me-1"></span> Posting...';
    button.disabled = true;

    try {
      const response = await fetch('/community_posts', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'X-CSRF-Token': csrfToken,
          'Accept': 'application/json'
        },
        body: JSON.stringify({ image_id: imageId })
      });

      const data = await response.json();
      
      if (data.success) {
        button.innerHTML = '<i class="bi bi-check-circle me-1"></i> Posted!';
        button.classList.replace('btn-primary', 'btn-success');
        
        setTimeout(() => {
          button.closest('.community-overlay').classList.remove('show-overlay');
        }, 1500);
      } else {
        alert(data.error || "Could not post to community.");
        button.innerHTML = originalText;
        button.disabled = false;
      }
    } catch (e) {
      alert("An error occurred while posting.");
      button.innerHTML = originalText;
      button.disabled = false;
    }
  }
}