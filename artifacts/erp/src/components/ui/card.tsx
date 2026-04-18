export function Card({ children, className = "" }: any) {
  return (
    <div className={`bg-white rounded-lg shadow border border-gray-200 ${className}`}>
      {children}
    </div>
  );
}

export function CardHeader({ children }: any) {
  return <div className="px-6 py-4 border-b border-gray-200">{children}</div>;
}

export function CardTitle({ children }: any) {
  return <h2 className="text-lg font-semibold">{children}</h2>;
}

export function CardContent({ children, className = "" }: any) {
  return <div className={`px-6 py-4 ${className}`}>{children}</div>;
}
