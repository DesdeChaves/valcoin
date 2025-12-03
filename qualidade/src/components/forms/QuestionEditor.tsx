import { Question } from '../types/form.types'

interface Props {
  question: Question
  onUpdate: (updated: Question) => void
}

export default function QuestionEditor({ question, onUpdate }: Props) {
  return (
    <div className="bg-white p-4 rounded-lg shadow border">
      <input
        value={question.enunciado}
        onChange={(e) => onUpdate({ ...question, enunciado: e.target.value })}
        placeholder="Enunciado da pergunta"
        className="w-full p-3 border rounded mb-4 text-lg"
      />
      {question.tipo_pergunta === 'escolha_multipla' && (
        <div className="space-y-2">
          <label>Opções:</label>
          {/* Adiciona inputs para opções aqui */}
          <input placeholder="Opção 1" className="w-full p-2 border rounded" />
        </div>
      )}
      {question.tipo_pergunta === 'escala_linear' && (
        <div className="flex space-x-4">
          <input type="number" placeholder="Mín (ex: 1)" className="w-20 p-2 border rounded" />
          <input type="number" placeholder="Máx (ex: 5)" className="w-20 p-2 border rounded" />
        </div>
      )}
    </div>
  )
}
