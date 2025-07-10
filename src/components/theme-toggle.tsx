import { Sun, Moon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAppStore } from "@/stores/app-store";

export function ThemeToggle() {
  const { theme, toggleTheme } = useAppStore();

  return (
    <Button
      variant="ghost"
      size="icon"
      onClick={toggleTheme}
      className="h-10 w-10 rounded-full"
    >
      {theme === "light" ? (
        <Moon className="h-5 w-5 transition-all duration-200" />
      ) : (
        <Sun className="h-5 w-5 transition-all duration-200" />
      )}
      <span className="sr-only">Toggle theme</span>
    </Button>
  );
}
