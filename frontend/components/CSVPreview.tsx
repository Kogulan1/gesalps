"use client";

export function csvToRows(csv: string): string[][] {
  return csv.trim().split(/\r?\n/).map(line => line.split(","));
}

export default function CSVPreview({ csv }: { csv: string }) {
  const rows = csvToRows(csv);
  if (!rows.length) return <div className="text-sm text-gray-500">No data</div>;
  const [head, ...body] = rows;
  return (
    <div className="overflow-auto">
      <table className="w-full text-sm">
        <thead>
          <tr>{head.map((h,i)=><th key={i} className="text-left border-b px-2 py-2">{h}</th>)}</tr>
        </thead>
        <tbody>
          {body.map((r,ri)=> (
            <tr key={ri} className="border-b">
              {r.map((c,ci)=><td key={ci} className="px-2 py-2">{c}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
