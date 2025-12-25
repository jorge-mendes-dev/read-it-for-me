let r=null,E={},F=!1,T={x:0,y:0},z=!1;async function W(){return new Promise((t,e)=>{browser.storage.local.get(["selectedLocale"],async i=>{const n=i.selectedLocale||"en";try{const l=browser.runtime.getURL(`_locales/${n}/messages.json`),o=await fetch(l);if(!o.ok)throw new Error(`HTTP ${o.status}`);E=await o.json(),t()}catch(l){console.error("[FloatingPlayer] Failed to load locale:",n,l);try{const o=browser.runtime.getURL("_locales/en/messages.json");E=await(await fetch(o)).json(),t()}catch(o){console.error("[FloatingPlayer] Failed to load fallback locale:",o),e(o)}}})})}function d(t){return E[t]?E[t].message:(console.warn(`[FloatingPlayer] Translation missing for key: ${t}`),t)}function K(){var x,v,h,k,L,M,U;if(r)return;if(Object.keys(E).length===0){console.error("[FloatingPlayer] Cannot create player - no messages loaded!");return}r=document.createElement("div"),r.id="read-it-for-me-player",r.innerHTML=`
    <style>
      #read-it-for-me-player {
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 300px;
        background: linear-gradient(135deg, rgba(99, 102, 241, 0.95) 0%, rgba(139, 92, 246, 0.95) 100%);
        backdrop-filter: blur(10px);
        border-radius: 16px;
        box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        padding: 16px;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: white;
        display: none;
        animation: slideIn 0.3s ease-out;
        transition: all 0.3s ease;
        cursor: move;
      }

      #read-it-for-me-player.mini-mode {
        width: 60px;
        padding: 12px 10px;
        border-radius: 30px;
        box-shadow: 0 4px 20px rgba(0, 0, 0, 0.4);
      }

      #read-it-for-me-player.mini-mode .rifm-settings-toggle {
        display: none;
      }

      #read-it-for-me-player.mini-mode .rifm-header {
        margin-bottom: 8px;
        justify-content: center;
        flex-direction: column;
        gap: 8px;
        align-items: center;
      }

      #read-it-for-me-player.mini-mode .rifm-header > div:first-child {
        order: 2;
        display: flex;
        justify-content: center;
        width: 100%;
      }

      #read-it-for-me-player.mini-mode .rifm-header > div:last-child {
        order: 1;
        display: flex;
        flex-direction: column;
        gap: 8px;
        align-items: center;
        width: 100%;
      }

      #read-it-for-me-player.mini-mode .rifm-progress-bar {
        height: 2px;
        margin-bottom: 8px;
        border-radius: 1px;
      }

      #read-it-for-me-player.mini-mode .rifm-status {
        margin-bottom: 8px;
        justify-content: center;
      }

      #read-it-for-me-player.mini-mode .rifm-status-left {
        gap: 3px;
      }

      #read-it-for-me-player.mini-mode .rifm-status-left span {
        display: none;
      }

      #read-it-for-me-player.mini-mode .rifm-pulse {
        width: 2.5px;
        height: 10px;
      }

      #read-it-for-me-player.mini-mode .rifm-controls {
        flex-direction: column;
        gap: 8px;
        align-items: center;
      }

      #read-it-for-me-player.mini-mode .rifm-close {
        width: 40px;
        height: 40px;
        font-size: 14px;
        border-radius: 12px;
      }

      #read-it-for-me-player.mini-mode .rifm-mini-toggle {
        width: 40px;
        height: 40px;
        border-radius: 12px;
        margin-left: 0;
      }

      #read-it-for-me-player.mini-mode .rifm-mini-toggle svg {
        width: 14px;
        height: 14px;
      }

      #read-it-for-me-player.mini-mode .rifm-clear-queue {
        padding: 4px;
        font-size: 10px;
        margin-bottom: 4px;
      }

      @media (prefers-color-scheme: dark) {
        #read-it-for-me-player {
          background: linear-gradient(135deg, rgba(79, 82, 221, 0.98) 0%, rgba(119, 72, 226, 0.98) 100%);
          box-shadow: 0 8px 32px rgba(0, 0, 0, 0.5);
        }
      }

      @keyframes slideIn {
        from {
          transform: translateY(100px);
          opacity: 0;
        }
        to {
          transform: translateY(0);
          opacity: 1;
        }
      }

      #read-it-for-me-player.show {
        display: block;
      }

      .rifm-header {
        display: flex;
        align-items: center;
        justify-content: space-between;
        margin-bottom: 12px;
      }

      .rifm-title {
        font-size: 14px;
        font-weight: 600;
        display: flex;
        align-items: center;
        gap: 8px;
      }

      #read-it-for-me-player.mini-mode .rifm-title {
        font-size: 0;
      }

      #read-it-for-me-player.mini-mode .rifm-title svg {
        width: 16px;
        height: 16px;
      }

      #read-it-for-me-player.mini-mode .rifm-title {
        margin-bottom: 0;
      }

      .rifm-queue-badge {
        background: rgba(255, 255, 255, 0.3);
        padding: 2px 6px;
        border-radius: 8px;
        font-size: 10px;
        font-weight: 700;
        margin-left: 4px;
      }

      #read-it-for-me-player.mini-mode .rifm-queue-badge {
        margin-left: 0;
      }

      .rifm-close {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        border-radius: 8px;
        width: 24px;
        height: 24px;
        cursor: pointer;
        color: white;
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background 0.2s;
      }

      .rifm-close:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      .rifm-progress-bar {
        height: 3px;
        background: rgba(255, 255, 255, 0.2);
        border-radius: 2px;
        margin-bottom: 12px;
        overflow: hidden;
      }

      .rifm-progress-fill {
        height: 100%;
        background: white;
        width: 0%;
        transition: width 0.1s linear;
      }

      .rifm-status {
        font-size: 12px;
        opacity: 0.9;
        margin-bottom: 8px;
        display: flex;
        align-items: center;
        justify-content: space-between;
      }

      .rifm-status-left {
        display: flex;
        align-items: center;
        gap: 6px;
      }

      .rifm-pulse {
        width: 4px;
        height: 12px;
        background: white;
        border-radius: 2px;
        animation: pulse 1s ease-in-out infinite;
      }

      .rifm-pulse:nth-child(2) {
        animation-delay: 0.2s;
      }

      .rifm-pulse:nth-child(3) {
        animation-delay: 0.4s;
      }

      @keyframes pulse {
        0%, 100% { transform: scaleY(0.5); opacity: 0.5; }
        50% { transform: scaleY(1); opacity: 1; }
      }

      .rifm-controls {
        display: flex;
        gap: 8px;
        justify-content: center;
      }

      .rifm-btn {
        background: rgba(255, 255, 255, 0.25);
        border: none;
        border-radius: 8px;
        padding: 10px 16px;
        color: white;
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        flex: 1;
      }

      #read-it-for-me-player.mini-mode .rifm-btn {
        width: 40px;
        height: 40px;
        padding: 10px;
        flex: none;
        border-radius: 12px;
        margin: 0;
      }

      #read-it-for-me-player.mini-mode .rifm-btn svg {
        width: 16px;
        height: 16px;
      }

      #read-it-for-me-player.mini-mode .rifm-btn span {
        display: none;
      }

      .rifm-btn:hover {
        background: rgba(255, 255, 255, 0.35);
        transform: translateY(-1px);
      }

      .rifm-btn:active {
        transform: translateY(0);
      }

      .rifm-btn-stop {
        background: rgba(239, 68, 68, 0.9);
        flex: 0.8;
      }

      .rifm-btn-stop:hover {
        background: rgba(220, 38, 38, 0.9);
      }

      .rifm-speed-presets {
        display: flex;
        gap: 4px;
        margin-bottom: 8px;
        justify-content: center;
      }

      .rifm-presets-label {
        font-size: 10px;
        opacity: 0.8;
        margin-bottom: 6px;
        text-align: center;
        font-weight: 600;
        letter-spacing: 0.5px;
      }

      .rifm-preset-btn {
        background: rgba(255, 255, 255, 0.15);
        border: 1px solid rgba(255, 255, 255, 0.3);
        border-radius: 6px;
        padding: 4px 8px;
        color: white;
        font-size: 10px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
      }

      .rifm-preset-btn:hover {
        background: rgba(255, 255, 255, 0.25);
      }

      .rifm-preset-btn.active {
        background: rgba(255, 255, 255, 0.4);
        border-color: white;
      }

      .rifm-clear-queue {
        background: rgba(255, 165, 0, 0.8);
        border: none;
        border-radius: 6px;
        padding: 4px 8px;
        color: white;
        font-size: 10px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        margin-bottom: 8px;
        width: 100%;
      }

      .rifm-clear-queue:hover {
        background: rgba(255, 140, 0, 0.9);
      }

      .rifm-reset-btn {
        background: rgba(239, 68, 68, 0.15);
        border: 1px solid rgba(239, 68, 68, 0.3);
        border-radius: 8px;
        padding: 8px 12px;
        color: rgba(255, 255, 255, 0.95);
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: all 0.2s;
        margin-top: 12px;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        border-top: 1px solid rgba(255, 255, 255, 0.15);
        padding-top: 12px;
      }

      .rifm-reset-btn:hover {
        background: rgba(239, 68, 68, 0.25);
        border-color: rgba(239, 68, 68, 0.5);
        transform: translateY(-1px);
      }

      .mini-mode .rifm-config-panel,
      .mini-mode .rifm-progress-bar,
      .mini-mode .rifm-clear-queue {
        display: none !important;
      }

      .mini-mode .rifm-status {
        margin-bottom: 8px;
      }

      .rifm-settings-toggle {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        border-radius: 8px;
        width: 24px;
        height: 24px;
        cursor: pointer;
        color: white;
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        margin-left: 4px;
      }

      .rifm-settings-toggle:hover {
        background: rgba(255, 255, 255, 0.3);
        transform: rotate(90deg);
      }

      .rifm-settings-toggle.active {
        background: rgba(255, 255, 255, 0.4);
        transform: rotate(180deg);
      }

      .rifm-mini-toggle {
        background: rgba(255, 255, 255, 0.2);
        border: none;
        border-radius: 8px;
        width: 24px;
        height: 24px;
        cursor: pointer;
        color: white;
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: all 0.2s;
        margin-left: 4px;
      }

      .rifm-mini-toggle:hover {
        background: rgba(255, 255, 255, 0.3);
      }

      .rifm-config-panel {
        max-height: 0;
        overflow: hidden;
        transition: max-height 0.3s ease-out, margin-top 0.3s ease-out;
        margin-top: 0;
      }

      .rifm-config-panel.open {
        max-height: 250px;
        margin-top: 12px;
      }

      .rifm-slider-group {
        margin-bottom: 12px;
      }

      .rifm-slider-group:last-child {
        margin-bottom: 0;
      }

      .rifm-slider-label {
        display: flex;
        justify-content: space-between;
        align-items: center;
        font-size: 11px;
        margin-bottom: 6px;
        opacity: 0.95;
      }

      .rifm-slider-value {
        background: rgba(255, 255, 255, 0.3);
        padding: 2px 8px;
        border-radius: 6px;
        font-weight: 600;
        font-size: 10px;
      }

      .rifm-slider {
        width: 100%;
        height: 4px;
        border-radius: 2px;
        background: rgba(255, 255, 255, 0.3);
        outline: none;
        -webkit-appearance: none;
        appearance: none;
      }

      .rifm-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: white;
        cursor: pointer;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }

      .rifm-slider::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: white;
        cursor: pointer;
        border: none;
        box-shadow: 0 2px 4px rgba(0, 0, 0, 0.2);
      }
    </style>
    <div class="rifm-header">
      <div class="rifm-title">
        <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
        </svg>
        ${d("readItForMe")}
        <span class="rifm-queue-badge" id="rifm-queue-badge" style="display: none;">0</span>
      </div>
      <div style="display: flex; gap: 4px;">
        <button class="rifm-mini-toggle" id="rifm-mini-toggle" title="Mini Mode">
          <svg width="12" height="12" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" viewBox="0 0 24 24">
            <path d="M19 13H5v-2h14v2z"/>
          </svg>
        </button>
        <button class="rifm-settings-toggle" id="rifm-settings-toggle" title="Settings">
          <svg width="16" height="16" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 6V4m0 2a2 2 0 100 4m0-4a2 2 0 110 4m-6 8a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4m6 6v10m6-2a2 2 0 100-4m0 4a2 2 0 110-4m0 4v2m0-6V4"/>
          </svg>
        </button>
        <button class="rifm-close" id="rifm-close" title="Close">×</button>
      </div>
    </div>
    <div class="rifm-progress-bar">
      <div class="rifm-progress-fill" id="rifm-progress-fill"></div>
    </div>
    <div class="rifm-status" id="rifm-status">
      <div class="rifm-status-left">
        <div class="rifm-pulse"></div>
        <div class="rifm-pulse"></div>
        <div class="rifm-pulse"></div>
        <span id="rifm-status-text">${d("reading")}</span>
      </div>
      <span id="rifm-time-estimate" style="font-size: 10px; opacity: 0.8;"></span>
    </div>
    <button class="rifm-clear-queue" id="rifm-clear-queue" style="display: none;">${d("clearQueue")}</button>
    <div class="rifm-controls">
      <button class="rifm-btn" id="rifm-play-pause">
        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24" id="rifm-icon">
          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
        </svg>
        <span id="rifm-btn-text">${d("pause")}</span>
      </button>
      <button class="rifm-btn rifm-btn-stop" id="rifm-stop">
        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 6h12v12H6z"/>
        </svg>
        <span>${d("stop")}</span>
      </button>
    </div>
    <div class="rifm-config-panel" id="rifm-config-panel">
      <div class="rifm-presets-label">${d("speedPresets")}</div>
      <div class="rifm-speed-presets" id="rifm-speed-presets">
        <button class="rifm-preset-btn" data-speed="0.7">${d("presetSlow")}</button>
        <button class="rifm-preset-btn active" data-speed="1.0">${d("presetNormal")}</button>
        <button class="rifm-preset-btn" data-speed="1.5">${d("presetFast")}</button>
        <button class="rifm-preset-btn" data-speed="2.0">x2</button>
      </div>
      <div class="rifm-slider-group" style="margin-top: 12px;">
        <div class="rifm-slider-label">
          <span>${d("speed")}</span>
          <span class="rifm-slider-value" id="rifm-speed-value">0.9x</span>
        </div>
        <input type="range" min="0.5" max="2" step="0.1" value="0.9" class="rifm-slider" id="rifm-speed-slider">
      </div>
      <div class="rifm-slider-group">
        <div class="rifm-slider-label">
          <span>${d("pitch")}</span>
          <span class="rifm-slider-value" id="rifm-pitch-value">1.0x</span>
        </div>
        <input type="range" min="0.5" max="2" step="0.1" value="1" class="rifm-slider" id="rifm-pitch-slider">
      </div>
      <div class="rifm-slider-group">
        <div class="rifm-slider-label">
          <span>${d("volume")}</span>
          <span class="rifm-slider-value" id="rifm-volume-value">100%</span>
        </div>
        <input type="range" min="0" max="1" step="0.1" value="1" class="rifm-slider" id="rifm-volume-slider">
      </div>
      <button class="rifm-reset-btn" id="rifm-reset-btn">
        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
        </svg>
        ${d("resetDefaults")}
      </button>
    </div>
  `,document.body.appendChild(r),browser.storage.local.get(["defaultRate","defaultPitch","defaultVolume","showProgressBar"],s=>{const a=r==null?void 0:r.querySelector("#rifm-speed-slider"),g=r==null?void 0:r.querySelector("#rifm-pitch-slider"),w=r==null?void 0:r.querySelector("#rifm-volume-slider"),$=r==null?void 0:r.querySelector(".rifm-progress-bar");$&&($.style.display=s.showProgressBar!==!1?"block":"none"),a&&s.defaultRate!==void 0&&(a.value=s.defaultRate.toString(),y("speed",s.defaultRate),r==null||r.querySelectorAll(".rifm-preset-btn").forEach(R=>{const G=parseFloat(R.dataset.speed||"1.0");Math.abs(G-s.defaultRate)<.01?R.classList.add("active"):R.classList.remove("active")})),g&&s.defaultPitch!==void 0&&(g.value=s.defaultPitch.toString(),y("pitch",s.defaultPitch)),w&&s.defaultVolume!==void 0&&(w.value=s.defaultVolume.toString(),y("volume",s.defaultVolume))}),(x=r.querySelector("#rifm-close"))==null||x.addEventListener("click",C),(v=r.querySelector("#rifm-stop"))==null||v.addEventListener("click",()=>{browser.runtime.sendMessage({action:"stopReading"}),C()}),(h=r.querySelector("#rifm-play-pause"))==null||h.addEventListener("click",Z),(k=r.querySelector("#rifm-mini-toggle"))==null||k.addEventListener("click",()=>{z=!z,r==null||r.classList.toggle("mini-mode",z);const s=r==null?void 0:r.querySelector("#rifm-mini-toggle svg");s&&(s.innerHTML=z?'<path d="M4 8h16M4 16h16"/>':'<path d="M19 13H5v-2h14v2z"/>')}),(L=r.querySelector("#rifm-clear-queue"))==null||L.addEventListener("click",()=>{browser.runtime.sendMessage({action:"clearQueue"})}),r.querySelectorAll(".rifm-preset-btn").forEach(s=>{s.addEventListener("click",()=>{const a=parseFloat(s.dataset.speed||"1.0"),g=r==null?void 0:r.querySelector("#rifm-speed-slider");g&&(g.value=a.toString(),y("speed",a),browser.runtime.sendMessage({action:"updateSettings",rate:a}),browser.storage.local.set({defaultRate:a})),r==null||r.querySelectorAll(".rifm-preset-btn").forEach(w=>w.classList.remove("active")),s.classList.add("active")})}),(M=r.querySelector("#rifm-reset-btn"))==null||M.addEventListener("click",()=>{var $;const s={rate:.9,pitch:1,volume:1},a=r==null?void 0:r.querySelector("#rifm-speed-slider"),g=r==null?void 0:r.querySelector("#rifm-pitch-slider"),w=r==null?void 0:r.querySelector("#rifm-volume-slider");a&&(a.value=s.rate.toString(),y("speed",s.rate)),g&&(g.value=s.pitch.toString(),y("pitch",s.pitch)),w&&(w.value=s.volume.toString(),y("volume",s.volume)),r==null||r.querySelectorAll(".rifm-preset-btn").forEach(R=>R.classList.remove("active")),($=r==null?void 0:r.querySelector('.rifm-preset-btn[data-speed="1.0"]'))==null||$.classList.add("active"),browser.storage.local.set({defaultRate:s.rate,defaultPitch:s.pitch,defaultVolume:s.volume}),browser.runtime.sendMessage({action:"updateSettings",rate:s.rate,pitch:s.pitch,volume:s.volume})}),(U=r.querySelector("#rifm-settings-toggle"))==null||U.addEventListener("click",()=>{const s=r==null?void 0:r.querySelector("#rifm-config-panel"),a=r==null?void 0:r.querySelector("#rifm-settings-toggle");s==null||s.classList.toggle("open"),a==null||a.classList.toggle("active")});let t=r.querySelector(".rifm-header");t==null||t.addEventListener("mousedown",e);function e(s){if(s.target.closest("button"))return;F=!0;const a=r.getBoundingClientRect();T.x=s.clientX-a.left,T.y=s.clientY-a.top,document.addEventListener("mousemove",i),document.addEventListener("mouseup",n),s.preventDefault()}function i(s){if(!F||!r)return;let a=s.clientX-T.x,g=s.clientY-T.y;const w=r.getBoundingClientRect();a=Math.max(0,Math.min(a,window.innerWidth-w.width)),g=Math.max(0,Math.min(g,window.innerHeight-w.height)),r.style.left=a+"px",r.style.top=g+"px",r.style.bottom="auto",r.style.right="auto"}function n(){F=!1,document.removeEventListener("mousemove",i),document.removeEventListener("mouseup",n)}const l=r.querySelector("#rifm-speed-slider"),o=r.querySelector("#rifm-pitch-slider"),c=r.querySelector("#rifm-volume-slider");l==null||l.addEventListener("input",s=>{const a=parseFloat(s.target.value);y("speed",a),browser.runtime.sendMessage({action:"updateSettings",rate:a}),browser.storage.local.set({defaultRate:a})}),o==null||o.addEventListener("input",s=>{const a=parseFloat(s.target.value);y("pitch",a),browser.runtime.sendMessage({action:"updateSettings",pitch:a}),browser.storage.local.set({defaultPitch:a})}),c==null||c.addEventListener("input",s=>{const a=parseFloat(s.target.value);y("volume",a),browser.runtime.sendMessage({action:"updateSettings",volume:a}),browser.storage.local.set({defaultVolume:a})})}function y(t,e){const i=r==null?void 0:r.querySelector(`#rifm-${t}-value`);i&&(t==="volume"?i.textContent=`${Math.round(e*100)}%`:i.textContent=`${e.toFixed(1)}x`)}async function H(){r||(await W(),K()),r&&r.classList.add("show")}function C(){r==null||r.classList.remove("show")}function j(t){if(!r)return;const e=r.querySelector("#rifm-icon"),i=r.querySelector("#rifm-btn-text"),n=r.querySelector("#rifm-status-text");t?(e&&(e.innerHTML='<path d="M8 5v14l11-7z"/>'),i&&(i.textContent=d("resume")),n&&(n.textContent=d("paused"))):(e&&(e.innerHTML='<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>'),i&&(i.textContent=d("pause")),n&&(n.textContent=d("reading")))}function V(t){const e=r==null?void 0:r.querySelector("#rifm-queue-badge"),i=r==null?void 0:r.querySelector("#rifm-clear-queue");e&&(t>0?(e.textContent=t.toString(),e.setAttribute("style","display: inline-block;")):e.setAttribute("style","display: none;")),i&&i.setAttribute("style",t>0?"display: block;":"display: none;")}function D(t,e){const i=r==null?void 0:r.querySelector("#rifm-progress-fill");if(i&&e>0){const n=t/e*100;i.style.width=`${n}%`}}function J(t){const e=r==null?void 0:r.querySelector("#rifm-time-estimate");if(e)if(t>60){const i=Math.ceil(t/60);e.textContent=`~${i}min`}else e.textContent=`~${Math.ceil(t)}s`}function Z(){browser.runtime.sendMessage({action:"getState"},t=>{t.isPaused?browser.runtime.sendMessage({action:"resumeReading"}):browser.runtime.sendMessage({action:"pauseReading"})})}browser.runtime.onMessage.addListener(t=>{if(t.action==="stateUpdate"){const{isReading:e,isPaused:i}=t.state;e?H().then(()=>j(i)).catch(console.error):C()}});window.addEventListener("rifm-state-update",t=>{const{isReading:e,isPaused:i}=t.detail;e?H().then(()=>j(i)).catch(console.error):C()});browser.storage.onChanged.addListener((t,e)=>{if(e==="local"&&t.selectedLocale&&r){const i=r.classList.contains("show");r.remove(),r=null,W().then(()=>{K(),i&&r&&r.classList.add("show")}).catch(console.error)}if(e==="local"&&t.showProgressBar&&r){const i=r.querySelector(".rifm-progress-bar");i&&(i.style.display=t.showProgressBar.newValue!==!1?"block":"none")}});let m=null,f=!1,u=!1,B={},b=null,Q=0,S=[];function _(){if(S.length===0){f=!1,u=!1,m=null,b&&clearInterval(b),C(),q();return}V(S.length);const t=S.shift();I(t.text,t.voiceIndex,t.rate,t.pitch,t.volume)}function I(t,e,i,n,l){const o=P(t),c=new SpeechSynthesisUtterance(o),x=150*(i||1),h=o.split(/\s+/).length/x*60;J(h);const k=window.speechSynthesis.getVoices();if(e!==void 0&&k[e])c.voice=k[e];else{const L=ie(t),M=se(L);M?c.voice=M:k.length>0&&(c.voice=k[0])}c.rate=i,c.pitch=n,c.volume=l,Q=Date.now(),b&&clearInterval(b),b=window.setInterval(()=>{if(!f||u)return;const L=(Date.now()-Q)/1e3;D(L,h)},100),c.onend=()=>{b&&clearInterval(b),D(100,100),_()},c.onerror=()=>{b&&clearInterval(b),_()},m=c,window.speechSynthesis.speak(c),f=!0,u=!1,q(),V(S.length),H().catch(console.error)}async function N(){return new Promise((t,e)=>{browser.storage.local.get(["selectedLocale"],async i=>{const n=i.selectedLocale||"en";try{const l=browser.runtime.getURL(`_locales/${n}/messages.json`);B=await(await fetch(l)).json(),t()}catch(l){console.error("[ContentScript] Failed to load locale:",n,l);try{const o=browser.runtime.getURL("_locales/en/messages.json");B=await(await fetch(o)).json(),t()}catch(o){console.error("[ContentScript] Failed to load fallback locale:",o),e(o)}}})})}function X(t){return B[t]?B[t].message:(console.warn(`[ContentScript] Translation missing for key: ${t}`),t)}N().then(()=>{te(),A()});function P(t){let e=t;return e=e.replace(/\s+/g," ").trim(),e=e.replace(/\(([^)]+)\)/g,", $1,"),e=e.replace(/\[([^\]]+)\]/g,", $1,"),e=e.replace(/"([^"]+)"/g,", $1,"),e=e.replace(/'([^']+)'/g,"$1"),e=e.replace(/\bDr\./gi,"Doctor"),e=e.replace(/\bMr\./g,"Mister"),e=e.replace(/\bMrs\./g,"Misses"),e=e.replace(/\bMs\./g,"Miss"),e=e.replace(/\bProf\./gi,"Professor"),e=e.replace(/\bSt\./g,"Saint"),e=e.replace(/\bAve\./g,"Avenue"),e=e.replace(/\bBlvd\./g,"Boulevard"),e=e.replace(/\bRd\./g,"Road"),e=e.replace(/\betc\./gi,"etcetera"),e=e.replace(/\be\.g\./gi,"for example"),e=e.replace(/\bi\.e\./gi,"that is"),e=e.replace(/\bvs\./gi,"versus"),e=e.replace(/\betc\b/gi,"etcetera"),e=e.replace(/\baka\b/gi,"also known as"),e=e.replace(/(\d{1,2}):(\d{2})\s*(am|pm)/gi,"$1 $2 $3"),e=e.replace(/(\d{1,2}):(\d{2})/g,"$1 $2"),e=e.replace(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/g,"$1 $2 $3"),e=e.replace(/(\d+)(st|nd|rd|th)\b/gi,"$1$2"),e=e.replace(/(\d+),(\d{3})/g,"$1$2"),e=e.replace(/\s*--\s*/g,", "),e=e.replace(/\s*—\s*/g,", "),e=e.replace(/\.\s+/g,". "),e=e.replace(/\?\s+/g,"? "),e=e.replace(/!\s+/g,"! "),e=e.replace(/,\s*/g,", "),e=e.replace(/;\s*/g,"; "),e=e.replace(/:\s*/g,": "),e=e.replace(/https?:\/\/[^\s]+/g," "),e=e.replace(/www\.[^\s]+/g," "),e=e.replace(/[\w.-]+@[\w.-]+\.\w+/g," "),e=e.replace(/\.{2,}/g,","),e=e.replace(/!{2,}/g,"!"),e=e.replace(/\?{2,}/g,"?"),e=e.replace(/[*_#`~\[\]]/g,""),e=e.replace(/^\s*[-•]\s*/gm,""),e=e.replace(/\b([A-Z]{2,})\b/g,i=>i.length<=4?i.split("").join(". "):i.toLowerCase()),e=e.replace(/\s+/g," "),e=e.replace(/,\s*,+/g,","),e=e.replace(/\s*,\s*/g,", "),e.trim()}function q(){browser.runtime.sendMessage({action:"stateUpdate",state:{isReading:f,isPaused:u,currentText:(m==null?void 0:m.text)||""}}),window.dispatchEvent(new CustomEvent("rifm-state-update",{detail:{isReading:f,isPaused:u}}))}browser.runtime.onMessage.addListener((t,e,i)=>{var n,l;if(t.action==="getSelectedText"){const o=((n=window.getSelection())==null?void 0:n.toString())||"",c=document.documentElement.lang||((l=document.querySelector('meta[http-equiv="content-language"]'))==null?void 0:l.getAttribute("content"))||navigator.language;return i({text:o,language:c}),!0}if(t.action==="startReading"){const{text:o,voiceIndex:c,rate:x,pitch:v,volume:h}=t;return f&&!u?(S.push({text:o,voiceIndex:c,rate:x,pitch:v,volume:h}),i({success:!0,queued:!0})):(m&&(m.onend=null,m.onerror=null,window.speechSynthesis.cancel()),S=[],I(o,c,x,v,h),i({success:!0,queued:!1})),!0}return t.action==="pauseReading"?(f&&!u&&(window.speechSynthesis.pause(),u=!0,j(!0),q()),i({success:!0}),!0):t.action==="resumeReading"?(f&&u&&(window.speechSynthesis.resume(),u=!1,j(!1),q()),i({success:!0}),!0):t.action==="stopReading"?(window.speechSynthesis.cancel(),S=[],f=!1,u=!1,m=null,b&&clearInterval(b),V(0),q(),i({success:!0}),!0):t.action==="clearQueue"?(S=[],V(0),i({success:!0}),!0):(t.action==="updateSettings"&&(m&&f&&(t.rate!==void 0&&(m.rate=t.rate),t.pitch!==void 0&&(m.pitch=t.pitch),t.volume!==void 0&&(m.volume=t.volume)),i({success:!0})),!0)});document.addEventListener("keydown",t=>{if(t.code==="Space"&&f&&!ee()&&(t.preventDefault(),u?browser.runtime.sendMessage({action:"resumeReading"}):browser.runtime.sendMessage({action:"pauseReading"})),t.code==="Escape"&&f&&browser.runtime.sendMessage({action:"stopReading"}),t.ctrlKey&&t.shiftKey&&t.code==="KeyR"){t.preventDefault();const e=window.getSelection();(e==null?void 0:e.toString().trim())&&O()}});function ee(){const t=document.activeElement;return t instanceof HTMLInputElement||t instanceof HTMLTextAreaElement||t instanceof HTMLSelectElement||(t==null?void 0:t.isContentEditable)}let p=null;function te(){p||(p=document.createElement("div"),p.id="rifm-selection-tooltip",p.innerHTML=`
    <style>
      #rifm-selection-tooltip {
        position: absolute !important;
        background: linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%) !important;
        color: white !important;
        padding: 8px 16px !important;
        border-radius: 20px !important;
        box-shadow: 0 4px 12px rgba(99, 102, 241, 0.4) !important;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif !important;
        font-size: 13px !important;
        font-weight: 600 !important;
        cursor: pointer !important;
        z-index: 2147483646 !important;
        display: none !important;
        align-items: center !important;
        gap: 6px !important;
        transition: all 0.2s !important;
        user-select: none !important;
        backdrop-filter: blur(10px) !important;
        white-space: nowrap !important;
      }

      @media (prefers-color-scheme: dark) {
        #rifm-selection-tooltip {
          background: linear-gradient(135deg, #4f52dd 0%, #7748e2 100%) !important;
          box-shadow: 0 4px 12px rgba(79, 82, 221, 0.5) !important;
        }
      }

      #rifm-selection-tooltip:hover {
        transform: scale(1.05) !important;
        box-shadow: 0 6px 16px rgba(99, 102, 241, 0.5) !important;
      }

      #rifm-selection-tooltip.show {
        display: flex !important;
      }

      #rifm-selection-tooltip svg {
        width: 16px !important;
        height: 16px !important;
        fill: white !important;
      }
    </style>
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor">
      <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z"/>
    </svg>
    <span id="rifm-tooltip-text">${X("readThis")}</span>
  `,p.addEventListener("click",O),document.body.appendChild(p))}function A(){if(!p)return;const t=p.querySelector("#rifm-tooltip-text");t&&(t.textContent=X("readThis"))}function re(t,e){var x;if(!p)return;A();const i=150,n=40,l=10;let o=t,c=e-n-l;if(o+i>window.innerWidth&&(o=window.innerWidth-i-l),o<l&&(o=l),c<l){const v=(x=window.getSelection())==null?void 0:x.getRangeAt(0),h=v==null?void 0:v.getBoundingClientRect();h&&(c=h.bottom+window.scrollY+l)}p.style.left=`${o}px`,p.style.top=`${c}px`,p.classList.add("show")}function Y(){p==null||p.classList.remove("show")}function ie(t){const e=/[\u4e00-\u9fa5]/,i=/[\u3040-\u309f\u30a0-\u30ff]/,n=/[\uac00-\ud7af]/,l=/[\u0600-\u06ff]/,o=/[\u0400-\u04ff]/;return e.test(t)?"zh-CN":i.test(t)?"ja-JP":n.test(t)?"ko-KR":l.test(t)?"ar-SA":o.test(t)?"ru-RU":"en-US"}function se(t){const e=window.speechSynthesis.getVoices(),i=t.split("-")[0].toLowerCase(),n=e.filter(o=>o.lang.toLowerCase().startsWith(i));return n.length===0?null:n.find(o=>o.name.includes("Premium")||o.name.includes("Enhanced")||o.name.includes("Neural")||!o.name.includes("Google"))||n[0]}function O(){var e;const t=(e=window.getSelection())==null?void 0:e.toString();t&&(Y(),browser.storage.local.get(["defaultVoiceIndex","defaultRate","defaultPitch","defaultVolume"],i=>{const n=i.defaultVoiceIndex,l=i.defaultRate??.9,o=i.defaultPitch??1,c=i.defaultVolume??1;f&&!u?S.push({text:t,voiceIndex:n,rate:l,pitch:o,volume:c}):(m&&(m.onend=null,m.onerror=null,window.speechSynthesis.cancel()),S=[],I(t,n,l,o,c))}))}document.addEventListener("mouseup",()=>{setTimeout(()=>{const t=window.getSelection(),e=t==null?void 0:t.toString();if(e&&e.trim().length>0){browser.storage.local.set({lastSelectedText:e});const i=t==null?void 0:t.getRangeAt(0),n=i==null?void 0:i.getBoundingClientRect();if(n){const l=n.left+n.width/2-50,o=n.top+window.scrollY;re(l,o)}}else Y()},10)});document.addEventListener("mousedown",t=>{if(p&&!p.contains(t.target)){const e=window.getSelection();(!e||e.toString().trim().length===0)&&Y()}});browser.storage.onChanged.addListener((t,e)=>{e==="local"&&t.selectedLocale&&N().then(()=>{A()})});
