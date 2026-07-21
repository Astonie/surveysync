import { OfflineProvider } from "@/providers/OfflineProvider";

export default function PublicLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <OfflineProvider>{children}</OfflineProvider>;
}
