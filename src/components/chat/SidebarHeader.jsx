import { Button } from "../ui/button";
import { Sun, Moon, Search } from "lucide-react";
import { SidebarTrigger } from "../ui/sidebar";

export function SidebarHeader({ onSearchOpen, theme, onThemeToggle }) {
  return (
    <div className="flex items-center justify-between p-2">
      <h1 className="text-xl font-semibold">AI Assistant</h1>
      <div className="flex items-center gap-1">
        <Button 
          variant="ghost" 
          size="icon"
          className="h-8 w-8"
          onClick={onSearchOpen}
        >
          <Search className="h-4 w-4" />
          <span className="sr-only">Search chats</span>
        </Button>
        <Button 
          variant="ghost" 
          size="icon"
          className="h-8 w-8"
          onClick={onThemeToggle}
        >
          {theme === "light" ? (
            <Moon className="h-4 w-4" />
          ) : (
            <Sun className="h-4 w-4" />
          )}
          <span className="sr-only">Toggle theme</span>
        </Button>
        <SidebarTrigger />
      </div>
    </div>
  );
}
