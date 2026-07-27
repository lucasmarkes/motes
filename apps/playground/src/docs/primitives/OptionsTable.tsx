import { DEFAULT_OPTIONS } from '@lucasmarkes/motes'

export interface OptionRow {
  name: keyof typeof DEFAULT_OPTIONS
  description: string
}

export function OptionsTable({ rows }: { rows: OptionRow[] }) {
  return (
    <div className="doc-table-wrap">
      <table className="doc-table">
        <thead>
          <tr>
            <th scope="col">Option</th>
            <th scope="col">Default</th>
            <th scope="col">What it does</th>
          </tr>
        </thead>
        <tbody>
          {rows.map((row) => (
            <tr key={row.name}>
              <td>
                <code>{row.name}</code>
              </td>
              <td>
                <code>{formatDefault(DEFAULT_OPTIONS[row.name])}</code>
              </td>
              <td>{row.description}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function formatDefault(value: string | number | boolean): string {
  if (typeof value === 'string') return `'${value}'`
  return String(value)
}
