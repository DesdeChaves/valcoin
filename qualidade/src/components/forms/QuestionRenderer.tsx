import { Question } from '../types/form.types'
import { useFormContext } from 'react-hook-form'

interface Props {
  question: Question
}

export default function QuestionRenderer({ question }: Props) {
  const { register } = useFormContext()

  return (
    <div className="mb-6 p-4 border rounded">
      <label className="block text-lg font-medium mb-2">{question.enunciado}</label>
      {question.tipo_pergunta === 'texto_curto' && (
        <input {...register(`answers.${question.id}`)} className="w-full p-3 border rounded" />
      )}
      {question.tipo_pergunta === 'escolha_multipla' && (
        <select {...register(`answers.${question.id}`)} className="w-full p-3 border rounded">
          {question.opcoes?.map(opt => <option key={opt.id} value={opt.id}>{opt.texto}</option>)}
        </select>
      )}
      {/* Adiciona mais tipos aqui */}
    </div>
  )
}
