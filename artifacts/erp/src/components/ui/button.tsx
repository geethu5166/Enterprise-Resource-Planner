export function Button({ children, onClick, type = "button", className = "" }: any) {
  return (
    <button
      type={type}
      onClick={onClick}
      className={`px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition flex items-center ${className}`}
    >
      {children}
    </button>
  );
}
