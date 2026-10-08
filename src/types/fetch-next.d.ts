// Legacy fetch calls (carried over from the Next.js era) pass a `next`
// cache-control option. It is a no-op outside of Next.js, but declaring it
// keeps the existing call sites type-checking.
interface RequestInit {
  next?: { revalidate?: number | false; tags?: string[] } | undefined;
}
