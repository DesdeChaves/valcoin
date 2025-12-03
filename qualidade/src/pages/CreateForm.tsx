import { useState } from 'react'
import { useForm } from 'react-hook-form'
import toast from 'react-hot-toast'
import { Plus, Save } from 'lucide-react'
import QuestionEditor from '../components/forms/QuestionEditor'

const defaultQuestions = [{ id: '1', tipo_pergunta: 'texto_curto' as const, enunciado: 'Exemplo de pergunta' }]

export default function CreateForm() {
  const { register, handleSubmit } = useForm()
  const [questions, setQuestions] = useState(defaultQuestions)

  const onSubmit = (data: any) => {
    // Envia para API: api.post('/forms', { titulo: data.titulo, questions })
    toast.success('Formulário criado!')
  }

  return (
    <div className="p-6 max-w-4xl mx-auto">
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
        <div>
          <label className="block text-sm font-medium mb-2">Título</label>
          <input {...register('titulo')} className="w-full p-3 border rounded" required />
        </div>
        <div className="space-y-4">
          {questions.map((q) => (
            <QuestionEditor key={q.id} question={q} onUpdate={(updated) => {
              setQuestions(questions.map(qq => qq.id === q.id ? updated : qq))
            }} />
          ))}
        </div>
        <button type="button" onClick={() => setQuestions([...questions, { id: Date.now().toString(), tipo_pergunta: 'texto_curto', enunciado: '' }])}
          className="flex items-center space-x-2 text-primary hover:underline">
          <Plus size={20} /> <span>Adicionar Pergunta</span>
        </button>
        <button type="submit" className="flex items-center space-x-2 bg-primary text-white px-6 py-3 rounded hover:bg-blue-600">
          <Save size={20} /> <span>Salvar Formulário</span>
        </button>
      </form>
    </div>
  )
}
