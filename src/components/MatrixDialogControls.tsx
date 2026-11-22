import { useId } from "react";
import { MAX_MATRIX_SIZE, MIN_MATRIX_SIZE } from "../core/matrixTemplate";

export function CountField({
  label,
  value,
  autoFocus,
  onChange,
}: {
  label: string;
  value: number;
  autoFocus?: boolean;
  onChange: (value: number) => void;
}) {
  const id = useId();
  return (
    <div className="flex items-center gap-1">
      <label htmlFor={id} className="w-16">
        {label}
      </label>
      <input
        id={id}
        type="number"
        min={MIN_MATRIX_SIZE}
        max={MAX_MATRIX_SIZE}
        value={value}
        autoFocus={autoFocus}
        aria-label={label}
        onChange={(event) => onChange(Number(event.target.value))}
        className="h-7 w-12 border border-[#8a8a8a] bg-white text-center [appearance:textfield] [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
      />
      <span className="flex flex-col">
        <button
          type="button"
          aria-label={`Increase ${label}`}
          className="h-3.5 w-5 border border-[#8a8a8a] bg-white text-[9px] leading-none"
          onClick={() => onChange(value + 1)}
        >
          ▲
        </button>
        <button
          type="button"
          aria-label={`Decrease ${label}`}
          className="h-3.5 w-5 border border-t-0 border-[#8a8a8a] bg-white text-[9px] leading-none"
          onClick={() => onChange(value - 1)}
        >
          ▼
        </button>
      </span>
    </div>
  );
}

export function Choices<T extends string>({
  legend,
  name,
  value,
  options,
  onChange,
}: {
  legend: string;
  name: string;
  value: T;
  options: readonly { id: T; label: string }[];
  onChange: (id: T) => void;
}) {
  return (
    <fieldset className="flex flex-wrap items-center gap-x-3 gap-y-1">
      <legend className="mr-1">{legend}</legend>
      {options.map((option) => (
        <label key={option.id} className="inline-flex items-center gap-1">
          <input
            type="radio"
            name={name}
            checked={value === option.id}
            onChange={() => onChange(option.id)}
          />
          {option.label}
        </label>
      ))}
    </fieldset>
  );
}
