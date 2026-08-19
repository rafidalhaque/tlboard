import { useEffect, useRef, useState } from "react";
import { api, type Board } from "../lib/api.js";

export default function SearchBar({ onResults }: { onResults: (results: (Board & { _formatted?: { name: string } })[] | null) => void }) {
  const [q, setQ] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout>>();

  useEffect(() => {
    clearTimeout(debounceRef.current);
    if (!q.trim()) {
      onResults(null);
      return;
    }
    debounceRef.current = setTimeout(async () => {
      onResults(await api.search(q));
    }, 120); // fast enough to feel instant, slow enough not to spam every keystroke
    return () => clearTimeout(debounceRef.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  return (
    <input
      className="search-input"
      placeholder="Search boards..."
      value={q}
      onChange={(e) => setQ(e.target.value)}
    />
  );
}
