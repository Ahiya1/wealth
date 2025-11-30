import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import { ChatPageClient } from '@/components/chat/ChatPageClient'

export default async function ChatPage() {
  const supabase = createClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect('/signin')
  }

  return <ChatPageClient />
}
