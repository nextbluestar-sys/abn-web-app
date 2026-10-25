(() => {
  const APP_URL = "https://nextbluestar-sys.github.io/abn-web-app/";
  const APK_BUILDS_URL = "https://github.com/nextbluestar-sys/abn-web-app/actions/workflows/build-android.yml";
  const panel = document.createElement("section");
  panel.id = "abnAppDownload";
  panel.className = "abn-download-panel";
  panel.innerHTML = `
    <div class="abn-download-copy">
      <span class="abn-brand-kicker">ABN · YOUR NETWORK, IN YOUR POCKET</span>
      <h2>Take ABN <em>with you.</em></h2>
      <p>Install the Ambedkarite Business Network on your phone for quick access to businesses, services and opportunities.</p>
      <div class="abn-download-actions">
        <button type="button" class="abn-install-button" id="abnInstallApp">＋ Install ABN app</button>
        <a class="abn-apk-button" href="${APK_BUILDS_URL}" target="_blank" rel="noopener noreferrer">Android APK builds ↗</a>
      </div>
      <p class="abn-download-help" id="abnInstallHelp">On iPhone: open Share and choose “Add to Home Screen”. On Android: use your browser menu and choose “Install app” or “Add to Home screen”.</p>
    </div>
    <div class="abn-qr-card">
      <img id="abnAppQr" alt="QR code to open the ABN web app" width="156" height="156" loading="lazy">
      <strong>Scan to open ABN</strong>
      <span>Opens the official ABN web app</span>
      <a href="${APP_URL}" target="_blank" rel="noopener noreferrer">Open website ↗</a>
    </div>`;
  const content = document.querySelector(".content");
  const footer = content?.querySelector(".page-footer");
  if (content && !document.querySelector("#abnAppDownload")) {
    if (footer) content.insertBefore(panel, footer);
    else content.append(panel);
  }
  const css = document.createElement("link");
  css.rel = "stylesheet";
  css.href = "./app-branding.css?v=20261025-2";
  document.head.append(css);
  const qr = document.querySelector("#abnAppQr");
  if (qr) {
    qr.src = "https://api.qrserver.com/v1/create-qr-code/?size=180x180&margin=8&data=" + encodeURIComponent(APP_URL);
    qr.onerror = () => { qr.style.display = "none"; qr.insertAdjacentHTML("afterend", '<span class="abn-qr-fallback">Open the website link to access ABN</span>'); };
  }
  let installPrompt = null;
  const installButton = document.querySelector("#abnInstallApp");
  const help = document.querySelector("#abnInstallHelp");
  window.addEventListener("beforeinstallprompt", event => {
    event.preventDefault();
    installPrompt = event;
    if (installButton) installButton.textContent = "＋ Install ABN app";
    if (help) help.textContent = "Install ABN directly on your device. Your browser may ask you to confirm.";
  });
  window.addEventListener("appinstalled", () => {
    installPrompt = null;
    if (installButton) { installButton.textContent = "✓ ABN installed"; installButton.disabled = true; }
    if (help) help.textContent = "ABN has been installed on this device.";
  });
  installButton?.addEventListener("click", async () => {
    if (installPrompt) {
      installPrompt.prompt();
      await installPrompt.userChoice;
      installPrompt = null;
      return;
    }
    if (help) help.textContent = "If no install prompt appears, use your browser menu → Install app / Add to Home Screen. The Android APK builds link opens the build page; a signed public release is not yet available.";
  });
})();