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

export function RecentChats({ 
  chats, 
  currentChatId, 
  onChatSelect, 
  onDelete, 
  onArchive, 
  onRename 
}) {
  const groupChats = (chats) => {
    return chats.reduce((acc, chat) => {
      const date = new Date(chat.date);
      let group = 'Older';
      
      if (isToday(date)) {
        group = 'Today';
      } else if (isYesterday(date)) {
        group = 'Yesterday';
      } else if (isThisWeek(date)) {
        group = 'This Week';
      } else if (isThisMonth(date)) {
        group = 'This Month';
      }
      
      if (!acc[group]) {
        acc[group] = [];
      }
      acc[group].push(chat);
      return acc;
    }, {});
  };

  const handleAction = (action, chat, e) => {
    // Prevent the chat selection when clicking menu items
    e?.preventDefault();
    e?.stopPropagation();

    switch (action) {
      case 'share':
        // TODO: Implement share functionality
        console.log('Share:', chat);
        break;
      case 'rename':
        const newTitle = prompt('Enter new title:', chat.title);
        if (newTitle && newTitle.trim() !== '') {
          onRename(chat.id, newTitle.trim());
        }
        break;
      case 'archive':
        onArchive(chat.id);
        break;
      case 'delete':
        onDelete(chat.id);
        break;
      default:
        break;
    }
  };

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
                        currentChatId === chat.id ? 'bg-accent' : ''
                      }`}
                      onClick={() => onChatSelect(chat.id)}
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
                        <DropdownMenuItem onClick={(e) => handleAction('share', chat, e)}>
                          <Share2 className="mr-2 h-4 w-4" />
                          <span>Share</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleAction('rename', chat, e)}>
                          <Pencil className="mr-2 h-4 w-4" />
                          <span>Rename</span>
                        </DropdownMenuItem>
                        <DropdownMenuItem onClick={(e) => handleAction('archive', chat, e)}>
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
                                onClick={(e) => handleAction('delete', chat, e)}
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
}
