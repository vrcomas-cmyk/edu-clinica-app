import { useState, useCallback } from 'react'

interface ToastItem {
  id: string
  title?: string
  description?: string
  variant?: 'default' | 'destructive' | 'success'
}

let globalToastFn: ((props: Omit<ToastItem, 'id'>) => void) | null = null

export function showToast(props: Omit<ToastItem, 'id'>) {
  globalToastFn?.(props)
}

export function ToasterProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const toast = useCallback((props: Omit<ToastItem, 'id'>) => {
    const id = Math.random().toString(36).substr(2, 9)
    setToasts((prev) => [...prev, { ...props, id }])
    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id))
    }, 3000)
  }, [])

  globalToastFn = toast

  return (
    <>
      {children}
      <div className="fixed bottom-4 right-4 z-[100] flex flex-col gap-2 max-w-sm">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`p-4 rounded-lg shadow-lg bg-card border ${
              t.variant === 'destructive' ? 'border-red-500 text-red-700' :
              t.variant === 'success' ? 'border-green-500 text-green-700' :
              'border-border'
            }`}
          >
            {t.title && <div className="font-semibold">{t.title}</div>}
            {t.description && <div className="text-sm opacity-90">{t.description}</div>}
          </div>
        ))}
      </div>
    </>
  )
}
