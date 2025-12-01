# Patterns - Iteration 23

## CC Bill Detection Patterns

### Payee Pattern Matching
Use regex patterns for Hebrew and English credit card company names:
```typescript
const CC_PAYEE_PATTERNS = [
  /visa\s*cal/i,        // English
  /ויזה\s*כאל/,         // Hebrew
  /isracard/i,
  /ישראכרט/,
  /leumi\s*card/i,
  /לאומי\s*קארד/,
  /max(\s*it)?/i,
  /מקס/,
  /diners/i,
  /דיינרס/,
  /american\s*express/i,
  /amex/i,
]
```

### Detection Criteria
1. Payee matches CC pattern
2. Amount > 500 NIS (filter out small refunds/adjustments)

### Result Structure
```typescript
interface ParsedFileResult {
  transactions: ParsedTransaction[]
  creditCardBills: ParsedTransaction[]  // NEW
  warning: string | null                 // NEW
  errors: string[]
}
```

## Navigation Pattern

### Mobile Bottom Nav (4+1)
- 4 primary tabs + More overflow
- Replace Goals (position 4) with Chat
- Move Goals to overflow (position 1)

### Desktop Sidebar
- Insert Chat after Dashboard (position 2)
- Use MessageCircle icon
- href: "/chat"

## Session Title Generation

### Algorithm
```typescript
function generateTitleFromMessage(message: string): string {
  const cleaned = message.trim().replace(/\s+/g, ' ')
  if (cleaned.length <= 50) {
    return cleaned.charAt(0).toUpperCase() + cleaned.slice(1)
  }

  const truncated = cleaned.substring(0, 50)
  const lastSpace = truncated.lastIndexOf(' ')
  const title = lastSpace > 0 ? truncated.substring(0, lastSpace) : truncated

  return title.charAt(0).toUpperCase() + title.slice(1) + '...'
}
```

### Trigger Condition
- After saving assistant message
- Check if session has exactly 2 messages (first exchange)
- Extract title from first user message

## Error Handling Patterns

### Toast Notifications
```typescript
import { toast } from 'sonner'

// On mutation error
onError: (error) => {
  toast.error('Failed to create chat session', {
    description: error.message,
  })
}
```

### Dismissible Error Banner
```tsx
{error && (
  <div className="flex items-center justify-between ...">
    <p className="text-sm flex-1">{error}</p>
    <Button variant="ghost" size="sm" onClick={() => setError(null)}>
      <X className="h-4 w-4" />
    </Button>
  </div>
)}
```

## Loading State Pattern

### File Processing
```typescript
const [isProcessing, setIsProcessing] = useState(false)

const handleFile = async (file: File) => {
  setIsProcessing(true)
  try {
    // Process file...
  } finally {
    setIsProcessing(false)
  }
}
```

### Visual Indicator
```tsx
{isProcessing && (
  <div className="flex items-center gap-2">
    <Loader2 className="h-4 w-4 animate-spin" />
    <span>Processing file...</span>
  </div>
)}
```
