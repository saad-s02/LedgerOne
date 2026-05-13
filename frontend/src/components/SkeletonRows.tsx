interface Props {
  count: number;
  columns: number;
}

export function SkeletonRows({ count, columns }: Props) {
  return (
    <>
      {Array.from({ length: count }).map((_, rowIdx) => (
        <tr key={rowIdx} data-testid="skeleton-row" className="border-b border-gray-100">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <td key={colIdx} className="px-3 py-2">
              <div className="h-3 w-3/4 animate-pulse rounded bg-gray-200" />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
