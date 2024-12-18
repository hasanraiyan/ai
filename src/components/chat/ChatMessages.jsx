import { useEffect, useRef } from "react";
import { getModelById } from "../../config/ai-models";
import { format } from "date-fns";
import { Bot, User, Loader2, AlertCircle } from "lucide-react";
import { MarkdownMessage } from "./MarkdownMessage";

export function ChatMessages({ messages, isGenerating }) {
  const scrollContainerRef = useRef(null);
  const bottomRef = useRef(null);
  const lastScrollHeightRef = useRef(0);
  const lastScrollTopRef = useRef(0);

  useEffect(() => {
    const scrollContainer = scrollContainerRef.current;
    if (!scrollContainer) return;

    // Save current scroll position and height
    lastScrollHeightRef.current = scrollContainer.scrollHeight;
    lastScrollTopRef.current = scrollContainer.scrollTop;

    // Check if user was near bottom before new content
    const wasNearBottom = scrollContainer.scrollHeight - scrollContainer.scrollTop 
      <= scrollContainer.clientHeight + 100;

    // After new content is added
    requestAnimationFrame(() => {
      // If height changed and user was near bottom, scroll to bottom
      if (wasNearBottom || messages.length <= 1) {
        bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
      } else {
        // Maintain scroll position
        const heightDiff = scrollContainer.scrollHeight - lastScrollHeightRef.current;
        scrollContainer.scrollTop = lastScrollTopRef.current + heightDiff;
      }
    });
  }, [messages, isGenerating]);

  if (!messages.length) {
    return (
      <div className="flex-1 flex items-center justify-center p-8 text-center">
        <div className="max-w-[420px] space-y-2">
          <h2 className="text-lg font-semibold dark:text-white">
            Start a conversation
          </h2>
          <p className="text-sm text-muted-foreground">
            Choose a model and start chatting. Your conversations will be saved here.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div 
      ref={scrollContainerRef}
      className="flex-1 overflow-y-auto messages-container scroll-smooth"
    >
      <div className="max-w-3xl mx-auto">
        {messages.map((message, index) => {
          const model = getModelById(message.modelId);
          const ModelIcon = model?.icon;
          const isUser = message.type === 'user';
          const isLast = index === messages.length - 1;

          return (
            <div
              key={index}
              className={`px-4 py-6 ${
                isUser ? 'bg-transparent' : 'bg-slate-50 dark:bg-slate-800/50'
              }`}
            >
              <div className="max-w-3xl mx-auto">
                <div className="flex gap-4">
                  <div className={`w-8 h-8 rounded-md flex items-center justify-center flex-shrink-0 ${
                    isUser 
                      ? 'bg-blue-500 text-white' 
                      : 'bg-primary/10 dark:bg-slate-800'
                  }`}>
                    {isUser ? (
                      <User className="h-5 w-5" />
                    ) : ModelIcon ? (
                      <ModelIcon className={`h-5 w-5 ${model.color}`} />
                    ) : (
                      <Bot className="h-5 w-5" />
                    )}
                  </div>
                  <div className="flex-1 space-y-2">
                    <div className="flex items-center gap-2">
                      <span className="font-medium dark:text-white">
                        {isUser ? 'You' : model?.displayName || 'AI Assistant'}
                      </span>
                      <span className="text-xs text-muted-foreground">
                        {format(new Date(message.timestamp), 'h:mm a')}
                      </span>
                    </div>
                    {message.error ? (
                      <div className="text-red-500 dark:text-red-400 flex items-center gap-2">
                        <AlertCircle className="h-4 w-4" />
                        {message.content}
                      </div>
                    ) : (
                      <MarkdownMessage content={message.content} />
                    )}
                  </div>
                </div>
              </div>
            </div>
          );
        })}

        {isGenerating && (
          <div className="px-4 py-6 bg-slate-50 dark:bg-slate-800/50">
            <div className="max-w-3xl mx-auto">
              <div className="flex gap-4">
                <div className="w-8 h-8 rounded-md bg-primary/10 dark:bg-slate-800 flex items-center justify-center flex-shrink-0">
                  {messages.length > 0 ? (
                    (() => {
                      const lastMessage = messages[messages.length - 1];
                      const model = getModelById(lastMessage.modelId);
                      const LastModelIcon = model?.icon;
                      return LastModelIcon ? (
                        <LastModelIcon className={`h-5 w-5 ${model.color}`} />
                      ) : (
                        <Bot className="h-5 w-5" />
                      );
                    })()
                  ) : (
                    <Bot className="h-5 w-5" />
                  )}
                </div>
                <div className="flex-1 space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="font-medium dark:text-white">
                      {messages.length > 0 
                        ? getModelById(messages[messages.length - 1].modelId)?.displayName 
                        : 'AI Assistant'}
                    </span>
                    <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                  </div>
                  <div className="h-4 w-12 bg-muted/20 rounded animate-pulse" />
                </div>
              </div>
            </div>
          </div>
        )}

        <div ref={bottomRef} className="h-px" />
      </div>
    </div>
  );
}
