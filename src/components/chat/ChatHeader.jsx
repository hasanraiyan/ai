import { Button } from '../ui/button'
import {
  MessageSquare,
  Menu,
  Share2,
  Settings2,
  Download,
  Copy,
  Trash2,
  MoreVertical,
  Zap,
  Clock,
  Shield,
  ShieldAlert,
  AlertTriangle,
  PlusCircle
} from 'lucide-react'
import { useSidebar } from '../ui/sidebar'
import { getModelById } from '../../config/ai-models'
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger
} from '../ui/tooltip'
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger
} from '../ui/dropdown-menu'
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger
} from '../ui/alert-dialog'
import { Badge } from '../ui/badge'

export function ChatHeader ({
  selectedModel,
  currentChat,
  onShare,
  onCopy,
  onDownload,
  onDelete,
  onNewChat
}) {
  const { toggleSidebar, state } = useSidebar()
  const model = getModelById(selectedModel)
  const ModelIcon = model?.icon

  const handleAction = action => {
    switch (action) {
      case 'share':
        onShare?.()
        break
      case 'copy':
        onCopy?.()
        break
      case 'download':
        onDownload?.()
        break
      case 'delete':
        onDelete?.()
        break
      case 'new':
        onNewChat?.()
        break
      default:
        break
    }
  }

  return (
    <div className='border-b border-border dark:border-slate-800/60 bg-background dark:bg-slate-950/30 backdrop-blur supports-[backdrop-filter]:bg-background/60'>
      <div className='h-14 px-4 flex items-center justify-between gap-2'>
        <div className='flex items-center gap-3 min-w-0'>
          {state === 'collapsed' && (
            <Button
              variant='ghost'
              size='icon'
              className='h-9 w-9 dark:hover:bg-slate-800/50'
              onClick={toggleSidebar}
            >
              <Menu className='h-5 w-5 dark:text-slate-400' />
              <span className='sr-only'>Toggle sidebar</span>
            </Button>
          )}
          <div className='flex items-center gap-2.5 px-2'>
            <div
              className={`p-1.5 rounded-md bg-primary/10 dark:bg-slate-800/60 ring-1 ring-inset ${model?.color}/20`}
            >
              {ModelIcon && <ModelIcon className={`h-5 w-5 ${model.color}`} />}
            </div>
            <div className='flex flex-col'>
              <div className='flex items-center gap-2'>
                <h1 className='text-lg font-semibold dark:text-white leading-none'>
                  {currentChat?.title || model?.displayName}
                </h1>
              </div>
              <div className='flex items-center gap-2 text-xs text-muted-foreground p-0.5'>
                <Clock className='h-3 w-3' />
                <span className='truncate'>{model?.description}</span>
                <div className='flex items-center gap-1.5'>
                  {model?.censored ? (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant='secondary'
                          className='h-5 gap-1 px-1.5 dark:bg-slate-800 dark:text-yellow-500 dark:border-yellow-500/20'
                        >
                          <Shield className='h-3 w-3' />
                          <span className='text-[10px] font-medium'>
                            Protected
                          </span>
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side='top'>
                        <p>Content filtering enabled</p>
                      </TooltipContent>
                    </Tooltip>
                  ) : (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant='secondary'
                          className='h-5 gap-1 px-1.5 dark:bg-slate-800 dark:text-red-500 dark:border-red-500/20'
                        >
                          <ShieldAlert className='h-3 w-3' />
                          <span className='text-[10px] font-medium'>
                            Unfiltered
                          </span>
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side='top'>
                        <p>No content filtering</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                  {model?.type && (
                    <Tooltip>
                      <TooltipTrigger asChild>
                        <Badge
                          variant='secondary'
                          className={`h-5 gap-1 px-1.5 dark:bg-slate-800 ${model.color} dark:border-${model.color}/20`}
                        >
                          <Zap className='h-3 w-3' />
                          <span className='text-[10px] font-medium'>
                            {model.type}
                          </span>
                        </Badge>
                      </TooltipTrigger>
                      <TooltipContent side='top'>
                        <p>Model type: {model.type}</p>
                      </TooltipContent>
                    </Tooltip>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className='flex items-center gap-1.5'>
          <TooltipProvider delayDuration={0}>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-8 w-8 dark:hover:bg-slate-800/50'
                  onClick={() => handleAction('share')}
                >
                  <Share2 className='h-4 w-4 dark:text-slate-400' />
                  <span className='sr-only'>Share chat</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side='bottom'
                className='dark:bg-slate-800 dark:border-slate-700'
              >
                <div className="flex items-center gap-2">
                  <span>Share chat</span>
                  <kbd className="text-xs bg-slate-800 px-1.5 py-0.5 rounded">⌘S</kbd>
                </div>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-8 w-8 dark:hover:bg-slate-800/50'
                  onClick={() => handleAction('new')}
                >
                  <PlusCircle className='h-4 w-4 dark:text-slate-400' />
                  <span className='sr-only'>New chat</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side='bottom'
                className='dark:bg-slate-800 dark:border-slate-700'
              >
                <p>New chat</p>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-8 w-8 dark:hover:bg-slate-800/50'
                  onClick={() => handleAction('copy')}
                >
                  <Copy className='h-4 w-4 dark:text-slate-400' />
                  <span className='sr-only'>Copy chat</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side='bottom'
                className='dark:bg-slate-800 dark:border-slate-700'
              >
                <div className="flex items-center gap-2">
                  <span>Copy to clipboard</span>
                  <kbd className="text-xs bg-slate-800 px-1.5 py-0.5 rounded">⌘C</kbd>
                </div>
              </TooltipContent>
            </Tooltip>

            <Tooltip>
              <TooltipTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-8 w-8 dark:hover:bg-slate-800/50'
                  onClick={() => handleAction('download')}
                >
                  <Download className='h-4 w-4 dark:text-slate-400' />
                  <span className='sr-only'>Download chat</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent
                side='bottom'
                className='dark:bg-slate-800 dark:border-slate-700'
              >
                <div className="flex items-center gap-2">
                  <span>Download chat</span>
                  <kbd className="text-xs bg-slate-800 px-1.5 py-0.5 rounded">⌘D</kbd>
                </div>
              </TooltipContent>
            </Tooltip>

            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  variant='ghost'
                  size='icon'
                  className='h-8 w-8 dark:hover:bg-slate-800/50'
                >
                  <MoreVertical className='h-4 w-4 dark:text-slate-400' />
                  <span className='sr-only'>More options</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent
                align='end'
                className='w-48 dark:bg-slate-800 dark:border-slate-700'
              >
                <DropdownMenuItem onClick={() => handleAction('settings')}>
                  <Settings2 className='mr-2 h-4 w-4' />
                  <span>Settings</span>
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <AlertDialog>
                  <AlertDialogTrigger asChild>
                    <DropdownMenuItem
                      onSelect={e => e.preventDefault()}
                      className='text-red-600 dark:text-red-400'
                    >
                      <Trash2 className='mr-2 h-4 w-4' />
                      <span>Delete chat</span>
                    </DropdownMenuItem>
                  </AlertDialogTrigger>
                  <AlertDialogContent className='dark:bg-slate-800 dark:border-slate-700'>
                    <AlertDialogHeader>
                      <AlertDialogTitle className='flex items-center gap-2'>
                        <AlertTriangle className='h-5 w-5 text-red-500' />
                        <span>Delete Chat History</span>
                      </AlertDialogTitle>
                      <AlertDialogDescription>
                        This will permanently delete your entire chat history
                        with this model. This action cannot be undone.
                      </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                      <AlertDialogCancel className='dark:bg-slate-700 dark:hover:bg-slate-600 dark:border-slate-600'>
                        Cancel
                      </AlertDialogCancel>
                      <AlertDialogAction
                        onClick={() => handleAction('delete')}
                        className='bg-red-600 hover:bg-red-700 dark:bg-red-600 dark:hover:bg-red-700'
                      >
                        Delete Chat
                      </AlertDialogAction>
                    </AlertDialogFooter>
                  </AlertDialogContent>
                </AlertDialog>
              </DropdownMenuContent>
            </DropdownMenu>
          </TooltipProvider>
        </div>
      </div>
    </div>
  )
}
