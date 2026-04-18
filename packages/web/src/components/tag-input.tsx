"use client";

import { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";

interface TagInputProps {
  value: string[];
  onChange: (tags: string[]) => void;
  placeholder?: string;
}

export function TagInput({ value, onChange, placeholder = "输入标签，回车添加" }: TagInputProps) {
  const [input, setInput] = useState("");
  const [showSuggestions, setShowSuggestions] = useState(false);

  const { data: historyData } = useQuery({
    queryKey: ["my-tags"],
    queryFn: () => api.get<string[]>("/my/tags"),
  });

  const allTags = historyData?.data ?? [];
  const suggestions = allTags.filter(
    (t) => !value.includes(t) && (input === "" || t.toLowerCase().includes(input.toLowerCase()))
  );

  const addTag = (tag: string) => {
    const trimmed = tag.trim();
    if (trimmed && !value.includes(trimmed)) {
      onChange([...value, trimmed]);
    }
    setInput("");
  };

  const removeTag = (tag: string) => {
    onChange(value.filter((t) => t !== tag));
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === "," || e.key === "，") {
      e.preventDefault();
      if (input.trim()) addTag(input);
    }
    if (e.key === "Backspace" && input === "" && value.length > 0) {
      removeTag(value[value.length - 1]);
    }
  };

  return (
    <div>
      {/* Selected tags */}
      <div className="flex flex-wrap gap-1.5 mb-2">
        {value.map((tag) => (
          <span key={tag} className="flex items-center gap-1 text-[11px] px-2 py-1 rounded-lg bg-[#5AC8FA]/15 text-[#5AC8FA]">
            {tag}
            <button onClick={() => removeTag(tag)} className="text-[#5AC8FA]/50 hover:text-[#5AC8FA] ml-0.5">×</button>
          </span>
        ))}
      </div>

      {/* Input */}
      <input
        type="text"
        value={input}
        onChange={(e) => { setInput(e.target.value); setShowSuggestions(true); }}
        onFocus={() => setShowSuggestions(true)}
        onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
        onKeyDown={handleKeyDown}
        placeholder={value.length === 0 ? placeholder : "继续添加..."}
        className="input-dark text-sm py-2 w-full"
      />

      {/* History suggestions */}
      {showSuggestions && suggestions.length > 0 && (
        <div className="flex flex-wrap gap-1 mt-2">
          {suggestions.slice(0, 12).map((tag) => (
            <button
              key={tag}
              onMouseDown={(e) => { e.preventDefault(); addTag(tag); }}
              className="text-[10px] px-2 py-1 rounded-lg bg-white/5 text-white/40 hover:bg-white/10 hover:text-white/60 transition-colors"
            >
              + {tag}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
