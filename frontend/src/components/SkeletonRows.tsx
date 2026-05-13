interface Props {
  count: number;
  columns: number;
}

export function SkeletonRows({ count, columns }: Props) {
  return (
    <>
      {Array.from({ length: count }).map((_, rowIdx) => (
        <tr key={rowIdx} data-testid="skeleton-row" className="border-b border-line">
          {Array.from({ length: columns }).map((_, colIdx) => (
            <td key={colIdx} className="px-3 py-2.5">
              <div
                data-motion-id="skeleton-bar"
                className="h-3 w-3/4 rounded-sm bg-[linear-gradient(90deg,var(--color-line)_0%,var(--color-line-strong)_50%,var(--color-line)_100%)] bg-[length:200%_100%] animate-[shimmer-sweep_1.6s_linear_infinite]"
              />
            </td>
          ))}
        </tr>
      ))}
    </>
  );
}
