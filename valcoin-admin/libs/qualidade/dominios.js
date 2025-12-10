// valcoin-admin/libs/qualidade/dominios.js
const db = require('../db');

// Obter todos os domínios
const getAllDominios = async () => {
    const { rows } = await db.query(
        'SELECT id, nome, descricao, ativo FROM public.dominios ORDER BY nome'
    );
    return rows;
};

// Obter um domínio por ID
const getDominioById = async (id) => {
    const { rows } = await db.query('SELECT * FROM public.dominios WHERE id = $1', [id]);
    return rows[0];
};

// Criar um novo domínio
const createDominio = async (nome, descricao, criado_por_id) => {
    const { rows } = await db.query(
        'INSERT INTO public.dominios (nome, descricao, criado_por_id) VALUES ($1, $2, $3) RETURNING *',
        [nome, descricao, criado_por_id]
    );
    return rows[0];
};

// Atualizar um domínio
const updateDominio = async (id, nome, descricao, ativo) => {
    const { rows } = await db.query(
        'UPDATE public.dominios SET nome = $1, descricao = $2, ativo = $3, data_atualizacao = now() WHERE id = $4 RETURNING *',
        [nome, descricao, ativo, id]
    );
    return rows[0];
};

// Apagar um domínio
const deleteDominio = async (id) => {
    // Verifica se o domínio está a ser utilizado por alguma competência
    const { rows } = await db.query('SELECT COUNT(*) AS count FROM public.competencia WHERE dominio_id = $1', [id]);
    if (rows[0].count > 0) {
        throw new Error('Este domínio não pode ser apagado porque está associado a competências.');
    }
    
    const result = await db.query('DELETE FROM public.dominios WHERE id = $1', [id]);
    return result.rowCount > 0;
};

module.exports = {
    getAllDominios,
    getDominioById,
    createDominio,
    updateDominio,
    deleteDominio,
};
