import ChatLayout from "@/app/chat/layout";

export default function VignetteLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <ChatLayout>{children}</ChatLayout>;
}
