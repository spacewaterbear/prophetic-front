export function TypingIndicator() {
  return (
    <div className="flex gap-1 items-center py-1">
      <div
        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
        style={{ animationDelay: "0ms", animationDuration: "1.4s" }}
      ></div>
      <div
        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
        style={{ animationDelay: "160ms", animationDuration: "1.4s" }}
      ></div>
      <div
        className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
        style={{ animationDelay: "320ms", animationDuration: "1.4s" }}
      ></div>
    </div>
  );
}
