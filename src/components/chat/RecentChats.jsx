import { Button } from "../ui/button";
import { getModelById } from "../../config/ai-models";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "../ui/dropdown-menu";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "../ui/alert-dialog";
import { 
  Share2, 
  Pencil, 
  Archive, 
  Trash2, 
  MoreHorizontal, 
  AlertTriangle, 
  Clock
} from "lucide-react";
import { format, isToday, isYesterday, isThisWeek, isThisMonth } from "date-fns";

const groupChats = (chats) => {
  if (!Array.isArray(chats)) return {};
  
  return chats.reduce((groups, chat) => {
    const date = new Date(chat.date);
    let key = 'Older';

    if (isToday(date)) {
      key = 'Today';
    } else if (isYesterday(date)) {
      key = 'Yesterday';
    } else if (isThisWeek(date)) {
      key = 'This Week';
    } else if (isThisMonth(date)) {
      key = 'This Month';
    }

    if (!groups[key]) {
      groups[key] = [];
    }
    groups[key].push(chat);
    return groups;
  }, {});
};

const RecentChats = ({ chats: rawChats, ...props }) => {
  const chats = Array.isArray(rawChats) ? rawChats : [];
  const groupedChats = groupChats(chats);
  const groups = ['Today', 'Yesterday', 'This Week', 'This Month', 'Older'];

  return (
    <div className="mt-6 space-y-6">
      {groups.map((group) => {
        const groupChats = groupedChats[group];
        if (!groupChats?.length) return null;

        return (
          <div key={group}>
            <h3 className="text-sm font-medium text-muted-foreground mb-2 px-2">
              {group}
            </h3>
            <div className="space-y-1">
              {groupChats.map((chat) => {
                const model = getModelById(chat.modelId);
                const ModelIcon = model?.icon;

                return (
                  <div key={chat.id} className="group relative">
                    <Button
                      variant="ghost"
                      className={`w-full justify-start h-auto py-3 px-3 dark:hover:bg-slate-800/50 ${
                        props.currentChatId === chat.id ? 'bg-accent' : ''
                      }`}
                      onClick={() => props.onChatSelect(chat.id)}
                    >
                      <div className="flex items-center gap-3 min-w-0 w-[calc(100%-24px)]">
                        {ModelIcon && (
                          <div className={`p-1 rounded-md bg-primary/10 dark:bg-slate-800/60 ring-1 ring-inset ${model.color}/20`}>
                            <ModelIcon className={`h-4 w-4 ${model.color}`} />
                          </div>
                        )}
                        <div className="flex flex-col min-w-0">
                          <span className="truncate font-medium dark:text-slate-200">
                            {chat.title}
                          </span>
                          <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            <span>{format(new Date(chat.date), 'h:mm a')}</span>
                            {model && (
                              <>
                                <span>•</span>
                                <span>{model.displayName}</span>
                              </>
                            )}
                          </div>
                        </div>
                      </div>
                    </Button>

                    <DropdownMenu>
                      <DropdownMenuTrigger asChild>
                        <Button
                          variant="ghost"
                          size="icon"
                          className="absolute right-2 top-1/2 -translate-y-1/2 h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity dark:hover:bg-slate-700/50"
                        >
                          <MoreHorizontal className="h-4 w-4 dark:text-slate-400" />
                          <span className="sr-only">More options</span>
                        </Button>
                      </DropdownMenuTrigger>
                      <DropdownMenuContent align="end" className="w-48 dark:bg-slate-800 dark:border-slate-700">
                        <DropdownMenuItem onClick={() => props.onRename?.(chat.id, chat.title)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          <span>Rename</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={() => props.onArchive?.(chat.id)}>
                          <Archive className="mr-2 h-4 w-4" />
                          <span>Archive</span>
                        </DropdownMenuItem>
                        <DropdownMenuSeparator />
                        <AlertDialog>
                          <AlertDialogTrigger asChild>
                            <DropdownMenuItem 
                              onSelect={(e) => e.preventDefault()}
                              className="text-red-600 dark:text-red-400"
                            >
                              <Trash2 className="mr-2 h-4 w-4" />
                              <span>Delete chat</span>
                            </DropdownMenuItem>
                          </AlertDialogTrigger>
                          <AlertDialogContent className="dark:bg-slate-800 dark:border-slate-700">
                            <AlertDialogHeader>
                              <AlertDialogTitle className="flex items-center gap-2">
                                <AlertTriangle className="h-5 w-5 text-red-500" />
                                <span>Delete Chat</span>
                              </AlertDialogTitle>
                              <AlertDialogDescription>
                                Are you sure you want to delete "{chat.title}"? This action cannot be undone.
                              </AlertDialogDescription>
                            </AlertDialogHeader>
                            <AlertDialogFooter>
                              <AlertDialogCancel className="dark:bg-slate-700 dark:hover:bg-slate-600 dark:border-slate-600">
                                Cancel
                              </AlertDialogCancel>
                              <AlertDialogAction 
                                onClick={() => props.onDelete?.(chat.id)}
                                className="bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700"
                              >
                                Delete Chat
                              </AlertDialogAction>
                            </AlertDialogFooter>
                          </AlertDialogContent>
                        </AlertDialog>
                      </DropdownMenuContent>
                    </DropdownMenu>
                  </div>
                );
              })}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default RecentChats;
