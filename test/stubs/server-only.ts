// Stub for Next.js's "server-only" package under Vitest. The real package
// throws unconditionally when resolved outside Next.js's "react-server"
// bundler condition, which is exactly what plain Node does when a test file
// imports something like lib/services/loanAgreement.ts — so tests alias the
// import to this empty no-op instead (see vitest.config.ts).
export {};
