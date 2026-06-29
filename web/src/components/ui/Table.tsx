import { ReactNode } from "react";

interface TableProps {
  headers: string[];
  children: ReactNode;
  className?: string;
}

export function Table({ headers, children, className = "" }: TableProps) {
  return (
    <div className={`bg-surface border border-border rounded-2xl overflow-hidden shadow-sm ${className}`}>
      <div className="overflow-x-auto">
        <table className="w-full text-start">
          <thead>
            <tr className="border-b border-border bg-background/50">
              {headers.map((header, i) => (
                <th
                  key={i}
                  className="px-4 py-3 text-text-secondary text-sm font-medium"
                >
                  {header}
                </th>
              ))}
            </tr>
          </thead>
          <tbody className="divide-y divide-border">{children}</tbody>
        </table>
      </div>
    </div>
  );
}

interface TableRowProps {
  children: ReactNode;
  className?: string;
}

export function TableRow({ children, className = "" }: TableRowProps) {
  return (
    <tr className={`hover:bg-surface-hover/50 transition-colors duration-200 ${className}`}>
      {children}
    </tr>
  );
}

interface TableCellProps {
  children: ReactNode;
  className?: string;
  colSpan?: number;
}

export function TableCell({ children, className = "", colSpan }: TableCellProps) {
  return <td colSpan={colSpan} className={`px-4 py-3 text-text-primary ${className}`}>{children}</td>;
}