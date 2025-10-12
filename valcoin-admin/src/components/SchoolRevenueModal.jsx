import React, { useState, useEffect } from 'react';

const SchoolRevenueModal = ({ revenue, onClose, onSave }) => {
  const [formData, setFormData] = useState({
    origem: '',
    montante: '',
    data: '',
  });

  const revenueCategories = {
    "1. Receitas provenientes de serviços prestados a alunos": [
      "Pagamento de refeições escolares (educação pré-escolar, 1.º, 2.º e 3.º ciclos e secundário)",
      "Venda de senhas de refeição",
      "Comparticipações em visitas de estudo e viagens escolares",
      "Atividades extracurriculares e de complemento curricular (AEC, CAF, clubes, oficinas, desporto escolar)",
      "Participação em projetos e atividades organizados pela escola",
      "Comparticipação em cursos de formação certificada promovidos pela escola (ex. cursos EFA, CEF, módulos capitalizáveis, cursos profissionais)",
    ],
    "2. Receitas de bens e produtos": [
      "Venda de material escolar (cadernos, lápis, papel, dossiers, etc.)",
      "Venda de fichas e livros de apoio",
      "Venda de uniformes ou equipamentos desportivos",
      "Venda de manuais escolares usados",
      "Venda de produtos produzidos por alunos (em projetos de empreendedorismo, cursos profissionais, etc.)",
      "Venda de refeições para professores, assistentes ou visitantes",
    ],
    "3. Aluguer e cedência de espaços ou equipamentos": [
      "Aluguer de pavilhão gimnodesportivo para associações ou clubes",
      "Cedência de auditórios, salas de aula, bibliotecas, refeitórios ou laboratórios",
      "Aluguer de campo exterior, ginásios ou espaços abertos",
      "Cedência de equipamento tecnológico (por exemplo, projetores, quadros digitais, etc.) – quando previsto no regulamento interno e autorizado pela DGEstE",
    ],
    "4. Receitas financeiras e de rendimentos acessórios": [
      "Juros de depósitos bancários (contas da escola)",
      "Receitas de operações de tesouraria (ex: acertos, regularizações)",
      "Reembolsos de despesas previamente adiantadas (por exemplo, comparticipações que vêm de outro financiamento após despesa feita pela escola)",
    ],
    "5. Donativos e patrocínios": [
      "Donativos em dinheiro ou espécie de empresas, particulares ou entidades",
      "Patrocínios para projetos específicos (ex: empresas locais que apoiam clubes, festas, semanas culturais, etc.)",
      "Apoios financeiros de associações de pais ou juntas de freguesia fora dos protocolos regulares",
    ],
    "6. Receitas por utilização de serviços escolares": [
      "Pagamento de fotocópias e impressões",
      "Uso de papelarias internas",
      "Serviços de encadernação ou plastificação",
      "Serviços de reprografia para exames ou avaliações externas",
    ],
    "7. Indemnizações e reposições": [
      "Reposições por danos materiais causados em instalações, equipamentos ou material escolar",
      "Reposição de valores indevidamente recebidos ou mal aplicados",
      "Receitas resultantes de penalizações contratuais a fornecedores (ex: incumprimento de contrato)",
    ],
    "8. Receitas de projetos com componente autofinanciada": [
      "Comparticipações em projetos Erasmus+ ou outros projetos internacionais",
      "Projetos com valência de empreendedorismo, onde há venda de produtos ou serviços",
      "Projetos interinstitucionais em que a escola assume parte da comparticipação através de receitas próprias",
    ],
  };

  useEffect(() => {
    if (revenue) {
      setFormData({
        origem: revenue.origem || '',
        montante: revenue.montante?.toString() || '',
        data: revenue.data ? new Date(revenue.data).toISOString().split('T')[0] : '',
      });
    } else {
      const firstCategory = Object.keys(revenueCategories)[0];
      const firstOption = revenueCategories[firstCategory][0];
      setFormData(prev => ({...prev, origem: firstOption, data: new Date().toISOString().split('T')[0]}));
    }
  }, [revenue]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    const payload = {
      ...formData,
      id: revenue ? revenue.id : undefined,
      montante: parseFloat(formData.montante) || 0,
    };
    if (!payload.origem || payload.montante <= 0 || !payload.data) {
      alert('Por favor, preencha todos os campos com valores válidos.');
      return;
    }
    onSave(payload);
    onClose();
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl p-6 w-full max-w-lg">
        <h2 className="text-2xl font-bold mb-4">{revenue ? 'Editar Receita' : 'Adicionar Receita'}</h2>
        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label htmlFor="origem" className="block text-sm font-medium text-gray-700">Origem</label>
            <select
              id="origem"
              name="origem"
              value={formData.origem}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            >
              {Object.entries(revenueCategories).map(([category, options]) => (
                <optgroup label={category} key={category}>
                  {options.map(option => (
                    <option key={option} value={option}>{option}</option>
                  ))}
                </optgroup>
              ))}
            </select>
          </div>
          <div className="mb-4">
            <label htmlFor="montante" className="block text-sm font-medium text-gray-700">Montante</label>
            <input
              type="number"
              id="montante"
              name="montante"
              value={formData.montante}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
              min="0.01"
              step="0.01"
            />
          </div>
          <div className="mb-4">
            <label htmlFor="data" className="block text-sm font-medium text-gray-700">Data</label>
            <input
              type="date"
              id="data"
              name="data"
              value={formData.data}
              onChange={handleChange}
              className="w-full px-4 py-2 border border-gray-300 rounded-lg"
              required
            />
          </div>
          <div className="flex justify-end space-x-4">
            <button type="button" onClick={onClose} className="px-4 py-2 bg-gray-300 text-gray-800 rounded-lg">
              Cancelar
            </button>
            <button type="submit" className="px-4 py-2 bg-blue-600 text-white rounded-lg">
              {revenue ? 'Salvar' : 'Adicionar'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SchoolRevenueModal;