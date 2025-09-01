"use client";
export default function SchemaTable({ schema }: { schema: any }) {
  const cols: Array<{name:string,type?:string,missing?:number,unique?:number}> = Array.isArray(schema?.columns) ? schema.columns : [];
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm">
        <thead>
          <tr className="text-left token-muted">
            <th className="py-2">Column</th>
            <th className="py-2">Type</th>
            <th className="py-2">% missing</th>
            <th className="py-2">Unique</th>
          </tr>
        </thead>
        <tbody>
          {cols.map((c)=> (
            <tr key={c.name} className="border-t" style={{borderColor:'var(--ges-border)'}}>
              <td className="py-2">{c.name}</td>
              <td className="py-2">{c.type || '-'}</td>
              <td className="py-2">{c.missing ?? '-'}</td>
              <td className="py-2">{c.unique ?? '-'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

