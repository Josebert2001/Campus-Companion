// Provide lightweight declarations so the project's TypeScript language server
// doesn't flag Deno runtime globals and 'npm:' style imports inside Supabase
// functions. These files are for editor/IDE ergonomics only and do not affect
// runtime behavior in the Deno environment.

declare const Deno: any;

// Allow imports using the `npm:` specifier used in Deno deployments (editor-only)
declare module 'npm:*' {
  const value: any;
  export default value;
}

// Specific fallback for supabase client import style
declare module 'npm:@supabase/supabase-js*' {
  // Lightweight editor-only declarations for the supabase client used inside
  // Deno/Supabase edge functions. These are intentionally permissive.
  export function createClient(...args: any[]): any;
  export const createBrowserSupabaseClient: any;
  export const SupabaseClient: any;
  export default {} as any;
}
