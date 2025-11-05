'use client'

import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { httpBatchLink } from '@trpc/client'
import { ThemeProvider } from 'next-themes'
import { trpc } from '@/lib/trpc'
import { useState } from 'react'
import superjson from 'superjson'

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient({
    defaultOptions: {
      queries: {
        // Reduce refetches on mobile (save bandwidth)
        staleTime: 60 * 1000,           // 60 seconds (vs default 0)
        retry: 1,                        // 1 retry (vs default 3)
        refetchOnWindowFocus: false,     // Don't refetch on tab switch
        refetchOnReconnect: true,        // Do refetch when connection restored

        // Keep existing behavior
        refetchOnMount: true,
        retryOnMount: true,
      },
      mutations: {
        // Mutations: Keep aggressive retries (user-initiated actions)
        retry: 3,
      }
    }
  }))
  const [trpcClient] = useState(() =>
    trpc.createClient({
      links: [
        httpBatchLink({
          url: '/api/trpc',
          transformer: superjson,
        }),
      ],
    })
  )

  return (
    <ThemeProvider
      attribute="class"
      defaultTheme="system"
      enableSystem
      disableTransitionOnChange
    >
      <trpc.Provider client={trpcClient} queryClient={queryClient}>
        <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
      </trpc.Provider>
    </ThemeProvider>
  )
}
