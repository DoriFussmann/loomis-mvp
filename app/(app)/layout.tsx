import { SiteHeader } from "@/components/site-header";

export default function AppLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto flex min-h-screen max-w-[1280px] flex-col bg-white">
      <SiteHeader />
      <main className="flex min-h-0 flex-1 flex-col px-8 py-6">{children}</main>
    </div>
  );
}
