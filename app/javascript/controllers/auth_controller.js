import { Controller } from "@hotwired/stimulus"

export default class extends Controller {
  static targets = [ "menu", "login", "signup", "forgot", "loginError", "signupError", "forgotError" ]

  showMenu(event) {
    if (event) event.preventDefault()
    this.hideAll()
    this.menuTarget.classList.remove("d-none")
  }

  showLogin(event) {
    if (event) event.preventDefault()
    this.hideAll()
    this.loginTarget.classList.remove("d-none")
  }

  showSignup(event) {
    if (event) event.preventDefault()
    this.hideAll()
    this.signupTarget.classList.remove("d-none")
  }

  showForgot(event) {
    if (event) event.preventDefault()
    this.hideAll()
    this.forgotTarget.classList.remove("d-none")
  }

  hideAll() {
    this.menuTarget.classList.add("d-none")
    this.loginTarget.classList.add("d-none")
    this.signupTarget.classList.add("d-none")
    this.forgotTarget.classList.add("d-none")
    
    if (this.hasLoginErrorTarget) this.loginErrorTarget.innerHTML = ""
    if (this.hasSignupErrorTarget) this.signupErrorTarget.innerHTML = ""
    if (this.hasForgotErrorTarget) this.forgotErrorTarget.innerHTML = ""
  }

  async submitForm(event, errorTarget) {
    event.preventDefault()
    const form = event.target
    const formData = new FormData(form)

    try {
      const response = await fetch(form.action, {
        method: form.method,
        body: formData,
        headers: {
          "X-CSRF-Token": document.querySelector('meta[name="csrf-token"]').content,
          "Accept": "text/html"
        }
      })

      const formActionUrl = new URL(form.action, window.location.origin).href

      if (response.redirected || response.url !== formActionUrl) {
        window.location.href = response.url
        return
      }

      const htmlText = await response.text()
      const parser = new DOMParser()
      const doc = parser.parseFromString(htmlText, "text/html")

      let errorMessageHtml = ""

      const errorExplanation = doc.querySelector("#error_explanation")
      if (errorExplanation) {
        const ul = errorExplanation.querySelector("ul")
        errorMessageHtml = `<div class='alert alert-danger shadow-sm text-start mb-3'>${ul ? ul.outerHTML : errorExplanation.innerText.trim()}</div>`
      } 
      else {
        const flashAlert = doc.querySelector(".alert-danger") || doc.querySelector(".alert-warning")
        if (flashAlert) {
          errorMessageHtml = `<div class='alert alert-danger shadow-sm mb-3'>${flashAlert.innerText.trim()}</div>`
        } else {
          errorMessageHtml = `<div class='alert alert-danger shadow-sm mb-3'>An error occurred. Please try again.</div>`
        }
      }

      errorTarget.innerHTML = errorMessageHtml

    } catch (error) {
      errorTarget.innerHTML = `<div class='alert alert-danger shadow-sm mb-3'>Network error. Please check your connection.</div>`
    }
  }

  submitLogin(event) {
    this.submitForm(event, this.loginErrorTarget)
  }

  submitSignup(event) {
    this.submitForm(event, this.signupErrorTarget)
  }

  submitForgot(event) {
    this.submitForm(event, this.forgotErrorTarget)
  }
}