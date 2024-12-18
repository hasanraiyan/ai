import { memo } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import rehypeRaw from 'rehype-raw'
import rehypeHighlight from 'rehype-highlight'
import { cn } from '@/lib/utils'

export const MarkdownMessage = memo(({ content, className }) => {
  return (
    <div className={cn('markdown-wrapper wmde-markdown', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw, rehypeHighlight]}
        components={{
          // Style pre tags (code blocks)
          pre: ({ node, ...props }) => (
            <pre className="overflow-auto p-4" {...props} />
          ),
          // Style code tags (inline code)
          code: ({ node, inline, className, children, ...props }) => {
            const match = /language-(\w+)/.exec(className || '')
            return !inline ? (
              <code className={className} {...props}>
                {children}
              </code>
            ) : (
              <code className="font-mono" {...props}>
                {children}
              </code>
            )
          },
          // Style tables
          table: ({ node, ...props }) => (
            <div className="overflow-x-auto">
              <table {...props} />
            </div>
          ),
          // Style links
          a: ({ node, ...props }) => (
            <a
              {...props}
              target="_blank"
              rel="noopener noreferrer"
              className="text-blue-400 hover:text-blue-500 transition-colors"
            />
          )
        }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
})
