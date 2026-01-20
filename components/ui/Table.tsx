
import React from 'react';

interface TableProps extends React.HTMLAttributes<HTMLTableElement> {}
interface TableHeaderProps extends React.HTMLAttributes<HTMLTableSectionElement> {}
interface TableBodyProps extends React.HTMLAttributes<HTMLTableSectionElement> {}
interface TableFooterProps extends React.HTMLAttributes<HTMLTableSectionElement> {}
interface TableRowProps extends React.HTMLAttributes<HTMLTableRowElement> {}
interface TableHeadProps extends React.ThHTMLAttributes<HTMLTableCellElement> {}
interface TableCellProps extends React.TdHTMLAttributes<HTMLTableCellElement> {}
interface TableCaptionProps extends React.HTMLAttributes<HTMLTableCaptionElement> {}

const Table: React.FC<TableProps> = ({ className, ...props }) => (
  <div className="relative w-full overflow-auto">
    <table className={`w-full caption-bottom text-sm ${className || ''}`} {...props} />
  </div>
);

const TableHeader: React.FC<TableHeaderProps> = ({ className, ...props }) => (
  <thead className={`[&_tr]:border-b ${className || ''}`} {...props} />
);

const TableBody: React.FC<TableBodyProps> = ({ className, ...props }) => (
  <tbody className={`[&_tr:last-child]:border-0 ${className || ''}`} {...props} />
);

const TableFooter: React.FC<TableFooterProps> = ({ className, ...props }) => (
  <tfoot className={`border-t bg-gray-100 font-medium [&_tr]:last:text-base ${className || ''}`} {...props} />
);

const TableRow: React.FC<TableRowProps> = ({ className, ...props }) => (
  <tr
    className={`border-b transition-colors hover:bg-gray-50 data-[state=selected]:bg-gray-50 ${className || ''}`}
    {...props}
  />
);

const TableHead: React.FC<TableHeadProps> = ({ className, ...props }) => (
  <th
    className={`h-10 px-2 text-left align-middle font-medium text-gray-500 [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] ${className || ''}`}
    {...props}
  />
);

const TableCell: React.FC<TableCellProps> = ({ className, ...props }) => (
  <td
    className={`p-2 align-middle [&:has([role=checkbox])]:pr-0 [&>[role=checkbox]]:translate-y-[2px] ${className || ''}`}
    {...props}
  />
);

const TableCaption: React.FC<TableCaptionProps> = ({ className, ...props }) => (
  <caption className={`mt-4 text-sm text-gray-500 ${className || ''}`} {...props} />
);

export { Table, TableHeader, TableBody, TableFooter, TableHead, TableRow, TableCell, TableCaption };
