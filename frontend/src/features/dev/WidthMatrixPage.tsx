import { useState } from 'react';

/**
 * Dev-only guardrail: renders a real app route inside iframes at a matrix of
 * viewport widths so the whole responsive curve is visible on one machine.
 * Each frame is its own browsing context, so container queries and media
 * queries evaluate against the frame width, not the host window.
 */
const WIDTHS = [360, 768, 1024, 1280, 1536, 1920];
const PRESETS = ['/recipes', '/import', '/templates', '/settings'];
const FRAME_HEIGHT = 820;
const CARD_WIDTH = 360;

export function WidthMatrixPage() {
  const [path, setPath] = useState('/recipes');
  const [draft, setDraft] = useState('/recipes');

  return (
    <div className="min-h-screen bg-neutral-100 p-4 text-neutral-900">
      <header className="mb-4 flex flex-wrap items-center gap-3">
        <h1 className="text-lg font-semibold">Width matrix</h1>
        <form
          onSubmit={(event) => {
            event.preventDefault();
            setPath(draft.startsWith('/') ? draft : `/${draft}`);
          }}
          className="flex items-center gap-2"
        >
          <input
            value={draft}
            onChange={(event) => setDraft(event.target.value)}
            className="h-8 rounded border border-neutral-300 bg-white px-2 text-sm"
            placeholder="/recipes"
          />
          <button type="submit" className="h-8 rounded bg-neutral-800 px-3 text-sm text-white">
            Preview
          </button>
        </form>
        <div className="flex flex-wrap gap-1.5">
          {PRESETS.map((preset) => (
            <button
              key={preset}
              type="button"
              onClick={() => {
                setPath(preset);
                setDraft(preset);
              }}
              className={`h-8 rounded border px-3 text-sm ${
                path === preset ? 'border-neutral-800 bg-neutral-800 text-white' : 'border-neutral-300 bg-white'
              }`}
            >
              {preset}
            </button>
          ))}
        </div>
      </header>

      <div className="flex flex-wrap gap-4">
        {WIDTHS.map((width) => {
          const scale = CARD_WIDTH / width;
          return (
            <figure key={width} className="m-0">
              <figcaption className="mb-1 text-xs font-medium text-neutral-500">{width}px</figcaption>
              <div
                className="overflow-hidden rounded border border-neutral-300 bg-white shadow-sm"
                style={{ width: CARD_WIDTH, height: FRAME_HEIGHT * scale }}
              >
                <iframe
                  title={`${path} @ ${width}px`}
                  src={path}
                  style={{
                    width,
                    height: FRAME_HEIGHT,
                    border: 0,
                    transform: `scale(${scale})`,
                    transformOrigin: 'top left',
                  }}
                />
              </div>
            </figure>
          );
        })}
      </div>
    </div>
  );
}
