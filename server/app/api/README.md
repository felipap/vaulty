# API Conventions for Sync Endpoints

This document describes the conventions used across all sync API endpoints.

## Authentication

### Read Endpoints (GET)

Use `requireReadAuth(request, scope)` from `@/lib/api-auth`. Returns:

- `{ authorized: true, token: TokenIdentity }` on success
- `{ authorized: false, response: Response }` on failure

```typescript
const auth = await requireReadAuth(request, "apple-notes")
if (!auth.authorized) {
  return auth.response
}
```

Scopes are defined per-sync type (e.g., `"apple-notes"`, `"imessages"`, `"whatsapp"`, `"contacts"`).

### Write Endpoints (POST)

Use `requireWriteAuth(request)` which validates against `API_WRITE_SECRET`:

```typescript
const unauthorized = await requireWriteAuth(request)
if (unauthorized) {
  return unauthorized
}
```

## Response Types

All sync endpoints use standardized response types from `@/app/api/types.ts`:

```typescript
type SyncSuccessResponse = {
  success: true
  insertedCount: number
  updatedCount: number
  rejectedCount: number
  skippedCount: number
}

type SyncErrorResponse = {
  error: string
}
```

## GET Endpoint Conventions

### Response Shape

```typescript
return Response.json({
  success: true,
  <entityPlural>,      // e.g., notes, messages, contacts
  count: items.length,
  page: {              // only for paginated endpoints
    limit,
    offset,
  },
})
```

### Data Window Filtering

Apply time-based filtering based on token permissions:

```typescript
const cutoff = getDataWindowCutoff(auth.token)
if (cutoff) {
  conditions.push(gte(Table.dateColumn, cutoff))
}
```

### Pagination (for large datasets)

Use `paginationSchema` from `@/lib/validate-params`:

```typescript
const searchParamsSchema = z
  .object({
    ...paginationSchema,
    after: z.coerce.date().optional(),
    // other filters...
  })
  .strict()
```

### Activity Logging

Always log reads:

```typescript
await logRead({
  type: "apple-note", // sync type
  description: "Fetched Apple Notes",
  count: items.length,
  token: auth.token,
})
```

## POST Endpoint Conventions

### Request Body Schema

```typescript
const PostSchema = z.object({
  <entities>: z.array(z.unknown()),  // validated individually
  syncTime: z.string(),
  deviceId: z.string(),
  messageCount: z.number().optional(),  // for messages
})
```

### Individual Item Schemas

- Use `encryptedRequired` / `encryptedOrEmpty` from `@/lib/encryption-schema` for encrypted fields
- Define per-item schemas (e.g., `NoteSchema`, `MessageSchema`, `ContactSchema`)

### Validation Pattern

Validate items individually to accept partial batches:

```typescript
function validateItems(items: unknown[]) {
  const validItems: ValidatedItem[] = []
  const rejectedItems: Array<{ index: number; item: unknown; error: string }> =
    []

  for (let i = 0; i < items.length; i++) {
    const result = ItemSchema.safeParse(items[i])
    if (!result.success) {
      rejectedItems.push({
        index: i,
        item: items[i],
        error: formatZodError(result.error),
      })
      continue
    }
    validItems.push(result.data)
  }

  return { validItems, rejectedItems }
}
```

### Batch Insertion

Insert in batches of 50:

```typescript
const BATCH_SIZE = 50
for (let i = 0; i < values.length; i += BATCH_SIZE) {
  const batch = values.slice(i, i + BATCH_SIZE)
  await db.insert(Table).values(batch).onConflictDoUpdate({...}).returning()
}
```

### Conflict Handling

- `onConflictDoUpdate`: Use when records should be updated (contacts, notes)
- `onConflictDoNothing`: Use when duplicates should be skipped (messages)

### Distinguishing Inserts vs Updates

Track by comparing `createdAt` with batch timestamp:

```typescript
const batchCreatedAt = new Date()
// ... insert with createdAt: batchCreatedAt

for (const row of result) {
  if (row.createdAt.getTime() === batchCreatedAt.getTime()) {
    insertedCount++
  } else {
    updatedCount++
  }
}
```

### Activity Logging

Log writes with encryption metadata:

```typescript
await logWrite({
  type: "apple-note",
  description: `Synced encrypted Apple Notes from ${deviceId}`,
  count: insertedCount,
  metadata: {
    rejectedCount: rejectedItems.length,
    encrypted: true,
    encryptedColumns: ENCRYPTED_COLUMNS,
  },
})
```

## File Organization

### Single-file routes

For simple endpoints:

```
/api/apple-notes/route.ts       # GET + POST
/api/apple-notes/[noteId]/route.ts  # GET by ID
```

### Split routes (route groups)

For complex endpoints, split GET and POST:

```
/api/imessage/(index)/route.ts  # exports from get.ts and post.ts
/api/imessage/(index)/get.ts
/api/imessage/(index)/post.ts
```

The `route.ts` just re-exports:

```typescript
export { GET } from "./get"
export { POST } from "./post"
```

## Dynamic Route Parameters

Use Next.js 15 async params pattern:

```typescript
export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ noteId: string }> }
) {
  const { noteId } = await params
  // ...
}
```

## Error Responses

### Validation errors (400)

```typescript
return NextResponse.json<SyncErrorResponse>(
  { error: formatZodError(result.error) },
  { status: 400 }
)
```

### Not found (404)

Following Stripe-style conventions, error responses rely on HTTP status codes and don't include a `success` field:

```typescript
return Response.json(
  { error: "Note not found" },
  { status: 404 }
)
```

### Auth errors

Handled by `requireReadAuth` / `requireWriteAuth` (returns 401/403).

## Console Logging

Log at entry and completion:

```typescript
console.log("GET /api/apple-notes")
// ... processing ...
console.info(`Retrieved ${notes.length} Apple Notes`)
```

For rejected items:

```typescript
console.warn(`Rejected Apple Note at index ${i}:`, JSON.stringify({ error }))
```
