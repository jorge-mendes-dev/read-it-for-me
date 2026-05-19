export const FLOATING_PLAYER_STYLES = String.raw`
      #read-it-for-me-player {
        --rifm-ease-out: cubic-bezier(0.23, 1, 0.32, 1);
        --rifm-ease-in-out: cubic-bezier(0.77, 0, 0.175, 1);
        --rifm-bg: #141519;
        --rifm-surface: #1a1c22;
        --rifm-surface-hover: #21242c;
        --rifm-border: #23252a;
        --rifm-border-strong: #2d3038;
        --rifm-text: #f7f8f8;
        --rifm-subtle-text: rgba(247, 248, 248, 0.9);
        --rifm-slider-bg: rgba(255, 255, 255, 0.3);
        --rifm-value-bg: rgba(255, 255, 255, 0.3);
        --rifm-preset-bg: rgba(255, 255, 255, 0.15);
        --rifm-preset-border: rgba(255, 255, 255, 0.3);
        --rifm-preset-hover: rgba(255, 255, 255, 0.25);
        --rifm-preset-active: rgba(255, 255, 255, 0.4);
        --rifm-preset-text: #ffffff;
        --rifm-primary: #5e6ad2;
        --rifm-ripple: rgba(255, 255, 255, 0.3);
        --rifm-shimmer: rgba(255, 255, 255, 0.12);
        position: fixed;
        bottom: 20px;
        right: 20px;
        width: 300px;
        background: var(--rifm-bg);
        border: 1px solid var(--rifm-border);
        border-radius: 12px;
        padding: 16px;
        z-index: 999999;
        font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
        color: var(--rifm-text);
        display: none;
        animation: slideIn 240ms var(--rifm-ease-out);
        transition: background-color 200ms var(--rifm-ease-out), border-color 200ms var(--rifm-ease-out), color 200ms var(--rifm-ease-out), transform 220ms var(--rifm-ease-out), box-shadow 220ms var(--rifm-ease-out);
        cursor: move;
        will-change: transform;
      }

      #read-it-for-me-player.rifm-theme-light {
        --rifm-bg: #ffffff;
        --rifm-surface: #f3f5f9;
        --rifm-surface-hover: #e9edf5;
        --rifm-border: #d8deea;
        --rifm-border-strong: #c7cfde;
        --rifm-text: #141923;
        --rifm-subtle-text: rgba(20, 25, 35, 0.85);
        --rifm-slider-bg: rgba(89, 102, 128, 0.3);
        --rifm-value-bg: rgba(89, 102, 128, 0.2);
        --rifm-preset-bg: rgba(89, 102, 128, 0.12);
        --rifm-preset-border: rgba(89, 102, 128, 0.25);
        --rifm-preset-hover: rgba(89, 102, 128, 0.2);
        --rifm-preset-active: rgba(89, 102, 128, 0.28);
        --rifm-preset-text: #141923;
        --rifm-ripple: rgba(20, 25, 35, 0.18);
        --rifm-shimmer: rgba(255, 255, 255, 0.35);
      }

      #read-it-for-me-player.rifm-theme-dark {
        --rifm-bg: #141519;
        --rifm-surface: #1a1c22;
        --rifm-surface-hover: #21242c;
        --rifm-border: #23252a;
        --rifm-border-strong: #2d3038;
        --rifm-text: #f7f8f8;
        --rifm-subtle-text: rgba(247, 248, 248, 0.9);
        --rifm-slider-bg: rgba(255, 255, 255, 0.3);
        --rifm-value-bg: rgba(255, 255, 255, 0.3);
        --rifm-preset-bg: rgba(255, 255, 255, 0.15);
        --rifm-preset-border: rgba(255, 255, 255, 0.3);
        --rifm-preset-hover: rgba(255, 255, 255, 0.25);
        --rifm-preset-active: rgba(255, 255, 255, 0.4);
        --rifm-preset-text: #ffffff;
        --rifm-ripple: rgba(255, 255, 255, 0.3);
        --rifm-shimmer: rgba(255, 255, 255, 0.12);
      }

      #read-it-for-me-player.dragging {
        cursor: grabbing !important;
        transition: none !important;
        border-color: var(--rifm-border-strong);
        transform: scale(1.02);
      }

      #read-it-for-me-player.dragging * {
        cursor: grabbing !important;
        user-select: none !important;
      }

      #read-it-for-me-player.mini-mode {
        width: 60px;
        padding: 12px 10px;
        border-radius: 12px;
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

      @keyframes bounceIn {
        0% {
          transform: scale(0.3);
          opacity: 0;
        }
        50% {
          transform: scale(1.05);
        }
        70% {
          transform: scale(0.9);
        }
        100% {
          transform: scale(1);
          opacity: 1;
        }
      }

      @keyframes shake {
        0%, 100% { transform: translateX(0); }
        10%, 30%, 50%, 70%, 90% { transform: translateX(-2px); }
        20%, 40%, 60%, 80% { transform: translateX(2px); }
      }

      @keyframes progressGlow {
        0%, 100% {
          opacity: 0.85;
        }
        50% {
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
        cursor: grab;
        user-select: none;
      }

      .rifm-header:active {
        cursor: grabbing;
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
        background: var(--rifm-surface);
        border: 1px solid var(--rifm-border-strong);
        padding: 2px 6px;
        border-radius: 8px;
        font-size: 10px;
        font-weight: 700;
        margin-left: 4px;
        animation: bounceIn 0.5s cubic-bezier(0.34, 1.56, 0.64, 1);
        transition: all 0.3s cubic-bezier(0.34, 1.56, 0.64, 1);
      }

      .rifm-queue-badge:hover {
        transform: scale(1.1);
        background: var(--rifm-surface-hover);
      }

      #read-it-for-me-player.mini-mode .rifm-queue-badge {
        margin-left: 0;
      }

      .rifm-close {
        background: var(--rifm-surface);
        border: 1px solid var(--rifm-border-strong);
        border-radius: 8px;
        width: 40px;
        height: 40px;
        cursor: pointer;
        color: var(--rifm-text);
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 180ms var(--rifm-ease-out), transform 180ms var(--rifm-ease-out), border-color 180ms var(--rifm-ease-out), box-shadow 180ms var(--rifm-ease-out);
      }

      .rifm-close:hover {
        background: var(--rifm-surface-hover);
        transform: translateY(-1px);
      }

      .rifm-close:active {
        transform: scale(0.96);
      }

      .rifm-close:focus-visible,
      .rifm-btn:focus-visible,
      .rifm-settings-toggle:focus-visible,
      .rifm-mini-toggle:focus-visible,
      .rifm-preset-btn:focus-visible,
      .rifm-clear-queue:focus-visible,
      .rifm-reset-btn:focus-visible,
      .rifm-slider:focus-visible {
        outline: 2px solid color-mix(in srgb, var(--rifm-primary) 60%, transparent) !important;
        outline-offset: 2px;
      }

      .rifm-progress-bar {
        height: 3px;
        background: var(--rifm-surface);
        border-radius: 2px;
        margin-bottom: 12px;
        overflow: hidden;
        position: relative;
      }

      .rifm-progress-fill {
        height: 100%;
        background: var(--rifm-primary);
        width: 0%;
        transition: width 0.1s linear;
        position: relative;
        animation: progressGlow 2s ease-in-out infinite;
      }

      .rifm-progress-fill::after {
        content: '';
        position: absolute;
        top: 0;
        right: 0;
        bottom: 0;
        width: 100px;
        background: var(--rifm-shimmer);
        animation: shimmer 2s ease-in-out infinite;
      }

      @keyframes shimmer {
        0% {
          transform: translateX(-100%);
        }
        100% {
          transform: translateX(100%);
        }
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
        background: var(--rifm-text);
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

      @media (prefers-reduced-motion: reduce) {
        #read-it-for-me-player,
        .rifm-btn,
        .rifm-btn::before,
        .rifm-queue-badge,
        .rifm-progress-fill,
        .rifm-pulse,
        #rifm-selection-tooltip {
          animation: none !important;
          transition: none !important;
        }
      }

      .rifm-controls {
        display: flex;
        gap: 8px;
        justify-content: center;
      }

      .rifm-btn {
        background: var(--rifm-surface);
        border: 1px solid var(--rifm-border-strong);
        border-radius: 8px;
        padding: 10px 16px;
        color: var(--rifm-text);
        font-size: 13px;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 180ms var(--rifm-ease-out), border-color 180ms var(--rifm-ease-out), color 180ms var(--rifm-ease-out), transform 160ms var(--rifm-ease-out), box-shadow 180ms var(--rifm-ease-out);
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        flex: 1;
        position: relative;
        overflow: hidden;
      }

      .rifm-btn::before {
        content: '';
        position: absolute;
        top: 50%;
        left: 50%;
        width: 0;
        height: 0;
        border-radius: 50%;
        background: var(--rifm-ripple);
        transform: translate(-50%, -50%);
        transition: width 0.6s, height 0.6s;
      }

      .rifm-btn:active::before {
        width: 300px;
        height: 300px;
      }

      #read-it-for-me-player.mini-mode .rifm-btn {
        width: 44px;
        height: 44px;
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
        background: var(--rifm-surface-hover);
        transform: translateY(-1px);
      }

      .rifm-btn:active {
        transform: translateY(0) scale(0.98);
      }

      .rifm-btn svg {
        transition: transform 180ms var(--rifm-ease-out);
        position: relative;
        z-index: 1;
      }

      .rifm-btn:hover svg {
        transform: scale(1.06);
      }

      .rifm-btn-stop {
        background: var(--rifm-surface);
        flex: 0.8;
        border-color: var(--rifm-primary);
      }

      .rifm-btn-stop:hover {
        background: var(--rifm-surface-hover);
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
        background: var(--rifm-preset-bg);
        border: 1px solid var(--rifm-preset-border);
        border-radius: 6px;
        padding: 4px 8px;
        color: var(--rifm-preset-text);
        font-size: 10px;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 160ms var(--rifm-ease-out), border-color 160ms var(--rifm-ease-out), transform 140ms var(--rifm-ease-out);
      }

      .rifm-preset-btn:hover {
        background: var(--rifm-preset-hover);
        transform: translateY(-1px);
      }

      .rifm-preset-btn.active {
        background: var(--rifm-preset-active);
        border-color: var(--rifm-text);
      }

      .rifm-preset-btn:active {
        transform: scale(0.97);
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
        transition: background-color 160ms var(--rifm-ease-out), transform 140ms var(--rifm-ease-out), box-shadow 180ms var(--rifm-ease-out);
        margin-bottom: 8px;
        width: 100%;
      }

      .rifm-clear-queue:hover {
        background: rgba(255, 140, 0, 0.9);
        transform: translateY(-1px);
      }

      .rifm-clear-queue:active {
        transform: scale(0.98);
      }

      .rifm-reset-btn {
        background: rgba(239, 68, 68, 0.15);
        border: 1px solid rgba(239, 68, 68, 0.3);
        border-radius: 8px;
        padding: 8px 12px;
        color: color-mix(in srgb, var(--rifm-text) 94%, transparent);
        font-size: 11px;
        font-weight: 600;
        cursor: pointer;
        transition: background-color 160ms var(--rifm-ease-out), border-color 160ms var(--rifm-ease-out), transform 140ms var(--rifm-ease-out), color 160ms var(--rifm-ease-out);
        margin-top: 12px;
        width: 100%;
        display: flex;
        align-items: center;
        justify-content: center;
        gap: 6px;
        border-top: 1px solid color-mix(in srgb, var(--rifm-text) 15%, transparent);
        padding-top: 12px;
      }

      .rifm-reset-btn:hover {
        background: rgba(239, 68, 68, 0.25);
        border-color: rgba(239, 68, 68, 0.5);
        transform: translateY(-1px);
      }

      .rifm-reset-btn:active {
        transform: scale(0.98);
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
        background: var(--rifm-surface);
        border: 1px solid var(--rifm-border-strong);
        border-radius: 8px;
        width: 40px;
        height: 40px;
        cursor: pointer;
        color: var(--rifm-text);
        font-size: 16px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 160ms var(--rifm-ease-out), border-color 160ms var(--rifm-ease-out), transform 180ms var(--rifm-ease-out);
        margin-left: 4px;
      }

      .rifm-settings-toggle:hover {
        background: var(--rifm-surface-hover);
        transform: translateY(-1px) rotate(15deg);
      }

      .rifm-settings-toggle.active {
        background: var(--rifm-surface-hover);
        transform: rotate(180deg);
      }

      .rifm-settings-toggle:active,
      .rifm-mini-toggle:active {
        transform: scale(0.96);
      }

      .rifm-mini-toggle {
        background: var(--rifm-surface);
        border: 1px solid var(--rifm-border-strong);
        border-radius: 8px;
        width: 40px;
        height: 40px;
        cursor: pointer;
        color: var(--rifm-text);
        font-size: 14px;
        display: flex;
        align-items: center;
        justify-content: center;
        transition: background-color 160ms var(--rifm-ease-out), border-color 160ms var(--rifm-ease-out), transform 160ms var(--rifm-ease-out);
        margin-left: 4px;
      }

      .rifm-mini-toggle:hover {
        background: var(--rifm-surface-hover);
        transform: translateY(-1px);
      }

      .rifm-config-panel {
        max-height: 0;
        overflow: hidden;
        opacity: 0;
        transform: translateY(-4px);
        transition: max-height 220ms var(--rifm-ease-out), margin-top 220ms var(--rifm-ease-out), opacity 180ms var(--rifm-ease-out), transform 180ms var(--rifm-ease-out);
        margin-top: 0;
      }

      .rifm-config-panel.open {
        max-height: 250px;
        margin-top: 12px;
        opacity: 1;
        transform: translateY(0);
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
        color: var(--rifm-subtle-text);
      }

      .rifm-slider-value {
        background: var(--rifm-value-bg);
        padding: 2px 8px;
        border-radius: 6px;
        font-weight: 600;
        font-size: 10px;
        color: var(--rifm-text);
      }

      .rifm-slider {
        width: 100%;
        height: 4px;
        border-radius: 2px;
        background: var(--rifm-slider-bg);
        outline: none;
        -webkit-appearance: none;
        appearance: none;
        transition: background-color 140ms var(--rifm-ease-out);
      }

      .rifm-slider::-webkit-slider-thumb {
        -webkit-appearance: none;
        appearance: none;
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: var(--rifm-text);
        cursor: pointer;
        border: 1px solid var(--rifm-border);
      }

      .rifm-slider::-moz-range-thumb {
        width: 14px;
        height: 14px;
        border-radius: 50%;
        background: var(--rifm-text);
        cursor: pointer;
        border: 1px solid var(--rifm-border);
      }
`
