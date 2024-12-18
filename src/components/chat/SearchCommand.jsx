import {
  CommandDialog,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from "../ui/command";
import { Clock, MessageSquare, Bot, Lock, Unlock } from "lucide-react";
import { getModelById, MODEL_GROUPS, SECURITY_ICONS, SECURITY_COLORS } from "../../config/ai-models";
import { format, isToday, isYesterday } from "date-fns";

export function SearchCommand({ 
  open, 
  onOpenChange, 
  searchQuery, 
  onSearchChange, 
  onNewChat,
  chats = [],
  onChatSelect,
  selectedModel,
  onModelSelect
}) {
  const filteredChats = chats.filter(chat => 
    chat.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
    chat.messages.some(msg => msg.content.toLowerCase().includes(searchQuery.toLowerCase()))
  );

  // Filter models based on search query
  const filteredModelGroups = Object.entries(MODEL_GROUPS).reduce((acc, [group, models]) => {
    const filtered = models.filter(model => 
      model.displayName.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.description.toLowerCase().includes(searchQuery.toLowerCase()) ||
      model.features.some(f => f.toLowerCase().includes(searchQuery.toLowerCase()))
    );
    if (filtered.length > 0) {
      acc[group] = filtered;
    }
    return acc;
  }, {});

  const getDateLabel = (date) => {
    const chatDate = new Date(date);
    if (isToday(chatDate)) return 'Today';
    if (isYesterday(chatDate)) return 'Yesterday';
    return format(chatDate, 'MMM d, yyyy');
  };

  const hasModelResults = Object.keys(filteredModelGroups).length > 0;
  const hasChatResults = filteredChats.length > 0;

  return (
    <CommandDialog open={open} onOpenChange={onOpenChange}>
      <CommandInput 
        placeholder="Search chats and models..." 
        value={searchQuery}
        onValueChange={onSearchChange}
      />
      <CommandList>
        <CommandEmpty>No results found.</CommandEmpty>
        
        {hasChatResults && (
          <CommandGroup heading="Chat History">
            {filteredChats.map((chat) => {
              const model = getModelById(chat.modelId);
              const ModelIcon = model?.icon;
              return (
                <CommandItem
                  key={chat.id}
                  value={chat.title}
                  className="flex items-center gap-2 py-2"
                  onSelect={() => {
                    onChatSelect?.(chat.id);
                    onOpenChange(false);
                  }}
                >
                  {ModelIcon && (
                    <div className={`p-1 rounded-md bg-primary/10 dark:bg-slate-800/60 ring-1 ring-inset ${model.color}/20`}>
                      <ModelIcon className={`h-4 w-4 ${model.color}`} />
                    </div>
                  )}
                  <div className="flex flex-col flex-1 min-w-0">
                    <span className="truncate">{chat.title}</span>
                    <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                      <Clock className="h-3 w-3" />
                      <span>{getDateLabel(chat.date)}</span>
                      {model && (
                        <>
                          <span>•</span>
                          <span>{model.displayName}</span>
                        </>
                      )}
                    </div>
                  </div>
                </CommandItem>
              );
            })}
          </CommandGroup>
        )}

        {hasModelResults && (
          <>
            {hasChatResults && <CommandSeparator />}
            {Object.entries(filteredModelGroups).map(([group, models]) => (
              <CommandGroup key={group} heading={group}>
                {models.map((model) => {
                  const ModelIcon = model.icon;
                  const SecurityIcon = model.censored ? SECURITY_ICONS.censored : SECURITY_ICONS.uncensored;
                  const securityColor = model.censored ? SECURITY_COLORS.censored : SECURITY_COLORS.uncensored;
                  
                  return (
                    <CommandItem
                      key={model.name}
                      value={model.displayName}
                      className="flex items-center gap-2 py-2"
                      onSelect={() => {
                        onModelSelect?.(model.name);
                        onOpenChange(false);
                      }}
                    >
                      <div className={`p-1 rounded-md bg-primary/10 dark:bg-slate-800/60 ring-1 ring-inset ${model.color}/20`}>
                        <ModelIcon className={`h-4 w-4 ${model.color}`} />
                      </div>
                      <div className="flex flex-col flex-1 min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="truncate font-medium">{model.displayName}</span>
                          <SecurityIcon className={`h-3 w-3 ${securityColor}`} />
                        </div>
                        <div className="flex items-center gap-1.5 text-xs text-muted-foreground">
                          <span className="truncate">{model.description}</span>
                        </div>
                      </div>
                    </CommandItem>
                  );
                })}
              </CommandGroup>
            ))}
          </>
        )}

        <CommandSeparator />
        <CommandGroup heading="Quick Actions">
          <CommandItem onSelect={() => {
            onNewChat();
            onOpenChange(false);
          }}>
            <MessageSquare className="mr-2 h-4 w-4" />
            <span>New Chat</span>
          </CommandItem>
      
        </CommandGroup>
      </CommandList>
    </CommandDialog>
  );
}
