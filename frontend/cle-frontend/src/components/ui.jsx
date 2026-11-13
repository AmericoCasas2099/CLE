import React from 'react'

export const inputClass =
  'flex h-10 w-full rounded-lg border border-zinc-200 bg-white px-3 py-2 text-sm text-zinc-900 placeholder:text-zinc-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 disabled:cursor-not-allowed disabled:opacity-50 transition-colors'

export const btn = {
  primary:
    'inline-flex items-center justify-center gap-2 rounded-lg bg-indigo-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 disabled:pointer-events-none disabled:opacity-50 transition-colors',
  secondary:
    'inline-flex items-center justify-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 focus:outline-none focus:ring-2 focus:ring-zinc-500/20 disabled:pointer-events-none disabled:opacity-50 transition-colors',
  danger:
    'inline-flex items-center justify-center gap-2 rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white shadow-sm hover:bg-rose-700 focus:outline-none focus:ring-2 focus:ring-rose-500/20 disabled:pointer-events-none disabled:opacity-50 transition-colors',
}

export function Field({ label, htmlFor, error, children }) {
  return (
    <div className="flex flex-col gap-1.5 text-left">
      {label && (
        <label htmlFor={htmlFor} className="text-xs font-medium text-zinc-700">
          {label}
        </label>
      )}
      {children}
      {error && <p className="text-xs text-rose-600">{error}</p>}
    </div>
  )
}