import { useState, useEffect, useMemo } from "react";
import {
  useReactTable,
  getCoreRowModel,
  getSortedRowModel,
  getFilteredRowModel,
  flexRender,
  ColumnDef,
  SortingState,
} from "@tanstack/react-table";
import { stripColorCodes } from "@/helpers/text-utils";

interface DataTableProps<TData> {
  data: TData[];
  columns: ColumnDef<TData>[];
  title?: string;
  defaultSort?: SortingState;
  showRowNumbers?: boolean; // New prop
}

export default function DataTable<TData>({
  data,
  columns,
  title = "Data Table",
  defaultSort = [],
  showRowNumbers = true, // Default to true
}: DataTableProps<TData>) {
  const [sorting, setSorting] = useState<SortingState>(defaultSort);
  const [globalFilter, setGlobalFilter] = useState("");

  useEffect(() => {
    setSorting(defaultSort);
  }, [defaultSort]);

  // Dynamically add the row number column if enabled
  const tableColumns = useMemo(() => {
    if (!showRowNumbers) return columns;

    const rowNumberColumn: ColumnDef<TData> = {
      id: "row_number",
      header: "", // Empty header
      size: 50, // Small width
      enableSorting: false, // Prevent sorting by row number
      cell: ({ row }) => (
        <span className="text-muted small">{row.index + 1}</span>
      ),
    };

    return [rowNumberColumn, ...columns];
  }, [columns, showRowNumbers]);

  const table = useReactTable({
    data,
    columns: tableColumns, // Use the computed columns
    state: {
      sorting,
      globalFilter,
    },
    onSortingChange: setSorting,
    onGlobalFilterChange: setGlobalFilter,
    getCoreRowModel: getCoreRowModel(),
    getSortedRowModel: getSortedRowModel(),
    getFilteredRowModel: getFilteredRowModel(),
    globalFilterFn: (row, columnId, filterValue) => {
      const value = row.getValue(columnId);
      if (value == null) return false;
      const cleanValue = stripColorCodes(String(value)).toLowerCase();
      const cleanFilter = stripColorCodes(String(filterValue)).toLowerCase();
      return cleanValue.includes(cleanFilter);
    },
  });

  // Helper to get the correct icon based on sort state
  const getSortIcon = (isSorted: string | boolean, canSort: boolean) => {
    if (!canSort) return null;

    switch (isSorted) {
      case "asc":
        return (
          // Chevron Up (Active)
          <span className="d-flex align-items-center" style={{ width: "32px" }}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="icon icon-sm text-dark"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="#ffffff"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M6 15l6 -6l6 6" />
            </svg>
          </span>
        );
      case "desc":
        return (
          // Chevron Down (Active)
          <span className="d-flex align-items-center" style={{ width: "32px" }}>
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="icon icon-sm text-dark"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              strokeWidth="2"
              stroke="#ffffff"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M6 9l6 6l6 -6" />
            </svg>
          </span>
        );
      default:
        return (
          // Neutral Arrows (Inactive/Default) - lighter color
          <span
            className="ms-1 d-flex align-items-center"
            style={{ width: "32px" }}
          >
            <svg
              xmlns="http://www.w3.org/2000/svg"
              className="icon icon-sm opacity-70"
              width="24"
              height="24"
              viewBox="0 0 24 24"
              strokeWidth="4"
              stroke="#ffffff"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path stroke="none" d="M0 0h24v24H0z" fill="none" />
              <path d="M3 9l4 -4l4 4m-8 11l4 4l4 -4" />
            </svg>
          </span>
        );
    }
  };

  return (
    <div className="card">
      <div className="card-header">
        <h3 className="card-title">{title}</h3>
        <div className="card-actions ms-auto">
          <div className="input-icon">
            <span className="input-icon-addon">
              <svg
                xmlns="http://www.w3.org/2000/svg"
                className="icon"
                width="24"
                height="24"
                viewBox="0 0 24 24"
                strokeWidth="2"
                stroke="currentColor"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path stroke="none" d="M0 0h24v24H0z" fill="none" />
                <path d="M10 10m-7 0a7 7 0 1 0 14 0a7 7 0 1 0 -14 0" />
                <path d="M21 21l-6 -6" />
              </svg>
            </span>
            <input
              type="text"
              value={globalFilter ?? ""}
              onChange={(e) => setGlobalFilter(e.target.value)}
              className="form-control"
              placeholder="Search..."
              aria-label="Search in table"
            />
          </div>
        </div>
      </div>

      <div className="table-responsive">
        <table className="table card-table table-vcenter text-nowrap datatable">
          <thead>
            {table.getHeaderGroups().map((hg) => (
              <tr key={hg.id}>
                {hg.headers.map((header) => {
                  const canSort = header.column.getCanSort();
                  const isSorted = header.column.getIsSorted();

                  return (
                    <th
                      key={header.id}
                      className={
                        canSort ? "cursor-pointer user-select-none" : ""
                      }
                      onClick={header.column.getToggleSortingHandler()}
                      style={{
                        width:
                          header.getSize() !== 150
                            ? header.getSize()
                            : undefined,
                      }}
                    >
                      <div className="d-flex align-items-center gap-1">
                        {flexRender(
                          header.column.columnDef.header,
                          header.getContext(),
                        )}
                        {getSortIcon(isSorted, canSort)}
                      </div>
                    </th>
                  );
                })}
              </tr>
            ))}
          </thead>
          <tbody>
            {table.getRowModel().rows.length > 0 ? (
              table.getRowModel().rows.map((row) => (
                <tr key={row.id}>
                  {row.getVisibleCells().map((cell) => (
                    <td key={cell.id}>
                      {flexRender(
                        cell.column.columnDef.cell,
                        cell.getContext(),
                      )}
                    </td>
                  ))}
                </tr>
              ))
            ) : (
              <tr>
                <td
                  colSpan={tableColumns.length}
                  className="text-center py-4 text-muted"
                >
                  No results found
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
