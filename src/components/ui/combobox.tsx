import { useState, useRef, useEffect } from 'react'
import { Input } from '@/components/ui/input'
import { cn } from '@/lib/utils'
import { Search, Check } from 'lucide-react'

interface ComboboxItem {
  value: string
  label: string
  subtitle?: string
}

interface ComboboxProps {
  items: ComboboxItem[]
  value: string
  onValueChange: (value: string) => void
  placeholder?: string
  searchPlaceholder?: string
  emptyMessage?: string
  className?: string
}

export function Combobox({
  items,
  value,
  onValueChange,
  placeholder = 'Seleccionar...',
  searchPlaceholder = 'Buscar...',
  emptyMessage = 'Sin resultados',
  className,
}: ComboboxProps) {
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState('')
  const containerRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLInputElement>(null)

  const selectedItem = items.find(i => i.value === value)

  const filteredItems = search
    ? items.filter(i =>
        i.label.toLowerCase().includes(search.toLowerCase()) ||
        (i.subtitle && i.subtitle.toLowerCase().includes(search.toLowerCase()))
      )
    : items

  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(event.target as Node)) {
        setOpen(false)
      }
    }
    document.addEventListener('mousedown', handleClickOutside)
    return () => document.removeEventListener('mousedown', handleClickOutside)
  }, [])

  function handleSelect(item: ComboboxItem) {
    onValueChange(item.value)
    setOpen(false)
    setSearch('')
  }

  return (
    <div ref={containerRef} className={cn('relative', className)}>
      <div
        onClick={() => {
          setOpen(!open)
          if (!open) {
            setTimeout(() => inputRef.current?.focus(), 50)
          }
        }}
        className={cn(
          'flex h-10 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background cursor-pointer',
          !selectedItem && 'text-muted-foreground',
          'hover:border-primary/50 transition-colors'
        )}
      >
        <span className={cn('truncate', !selectedItem && 'text-muted-foreground')}>
          {selectedItem ? selectedItem.label : placeholder}
        </span>
        <Search className="h-4 w-4 shrink-0 opacity-50 ml-2" />
      </div>

      {open && (
        <div className="absolute z-50 w-full mt-1 rounded-md border bg-popover text-popover-foreground shadow-md">
          <div className="p-2 border-b">
            <Input
              ref={inputRef}
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-8 text-sm"
            />
          </div>
          <div className="max-h-60 overflow-y-auto p-1">
            {filteredItems.length === 0 ? (
              <p className="text-sm text-muted-foreground py-4 text-center">
                {emptyMessage}
              </p>
            ) : (
              filteredItems.map((item) => (
                <div
                  key={item.value}
                  onClick={() => handleSelect(item)}
                  className={cn(
                    'flex items-center gap-2 px-2 py-2 rounded-md text-sm cursor-pointer transition-colors',
                    item.value === value
                      ? 'bg-primary/10 text-primary'
                      : 'hover:bg-accent hover:text-accent-foreground'
                  )}
                >
                  <div className="flex-1 min-w-0">
                    <p className="truncate font-medium">{item.label}</p>
                    {item.subtitle && (
                      <p className="truncate text-xs text-muted-foreground">{item.subtitle}</p>
                    )}
                  </div>
                  {item.value === value && (
                    <Check className="h-4 w-4 shrink-0 text-primary" />
                  )}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  )
}
