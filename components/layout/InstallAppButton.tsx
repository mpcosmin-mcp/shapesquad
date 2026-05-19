'use client';
import { useEffect, useRef, useState } from 'react';
import { Download, Share, Smartphone, X } from 'lucide-react';

interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * Install App button — shows when the browser supports PWA installation
 * (Chrome/Edge/Android: native `beforeinstallprompt`; iOS Safari: shows a
 * small instructions modal because Apple disallows programmatic prompts).
 *
 * Auto-hides after installation. Renders nothing when the app is already
 * running as a PWA (standalone mode).
 */
export function InstallAppButton() {
  const [prompt, setPrompt] = useState<BeforeInstallPromptEvent | null>(null);
  const [installed, setInstalled] = useState(false);
  const [isStandalone, setIsStandalone] = useState(false);
  const [isIOS, setIsIOS] = useState(false);
  const [iosHelpOpen, setIosHelpOpen] = useState(false);
  const helpRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    // Are we already running as a PWA?
    const standalone =
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true;
    setIsStandalone(standalone);

    // Detect iOS Safari (no programmatic install possible)
    const ua = window.navigator.userAgent;
    setIsIOS(/iPad|iPhone|iPod/.test(ua) && !/CriOS|FxiOS/.test(ua));

    const handler = (e: Event) => {
      e.preventDefault();
      setPrompt(e as BeforeInstallPromptEvent);
    };
    const installedHandler = () => {
      setInstalled(true);
      setPrompt(null);
    };
    window.addEventListener('beforeinstallprompt', handler);
    window.addEventListener('appinstalled', installedHandler);
    return () => {
      window.removeEventListener('beforeinstallprompt', handler);
      window.removeEventListener('appinstalled', installedHandler);
    };
  }, []);

  useEffect(() => {
    if (!iosHelpOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (helpRef.current && !helpRef.current.contains(e.target as Node)) setIosHelpOpen(false);
    };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') setIosHelpOpen(false); };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [iosHelpOpen]);

  if (isStandalone || installed) return null;
  // If we have neither a native prompt nor iOS detection, the button would
  // be a dead-end. Hide it.
  if (!prompt && !isIOS) return null;

  const onClick = async () => {
    if (prompt) {
      await prompt.prompt();
      const choice = await prompt.userChoice;
      if (choice.outcome === 'accepted') setPrompt(null);
    } else if (isIOS) {
      setIosHelpOpen(true);
    }
  };

  return (
    <>
      <button
        onClick={onClick}
        title="Instalează app-ul"
        aria-label="Instalează app-ul"
        className="tap rounded-lg flex items-center gap-1.5 px-2.5 text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] hover:bg-[var(--color-surface)] transition-colors text-[11px] font-bold"
      >
        <Download size={14} strokeWidth={2} />
        <span className="hidden sm:inline">Instalează</span>
      </button>

      {iosHelpOpen && (
        <>
          <div
            className="fixed inset-0 z-40 bg-black/60 backdrop-blur-[3px] anim-fade-in"
            aria-hidden
          />
          <div
            ref={helpRef}
            className="fixed z-50 inset-x-3 sm:inset-x-auto sm:right-3 top-16 sm:w-80 rounded-2xl border border-[var(--color-border)] bg-[var(--color-bg)] shadow-2xl shadow-black/40 anim-scale p-4"
            role="dialog"
            aria-label="Instrucțiuni instalare iOS"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-[var(--color-accent)]/15 flex items-center justify-center">
                  <Smartphone className="w-4 h-4 text-[var(--color-accent)]" />
                </div>
                <div>
                  <div className="font-bold text-sm">Instalează pe iPhone</div>
                  <div className="text-[10px] text-[var(--color-fg-muted)]">3 pași Safari</div>
                </div>
              </div>
              <button
                onClick={() => setIosHelpOpen(false)}
                className="text-[var(--color-fg-muted)] hover:text-[var(--color-fg)] p-1"
                aria-label="Închide"
              >
                <X size={14} />
              </button>
            </div>
            <ol className="space-y-2 text-xs text-[var(--color-fg-dim)]">
              <li className="flex items-baseline gap-2">
                <span className="num font-bold text-[var(--color-accent)]">1.</span>
                <span>Apasă butonul <Share className="inline w-3 h-3 mx-0.5" /> <strong>Share</strong> din bara Safari.</span>
              </li>
              <li className="flex items-baseline gap-2">
                <span className="num font-bold text-[var(--color-accent)]">2.</span>
                <span>Scroll și alege <strong>"Add to Home Screen"</strong>.</span>
              </li>
              <li className="flex items-baseline gap-2">
                <span className="num font-bold text-[var(--color-accent)]">3.</span>
                <span>Confirmă cu <strong>Add</strong>. Apare ca aplicație pe ecran.</span>
              </li>
            </ol>
          </div>
        </>
      )}
    </>
  );
}
