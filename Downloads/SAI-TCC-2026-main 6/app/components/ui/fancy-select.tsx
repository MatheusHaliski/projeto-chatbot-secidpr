'use client';

import Image from 'next/image';
import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';

type FancyOption = {
  value: string;
  label: string;
  hint?: string;
  group?: string;
  icon?: {
    type?: 'emoji' | 'image';
    value: string;
    alt?: string;
  };
};

type FancySelectProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  options: FancyOption[];
  label?: string;
};

export default function FancySelect({
  value,
  onChange,
  placeholder = 'Select an option',
  options,
  label,
}: FancySelectProps) {
  const [open, setOpen] = useState(false);
  const rootRef = useRef<HTMLDivElement | null>(null);
  const triggerRef = useRef<HTMLButtonElement | null>(null);
  const menuRef = useRef<HTMLDivElement | null>(null);
  const [dropdownStyle, setDropdownStyle] = useState<{ top: number; left: number; width: number; maxHeight: number }>({
    top: 0,
    left: 0,
    width: 0,
    maxHeight: 300,
  });

  const selected = useMemo(
    () => options.find((option) => option.value === value),
    [options, value],
  );

  const groupedOptions = useMemo(() => {
    const groups = new Map<string, FancyOption[]>();

    for (const option of options) {
      const groupName = option.group ?? 'Options';
      const current = groups.get(groupName) ?? [];
      current.push(option);
      groups.set(groupName, current);
    }

    return Array.from(groups.entries());
  }, [options]);

  useEffect(() => {
    const handleOutside = (event: MouseEvent) => {
      const target = event.target as Node;
      if (!rootRef.current) return;
      if (rootRef.current.contains(target)) return;
      if (menuRef.current?.contains(target)) return;
      setOpen(false);
    };

    const handleEscape = (event: KeyboardEvent) => {
      if (event.key !== 'Escape') return;
      setOpen(false);
    };

    window.addEventListener('mousedown', handleOutside);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handleOutside);
      window.removeEventListener('keydown', handleEscape);
    };
  }, []);

  useEffect(() => {
    if (!open) return;

    const syncDropdownPosition = () => {
      const rect = triggerRef.current?.getBoundingClientRect();
      if (!rect) return;
      const spaceBelow = window.innerHeight - rect.bottom - 16;
      const spaceAbove = rect.top - 16;
      const shouldOpenAbove = spaceBelow < 260 && spaceAbove > spaceBelow;
      const availableHeight = shouldOpenAbove ? spaceAbove : spaceBelow;
      const maxHeight = Math.max(180, Math.min(420, availableHeight - 12));
      const top = shouldOpenAbove ? Math.max(8, rect.top - maxHeight - 12) : rect.bottom + 12;

      setDropdownStyle({
        top,
        left: rect.left,
        width: rect.width,
        maxHeight,
      });
    };

    syncDropdownPosition();
    window.addEventListener('resize', syncDropdownPosition);
    window.addEventListener('scroll', syncDropdownPosition, true);
    return () => {
      window.removeEventListener('resize', syncDropdownPosition);
      window.removeEventListener('scroll', syncDropdownPosition, true);
    };
  }, [open]);

  useEffect(() => {
    if (!open) {
      menuRef.current = null;
    }
  }, [open]);

  const renderOptionIcon = (option?: FancyOption) => {
    if (!option?.icon?.value) return null;
    if (option.icon.type === 'image') {
      return (
        <Image
          src={option.icon.value}
          alt={option.icon.alt ?? option.label}
          width={20}
          height={20}
          className="h-5 w-5 rounded-full object-contain"
          unoptimized
        />
      );
    }

    return <span className="text-base leading-none">{option.icon.value}</span>;
  };

  const selectOption = (optionValue: string) => {
    onChange(optionValue);
    setOpen(false);
  };

  return (
    <div
      ref={rootRef}
      className={`relative w-full ${open ? 'z-[140]' : 'z-10'}`}
      style={{ fontFamily: '"Gotham Light", Gotham, "Helvetica Neue", Arial, sans-serif' }}
    >
      {label ? (
        <p className="mb-2 text-xs font-semibold uppercase tracking-[0.18em] text-white/60">
          {label}
        </p>
      ) : null}

      <button
        ref={triggerRef}
        type="button"
        onClick={() => setOpen((prev) => !prev)}
        className={`group relative flex w-full items-center justify-between rounded-3xl border px-4 py-3 text-left shadow-[0_12px_32px_rgba(0,0,0,0.18)] backdrop-blur-xl transition ${
          open
            ? 'border-fuchsia-400/50 bg-white/16 ring-2 ring-violet-500/30'
            : 'border-white/20 bg-white/10 hover:bg-white/14'
        }`}
      >
        <div className="min-w-0">
          <div className="text-[11px] font-semibold uppercase tracking-[0.16em] text-white/45">
            Selection
          </div>
          <div className={`flex items-center gap-2 truncate text-sm font-medium ${selected ? 'text-white' : 'text-white/55'}`}>
            {renderOptionIcon(selected)}
            <span className="truncate">{selected?.label ?? placeholder}</span>
          </div>
          <div className="truncate text-xs text-white/45">
            {selected?.hint ?? 'Open to choose an item'}
          </div>
        </div>

        <div
          className={`ml-4 flex h-9 w-9 shrink-0 items-center justify-center rounded-full border border-white/15 bg-white/10 text-white/75 transition ${
            open ? 'rotate-180' : ''
          }`}
        >
          ▾
        </div>

        <div className="pointer-events-none absolute inset-0 rounded-3xl bg-gradient-to-r from-violet-500/0 via-fuchsia-500/0 to-pink-500/0 opacity-0 transition group-hover:opacity-100 group-hover:from-violet-500/5 group-hover:via-fuchsia-500/5 group-hover:to-pink-500/5" />
      </button>

      {open && typeof window !== 'undefined'
        ? createPortal(
            <div
              ref={menuRef}
              className="fixed z-[9999] rounded-3xl border border-white/20 bg-slate-950/80 shadow-[0_24px_60px_rgba(0,0,0,0.38)] backdrop-blur-2xl"
              style={{
                top: `${dropdownStyle.top}px`,
                left: `${dropdownStyle.left}px`,
                width: `${dropdownStyle.width}px`,
              }}
            >
              <div
                className="overflow-x-hidden overflow-y-auto overscroll-contain p-3"
                style={{ maxHeight: `${dropdownStyle.maxHeight}px` }}
              >
                {groupedOptions.length === 0 ? (
                  <div className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-white/55">
                    No options available
                  </div>
                ) : (
                  groupedOptions.map(([groupName, groupItems]) => (
                    <div key={groupName} className="mb-3 last:mb-0">
                      <div className="mb-2 px-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-white/40">
                        {groupName}
                      </div>

                      <div className="space-y-2">
                        {groupItems.map((option) => {
                          const isSelected = option.value === value;

                          return (
                            <button
                              key={option.value}
                              type="button"
                              onMouseDown={(event) => {
                                event.preventDefault();
                              }}
                              onClick={() => {
                                selectOption(option.value);
                              }}
                              className={`flex w-full items-center justify-between rounded-3xl border px-4 py-3 text-left transition ${
                                isSelected
                                  ? 'border-fuchsia-400/40 bg-gradient-to-r from-violet-600/70 via-fuchsia-600/70 to-pink-600/70 text-white shadow-[0_10px_30px_rgba(168,85,247,0.28)]'
                                  : 'border-white/10 bg-white/5 text-white hover:border-white/20 hover:bg-white/10'
                              }`}
                            >
                              <div className="min-w-0">
                                <div className="flex items-center gap-2 truncate text-sm font-semibold">
                                  {renderOptionIcon(option)}
                                  <span className="truncate">{option.label}</span>
                                </div>
                                {option.hint ? (
                                  <div className="truncate text-xs text-white/60">
                                    {option.hint}
                                  </div>
                                ) : null}
                              </div>

                              <div
                                className={`ml-4 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border text-xs ${
                                  isSelected
                                    ? 'border-white/20 bg-white/15 text-white'
                                    : 'border-white/10 bg-transparent text-white/40'
                                }`}
                              >
                                {isSelected ? '✓' : '•'}
                              </div>
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>,
            document.body,
          )
        : null}
    </div>
  );
}
