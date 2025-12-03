import { useParams } from 'react-router-dom'
import { useEffect, useState } from 'react'
import { Question } from '../types/form.types'
import QuestionRenderer from '../components/forms/QuestionRenderer' // similar ao Editor, mas para resposta
import api from '../lib/api'

export default function RespondForm() {
  const { id } = useParams()
  const [form, setForm] = useState<any>(null)
  const [questions, setQuestions] = useState<Question[]>([])

  useEffect(() => {
    // Busca da API
    api.get(`/forms/${id}`).then(res => {
      setForm(res.data)
      setQuestions(res.data.questions)
    })
  }, [id])

  const onSubmit = (answers: any) => {
    api.post(`/forms/${id}/respond`, answers).then(() => alert('Enviado!'))
  }

  if (!form) return <div>Carregando...</div>

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h1 className="text-2xl font-bold mb-4">{form.titulo}</h1>
      <form onSubmit={onSubmit}>
        {questions.map(q => <QuestionRenderer key={q.id} question={q} />)}
        <button type="submit" className="bg-primary text-white px-6 py-3 rounded mt-6">Enviar Respostas</button>
      </form>
    </div>
  )
}
