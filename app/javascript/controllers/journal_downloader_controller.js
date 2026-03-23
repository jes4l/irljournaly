import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = ["book"]

  async download(event) {
    const btn = event.currentTarget;
    const originalHtml = btn.innerHTML;
    btn.innerHTML = '<span class="spinner-border spinner-border-sm"></span>';
    btn.disabled = true;

    try {
      const canvas = await html2canvas(this.bookTarget, {
        scale: 2,
        useCORS: true,
        backgroundColor: "#fdfbf7"
      });

      const link = document.createElement("a");
      link.download = `my_journal_${new Date().toISOString().split('T')[0]}.png`;
      link.href = canvas.toDataURL("image/png");
      link.click();

      btn.innerHTML = '<i class="bi bi-check-lg"></i>';
      setTimeout(() => { btn.innerHTML = originalHtml; btn.disabled = false; }, 2000);
    } catch (e) {
      btn.innerHTML = '<i class="bi bi-x-lg"></i>';
      setTimeout(() => { btn.innerHTML = originalHtml; btn.disabled = false; }, 2000);
    }
  }
}