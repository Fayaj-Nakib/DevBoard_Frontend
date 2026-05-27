/**
 * Auth route group layout.
 * Auth pages (login, register, forgot/reset password) do NOT use AppShell.
 * This layout is intentionally bare — each page applies its own full-screen wrapper.
 */
export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return <>{children}</>;
}
