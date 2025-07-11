import { useState, useRef, useEffect } from "react";
import { X, Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/stores/app-store";
import { cn } from "@/lib/utils";
import { AnimatedNumber } from "@/components/ui/animated-number";

export function SearchBox() {
  const {
    searchQuery,
    searchResults,
    setSearchQuery,
    searchMessages,
    clearSearch,
  } = useAppStore();

  const [isExpanded, setIsExpanded] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setShowResults(false);
        if (!searchQuery) {
          setIsExpanded(false);
        }
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [searchQuery]);

  const handleSearch = (query: string) => {
    setSearchQuery(query);
    searchMessages(query);
    setShowResults(query.trim().length > 0);
  };

  const handleClear = () => {
    clearSearch();
    setShowResults(false);
    setIsExpanded(false);
    inputRef.current?.blur();
  };

  const handleExpand = () => {
    setIsExpanded(true);
    setTimeout(() => inputRef.current?.focus(), 100);
  };

  const highlightText = (text: string, query: string) => {
    if (!query.trim()) return text;

    const regex = new RegExp(
      `(${query.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")})`,
      "gi",
    );
    const parts = text.split(regex);

    return parts.map((part, index) =>
      regex.test(part) ? (
        <mark
          key={index}
          className="bg-yellow-200 dark:bg-yellow-800 px-1 rounded"
        >
          {part}
        </mark>
      ) : (
        part
      ),
    );
  };

  return (
    <div ref={containerRef} className="relative">
      <div
        className={cn(
          "flex items-center transition-all duration-200",
          isExpanded ? "w-80" : "w-10",
        )}
      >
        {!isExpanded ? (
          <Button
            variant="ghost"
            size="icon"
            onClick={handleExpand}
            className="h-10 w-10"
          >
            <Search className="h-4 w-4" />
          </Button>
        ) : (
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input
              ref={inputRef}
              type="text"
              placeholder="Search messages..."
              value={searchQuery}
              onChange={(e) => handleSearch(e.target.value)}
              className="pl-10 pr-10 h-10"
            />
            {searchQuery && (
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClear}
                className="absolute right-1 top-1/2 transform -translate-y-1/2 h-8 w-8"
              >
                <X className="h-3 w-3" />
              </Button>
            )}
          </div>
        )}
      </div>

      {/* Search Results Dropdown */}
      {showResults && isExpanded && (
        <div className="absolute top-full left-0 right-0 mt-2 bg-card border rounded-md shadow-lg max-h-80 overflow-y-auto z-50">
          {searchResults.length > 0 ? (
            <div className="p-2">
              <div className="text-xs text-muted-foreground mb-2 px-2">
                <AnimatedNumber
                  value={searchResults.length}
                  className="inline"
                />{" "}
                result
                {searchResults.length !== 1 ? "s" : ""} found
              </div>
              {searchResults.slice(0, 10).map((message) => (
                <div
                  key={message.id}
                  className="p-3 hover:bg-muted rounded-sm cursor-pointer border-b last:border-b-0"
                  onClick={() => {
                    // Could add navigation to message here
                    setShowResults(false);
                  }}
                >
                  <div className="flex items-center justify-between mb-1">
                    <span className="text-sm font-medium">
                      {message.channel}
                    </span>
                    <span className="text-xs text-muted-foreground">
                      {new Date(message.timestamp).toLocaleTimeString()}
                    </span>
                  </div>
                  <div className="text-sm text-muted-foreground">
                    {message.text && highlightText(message.text, searchQuery)}
                  </div>
                </div>
              ))}
              {searchResults.length > 10 && (
                <div className="text-xs text-muted-foreground text-center py-2">
                  +
                  <AnimatedNumber
                    value={searchResults.length - 10}
                    className="inline"
                  />{" "}
                  more results
                </div>
              )}
            </div>
          ) : (
            <div className="p-4 text-center text-muted-foreground text-sm">
              No messages found for "{searchQuery}"
            </div>
          )}
        </div>
      )}
    </div>
  );
}
