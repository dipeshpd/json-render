export default function CanvasLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return <div className="h-dvh flex flex-col overflow-hidden">{children}</div>;
}
