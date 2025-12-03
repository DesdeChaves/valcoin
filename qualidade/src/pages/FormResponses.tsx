import { BarChart, Bar, XAxis, YAxis, Tooltip } from 'recharts'

const sampleData = [{ name: 'Opção 1', value: 10 }, { name: 'Opção 2', value: 20 }]

export default function FormResponses() {
  return (
    <div className="p-6">
      <h1 className="text-2xl font-bold mb-6">Análise de Respostas</h1>
      <BarChart width={600} height={300} data={sampleData}>
        <XAxis dataKey="name" />
        <YAxis />
        <Tooltip />
        <Bar dataKey="value" fill="#3B82F6" />
      </BarChart>
    </div>
  )
}
