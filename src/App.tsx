import { ThemeProvider } from "./components/theme-provider";
import "./styles/globals.css";

function AppContent() {
  return (
    <div className="">
      BluChat
    </div>
  );
}

export function App() {
  return (
    <ThemeProvider defaultTheme="system" storageKey="rule-builder-theme">
      <AppContent />
    </ThemeProvider>
  );
}
