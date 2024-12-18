import { useState, useRef, useEffect } from "react"
import { Button } from "../ui/button"
import { Textarea } from "../ui/textarea"
import { Paperclip, Globe, ArrowUp, Loader2, StopCircle } from 'lucide-react'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "../ui/tooltip"

export function ChatInput({
  inputMessage,
  onInputChange,
  onSend,
  modelName,
  modelDescription,
  isGenerating = false,
  onStopGeneration
}) {
  const [rows, setRows] = useState(1)
  const textareaRef = useRef(null)

  useEffect(() => {
    if (textareaRef.current) {
      const lineHeight = 24 // Approximate line height in pixels
      const maxRows = 2 // Maximum number of rows before scrolling
      const newRows = Math.min(
        Math.max(
          Math.ceil(textareaRef.current.scrollHeight / lineHeight),
          1
        ),
        maxRows
      )
      setRows(newRows)
    }
  }, [inputMessage])

  const handleKeyDown = (e) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      if (inputMessage.trim()) {
        onSend()
      }
    }
  }

  return (
    <div className="border-t bg-background p-4">
      <div className="mx-auto max-w-3xl">
        <div className="relative flex flex-col gap-2">
          <div className="relative flex items-end">
            <Textarea
              ref={textareaRef}
              rows={rows}
              value={inputMessage}
              onChange={(e) => onInputChange(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={`Message ${modelName}...`}
              disabled={isGenerating}
              className="min-h-[56px] w-full resize-none rounded-md border-input bg-background px-14 py-4 pr-20 text-sm ring-offset-background placeholder:text-muted-foreground focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:cursor-not-allowed disabled:opacity-50"
            />
            <div className="absolute bottom-3 left-3 flex items-center">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      disabled={isGenerating}
                    >
                      <Paperclip className="h-4 w-4 text-muted-foreground" />
                      <span className="sr-only">Attach file</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Attach file</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>
            </div>
            <div className="absolute bottom-3 right-3 flex items-center space-x-2">
              <TooltipProvider delayDuration={300}>
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="h-8 w-8 rounded-full"
                      disabled={isGenerating}
                    >
                      <Globe className="h-4 w-4 text-muted-foreground" />
                      <span className="sr-only">Web search</span>
                    </Button>
                  </TooltipTrigger>
                  <TooltipContent side="top">
                    <p>Search the web</p>
                  </TooltipContent>
                </Tooltip>
              </TooltipProvider>

              {isGenerating ? (
                <Button
                  size="icon"
                  variant="destructive"
                  onClick={onStopGeneration}
                  className="h-8 w-8 rounded-full"
                >
                  <StopCircle className="h-4 w-4" />
                  <span className="sr-only">Stop generation</span>
                </Button>
              ) : (
                <Button
                  size="icon"
                  disabled={!inputMessage.trim() || isGenerating}
                  onClick={onSend}
                  className="h-8 w-8 rounded-full bg-primary text-primary-foreground hover:bg-primary/90"
                >
                  {isGenerating ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <ArrowUp className="h-4 w-4" />
                  )}
                  <span className="sr-only">Send message</span>
                </Button>
              )}
            </div>
          </div>
          <p className="text-xs text-muted-foreground">
            {modelName}: {modelDescription}
          </p>
        </div>
      </div>
    </div>
  )
}
