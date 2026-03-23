import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static values = { entryId: Number, originalText: String }
  static targets = [ "ttsControls", "playBtn", "timeDisplay", "progressBar" ]

  connect() {
    this.fullText = this.originalTextValue || "There is no text available to read.";
    this.totalSeconds = 0;
    this.currentPercentage = 0;
    this.currentSeekIndex = 0;
    this.isPaused = false;
    this.isDragging = false;
    this.animationFrameId = null;
    this.lastFrameTime = 0;
    this.activeUtterance = null;
    
    this.speech = window.speechSynthesis;

    if (this.speech) {
      this.speech.resume(); 
      this.speech.cancel(); 
      
      this.speech.getVoices();
      this.speech.onvoiceschanged = () => {
        this.speech.getVoices();
      };
    }
    
    this.calculateEstimatedTime(this.fullText);
    this.fetchTranscriptInBackground();
  }

  disconnect() {
    this.stopProgressTimer();
    if (this.speech) {
      this.speech.cancel();
    }
  }

  async fetchTranscriptInBackground() {
    try {
      const response = await fetch(`/entries/${this.entryIdValue}/transcript`);
      const data = await response.json();
      if (data.transcript && data.transcript.trim() !== '') {
        this.fullText = data.transcript;
        this.calculateEstimatedTime(this.fullText);
        this.updateProgressUI(this.currentPercentage);
      }
    } catch (e) {
      // Fallback to original text
    }
  }

  setAngelicVoice(utterance) {
    if (!this.speech) return;
    const voices = this.speech.getVoices();
    const preferredVoice = voices.find(v => v.name === 'Alex') ||
                           voices.find(v => v.name === 'Samantha') ||
                           voices.find(v => v.name === 'Victoria') ||
                           voices.find(v => v.name === 'Daniel') ||
                           voices.find(v => v.lang === 'en-GB' || v.lang === 'en-US') || 
                           voices[0];
                           
    if (preferredVoice) {
      utterance.voice = preferredVoice;
    }
    
    utterance.rate = 0.70; 
    utterance.pitch = 1.0; 
  }

  togglePlay() {
    if (!this.speech) this.speech = window.speechSynthesis;

    // Expand the UI
    this.ttsControlsTarget.style.width = "250px";
    this.ttsControlsTarget.style.opacity = "1";

    if (this.speech.speaking && !this.isPaused) {
      this.speech.pause();
      this.playBtnTarget.innerHTML = '<i class="bi bi-play-fill fs-2 text-dark"></i>';
      this.isPaused = true;
      this.stopProgressTimer();
    } else if (this.isPaused) {
      this.speech.resume();
      this.playBtnTarget.innerHTML = '<i class="bi bi-pause-fill fs-2 text-dark"></i>';
      this.isPaused = false;
      this.startProgressTimer();
    } else {
      this.startSpeakingFrom(this.currentPercentage);
    }
  }

  minimizeTTS() {
    this.ttsControlsTarget.style.width = "0px";
    this.ttsControlsTarget.style.opacity = "0";
  }

  startSpeakingFrom(startPercentage) {
    if (this.speech) {
      this.speech.cancel();
    }

    const startIndex = Math.floor(this.fullText.length * startPercentage);
    let adjustedIndex = startIndex;
    
    while (adjustedIndex > 0 && this.fullText[adjustedIndex - 1] !== ' ' && this.fullText[adjustedIndex - 1] !== '\n') {
      adjustedIndex--;
    }

    const textToRead = this.fullText.substring(adjustedIndex);
    
    if (!textToRead || !textToRead.trim()) {
       this.playBtnTarget.innerHTML = '<i class="bi bi-play-fill fs-2 text-dark"></i>';
       return;
    }

    const utterance = new SpeechSynthesisUtterance(textToRead);
    this.activeUtterance = utterance; 
    window.utteranceHack = utterance; 
    
    this.setAngelicVoice(utterance);

    utterance.onstart = () => {
      if (this.activeUtterance === utterance) {
        this.startProgressTimer();
      }
    };

    utterance.onerror = () => {
      if (this.activeUtterance === utterance) {
        this.resetPlayerUI();
      }
    };

    utterance.onend = () => {
      if (this.activeUtterance === utterance && !this.isDragging) {
        this.resetPlayerUI();
      }
    };
    
    utterance.onboundary = (event) => {
      if (this.activeUtterance === utterance && event.name === 'word' && !this.isDragging) {
        this.currentSeekIndex = adjustedIndex + event.charIndex;
      }
    };

    this.speech.speak(utterance);
    this.playBtnTarget.innerHTML = '<i class="bi bi-pause-fill fs-2 text-dark"></i>';
    this.isPaused = false;
  }

  dragProgress(event) {
    this.isDragging = true;
    this.stopProgressTimer();
    this.currentPercentage = event.target.value / 100;
    this.updateProgressUI(this.currentPercentage);
  }

  seekTTS(event) {
    this.isDragging = false;
    this.currentPercentage = event.target.value / 100;
    this.updateProgressUI(this.currentPercentage);

    if (this.speech && (this.speech.speaking || this.isPaused)) {
      this.activeUtterance = null;
      this.speech.cancel();
      this.stopProgressTimer();

      setTimeout(() => {
        this.startSpeakingFrom(this.currentPercentage);
      }, 150);
    } else {
      this.currentSeekIndex = Math.floor(this.fullText.length * this.currentPercentage);
    }
  }

  startProgressTimer() {
    this.lastFrameTime = performance.now();
    const animate = (time) => {
      if (this.isPaused || this.isDragging) return;
      
      const deltaTime = (time - this.lastFrameTime) / 1000; 
      this.lastFrameTime = time;

      const percentageIncrease = deltaTime / this.totalSeconds;
      this.currentPercentage = Math.min(1.0, this.currentPercentage + percentageIncrease);
      
      this.updateProgressUI(this.currentPercentage);

      if (this.currentPercentage < 1.0) {
        this.animationFrameId = requestAnimationFrame(animate);
      }
    };
    
    this.animationFrameId = requestAnimationFrame(animate);
  }

  stopProgressTimer() {
    if (this.animationFrameId) {
      cancelAnimationFrame(this.animationFrameId);
    }
  }

  resetPlayerUI() {
    this.playBtnTarget.innerHTML = '<i class="bi bi-play-fill fs-2 text-dark"></i>';
    this.currentPercentage = 0;
    this.currentSeekIndex = 0;
    this.updateProgressUI(0);
    this.isPaused = false;
    this.stopProgressTimer();
  }

  calculateEstimatedTime(text) {
    const words = text.split(/\s+/).length;
    const wpm = 130; 
    this.totalSeconds = (words / wpm) * 60;
  }

  updateProgressUI(percentage) {
    if (!this.hasProgressBarTarget || !this.hasTimeDisplayTarget) return;
    
    this.progressBarTarget.value = percentage * 100;

    if (this.totalSeconds) {
      const currentSeconds = this.totalSeconds * percentage;
      this.timeDisplayTarget.innerText = `${this.formatTime(currentSeconds)} / ${this.formatTime(this.totalSeconds)}`;
    }
  }

  formatTime(seconds) {
    if (isNaN(seconds) || seconds < 0) return "0:00";
    const m = Math.floor(seconds / 60);
    const s = Math.floor(seconds % 60);
    return `${m}:${s.toString().padStart(2, '0')}`;
  }
}