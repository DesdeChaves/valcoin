import { User } from '../App'
import { Link } from 'react-router-dom'
import { User, BookOpen, FileText } from 'lucide-react'

interface Props {
  user: User | null
}

export default function Dashboard({ user }: Props) {
  return (
    <div className="p-6">
      <header className="flex justify-between items-center mb-6">
        <h1 className="text-3xl font-bold">Dashboard</h1>
        <div className="flex items-center space-x-4">
          <User className="w-6 h-6" />
          <span>{user?.email}</span>
        </div>
      </header>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <Link to="/create-form" className="bg-white p-6 rounded-lg shadow hover:shadow-md">
          <FileText className="w-8 h-8 text-primary mb-2" />
          <h2 className="text-xl font-semibold">Criar Questionário</h2>
        </Link>
        <div className="bg-white p-6 rounded-lg shadow">
          <BookOpen className="w-8 h-8 text-secondary mb-2" />
          <h2 className="text-xl font-semibold">Meus Formulários</h2>
          <p className="text-gray-600">5 pendentes</p>
        </div>
        {user?.tipo_utilizador === 'PROFESSOR' && (
          <div className="bg-white p-6 rounded-lg shadow">
            <h2 className="text-xl font-semibold">Respostas</h2>
            <p className="text-gray-600">Ver análises</p>
          </div>
        )}
      </div>
    </div>
  )
}
