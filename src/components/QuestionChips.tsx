"use client";

interface Props {
  onPick: (q: string) => void;
}

const CHIPS = [
  "Should I raise my latte from $5.00 to $5.50?",
  "What if I run a 2-for-1 on Tuesdays?",
  "Will people buy a $9 matcha bowl?",
  "Does a student discount sign bring in more students?",
  "What if I open at 6:30 instead of 7:00?",
  "Do I need a second barista on Saturday mornings?",
  "A chain café is opening across the street. What happens?",
  "What if my rival cuts prices by 20%?",
];

export function QuestionChips({ onPick }: Props) {
  return (
    <div className="flex flex-wrap gap-2">
      {CHIPS.map((q) => (
        <button
          key={q}
          onClick={() => onPick(q)}
          className="rounded-full border border-zinc-200 bg-white px-3 py-1 text-xs text-zinc-700 hover:border-zinc-400 hover:bg-zinc-50"
        >
          {q}
        </button>
      ))}
    </div>
  );
}
