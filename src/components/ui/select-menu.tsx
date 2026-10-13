"use client";

import { useEffect, useId, useRef, useState, type KeyboardEvent } from "react";

export type SelectOption = { value: string; label: string };

/**
 * Branded replacement for a native <select>: a combobox button that opens a
 * listbox panel. Focus stays on the button and the active option is announced
 * via aria-activedescendant. The value is submitted through a hidden input.
 */
export function SelectMenu({
  id,
  name,
  options,
  placeholder,
  defaultValue = "",
  className = "",
  "aria-describedby": describedBy,
  "aria-invalid": invalid,
}: {
  id: string;
  name: string;
  options: readonly SelectOption[];
  placeholder: string;
  defaultValue?: string;
  className?: string;
  "aria-describedby"?: string;
  "aria-invalid"?: boolean;
}) {
  const listId = useId();
  const rootRef = useRef<HTMLDivElement>(null);
  const listRef = useRef<HTMLUListElement>(null);
  const typeahead = useRef({ text: "", timer: 0 });
  const [value, setValue] = useState(defaultValue);
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const selectedIndex = options.findIndex((option) => option.value === value);
  const selected = selectedIndex >= 0 ? options[selectedIndex] : null;
  const optionId = (index: number) => `${listId}-option-${index}`;

  useEffect(() => {
    if (!open) return;
    const onPointerDown = (event: PointerEvent) => {
      if (!rootRef.current?.contains(event.target as Node)) setOpen(false);
    };
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, [open]);

  useEffect(() => {
    if (!open || active < 0) return;
    listRef.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  function openMenu(index = selectedIndex >= 0 ? selectedIndex : 0) {
    setActive(index);
    setOpen(true);
  }

  function choose(index: number) {
    const option = options[index];
    if (option) setValue(option.value);
    setOpen(false);
  }

  function findByTyping(key: string): number {
    const state = typeahead.current;
    window.clearTimeout(state.timer);
    state.text += key.toLowerCase();
    state.timer = window.setTimeout(() => (state.text = ""), 600);
    const start = open ? active : selectedIndex;
    const ordered = [...options.keys()].map((offset) => (start + 1 + offset) % options.length);
    const repeated = state.text.split("").every((char) => char === state.text[0]);
    const needle = repeated ? state.text[0] : state.text;
    return ordered.find((index) => options[index].label.toLowerCase().startsWith(needle)) ?? -1;
  }

  function onKeyDown(event: KeyboardEvent<HTMLButtonElement>) {
    const last = options.length - 1;
    if (!open) {
      if (["ArrowDown", "ArrowUp", "Enter", " "].includes(event.key)) {
        event.preventDefault();
        openMenu(event.key === "ArrowUp" && selectedIndex < 0 ? last : undefined);
      } else if (event.key.length === 1 && /\S/.test(event.key)) {
        const match = findByTyping(event.key);
        if (match >= 0) setValue(options[match].value);
      }
      return;
    }
    switch (event.key) {
      case "ArrowDown":
        event.preventDefault();
        setActive((index) => Math.min(last, index + 1));
        break;
      case "ArrowUp":
        event.preventDefault();
        setActive((index) => Math.max(0, index - 1));
        break;
      case "Home":
        event.preventDefault();
        setActive(0);
        break;
      case "End":
        event.preventDefault();
        setActive(last);
        break;
      case "Enter":
      case " ":
        event.preventDefault();
        choose(active);
        break;
      case "Escape":
        event.preventDefault();
        setOpen(false);
        break;
      case "Tab":
        setOpen(false);
        break;
      default:
        if (event.key.length === 1 && /\S/.test(event.key)) {
          const match = findByTyping(event.key);
          if (match >= 0) setActive(match);
        }
    }
  }

  return (
    <div ref={rootRef} className={`relative ${className}`}>
      <input type="hidden" name={name} value={value} />
      <button
        id={id}
        type="button"
        role="combobox"
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={listId}
        aria-activedescendant={open && active >= 0 ? optionId(active) : undefined}
        aria-describedby={describedBy}
        aria-invalid={invalid}
        onClick={() => (open ? setOpen(false) : openMenu())}
        onKeyDown={onKeyDown}
        className={`field-underline mt-2 flex w-full items-center justify-between gap-4 border-0 border-b bg-transparent px-0 py-3 text-left text-[1.05rem] transition-colors focus:outline-none ${
          open ? "border-ink" : "border-line"
        } focus-visible:border-ink focus-visible:shadow-[0_1px_0_0_var(--color-ink)] aria-[invalid=true]:border-accent`}
      >
        <span className={selected ? "text-ink" : "text-mist"}>{selected ? selected.label : placeholder}</span>
        <svg
          aria-hidden
          viewBox="0 0 16 16"
          className={`h-4 w-4 shrink-0 text-stone transition-transform duration-300 ${open ? "rotate-180" : ""}`}
        >
          <path d="M3.5 6l4.5 4.5L12.5 6" fill="none" stroke="currentColor" strokeWidth="1.5" />
        </svg>
      </button>

      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        aria-labelledby={id}
        hidden={!open}
        className="select-menu-panel absolute inset-x-0 top-full z-30 mt-2 max-h-80 overflow-y-auto rounded-[18px] border border-line bg-surface p-2 shadow-[0_24px_60px_-20px_rgb(0_0_0/0.35)]"
      >
        {options.map((option, index) => {
          const isSelected = option.value === value;
          const isActive = index === active;
          return (
            <li
              key={option.value}
              id={optionId(index)}
              role="option"
              aria-selected={isSelected}
              onPointerDown={(event) => event.preventDefault()}
              onClick={() => choose(index)}
              onPointerMove={() => setActive(index)}
              className={`flex cursor-pointer items-center justify-between gap-4 rounded-[12px] px-4 py-3 text-[0.98rem] transition-colors ${
                isActive ? "bg-paper-deep text-ink" : "text-charcoal"
              }`}
            >
              <span className={isSelected ? "font-medium text-ink" : undefined}>{option.label}</span>
              {isSelected ? (
                <svg aria-hidden viewBox="0 0 16 16" className="h-4 w-4 shrink-0 text-ink">
                  <path d="M3 8.5l3.2 3L13 4.5" fill="none" stroke="currentColor" strokeWidth="1.6" />
                </svg>
              ) : null}
            </li>
          );
        })}
      </ul>
    </div>
  );
}
