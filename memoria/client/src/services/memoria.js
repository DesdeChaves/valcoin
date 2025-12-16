import api from '../api';

const memoriaService = {
  getFilaDiaria: async () => {
    return api.get('/fila-diaria');
  },
  registarRevisao: async (flashcardId, subId, rating) => {
    return api.post('/revisao', {
      flashcard_id: flashcardId,
      sub_id: subId,
      rating: rating
    });
  },
  // If there are other API calls related to memoria, they should be added here
};

export default memoriaService;
