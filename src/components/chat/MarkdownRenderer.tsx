'use client'

import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import { cn } from '@/lib/utils'

interface MarkdownRendererProps {
  content: string
  className?: string
}

export function MarkdownRenderer({ content, className }: MarkdownRendererProps) {
  return (
    <div className={cn('markdown-content', className)}>
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
        // Headings
        h1: ({ ...props }) => (
          <h1 className="text-xl font-semibold mt-4 mb-2" {...props} />
        ),
        h2: ({ ...props }) => (
          <h2 className="text-lg font-semibold mt-3 mb-2" {...props} />
        ),
        h3: ({ ...props }) => (
          <h3 className="text-base font-semibold mt-2 mb-1" {...props} />
        ),

        // Lists
        ul: ({ ...props }) => (
          <ul className="list-disc list-inside my-2 space-y-1" {...props} />
        ),
        ol: ({ ...props }) => (
          <ol className="list-decimal list-inside my-2 space-y-1" {...props} />
        ),
        li: ({ ...props }) => <li className="ml-4" {...props} />,

        // Code
        code: ({ className, ...props }) => {
          const isInline = !className?.includes('language-')
          return isInline ? (
            <code
              className="px-1.5 py-0.5 rounded bg-warm-gray-100 dark:bg-warm-gray-800 text-sm font-mono"
              {...props}
            />
          ) : (
            <code
              className="block p-3 rounded-lg bg-warm-gray-100 dark:bg-warm-gray-800 text-sm font-mono overflow-x-auto my-2"
              {...props}
            />
          )
        },

        // Links
        a: ({ ...props }) => (
          <a
            className="text-sage-600 dark:text-sage-400 underline hover:text-sage-700"
            target="_blank"
            rel="noopener noreferrer"
            {...props}
          />
        ),

        // Tables
        table: ({ ...props }) => (
          <div className="overflow-x-auto my-4">
            <table className="min-w-full border-collapse" {...props} />
          </div>
        ),
        th: ({ ...props }) => (
          <th
            className="border border-warm-gray-300 dark:border-warm-gray-600 px-3 py-2 bg-warm-gray-50 dark:bg-warm-gray-800 text-left font-semibold"
            {...props}
          />
        ),
        td: ({ ...props }) => (
          <td
            className="border border-warm-gray-300 dark:border-warm-gray-600 px-3 py-2"
            {...props}
          />
        ),

        // Emphasis
        strong: ({ ...props }) => (
          <strong className="font-semibold" {...props} />
        ),
        em: ({ ...props }) => <em className="italic" {...props} />,

        // Blockquotes
        blockquote: ({ ...props }) => (
          <blockquote
            className="border-l-4 border-sage-300 dark:border-sage-700 pl-4 italic my-2 text-muted-foreground"
            {...props}
          />
        ),

        // Horizontal rule
        hr: ({ ...props }) => (
          <hr
            className="my-4 border-warm-gray-200 dark:border-warm-gray-700"
            {...props}
          />
        ),

        // Paragraphs
        p: ({ ...props }) => <p className="my-2" {...props} />,
      }}
      >
        {content}
      </ReactMarkdown>
    </div>
  )
}
