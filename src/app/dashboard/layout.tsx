import  {ToastProvider}  from "@/components/ui/ToastProvider";

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ToastProvider>{children}</ToastProvider>;
}