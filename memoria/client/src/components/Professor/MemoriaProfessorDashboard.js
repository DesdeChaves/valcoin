import React from 'react';
import { useNavigate } from 'react-router-dom';

const MemoriaProfessorDashboard = () => {
  const navigate = useNavigate();

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 py-12">
      <div className="max-w-7xl mx-auto px-6">
        {/* Cabeçalho */}
        <header className="mb-12 text-center">
          <h1 className="text-5xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mb-4">
            🧠 Bem-vindo ao Memória!
          </h1>
          <p className="text-xl text-gray-700">Cria e gere flashcards com repetição espaçada avançada</p>
        </header>

        {/* Secção de Ações Rápidas */}
        <div className="mb-16 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          <button onClick={() => navigate('/create')} className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl hover:bg-indigo-50 transition-all text-center">
            <h3 className="text-xl font-semibold text-indigo-700">Criar Flashcards</h3>
            <p className="text-gray-600 mt-2">Construir novos materiais de estudo.</p>
          </button>
          <button onClick={() => navigate('/manage')} className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl hover:bg-purple-50 transition-all text-center">
            <h3 className="text-xl font-semibold text-purple-700">Gerir Flashcards</h3>
            <p className="text-gray-600 mt-2">Editar e organizar os teus materiais.</p>
          </button>
          <button onClick={() => navigate('/reviews')} className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl hover:bg-green-50 transition-all text-center">
            <h3 className="text-xl font-semibold text-green-700">Pedidos de Revisão</h3>
            <p className="text-gray-600 mt-2">Ver o feedback dos teus alunos.</p>
          </button>
          <button onClick={() => navigate('/analytics')} className="bg-white p-6 rounded-lg shadow-md hover:shadow-xl hover:bg-yellow-50 transition-all text-center">
            <h3 className="text-xl font-semibold text-yellow-700">Analisar Desempenho</h3>
            <p className="text-gray-600 mt-2">Verificar a eficácia dos teus flashcards.</p>
          </button>
        </div>

        {/* Secção: Guias de Boas Práticas em Recuperação */}
        <div className="mt-20">
          <h2 className="text-4xl font-bold text-center text-gray-800 mb-12">
            Boas Práticas na Prática de Recuperação
          </h2>

          {/* Primeiro Infográfico: O Que Deve Ser Recuperado? */}
          <section className="mb-20">
            <h3 className="text-3xl font-bold text-center text-indigo-700 mb-10">
              O QUE DEVE SER RECUPERADO?
            </h3>

            <div className="grid md:grid-cols-3 gap-8 items-start">
              {/* Recuperar */}
              <div>
                <h4 className="text-2xl font-semibold text-center mb-6 text-white bg-indigo-600 rounded-t-lg py-3">
                  Recupere conhecimento que:
                </h4>
                <ul className="space-y-4">
                  {[
                    '1. Constrói compreensão futura (pré-requisitos, conceitos-alvo)',
                    '2. Os alunos esquecem (frágil, abstrato, contraintuitivo)',
                    '3. Aborda perceções erradas (peso vs. massa, energia, tipos de cláusulas)',
                    '4. Desbloqueia compreensão (modelos sistémicos, princípios)',
                    '5. Mais alto nível > itens (conceitos-chave: Tier 2 + termos disciplinares)',
                  ].map((item, i) => (
                    <li
                      key={i}
                      className="bg-blue-600 text-white p-5 rounded-lg flex items-center justify-between shadow-md"
                    >
                      <span className="text-lg">{item}</span>
                      <span className="bg-green-500 text-4xl w-14 h-14 rounded-full flex items-center justify-center font-bold">
                        ✓
                      </span>
                    </li>
                  ))}
                </ul>
              </div>

              {/* Princípios Gerais (central) */}
              <div className="bg-green-600 text-white p-8 rounded-2xl shadow-xl text-center">
                <h4 className="text-2xl font-bold mb-6">Princípios Gerais</h4>
                <p className="text-lg mb-4">Se o esquecimento cria problemas futuros</p>
                <p className="text-2xl font-bold mb-8">recupere-o.</p>
                <p className="text-lg mb-4">Se o esquecimento não altera nada</p>
                <p className="text-2xl font-bold">Deixe-o.</p>
              </div>

              {/* Não recuperar */}
              <div>
                <h4 className="text-2xl font-semibold text-center mb-6 text-white bg-teal-600 rounded-t-lg py-3">
                  Não recupere:
                </h4>
                <ul className="space-y-4">
                  {[
                    '1. Material que ainda não foi compreendido',
                    '2. Qualquer coisa que o aluno esteja a encontrar pela primeira vez',
                    '3. Características superficiais que não transferem',
                    '4. Conteúdo episódico sem valor proposicional',
                  ].map((item, i) => (
                    <li
                      key={i}
                      className="bg-teal-600 text-white p-5 rounded-lg flex items-center justify-between shadow-md"
                    >
                      <span className="text-lg">{item}</span>
                      <span className="bg-red-500 text-4xl w-14 h-14 rounded-full flex items-center justify-center font-bold">
                        ✗
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </section>

          {/* Segundo Infográfico: Cinco Mutações Letais */}
          <section>
            <h3 className="text-3xl font-bold text-center text-indigo-700 mb-10">
              CINCO MUTAÇÕES LETAIS DA PRÁTICA DE RECUPERAÇÃO
            </h3>

            <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-8">
              {[
                {
                  title: '1. Não Pode Recuperar da Memória o que Nunca Entrou na Memória',
                  text: 'A prática de recuperação fortalece traços de memória que já existem. Antes de pedir aos alunos que recuperem, assegure-se de que houve algo digno de recuperação.',
                },
                {
                  title: '2. Prática de Recuperação Sem Currículo é Apenas uma Atividade',
                  text: 'A recuperação fortalece o que quer que seja recuperado. O currículo deve decidir o que é importante antes da recuperação amplificá-lo.',
                },
                {
                  title: '3. Nem Todos os Tipos de Conhecimento Funcionam com Recuperação',
                  text: 'Factos podem ser recuperados. Argumentos devem ser construídos. Funciona para conhecimento declarativo discreto, não para material integrativo.',
                },
                {
                  title: '4. A Recuperação Só Funciona Quando Espaçada',
                  text: 'O efeito de teste requer repetida recuperação em intervalos expansivos, após suficiente esquecimento para tornar o esforço significativo.',
                },
                {
                  title: '5. O Esforço Só Ajuda Quando Há Capacidade Sobrando para o Direcionar',
                  text: 'Quando o material é muito complexo e esgota a memória de trabalho, a prática de recuperação pode sobrecarregar em vez de fortalecer.',
                },
              ].map((item, i) => (
                <div
                  key={i}
                  className="bg-white rounded-2xl shadow-xl p-8 border border-gray-200 hover:shadow-2xl transition-shadow"
                >
                  <div className="bg-green-500 w-20 h-20 rounded-2xl mx-auto mb-6 flex items-center justify-center text-4xl">
                    {i === 0 ? '🧠' : i === 1 ? '📋' : i === 2 ? '📊' : i === 3 ? '⏱️' : '💪'}
                  </div>
                  <h4 className="text-xl font-bold text-gray-800 mb-4 text-center">
                    {item.title}
                  </h4>
                  <p className="text-gray-700 text-center">{item.text}</p>
                </div>
              ))}
            </div>
          </section>

          {/* Rodapé da secção */}
          <p className="text-center text-gray-600 mt-16 italic">
            Baseado em princípios da ciência da aprendizagem cognitiva (Carl Hendrick, Pooja Agarwal, entre outros)
          </p>
        </div>
      </div>
    </div>
  );
};

export default MemoriaProfessorDashboard;
