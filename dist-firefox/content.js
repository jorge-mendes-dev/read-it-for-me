let i=null,E={},z=!1,j={x:0,y:0},F=!1;async function N(){return new Promise((t,e)=>{browser.storage.local.get(["selectedLocale"],async r=>{const o=r.selectedLocale||"en";try{const c=browser.runtime.getURL(`_locales/${o}/messages.json`),n=await fetch(c);if(!n.ok)throw new Error(`HTTP ${n.status}`);E=await n.json(),t()}catch(c){console.error("[FloatingPlayer] Failed to load locale:",o,c);try{const n=browser.runtime.getURL("_locales/en/messages.json");E=await(await fetch(n)).json(),t()}catch(n){console.error("[FloatingPlayer] Failed to load fallback locale:",n),e(n)}}})})}function f(t){return E[t]?E[t].message:(console.warn(`[FloatingPlayer] Translation missing for key: ${t}`),t)}function X(){var u,$,y,k,C,S,q;if(i)return;if(Object.keys(E).length===0){console.error("[FloatingPlayer] Cannot create player - no messages loaded!");return}i=document.createElement("div"),i.id="read-it-for-me-player",i.innerHTML=`
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
        ${f("readItForMe")}
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
        <span id="rifm-status-text">${f("reading")}</span>
      </div>
      <span id="rifm-time-estimate" style="font-size: 10px; opacity: 0.8;"></span>
    </div>
    <button class="rifm-clear-queue" id="rifm-clear-queue" style="display: none;">${f("clearQueue")}</button>
    <div class="rifm-controls">
      <button class="rifm-btn" id="rifm-play-pause">
        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24" id="rifm-icon">
          <path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>
        </svg>
        <span id="rifm-btn-text">${f("pause")}</span>
      </button>
      <button class="rifm-btn rifm-btn-stop" id="rifm-stop">
        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
          <path d="M6 6h12v12H6z"/>
        </svg>
        <span>${f("stop")}</span>
      </button>
    </div>
    <div class="rifm-config-panel" id="rifm-config-panel">
      <div class="rifm-presets-label">${f("speedPresets")}</div>
      <div class="rifm-speed-presets" id="rifm-speed-presets">
        <button class="rifm-preset-btn" data-speed="0.7">${f("presetSlow")}</button>
        <button class="rifm-preset-btn active" data-speed="1.0">${f("presetNormal")}</button>
        <button class="rifm-preset-btn" data-speed="1.5">${f("presetFast")}</button>
        <button class="rifm-preset-btn" data-speed="2.0">x2</button>
      </div>
      <div class="rifm-slider-group" style="margin-top: 12px;">
        <div class="rifm-slider-label">
          <span>${f("speed")}</span>
          <span class="rifm-slider-value" id="rifm-speed-value">0.9x</span>
        </div>
        <input type="range" min="0.5" max="2" step="0.1" value="0.9" class="rifm-slider" id="rifm-speed-slider">
      </div>
      <div class="rifm-slider-group">
        <div class="rifm-slider-label">
          <span>${f("pitch")}</span>
          <span class="rifm-slider-value" id="rifm-pitch-value">1.0x</span>
        </div>
        <input type="range" min="0.5" max="2" step="0.1" value="1" class="rifm-slider" id="rifm-pitch-slider">
      </div>
      <div class="rifm-slider-group">
        <div class="rifm-slider-label">
          <span>${f("volume")}</span>
          <span class="rifm-slider-value" id="rifm-volume-value">100%</span>
        </div>
        <input type="range" min="0" max="1" step="0.1" value="1" class="rifm-slider" id="rifm-volume-slider">
      </div>
      <button class="rifm-reset-btn" id="rifm-reset-btn">
        <svg width="14" height="14" fill="currentColor" viewBox="0 0 24 24">
          <path d="M17.65 6.35A7.958 7.958 0 0012 4c-4.42 0-7.99 3.58-7.99 8s3.57 8 7.99 8c3.73 0 6.84-2.55 7.73-6h-2.08c-.82 2.33-3.04 4-5.65 4-3.31 0-6-2.69-6-6s2.69-6 6-6c1.66 0 3.14.69 4.22 1.78L13 11h7V4l-2.35 2.35z"/>
        </svg>
        ${f("resetDefaults")}
      </button>
    </div>
  `,document.body.appendChild(i),browser.storage.local.get(["defaultRate","defaultPitch","defaultVolume","showProgressBar"],s=>{const a=i==null?void 0:i.querySelector("#rifm-speed-slider"),x=i==null?void 0:i.querySelector("#rifm-pitch-slider"),m=i==null?void 0:i.querySelector("#rifm-volume-slider"),d=i==null?void 0:i.querySelector(".rifm-progress-bar");d&&(d.style.display=s.showProgressBar!==!1?"block":"none"),a&&s.defaultRate!==void 0&&(a.value=s.defaultRate.toString(),L("speed",s.defaultRate),i==null||i.querySelectorAll(".rifm-preset-btn").forEach(p=>{const T=parseFloat(p.dataset.speed||"1.0");Math.abs(T-s.defaultRate)<.01?p.classList.add("active"):p.classList.remove("active")})),x&&s.defaultPitch!==void 0&&(x.value=s.defaultPitch.toString(),L("pitch",s.defaultPitch)),m&&s.defaultVolume!==void 0&&(m.value=s.defaultVolume.toString(),L("volume",s.defaultVolume))}),(u=i.querySelector("#rifm-close"))==null||u.addEventListener("click",V),($=i.querySelector("#rifm-stop"))==null||$.addEventListener("click",()=>{browser.runtime.sendMessage({action:"stopReading"}),V()}),(y=i.querySelector("#rifm-play-pause"))==null||y.addEventListener("click",ee),(k=i.querySelector("#rifm-mini-toggle"))==null||k.addEventListener("click",()=>{F=!F,i==null||i.classList.toggle("mini-mode",F);const s=i==null?void 0:i.querySelector("#rifm-mini-toggle svg");s&&(s.innerHTML=F?'<path d="M4 8h16M4 16h16"/>':'<path d="M19 13H5v-2h14v2z"/>')}),(C=i.querySelector("#rifm-clear-queue"))==null||C.addEventListener("click",()=>{browser.runtime.sendMessage({action:"clearQueue"})}),i.querySelectorAll(".rifm-preset-btn").forEach(s=>{s.addEventListener("click",()=>{const a=parseFloat(s.dataset.speed||"1.0"),x=i==null?void 0:i.querySelector("#rifm-speed-slider");x&&(x.value=a.toString(),L("speed",a),browser.runtime.sendMessage({action:"updateSettings",rate:a}),browser.storage.local.set({defaultRate:a})),i==null||i.querySelectorAll(".rifm-preset-btn").forEach(m=>m.classList.remove("active")),s.classList.add("active")})}),(S=i.querySelector("#rifm-reset-btn"))==null||S.addEventListener("click",()=>{var d;const s={rate:.9,pitch:1,volume:1},a=i==null?void 0:i.querySelector("#rifm-speed-slider"),x=i==null?void 0:i.querySelector("#rifm-pitch-slider"),m=i==null?void 0:i.querySelector("#rifm-volume-slider");a&&(a.value=s.rate.toString(),L("speed",s.rate)),x&&(x.value=s.pitch.toString(),L("pitch",s.pitch)),m&&(m.value=s.volume.toString(),L("volume",s.volume)),i==null||i.querySelectorAll(".rifm-preset-btn").forEach(p=>p.classList.remove("active")),(d=i==null?void 0:i.querySelector('.rifm-preset-btn[data-speed="1.0"]'))==null||d.classList.add("active"),browser.storage.local.set({defaultRate:s.rate,defaultPitch:s.pitch,defaultVolume:s.volume}),browser.runtime.sendMessage({action:"updateSettings",rate:s.rate,pitch:s.pitch,volume:s.volume})}),(q=i.querySelector("#rifm-settings-toggle"))==null||q.addEventListener("click",()=>{const s=i==null?void 0:i.querySelector("#rifm-config-panel"),a=i==null?void 0:i.querySelector("#rifm-settings-toggle");s==null||s.classList.toggle("open"),a==null||a.classList.toggle("active")});let t=i.querySelector(".rifm-header");t==null||t.addEventListener("mousedown",e);function e(s){if(s.target.closest("button"))return;z=!0;const a=i.getBoundingClientRect();j.x=s.clientX-a.left,j.y=s.clientY-a.top,document.addEventListener("mousemove",r),document.addEventListener("mouseup",o),s.preventDefault()}function r(s){if(!z||!i)return;let a=s.clientX-j.x,x=s.clientY-j.y;const m=i.getBoundingClientRect();a=Math.max(0,Math.min(a,window.innerWidth-m.width)),x=Math.max(0,Math.min(x,window.innerHeight-m.height)),i.style.left=a+"px",i.style.top=x+"px",i.style.bottom="auto",i.style.right="auto"}function o(){if(z&&(z=!1,document.removeEventListener("mousemove",r),document.removeEventListener("mouseup",o),i)){const s=i.getBoundingClientRect();browser.storage.local.set({playerPosition:{left:s.left,top:s.top}})}}const c=i.querySelector("#rifm-speed-slider"),n=i.querySelector("#rifm-pitch-slider"),l=i.querySelector("#rifm-volume-slider");c==null||c.addEventListener("input",s=>{const a=parseFloat(s.target.value);L("speed",a),browser.runtime.sendMessage({action:"updateSettings",rate:a}),browser.storage.local.set({defaultRate:a})}),n==null||n.addEventListener("input",s=>{const a=parseFloat(s.target.value);L("pitch",a),browser.runtime.sendMessage({action:"updateSettings",pitch:a}),browser.storage.local.set({defaultPitch:a})}),l==null||l.addEventListener("input",s=>{const a=parseFloat(s.target.value);L("volume",a),browser.runtime.sendMessage({action:"updateSettings",volume:a}),browser.storage.local.set({defaultVolume:a})})}function L(t,e){const r=i==null?void 0:i.querySelector(`#rifm-${t}-value`);r&&(t==="volume"?r.textContent=`${Math.round(e*100)}%`:r.textContent=`${e.toFixed(1)}x`)}async function A(){i||(await N(),X()),i&&i.classList.add("show")}function V(){i==null||i.classList.remove("show")}function B(t){if(!i)return;const e=i.querySelector("#rifm-icon"),r=i.querySelector("#rifm-btn-text"),o=i.querySelector("#rifm-status-text");t?(e&&(e.innerHTML='<path d="M8 5v14l11-7z"/>'),r&&(r.textContent=f("resume")),o&&(o.textContent=f("paused"))):(e&&(e.innerHTML='<path d="M6 4h4v16H6V4zm8 0h4v16h-4V4z"/>'),r&&(r.textContent=f("pause")),o&&(o.textContent=f("reading")))}function H(t){const e=i==null?void 0:i.querySelector("#rifm-queue-badge"),r=i==null?void 0:i.querySelector("#rifm-clear-queue");e&&(t>0?(e.textContent=t.toString(),e.setAttribute("style","display: inline-block;")):e.setAttribute("style","display: none;")),r&&r.setAttribute("style",t>0?"display: block;":"display: none;")}function Q(t,e){const r=i==null?void 0:i.querySelector("#rifm-progress-fill");if(r&&e>0){const o=t/e*100;r.style.width=`${o}%`}}function P(t){const e=i==null?void 0:i.querySelector("#rifm-time-estimate");if(e)if(t>60){const r=Math.ceil(t/60);e.textContent=`~${r}min`}else e.textContent=`~${Math.ceil(t)}s`}function ee(){browser.runtime.sendMessage({action:"getState"},t=>{t.isPaused?browser.runtime.sendMessage({action:"resumeReading"}):browser.runtime.sendMessage({action:"pauseReading"})})}browser.runtime.onMessage.addListener(t=>{if(t.action==="stateUpdate"){const{isReading:e,isPaused:r}=t.state;e?A().then(()=>B(r)).catch(console.error):V()}});window.addEventListener("rifm-state-update",t=>{const{isReading:e,isPaused:r}=t.detail;e?A().then(()=>B(r)).catch(console.error):V()});browser.storage.onChanged.addListener((t,e)=>{if(e==="local"&&t.selectedLocale&&i){const r=i.classList.contains("show");i.remove(),i=null,N().then(()=>{X(),r&&i&&i.classList.add("show")}).catch(console.error)}if(e==="local"&&t.showProgressBar&&i){const r=i.querySelector(".rifm-progress-bar");r&&(r.style.display=t.showProgressBar.newValue!==!1?"block":"none")}});let h=null,v=!1,w=!1,I={},b=null,W=0;function te(){return new Promise(t=>{const e=window.speechSynthesis.getVoices();e.length>0?t(e):window.speechSynthesis.onvoiceschanged=()=>{const r=window.speechSynthesis.getVoices();t(r)}})}let M=[];function _(){if(M.length===0){v=!1,w=!1,h=null,b&&(clearInterval(b),b=null),V(),R();return}H(M.length);const t=M.shift();U(t.text,t.voiceIndex,t.rate,t.pitch,t.volume)}function U(t,e,r,o,c){const n=ie(t),l=new SpeechSynthesisUtterance(n),u=150*(r||1),y=n.split(/\s+/).length/u*60;P(y);const k=window.speechSynthesis.getVoices();if(e!==void 0&&k[e])l.voice=k[e];else{const C=J(t),S=ne(C);S?l.voice=S:k.length>0&&(l.voice=k[0])}l.rate=r,l.pitch=o,l.volume=c,W=Date.now(),b&&(clearInterval(b),b=null),b=window.setInterval(()=>{if(!v||w)return;const C=(Date.now()-W)/1e3;Q(C,y)},100),l.onend=()=>{b&&(clearInterval(b),b=null),Q(100,100),_()},l.onerror=()=>{b&&(clearInterval(b),b=null),_()},h=l,window.speechSynthesis.speak(l),v=!0,w=!1,R(),H(M.length),A().catch(console.error)}async function O(){return new Promise((t,e)=>{browser.storage.local.get(["selectedLocale"],async r=>{const o=r.selectedLocale||"en";try{const c=browser.runtime.getURL(`_locales/${o}/messages.json`);I=await(await fetch(c)).json(),t()}catch(c){console.error("[ContentScript] Failed to load locale:",o,c);try{const n=browser.runtime.getURL("_locales/en/messages.json");I=await(await fetch(n)).json(),t()}catch(n){console.error("[ContentScript] Failed to load fallback locale:",n),e(n)}}})})}function G(t){return I[t]?I[t].message:(console.warn(`[ContentScript] Translation missing for key: ${t}`),{readThis:"Read This",pause:"Pause",resume:"Resume",stop:"Stop",clearQueue:"Clear Queue"}[t]||t)}O().then(()=>{K(),D()}).catch(t=>{console.error("[ContentScript] Failed to load locale, creating tooltip with defaults:",t),K()});function ie(t){let e=t;return e=e.replace(/\s+/g," ").trim(),e=e.replace(/\(([^)]+)\)/g,", $1,"),e=e.replace(/\[([^\]]+)\]/g,", $1,"),e=e.replace(/"([^"]+)"/g,", $1,"),e=e.replace(/'([^']+)'/g,"$1"),e=e.replace(/\bDr\./gi,"Doctor"),e=e.replace(/\bMr\./g,"Mister"),e=e.replace(/\bMrs\./g,"Misses"),e=e.replace(/\bMs\./g,"Miss"),e=e.replace(/\bProf\./gi,"Professor"),e=e.replace(/\bSt\./g,"Saint"),e=e.replace(/\bAve\./g,"Avenue"),e=e.replace(/\bBlvd\./g,"Boulevard"),e=e.replace(/\bRd\./g,"Road"),e=e.replace(/\betc\./gi,"etcetera"),e=e.replace(/\be\.g\./gi,"for example"),e=e.replace(/\bi\.e\./gi,"that is"),e=e.replace(/\bvs\./gi,"versus"),e=e.replace(/\betc\b/gi,"etcetera"),e=e.replace(/\baka\b/gi,"also known as"),e=e.replace(/(\d{1,2}):(\d{2})\s*(am|pm)/gi,"$1 $2 $3"),e=e.replace(/(\d{1,2}):(\d{2})/g,"$1 $2"),e=e.replace(/(\d{1,2})\/(\d{1,2})\/(\d{2,4})/g,"$1 $2 $3"),e=e.replace(/(\d+)(st|nd|rd|th)\b/gi,"$1$2"),e=e.replace(/(\d+),(\d{3})/g,"$1$2"),e=e.replace(/\s*--\s*/g,", "),e=e.replace(/\s*—\s*/g,", "),e=e.replace(/\.\s+/g,". "),e=e.replace(/\?\s+/g,"? "),e=e.replace(/!\s+/g,"! "),e=e.replace(/,\s*/g,", "),e=e.replace(/;\s*/g,"; "),e=e.replace(/:\s*/g,": "),e=e.replace(/https?:\/\/[^\s]+/g," "),e=e.replace(/www\.[^\s]+/g," "),e=e.replace(/[\w.-]+@[\w.-]+\.\w+/g," "),e=e.replace(/\.{2,}/g,","),e=e.replace(/!{2,}/g,"!"),e=e.replace(/\?{2,}/g,"?"),e=e.replace(/[*_#`~\[\]]/g,""),e=e.replace(/^\s*[-•]\s*/gm,""),e=e.replace(/\b([A-Z]{2,})\b/g,r=>r.length<=4?r.split("").join(". "):r.toLowerCase()),e=e.replace(/\s+/g," "),e=e.replace(/,\s*,+/g,","),e=e.replace(/\s*,\s*/g,", "),e.trim()}function R(){browser.runtime.sendMessage({action:"stateUpdate",state:{isReading:v,isPaused:w,currentText:(h==null?void 0:h.text)||""}}),window.dispatchEvent(new CustomEvent("rifm-state-update",{detail:{isReading:v,isPaused:w}}))}browser.runtime.onMessage.addListener((t,e,r)=>{var o,c;if(t.action==="getSelectedText"){const n=((o=window.getSelection())==null?void 0:o.toString())||"",l=document.documentElement.lang||((c=document.querySelector('meta[http-equiv="content-language"]'))==null?void 0:c.getAttribute("content"))||navigator.language;return r({text:n,language:l}),!0}if(t.action==="startReading"){const{text:n,voiceIndex:l,rate:u,pitch:$,volume:y}=t;return v&&!w?(M.push({text:n,voiceIndex:l,rate:u,pitch:$,volume:y}),r({success:!0,queued:!0})):(h&&(h.onend=null,h.onerror=null,window.speechSynthesis.cancel()),M=[],U(n,l,u,$,y),r({success:!0,queued:!1})),!0}return t.action==="pauseReading"?(v&&!w&&(window.speechSynthesis.pause(),w=!0,B(!0),R()),r({success:!0}),!0):t.action==="resumeReading"?(v&&w&&(window.speechSynthesis.resume(),w=!1,B(!1),R()),r({success:!0}),!0):t.action==="stopReading"?(window.speechSynthesis.cancel(),M=[],v=!1,w=!1,h=null,b&&clearInterval(b),H(0),R(),r({success:!0}),!0):t.action==="clearQueue"?(M=[],H(0),r({success:!0}),!0):(t.action==="updateSettings"&&(h&&v&&(t.rate!==void 0&&(h.rate=t.rate),t.pitch!==void 0&&(h.pitch=t.pitch),t.volume!==void 0&&(h.volume=t.volume)),r({success:!0})),!0)});document.addEventListener("keydown",t=>{if(t.code==="Space"&&v&&!re()&&(t.preventDefault(),w?browser.runtime.sendMessage({action:"resumeReading"}):browser.runtime.sendMessage({action:"pauseReading"})),t.code==="Escape"&&v&&browser.runtime.sendMessage({action:"stopReading"}),t.ctrlKey&&t.shiftKey&&t.code==="KeyR"){t.preventDefault();const e=window.getSelection();(e==null?void 0:e.toString().trim())&&Z()}});function re(){const t=document.activeElement;return t instanceof HTMLInputElement||t instanceof HTMLTextAreaElement||t instanceof HTMLSelectElement||(t==null?void 0:t.isContentEditable)}let g=null;function K(){g||(g=document.createElement("div"),g.id="rifm-selection-tooltip",g.innerHTML=`
    <style>
      #rifm-selection-tooltip {
        position: fixed !important;
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
    <span id="rifm-tooltip-text">${G("readThis")}</span>
  `,g.addEventListener("click",Z),document.body.appendChild(g))}function D(){if(!g)return;const t=g.querySelector("#rifm-tooltip-text");t&&(t.textContent=G("readThis"))}function se(){if(!g)return;D();const t=window.getSelection();if(!t||t.rangeCount===0)return;const r=t.getRangeAt(0).getBoundingClientRect(),o=150,c=40,n=5;let l=r.left+r.width/2-o/2,u=r.top-c-n;l+o>window.innerWidth-n&&(l=window.innerWidth-o-n),l<n&&(l=n),u<n&&(u=r.bottom+n),u+c>window.innerHeight-n&&(u=window.innerHeight-c-n),g.style.left=`${l}px`,g.style.top=`${u}px`,g.classList.add("show")}function Y(){g==null||g.classList.remove("show")}function J(t){const e=/[\u4e00-\u9fa5]/,r=/[\u3040-\u309f\u30a0-\u30ff]/,o=/[\uac00-\ud7af]/,c=/[\u0600-\u06ff]/,n=/[\u0400-\u04ff]/;return e.test(t)?"zh-CN":r.test(t)?"ja-JP":o.test(t)?"ko-KR":c.test(t)?"ar-SA":n.test(t)?"ru-RU":"en-US"}function ne(t){const e=window.speechSynthesis.getVoices(),r=t.split("-")[0].toLowerCase(),o=e.filter(n=>n.lang.toLowerCase().startsWith(r));return o.length===0?null:o.find(n=>n.name.includes("Premium")||n.name.includes("Enhanced")||n.name.includes("Neural")||!n.name.includes("Google"))||o[0]}function Z(){var r;const t=(r=window.getSelection())==null?void 0:r.toString();if(!t)return;Y();const e=()=>{var l,u;const o=document.documentElement.lang;if(o)return o;const c=(l=document.querySelector('meta[http-equiv="content-language"]'))==null?void 0:l.getAttribute("content");if(c)return c;const n=(u=document.querySelector('meta[name="language"]'))==null?void 0:u.getAttribute("content");return n||J(t)};browser.storage.local.get(["defaultVoiceIndex","defaultRate","defaultPitch","defaultVolume","autoSelectVoice"],async o=>{let c=o.defaultVoiceIndex;const n=o.defaultRate??.9,l=o.defaultPitch??1,u=o.defaultVolume??1;if(o.autoSelectVoice??!1){const y=await te(),k=e(),C=k.split("-")[0].toLowerCase(),S=k.toLowerCase(),q=y.filter(s=>{const a=s.lang.toLowerCase();return a.startsWith(C)||a===S||a.startsWith(S)});if(q.length>0){const s=m=>{let d=0;const p=m.name.toLowerCase(),T=m.lang.toLowerCase();return T===S?d+=50:T.startsWith(S)&&(d+=30),p.includes("neural")&&(d+=100),p.includes("premium")&&(d+=90),p.includes("enhanced")&&(d+=80),p.includes("natural")&&(d+=70),p.includes("microsoft")&&(d+=40),p.includes("edge")&&(d+=40),p.includes("google")&&(d+=30),p.includes("espeak")&&(d-=50),p.includes("festival")&&(d-=50),m.localService&&(d+=20),(p.includes("female")||p.includes("aria")||p.includes("zira")||p.includes("heera")||p.includes("susan")||p.includes("samantha"))&&(d+=15),d},x=q.map(m=>({voice:m,score:s(m)})).sort((m,d)=>d.score-m.score)[0].voice;c=y.indexOf(x),browser.storage.local.set({autoSelectedVoice:c})}}v&&!w?M.push({text:t,voiceIndex:c,rate:n,pitch:l,volume:u}):(h&&(h.onend=null,h.onerror=null,window.speechSynthesis.cancel()),M=[],U(t,c,n,l,u))})}document.addEventListener("mouseup",()=>{setTimeout(()=>{const t=window.getSelection(),e=t==null?void 0:t.toString();e&&e.trim().length>0?(browser.storage.local.set({lastSelectedText:e}),se()):Y()},10)});document.addEventListener("mousedown",t=>{if(g&&!g.contains(t.target)){const e=window.getSelection();(!e||e.toString().trim().length===0)&&Y()}});browser.storage.onChanged.addListener((t,e)=>{e==="local"&&t.selectedLocale&&O().then(()=>{D()})});
