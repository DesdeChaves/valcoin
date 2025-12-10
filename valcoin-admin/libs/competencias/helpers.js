const Joi = require('joi');

const competenciaSchema = Joi.object({
    disciplina_id: Joi.string().uuid().required(),
    codigo: Joi.string().max(50).required(),
    nome: Joi.string().max(255).required(),
    descricao: Joi.string().allow(null, ''),
    medida_educativa: Joi.string().valid('universal', 'seletiva', 'adicional', 'nenhuma').default('nenhuma'),
    descricao_adaptacao: Joi.string().allow(null, ''),
    criado_por_id: Joi.string().uuid().required(),
    validado: Joi.boolean().default(false),
    validado_por_id: Joi.string().uuid().allow(null),
    dominio_ids: Joi.array().items(Joi.string().uuid()).allow(null),
    ordem: Joi.number().integer().default(0),
    ativo: Joi.boolean().default(true)
});

const validateCompetencia = (data) => {
    return competenciaSchema.validate(data);
};

module.exports = {
    validateCompetencia
};
