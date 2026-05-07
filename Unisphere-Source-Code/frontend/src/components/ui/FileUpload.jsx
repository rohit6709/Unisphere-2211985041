import React from 'react';
import { FileUp, ImagePlus, UploadCloud, X } from 'lucide-react';
import { cn } from '@/utils/cn';

export function FileUpload({
  label = 'Upload file',
  accept,
  value = null,
  onChange,
  onClear,
  previewUrl = '',
  progress = 0,
  dragLabel = 'Drop a file here or click to browse',
  helperText = '',
  disabled = false,
  className,
}) {
  const [isDragging, setIsDragging] = React.useState(false);
  const inputRef = React.useRef(null);

  const fileName = value?.name || '';
  const isImagePreview = Boolean(previewUrl);

  const handleFile = (file) => {
    if (!file || disabled) return;
    onChange?.(file);
  };

  return (
    <div className={cn('space-y-3', className)}>
      <label className="block text-xs font-semibold uppercase tracking-wide text-gray-500">{label}</label>
      <div
        role="button"
        tabIndex={disabled ? -1 : 0}
        onClick={() => !disabled && inputRef.current?.click()}
        onKeyDown={(event) => {
          if (!disabled && (event.key === 'Enter' || event.key === ' ')) {
            event.preventDefault();
            inputRef.current?.click();
          }
        }}
        onDragOver={(event) => {
          event.preventDefault();
          if (!disabled) setIsDragging(true);
        }}
        onDragLeave={() => setIsDragging(false)}
        onDrop={(event) => {
          event.preventDefault();
          setIsDragging(false);
          handleFile(event.dataTransfer.files?.[0]);
        }}
        className={cn(
          'rounded-3xl border-2 border-dashed px-6 py-8 text-center transition',
          isDragging ? 'border-indigo-400 bg-indigo-50/60 dark:bg-indigo-950/20' : 'border-gray-200 bg-gray-50/60 dark:border-gray-800 dark:bg-gray-950/40',
          disabled && 'cursor-not-allowed opacity-60'
        )}
      >
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-2xl bg-white text-indigo-600 shadow-sm dark:bg-gray-900">
          {isImagePreview ? <ImagePlus className="h-6 w-6" /> : <UploadCloud className="h-6 w-6" />}
        </div>
        <p className="mt-4 text-sm font-semibold text-gray-900 dark:text-white">{dragLabel}</p>
        {helperText && <p className="mt-2 text-xs text-gray-500">{helperText}</p>}
        <input
          ref={inputRef}
          type="file"
          accept={accept}
          className="hidden"
          onChange={(event) => handleFile(event.target.files?.[0])}
          disabled={disabled}
        />
      </div>

      {(fileName || previewUrl) && (
        <div className="rounded-2xl border border-gray-200 bg-white p-4 dark:border-gray-800 dark:bg-gray-900">
          <div className="flex items-start justify-between gap-3">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                <FileUp className="h-4 w-4 text-indigo-600" />
                <p className="truncate text-sm font-semibold text-gray-900 dark:text-white">{fileName || 'Selected file'}</p>
              </div>
              {previewUrl && (
                <img src={previewUrl} alt="Upload preview" className="mt-3 max-h-48 rounded-2xl border border-gray-200 object-cover dark:border-gray-800" />
              )}
            </div>
            {onClear && (
              <button
                type="button"
                onClick={onClear}
                className="rounded-full p-1 text-gray-400 transition hover:bg-gray-100 hover:text-gray-600 dark:hover:bg-gray-800"
                aria-label="Clear file"
              >
                <X className="h-4 w-4" />
              </button>
            )}
          </div>
          {progress > 0 && (
            <div className="mt-4">
              <div className="mb-2 flex items-center justify-between text-xs text-gray-500">
                <span>Upload progress</span>
                <span>{progress}%</span>
              </div>
              <div className="h-2 rounded-full bg-gray-100 dark:bg-gray-800">
                <div className="h-2 rounded-full bg-indigo-600 transition-all" style={{ width: `${progress}%` }} />
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
