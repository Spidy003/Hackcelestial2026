import * as React from 'react'

export function Table({ className = '', children, ...props }: React.TableHTMLAttributes<HTMLTableElement>) {
  return (
    <div className="w-full overflow-x-auto border-2 border-black shadow-[4px_4px_0px_#000]">
      <table className={`w-full text-left border-collapse bg-[#0c1318] ${className}`} {...props}>
        {children}
      </table>
    </div>
  )
}

export function TableHeader({ className = '', children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <thead className={`bg-black text-white border-b-2 border-black ${className}`} {...props}>
      {children}
    </thead>
  )
}

export function TableBody({ className = '', children, ...props }: React.HTMLAttributes<HTMLTableSectionElement>) {
  return (
    <tbody className={`divide-y-2 divide-black ${className}`} {...props}>
      {children}
    </tbody>
  )
}

export function TableRow({ className = '', children, ...props }: React.HTMLAttributes<HTMLTableRowElement>) {
  return (
    <tr className={`hover:bg-[#152028] transition-colors ${className}`} {...props}>
      {children}
    </tr>
  )
}

export function TableHead({ className = '', children, ...props }: React.ThHTMLAttributes<HTMLTableCellElement>) {
  return (
    <th className={`font-pixel text-[9px] text-[#00f0ff] uppercase tracking-wider p-3 border-r-2 border-black last:border-r-0 ${className}`} {...props}>
      {children}
    </th>
  )
}

export function TableCell({ className = '', children, ...props }: React.TdHTMLAttributes<HTMLTableCellElement>) {
  return (
    <td className={`font-mono-data text-xs text-slate-200 p-3 border-r-2 border-black last:border-r-0 ${className}`} {...props}>
      {children}
    </td>
  )
}
