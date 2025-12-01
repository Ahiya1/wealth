# Tech Stack - Iteration 23

## Languages & Frameworks
- TypeScript 5.x
- Next.js 14 (App Router)
- React 18

## Key Libraries
- lucide-react (MessageCircle icon for Chat nav)
- date-fns (already in use)
- sonner (toast notifications for errors)

## Patterns
- tRPC procedures for session title updates
- SSE streaming for chat (existing)
- Mobile-first responsive design

## File Locations

### New Files
- `src/lib/services/cc-bill-detection.service.ts` - CC bill detection logic

### Modified Files

#### Navigation (3 files)
1. `src/lib/mobile-navigation.ts` - Add Chat to primary nav, move Goals to overflow
2. `src/components/dashboard/DashboardSidebar.tsx` - Add Chat to sidebar nav

#### CC Bill Detection (2 files)
1. `src/server/services/chat-tools.service.ts` - Integrate CC detection into parse_file
2. `src/components/chat/TransactionPreview.tsx` - Show excluded CC bills

#### Session Titles (1 file)
1. `src/app/api/chat/stream/route.ts` - Auto-generate title after first exchange

#### UI Polish (3 files)
1. `src/components/chat/FileUploadZone.tsx` - Add loading state
2. `src/components/chat/ChatInput.tsx` - Add error dismissal
3. `src/components/chat/ChatPageClient.tsx` - Add createSession error handling

## Testing
- Jest unit tests for CC bill detection patterns
- Manual testing checklist for navigation and UI

## No Schema Changes Required
- Uses existing `tags` field for CC bill marking (if needed in future)
- No new Prisma models or migrations
