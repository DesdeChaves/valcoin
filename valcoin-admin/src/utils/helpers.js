export const getUserTypeColor = (type) => {
  switch (type) {
    case 'ALUNO':
      return 'text-blue-600 bg-blue-100';
    case 'PROFESSOR':
      return 'text-green-600 bg-green-100';
    case 'DIRETOR_TURMA':
      return 'text-purple-600 bg-purple-100';
    case 'DIRECAO':
      return 'text-orange-600 bg-orange-100';
    case 'ADMIN':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};

export const getStatusColor = (status) => {
  switch (status) {
    case 'CREDIT':
      return 'text-green-600 bg-green-100';
    case 'DEBIT':
      return 'text-red-600 bg-red-100';
    default:
      return 'text-gray-600 bg-gray-100';
  }
};
