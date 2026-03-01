# Agent Development Rules

Latest: Mar 1, 2026

## General

- Use `npm` as the package manager.

## TypeScript Type Safety

- NEVER use `as any` in TypeScript code
- Always fix type issues properly by:
  1. Using correct type imports
  2. Creating proper type assertions with specific types like `as NylasThread`
  3. Fixing underlying type mismatches instead of bypassing them
  4. Using proper type guards and null checks
- Use `npm run ts-check` on each of the projects instead of building to check for TypeScript errors (faster and more focused)
- Run `npm run lint` to check for linting before each commit

## Component Organization

- Components should be co-located with the features that use them
- Only put components in the root `ui/` folder if they are truly shared across multiple features/pages
- Do NOT create `components/` folders within feature directories

## Backend

- Don't worry about migrating the database, the user will always do it.
- NEVER use `await import()` - if you need to use it, you're doing something wrong
- Server actions should be imported normally, not dynamically
- Only code in app/ should call code inside of app/. You're making this mistake a lot with actions.ts files getting used by lib/ files.
- Whenever possible, use db.`query.TableName.findFirst` or `.findMany` instead
  of defaulting to `db.select().from()` etc.
- Prefer readable code over docstrings.
- I'm not a fan of formal docstrings for 90% of the functions.

## Frontend

- Always use braces. Don't do "if (x) return y;"
- In the frontend, calls to the API should be put into separate functions. Perhaps in the same file as the component that uses it. Perhaps not.
- Don't just put SVGs straight into a bigger component. Break it out into a separate component.
- No default exports except for the page.tsx files.
- Pages default exports should just be called `function Page() {`.
- Use theme-aware colors for text and backgrounds as defined in global.css
- There is no such thing as `bg-one` or `bg-two` etc. Only use colors that exist in `@/ui/globals.css`
- Prefer using flex gaps over margins between elements
- Prefer `Props` instead of `WhateverComponentNameProps` for the main export of a file.
- All icons should be routed through `ui/icons.tsx`, instead of directly
  importing from `react-icons` or `lucide-react` or whatever.
- Use `twMerge` to apply conditional classes.
- Don't use width or height variables like w-lg, w-xl etc. Use the full width value instead.

## Error Handling

- Never wrap entire functions in try-catch blocks, use try-catch around
  **specific operations** that you expect might fail and where you can
  meaningfully recover (when you catch an error, you should know exactly which
  statement threw it).
- Most database queries in well-formed applications don't need individual
  try-catch handling

## File Organization

- Put the exported functions at the top of the file, after imports and types and
  constants.
- Use server actions (`./actions.ts`) instead of API routes when possible
- Organize related functionality into separate files (e.g., thread-actions.ts
  for thread operations)
- Keep services and utilities close to where they're used
- Only extract to shared locations when truly needed across multiple features
- Stop adding scripts to `package.json`
