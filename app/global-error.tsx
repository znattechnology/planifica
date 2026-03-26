'use client'

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string }
  reset: () => void
}) {
  return (
    <html lang="pt" className="dark">
      <body className="font-sans antialiased bg-background text-foreground">
        <div className="flex min-h-screen items-center justify-center px-4">
          <div className="mx-auto max-w-lg text-center">
            {/* Icon */}
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-full border border-red-500/20 bg-red-500/5">
              <svg
                className="h-10 w-10 text-red-500"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="currentColor"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126ZM12 15.75h.007v.008H12v-.008Z"
                />
              </svg>
            </div>

            {/* Text */}
            <h1 className="mt-6 text-2xl font-bold tracking-tight sm:text-3xl">
              Erro crítico
            </h1>
            <p className="mt-3 text-sm opacity-70 sm:text-base">
              Ocorreu um erro grave na aplicação. Pedimos desculpa pelo incómodo.
            </p>

            {error.digest && (
              <p className="mt-3 text-xs opacity-50">
                Código: <code className="font-mono">{error.digest}</code>
              </p>
            )}

            {/* Actions */}
            <div className="mt-8 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <button
                onClick={reset}
                className="w-full rounded-lg bg-white px-6 py-2.5 text-sm font-medium text-black hover:bg-white/90 sm:w-auto"
              >
                Tentar Novamente
              </button>
              <a
                href="/"
                className="w-full rounded-lg border border-white/20 px-6 py-2.5 text-sm font-medium hover:bg-white/10 sm:w-auto"
              >
                Página Inicial
              </a>
            </div>
          </div>
        </div>
      </body>
    </html>
  )
}
