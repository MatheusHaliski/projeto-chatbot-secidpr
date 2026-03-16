import {useEffect, useId, useMemo, useRef, useState} from "react";

export function SearchSelect<T extends string>({
                                            value,
                                            options,
                                            onChange,
                                            placeholder,
                                            searchPlaceholder,
                                            disabled,
                                            getOptionKey,
                                            getOptionLabel,
                                            renderOption,
                                            renderValue,
                                            includeAllOption,
                                            allLabel,
                                        }: {
    value: T;
    options: T[];
    onChange: (next: T) => void;

    placeholder: string;
    searchPlaceholder: string;

    disabled?: boolean;

    getOptionKey?: (opt: T) => string;
    getOptionLabel: (opt: T) => string;

    renderOption?: (opt: T, selected: boolean) => React.ReactNode;
    renderValue?: (opt: T) => React.ReactNode;

    includeAllOption?: boolean;
    allLabel?: string;
}){
    const [open, setOpen] = useState(false);
    const [query, setQuery] = useState("");
    const rootRef = useRef<HTMLDivElement | null>(null);
    const searchInputId = useId();

    const hasValue = Boolean(value);
    const buttonLabel = hasValue
        ? renderValue
            ? renderValue(value)
            : getOptionLabel(value)
        : allLabel ?? placeholder;

    const filteredOptions = useMemo(() => {
        const q = query.trim().toLowerCase();
        if (!q) return options;

        return options.filter((opt) =>
            getOptionLabel(opt).toLowerCase().includes(q)
        );
    }, [options, query, getOptionLabel]);

    useEffect(() => {
        if (!open) return;

        const onDocMouseDown = (e: MouseEvent) => {
            const el = rootRef.current;
            if (!el) return;
            if (e.target instanceof Node && !el.contains(e.target)) setOpen(false);
        };

        const onKeyDown = (e: KeyboardEvent) => {
            if (e.key === "Escape") setOpen(false);
        };

        document.addEventListener("mousedown", onDocMouseDown);
        document.addEventListener("keydown", onKeyDown);
        return () => {
            document.removeEventListener("mousedown", onDocMouseDown);
            document.removeEventListener("keydown", onKeyDown);
        };
    }, [open]);

    useEffect(() => {
        if (!open) return;
        const t = setTimeout(() => {
            const input = rootRef.current?.querySelector<HTMLInputElement>(
                'input[data-searchselect="1"]'
            );
            input?.focus();
        }, 0);
        return () => clearTimeout(t);
    }, [open]);

    return (
        <div ref={rootRef} className="relative">
    <button
        type="button"
    disabled={disabled}
    onClick={() => setOpen((v) => !v)}
    aria-haspopup="listbox"
    aria-expanded={open}
    className={`w-full text-xs font-semibold uppercase tracking-[0.2em] text-white transition   rounded-xl top-10 bg-[#2563eb] px-4 py-5 text-base font-semibold text-[#e0f2fe] shadow-lg shadow-[#2563eb]/40   ${
        disabled
            ? "cursor-not-allowed bg-white/5 text-white/40"
            : "bg-white/5 "
    }`}
>
    <span className=" text-ellipsis whitespace-nowrap">
        {buttonLabel}
        </span>
        <span className="text-white/70">{open ? "▲" : "▼"}</span>
        </button>

    {open && (
        <div
            role="listbox"
        className="absolute left-0 right-0 top-[calc(100%+8px)] z-50 rounded-2xl border border-white/10 bg-neutral-900/95 shadow-xl shadow-black/30 backdrop-blur"
        >
        <div className="border-b border-white/10 p-2.5">
        <input
            id={searchInputId}
        data-searchselect="1"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder={searchPlaceholder}
        className="h-12 w-full rounded-xl border border-white/10 bg-white/5 px-3 text-white placeholder:text-white/40 transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-400/40"
            />
            </div>

            <div className="max-h-[280px] overflow-y-auto">
        {includeAllOption ? (
                    <button
                        type="button"
                onClick={() => {
        onChange("" as T);
        setOpen(false);
    }}
        className={`w-full px-3 py-2.5 text-left text-sm text-white transition-all duration-200  ${
            !value ? "bg-cyan-500/10" : "bg-transparent"
        }`}
    >
        {allLabel ?? placeholder}
        </button>
    ) : null}

        {filteredOptions.length === 0 ? (
            <div className="px-3 py-2.5 text-sm text-white/60">
                No matches.
            </div>
        ) : (
            filteredOptions.map((opt) => {
                const key = getOptionKey ? getOptionKey(opt) : String(opt);
                const selected = opt === value;

                return (
                    <button
                        key={key}
                type="button"
                onClick={() => {
                    onChange(opt);
                    setOpen(false);
                }}
                className={`flex w-full items-center justify-between gap-2 px-3 py-2.5 text-left text-sm text-white transition-all duration-200  ${
                    selected ? "bg-cyan-500/10" : "bg-transparent"
                }`}
            >
                <span>
                    {renderOption
                    ? renderOption(opt, selected)
                    : getOptionLabel(opt)}
                </span>
                {selected ? <span className="text-white/80">✓</span> : null}
                </button>
                );
                })
            )}
            </div>
            </div>
        )}
        </div>
    );
    }