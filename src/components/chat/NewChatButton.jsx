import { Button } from "../ui/button";
import { Plus, Sparkles } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip";

export function NewChatButton({ onClick }) {
  return (
    <TooltipProvider>
      <Tooltip>
        <TooltipTrigger asChild>
          <Button 
            className="w-full h-10 gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 dark:from-blue-600 dark:to-blue-700 dark:hover:from-blue-700 dark:hover:to-blue-800 text-white shadow-lg hover:shadow-xl transition-all duration-200"
            onClick={onClick}
          >
            <Plus className="h-4 w-4" />
            <span>New Chat</span>
            <Sparkles className="h-4 w-4 opacity-50" />
          </Button>
        </TooltipTrigger>
        <TooltipContent side="top" className="dark:bg-slate-800 dark:border-slate-700">
          <div className="text-xs">
            Start a new conversation (⌘N)
          </div>
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
