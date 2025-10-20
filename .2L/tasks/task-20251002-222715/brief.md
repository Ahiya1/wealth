# Task: Fix Select.Item Empty Value Error

## Error
```
Unhandled Runtime Error
Error: A <Select.Item /> must have a value prop that is not an empty string. This is because the Select value can be set to an empty string to clear the selection and show the placeholder.

Call Stack
eval
../src/select.tsx (1278:13)
```

## Context
React error when trying to create a new category in the settings.

## Type
FIX

## Timestamp
20251002-222715

## Scope
- Estimated files: 1-2
- Estimated time: 15-30 minutes
- Complexity: SIMPLE

## Agent Assignment
Single healer agent

## Available MCP Tools
- Chrome DevTools MCP: Debug in browser
- Playwright MCP: Test the fix
- Supabase MCP: Database debugging
