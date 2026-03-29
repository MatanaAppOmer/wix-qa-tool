'use client';

import { useState, useRef } from 'react';
import type { ScanResult } from '@/lib/scanner/types';
import { ReportView } from '@/components/ReportView';
import { ScanLoadingPanel } from '@/components/ScanLoadingPanel';

type ScanState = 'idle' | 'scanning' | 'done' | 'error';

const CHECKS = [
  'H1 count per page',
  'Minimum text size (12px)',
  'Header & footer presence',
  'Functional links & buttons',
  'Allowed fonts (Google / Wix)',
  'URL slug matches page name',
  'Hover states on interactive elements',
  'Suspicious hidden elements',
  'Placeholder / mixed-language text',
];

type Theme = 'light' | 'dark';

// Theme-keyed class maps
const t = {
  page:        { light: 'bg-zinc-50',                        dark: 'bg-[#0f0f11]' },
  header:      { light: 'bg-white border-b border-zinc-100', dark: 'bg-[#0f0f11]/80 border-b border-white/[0.06] backdrop-blur-sm' },
  logoMain:    { light: 'text-zinc-900',                     dark: 'text-white' },
  logoSub:     { light: 'text-zinc-400',                     dark: 'text-white/40' },
  logoDot:     { light: 'text-zinc-200',                     dark: 'text-white/20' },
  scanDot:     { light: 'bg-zinc-400',                       dark: 'bg-blue-400' },
  scanLabel:   { light: 'text-zinc-400',                     dark: 'text-white/30' },
  title:       { light: 'text-zinc-900',                     dark: 'text-white' },
  subtitle:    { light: 'text-zinc-500',                     dark: 'text-white/40' },
  card:        { light: 'bg-white border border-zinc-200 shadow-sm', dark: 'bg-white/[0.04] border border-white/[0.08] shadow-xl shadow-black/30' },
  input:       { light: 'bg-white border-zinc-200 text-zinc-900 placeholder:text-zinc-400 focus:ring-zinc-900', dark: 'bg-white/[0.06] border-white/[0.1] text-white placeholder:text-white/25 focus:ring-blue-500/60' },
  btnPrimary:  { light: 'bg-zinc-900 text-white hover:bg-zinc-700', dark: 'bg-blue-600 text-white hover:bg-blue-500' },
  btnSecondary:{ light: 'bg-white border border-zinc-200 text-zinc-600 hover:bg-zinc-50 hover:text-zinc-900', dark: 'bg-white/[0.05] border border-white/[0.08] text-white/60 hover:bg-white/[0.1] hover:text-white' },
  divider:     { light: 'border-zinc-100',                   dark: 'border-white/[0.06]' },
  checkLabel:  { light: 'text-zinc-400',                     dark: 'text-white/20' },
  checkItem:   { light: 'text-zinc-400',                     dark: 'text-white/30' },
  checkDot:    { light: 'bg-zinc-300',                       dark: 'bg-white/20' },
  errorBox:    { light: 'text-red-600 bg-red-50 border-red-100', dark: 'text-red-400 bg-red-500/10 border-red-500/20' },
  toggleBtn:   { light: 'text-zinc-400 hover:text-zinc-600 hover:bg-zinc-100', dark: 'text-white/30 hover:text-white/60 hover:bg-white/[0.06]' },
} satisfies Record<string, Record<Theme, string>>;

export default function Home() {
  const [url, setUrl] = useState('');
  const [state, setState] = useState<ScanState>('idle');
  const [result, setResult] = useState<ScanResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [elapsed, setElapsed] = useState(0);
  const timerRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const [screenshotting, setScreenshotting] = useState(false);
  const [screenshotError, setScreenshotError] = useState<string | null>(null);
  const [screenshotDone, setScreenshotDone] = useState(false);
  const [recording, setRecording] = useState(false);
  const [recordingError, setRecordingError] = useState<string | null>(null);
  const [recordingDone, setRecordingDone] = useState(false);
  const [capturingSections, setCapturingSections] = useState(false);
  const [sectionsError, setSectionsError] = useState<string | null>(null);
  const [sectionsDone, setSectionsDone] = useState(false);
  const [theme, setTheme] = useState<Theme>('light');
  const T = (key: keyof typeof t) => t[key][theme];

  async function startScan(rawUrl: string) {
    const trimmed = rawUrl.trim();
    if (!trimmed) return;

    setState('scanning');
    setResult(null);
    setError(null);
    setElapsed(0);

    const start = Date.now();
    timerRef.current = setInterval(() => {
      setElapsed(Math.floor((Date.now() - start) / 1000));
    }, 1000);

    try {
      const res = await fetch('/api/scan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }

      setResult(data as ScanResult);
      setState('done');
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Unknown error');
      setState('error');
    } finally {
      if (timerRef.current) clearInterval(timerRef.current);
    }
  }

  async function captureScreenshot() {
    const trimmed = url.trim();
    if (!trimmed) return;
    setScreenshotting(true);
    setScreenshotError(null);
    setScreenshotDone(false);
    try {
      const res = await fetch('/api/screenshot', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      const urlPath = new URL(trimmed).pathname.replace(/\/$/, '');
      const pageName = urlPath.split('/').filter(Boolean).pop() || 'home';
      a.download = `${pageName}.png`;
      a.click();
      URL.revokeObjectURL(objectUrl);
      setScreenshotDone(true);
      setTimeout(() => setScreenshotDone(false), 3000);
    } catch (err: unknown) {
      setScreenshotError(err instanceof Error ? err.message : 'Screenshot failed');
    } finally {
      setScreenshotting(false);
    }
  }

  async function captureSections() {
    const trimmed = url.trim();
    if (!trimmed) return;
    setCapturingSections(true);
    setSectionsError(null);
    setSectionsDone(false);
    try {
      const res = await fetch('/api/sections-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const { sections } = await res.json();
      for (let i = 0; i < sections.length; i++) {
        const { name, data } = sections[i];
        const blob = new Blob([Uint8Array.from(atob(data), c => c.charCodeAt(0))], { type: 'image/png' });
        const objectUrl = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = objectUrl;
        a.download = `${name}.png`;
        a.click();
        URL.revokeObjectURL(objectUrl);
        // small gap so the browser doesn't suppress multiple downloads
        await new Promise(r => setTimeout(r, 200));
      }
      setSectionsDone(true);
      setTimeout(() => setSectionsDone(false), 3000);
    } catch (err: unknown) {
      setSectionsError(err instanceof Error ? err.message : 'Sections capture failed');
    } finally {
      setCapturingSections(false);
    }
  }

  async function captureWebp() {
    const trimmed = url.trim();
    if (!trimmed) return;
    setRecording(true);
    setRecordingError(null);
    setRecordingDone(false);
    try {
      const res = await fetch('/api/webp-capture', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ url: trimmed }),
      });
      if (!res.ok) {
        const data = await res.json();
        throw new Error(data.error ?? `HTTP ${res.status}`);
      }
      const blob = await res.blob();
      const objectUrl = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = objectUrl;
      const urlPath = new URL(trimmed).pathname.replace(/\/$/, '');
      const pageName = urlPath.split('/').filter(Boolean).pop() || 'home';
      a.download = `${pageName}.webp`;
      a.click();
      URL.revokeObjectURL(objectUrl);
      setRecordingDone(true);
      setTimeout(() => setRecordingDone(false), 3000);
    } catch (err: unknown) {
      setRecordingError(err instanceof Error ? err.message : 'Recording failed');
    } finally {
      setRecording(false);
    }
  }

  function handleReset() {
    setState('idle');
    setResult(null);
    setError(null);
    setUrl('');
  }

  return (
    <div className={`min-h-screen transition-colors duration-300 ${T('page')}`}>
      {/* Top header */}
      <header className={`sticky top-0 z-20 transition-colors duration-300 ${T('header')}`}>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 h-12 flex items-center gap-3">
          <div className="flex items-center gap-2.5">
            <span className={`text-sm font-semibold tracking-tight ${T('logoMain')}`}>Wix Studio</span>
            <span className={`text-sm ${T('logoDot')}`}>·</span>
            <span className={`text-sm ${T('logoSub')}`}>Template QA</span>
          </div>
          {state === 'scanning' && (
            <span className={`ml-3 text-[11px] flex items-center gap-1.5 ${T('scanLabel')}`}>
              <span className={`w-1.5 h-1.5 rounded-full animate-pulse ${T('scanDot')}`} />
              Scanning…
            </span>
          )}
          {/* Theme toggle */}
          <button
            type="button"
            onClick={() => setTheme(theme === 'light' ? 'dark' : 'light')}
            title={theme === 'light' ? 'Switch to dark mode' : 'Switch to light mode'}
            className={`ml-auto rounded-lg p-1.5 transition-colors ${T('toggleBtn')}`}
          >
            {theme === 'light' ? (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
              </svg>
            ) : (
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                <circle cx="12" cy="12" r="5" />
                <line x1="12" y1="1" x2="12" y2="3" /><line x1="12" y1="21" x2="12" y2="23" />
                <line x1="4.22" y1="4.22" x2="5.64" y2="5.64" /><line x1="18.36" y1="18.36" x2="19.78" y2="19.78" />
                <line x1="1" y1="12" x2="3" y2="12" /><line x1="21" y1="12" x2="23" y2="12" />
                <line x1="4.22" y1="19.78" x2="5.64" y2="18.36" /><line x1="18.36" y1="5.64" x2="19.78" y2="4.22" />
              </svg>
            )}
          </button>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 py-12">
        {/* ── Done: full report replaces the form ── */}
        {state === 'done' && result ? (
          <ReportView result={result} elapsed={elapsed} onNewScan={handleReset} />
        ) : (
          <div className="max-w-2xl mx-auto">

            {/* Hero text — hidden while scanning so the loading panel has space */}
            {state !== 'scanning' && (
              <div className="text-center mb-10">
                <h1 className={`text-3xl font-semibold tracking-tight mb-3 ${T('title')}`}>
                  Template QA Scanner
                </h1>
                <p className={`text-sm leading-relaxed ${T('subtitle')}`}>
                  Paste a Wix Studio template URL to run an automated QA check across all pages.
                </p>
              </div>
            )}

            {/* Card — always visible so all buttons remain accessible */}
            <div className={`rounded-2xl px-7 py-7 transition-colors duration-300 ${T('card')}`}>

              {/* URL + scan row */}
              <form onSubmit={(e) => { e.preventDefault(); startScan(url); }} className="flex gap-2.5">
                <input
                  type="url"
                  value={url}
                  onChange={(e) => setUrl(e.target.value)}
                  placeholder="https://your-template.wixsite.com/…"
                  required
                  autoFocus
                  className={`flex-1 rounded-xl border px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:border-transparent transition-all ${T('input')}`}
                />
                <button
                  type="submit"
                  disabled={state === 'scanning'}
                  className={`shrink-0 text-sm font-medium rounded-xl px-5 py-2.5 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 ${T('btnPrimary')}`}
                >
                  {state === 'scanning' ? 'Scanning…' : 'Run QA Scan'}
                </button>
              </form>

              {/* Inline scan loading panel */}
              {state === 'scanning' && (
                <div className="mt-4">
                  <ScanLoadingPanel url={url} elapsed={elapsed} isDark={theme === 'dark'} />
                </div>
              )}

              {/* Capture tools divider */}
              <div className={`mt-5 pt-4 border-t ${T('divider')}`}>
                <p className={`text-[10px] font-semibold uppercase tracking-widest mb-3 ${T('checkLabel')}`}>
                  Image capture
                </p>

                {/* Capture buttons — row 1 */}
                <div className="flex gap-2.5">
                  <div className="flex-1 flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={captureScreenshot}
                      disabled={!url.trim() || screenshotting}
                      className={`w-full flex items-center justify-center gap-2 text-sm font-medium rounded-xl px-4 py-2.5 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 ${T('btnSecondary')}`}
                    >
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <rect x="3" y="3" width="18" height="18" rx="2" ry="2" />
                        <circle cx="12" cy="12" r="4" />
                      </svg>
                      {screenshotting ? 'Capturing…' : screenshotDone ? 'Downloaded!' : 'Long Screenshot'}
                    </button>
                    {screenshotting && (
                      <div className={`h-[3px] rounded-full overflow-hidden ${theme === 'dark' ? 'bg-white/[0.06]' : 'bg-zinc-100'}`}>
                        <div className={`h-full w-[35%] rounded-full animate-indeterminate ${theme === 'dark' ? 'bg-blue-500' : 'bg-zinc-500'}`} />
                      </div>
                    )}
                    {screenshotDone && !screenshotting && (
                      <div className={`h-[3px] rounded-full ${theme === 'dark' ? 'bg-blue-500/60' : 'bg-green-400'}`} />
                    )}
                  </div>

                  <div className="flex-1 flex flex-col gap-1.5">
                    <button
                      type="button"
                      onClick={captureWebp}
                      disabled={!url.trim() || recording}
                      className={`w-full flex items-center justify-center gap-2 text-sm font-medium rounded-xl px-4 py-2.5 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 ${T('btnSecondary')}`}
                    >
                      <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                        <polygon points="23 7 16 12 23 17 23 7" />
                        <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
                      </svg>
                      {recording ? 'Recording…' : recordingDone ? 'Downloaded!' : 'Scroll WebP'}
                    </button>
                    {recording && (
                      <div className={`h-[3px] rounded-full overflow-hidden ${theme === 'dark' ? 'bg-white/[0.06]' : 'bg-zinc-100'}`}>
                        <div className={`h-full w-[35%] rounded-full animate-indeterminate ${theme === 'dark' ? 'bg-blue-500' : 'bg-zinc-500'}`} />
                      </div>
                    )}
                    {recordingDone && !recording && (
                      <div className={`h-[3px] rounded-full ${theme === 'dark' ? 'bg-blue-500/60' : 'bg-green-400'}`} />
                    )}
                  </div>
                </div>

                {/* Capture buttons — row 2 */}
                <div className="mt-2.5 flex flex-col gap-1.5">
                  <button
                    type="button"
                    onClick={captureSections}
                    disabled={!url.trim() || capturingSections}
                    className={`w-full flex items-center justify-center gap-2 text-sm font-medium rounded-xl px-4 py-2.5 active:scale-[0.98] transition-all disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100 ${T('btnSecondary')}`}
                  >
                    <svg className="w-3.5 h-3.5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <rect x="2" y="3" width="20" height="14" rx="2" />
                      <line x1="8" y1="21" x2="16" y2="21" />
                      <line x1="12" y1="17" x2="12" y2="21" />
                    </svg>
                    {capturingSections ? 'Capturing sections…' : sectionsDone ? 'Downloaded!' : 'Hero + 5 Sections (1200×748)'}
                  </button>
                  {capturingSections && (
                    <div className={`h-[3px] rounded-full overflow-hidden ${theme === 'dark' ? 'bg-white/[0.06]' : 'bg-zinc-100'}`}>
                      <div className={`h-full w-[35%] rounded-full animate-indeterminate ${theme === 'dark' ? 'bg-blue-500' : 'bg-zinc-500'}`} />
                    </div>
                  )}
                  {sectionsDone && !capturingSections && (
                    <div className={`h-[3px] rounded-full ${theme === 'dark' ? 'bg-blue-500/60' : 'bg-green-400'}`} />
                  )}
                </div>
              </div>

              {/* Errors */}
              {(error || screenshotError || recordingError || sectionsError) && (
                <div className="mt-4 space-y-2">
                  {error && (
                    <div className={`text-sm border rounded-xl px-4 py-3 ${T('errorBox')}`}>
                      <span className="font-semibold">Scan error: </span>{error}
                    </div>
                  )}
                  {screenshotError && (
                    <div className={`text-sm border rounded-xl px-4 py-3 ${T('errorBox')}`}>
                      <span className="font-semibold">Screenshot error: </span>{screenshotError}
                    </div>
                  )}
                  {recordingError && (
                    <div className={`text-sm border rounded-xl px-4 py-3 ${T('errorBox')}`}>
                      <span className="font-semibold">WebP error: </span>{recordingError}
                    </div>
                  )}
                  {sectionsError && (
                    <div className={`text-sm border rounded-xl px-4 py-3 ${T('errorBox')}`}>
                      <span className="font-semibold">Sections error: </span>{sectionsError}
                    </div>
                  )}
                </div>
              )}

              {/* Checks list — only shown when not scanning */}
              {state !== 'scanning' && (
                <div className={`mt-6 pt-5 border-t ${T('divider')}`}>
                  <p className={`text-[10px] font-semibold uppercase tracking-widest mb-3 ${T('checkLabel')}`}>
                    9 automated checks
                  </p>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
                    {CHECKS.map((check) => (
                      <div key={check} className={`flex items-center gap-2 text-xs ${T('checkItem')}`}>
                        <span className={`w-1 h-1 rounded-full shrink-0 ${T('checkDot')}`} />
                        {check}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
