import { useRef, useState } from 'react';
import { cn } from '@/lib/utils';

/** Mirrors the magic-byte whitelist the API enforces; SVG is rejected server side. */
const ACCEPT = 'image/jpeg,image/png,image/webp,image/avif';

interface Props {
  onFile: (file: File) => void;
  disabled?: boolean;
  className?: string;
  children: (state: { openPicker: () => void; isDragging: boolean }) => React.ReactNode;
}

export function ImageDropZone({ onFile, disabled = false, className, children }: Props) {
  const input = useRef<HTMLInputElement>(null);
  const [isDragging, setDragging] = useState(false);

  function accept(file: File | undefined) {
    if (!file || disabled) return;
    onFile(file);
  }

  return (
    <div
      className={cn(className, isDragging && 'ring-2 ring-ring ring-inset')}
      onDragOver={(event) => {
        if (disabled) return;
        event.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={(event) => {
        if (disabled) return;
        event.preventDefault();
        setDragging(false);
        accept(event.dataTransfer.files?.[0]);
      }}
    >
      {children({ openPicker: () => input.current?.click(), isDragging })}
      <input
        ref={input}
        type="file"
        accept={ACCEPT}
        className="hidden"
        onChange={(event) => {
          accept(event.target.files?.[0]);
          event.target.value = '';
        }}
      />
    </div>
  );
}
