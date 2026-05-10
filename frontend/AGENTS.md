---

## Core Architectural Rules

### API Client
Always use the shared Axios instance from `lib/api/client.ts`. Never create 
inline `fetch()` calls in components. The client must have `withCredentials: true`
set globally so HttpOnly cookies are sent on every request.

### Server vs Client Components
- Default to **Server Components** — no `"use client"` unless the component 
  needs interactivity, hooks, or browser APIs
- Data that needs to be interactive or update in real-time → TanStack Query 
  in a Client Component
- Combine them: Server Component fetches initial data → passes to Client 
  Component → TanStack Query hydrates from it

### Authentication
- Auth state lives in Zustand (`store/auth-store.ts`)
- Route protection lives in `src/middleware.ts` — check for JWT cookie, 
  redirect to `/login` if missing
- On 401 responses, the Axios interceptor redirects to `/login` globally
- Never store tokens in localStorage or sessionStorage — they live in 
  HttpOnly cookies set by the backend

### Optimistic Updates
Use TanStack Query's `onMutate` for interactions that should feel instant:
like toggling, connection requests, post deletion. The user should never 
wait for a server round-trip to see their action reflected in the UI.

### TypeScript
- All API response shapes must be typed in `src/types/`
- No `any` types — ever
- Type API responses as `ApiResponse<T>` with a generic wrapper
- Mirror backend Zod schemas as TypeScript interfaces, not vice versa

### Images and Navigation
- Always use `next/image` — never raw `<img>` tags
- Always use `next/link` — never raw `<a>` tags for internal navigation

---

## Performance Standards
- Every page route must have a `loading.tsx` sibling using shadcn/ui Skeleton 
  components — no blank screens during data fetching
- Every page route should have an `error.tsx` sibling for error boundaries
- Code splitting is automatic with App Router — do not bundle features together
- Avoid `useEffect` for data fetching — that's what TanStack Query is for
- Memoize (`useMemo`, `useCallback`) only when there is a measurable performance 
  reason, not preemptively

---

## Backend Boundary — CRITICAL
You work exclusively on the frontend codebase. You **never**:
- Edit any file in the `Backend/` directory
- Run backend commands
- Modify backend schemas, routes, controllers, or services

If you discover the backend needs a change to support a frontend requirement 
(missing field in a response, needed endpoint, CORS issue), you:
1. Stop and clearly communicate exactly what needs to change
2. Explain why it's needed from the frontend's perspective
3. Suggest the minimal backend change required
4. Wait for the developer to make that change in the backend

You are a collaborator with the backend, not its owner.

---

## Your Working Style
- **Read before building.** Check `docs/api.md` before any API integration. 
  Check existing components before creating new ones.
- **Explain your decisions.** When you make an architectural choice, briefly 
  state why. This is a learning project.
- **Flag concerns proactively.** If something in the design, the API contract, 
  or the requirements looks wrong — say so immediately with a specific suggestion.
- **Prefer composition over complexity.** A simple component that does one 
  thing well beats a clever component that does everything.
- **Be flexible.** The folder structure and patterns above are strong defaults, 
  not laws. If the project evolves in a direction that demands a different 
  approach, adapt and explain the reasoning.