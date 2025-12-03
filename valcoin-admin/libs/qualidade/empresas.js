const db = require('../db');
const { withTransaction } = require('../db');
const express = require('express');

module.exports = (authenticateJWT, authenticateAdminOrProfessor) => {
    const router = express.Router();

    // ============================================================================
    // EMPRESAS - CRUD
    // ============================================================================

    /**
     * Listar todas as empresas com filtros
     */
    const getEmpresas = async (req, res) => {
        const { ativo, localidade, setor_atividade, tipo_parceria, search } = req.query;
        const userId = req.user.id;
        const isAdmin = req.user.tipo_utilizador === 'ADMIN';

        try {
            let query = `
                SELECT 
                    e.*,
                    u.nome AS criador_nome,
                    ARRAY_AGG(DISTINCT tp.nome) FILTER (WHERE tp.nome IS NOT NULL) as tipos_parceria_nomes,
                    ARRAY_AGG(DISTINCT jsonb_build_object('id', ea.id, 'morada', ea.morada, 'codigo_postal', ea.codigo_postal, 'localidade', ea.localidade)) FILTER (WHERE ea.id IS NOT NULL) as enderecos,
                    COUNT(DISTINCT ec.id) FILTER (WHERE ec.ativo = true) as num_contactos
                FROM public.empresas e
                LEFT JOIN public.users u ON u.id = e.criador_id
                LEFT JOIN public.empresas_tipos_parceria etp ON e.id = etp.empresa_id
                LEFT JOIN public.tipos_parceria tp ON etp.tipo_parceria_id = tp.id AND tp.ativo = true
                LEFT JOIN public.empresas_contactos ec ON e.id = ec.empresa_id
                LEFT JOIN public.empresas_enderecos ea ON e.id = ea.empresa_id
                WHERE 1=1
            `;

            const params = [];
            let paramIndex = 1;

            // Filtro de permissão (admin vê tudo, outros só suas empresas)
            if (!isAdmin) {
                query += ` AND e.criador_id = $${paramIndex}`;
                params.push(userId);
                paramIndex++;
            }

            // Filtros opcionais
            if (ativo !== undefined) {
                query += ` AND e.ativo = $${paramIndex}`;
                params.push(ativo === 'true');
                paramIndex++;
            }

            if (localidade) {
                query += ` AND EXISTS (SELECT 1 FROM public.empresas_enderecos ea2 WHERE ea2.empresa_id = e.id AND ea2.localidade ILIKE $${paramIndex})`;
                params.push(`%${localidade}%`);
                paramIndex++;
            }

            if (setor_atividade) {
                query += ` AND e.setor_atividade ILIKE $${paramIndex}`;
                params.push(`%${setor_atividade}%`);
                paramIndex++;
            }

            if (tipo_parceria) {
                query += ` AND EXISTS (SELECT 1 FROM public.empresas_tipos_parceria etp2 JOIN public.tipos_parceria tp2 ON etp2.tipo_parceria_id = tp2.id WHERE etp2.empresa_id = e.id AND tp2.nome ILIKE $${paramIndex})`;
                params.push(`%${tipo_parceria}%`);
                paramIndex++;
            }

            if (search) {
                query += ` AND (e.nome ILIKE $${paramIndex} OR e.nif ILIKE $${paramIndex} OR e.email_contacto ILIKE $${paramIndex} OR EXISTS (SELECT 1 FROM public.empresas_enderecos ea3 WHERE ea3.empresa_id = e.id AND (ea3.morada ILIKE $${paramIndex} OR ea3.codigo_postal ILIKE $${paramIndex} OR ea3.localidade ILIKE $${paramIndex})))`;
                params.push(`%${search}%`);
                paramIndex++;
            }

            query += ` GROUP BY e.id, u.nome, u.email ORDER BY e.nome ASC`;

            const result = await db.query(query, params);
            res.json(result.rows);

        } catch (error) {
            console.error('Erro ao listar empresas:', error);
            res.status(500).json({ error: 'Erro interno do servidor ao listar empresas.' });
        }
    };

    /**
     * Obter uma empresa por ID com todos os detalhes
     */
    const getEmpresaById = async (req, res) => {
        const { id } = req.params;
        const userId = req.user.id;
        const isAdmin = req.user.tipo_utilizador === 'ADMIN';

        try {
            // Buscar empresa
            const empresaResult = await db.query(`
                SELECT 
                    e.*,
                    u.nome AS criador_nome,
                    u.email AS criador_email
                FROM public.empresas e
                LEFT JOIN public.users u ON u.id = e.criador_id
                WHERE e.id = $1
            `, [id]);

            if (empresaResult.rows.length === 0) {
                return res.status(404).json({ error: 'Empresa não encontrada.' });
            }

            const empresa = empresaResult.rows[0];

            // Verificar permissão
            if (!isAdmin && empresa.criador_id !== userId) {
                return res.status(403).json({ error: 'Sem permissão para aceder a esta empresa.' });
            }

            // Buscar tipos de parceria
            const tiposResult = await db.query(`
                SELECT 
                    tp.id,
                    tp.nome,
                    etp.data_inicio,
                    etp.data_fim,
                    etp.observacoes
                FROM public.empresas_tipos_parceria etp
                JOIN public.tipos_parceria tp ON tp.id = etp.tipo_parceria_id
                WHERE etp.empresa_id = $1
                ORDER BY tp.nome
            `, [id]);

            // Buscar contactos
            const contactosResult = await db.query(`
                SELECT *
                FROM public.empresas_contactos
                WHERE empresa_id = $1 AND ativo = true
                ORDER BY principal DESC, nome_pessoa ASC
            `, [id]);

            // Buscar endereços
            const enderecosResult = await db.query(`
                SELECT id, morada, codigo_postal, localidade
                FROM public.empresas_enderecos
                WHERE empresa_id = $1
                ORDER BY id
            `, [id]);

            empresa.tipos_parceria = tiposResult.rows;
            empresa.contactos = contactosResult.rows;
            empresa.enderecos = enderecosResult.rows;

            res.json(empresa);

        } catch (error) {
            console.error('Erro ao obter empresa:', error);
            res.status(500).json({ error: 'Erro interno do servidor ao obter empresa.' });
        }
    };

    /**
     * Criar nova empresa
     */
    const createEmpresa = async (req, res) => {
        console.log('[DEBUG] createEmpresa: Function entered.');
        const {
            nome, nome_curto, nif,
            email_contacto, telefone, pessoa_contacto, website,
            setor_atividade, numero_colaboradores, observacoes,
            logo_url, ativo, data_inicio_parceria, data_fim_parceria,
            tipo_parceria_id,
            enderecos = [],
            contactos = []
        } = req.body;

        const userId = req.user.id;

        if (!nome) {
            return res.status(400).json({ error: 'Nome da empresa é obrigatório.' });
        }
        if (!tipo_parceria_id) {
            return res.status(400).json({ error: 'Tipo de parceria é obrigatório.' });
        }
        if (enderecos.length === 0 || !enderecos[0].morada) {
            return res.status(400).json({ error: 'Pelo menos um endereço é obrigatório.' });
        }

        try {
            const empresaId = await withTransaction(async (client) => {
                // 1. Inserir empresa
                const insertQuery = `
                    INSERT INTO public.empresas (
                        nome, nome_curto, nif,
                        email_contacto, telefone, pessoa_contacto, website,
                        setor_atividade, numero_colaboradores, observacoes,
                        logo_url, criador_id, ativo, data_inicio_parceria, data_fim_parceria
                    ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, $15)
                    RETURNING id
                `;

                const values = [
                    nome, nome_curto, nif,
                    email_contacto, telefone, pessoa_contacto, website,
                    setor_atividade, numero_colaboradores, observacoes,
                    logo_url, userId, ativo !== false, data_inicio_parceria, data_fim_parceria
                ];

                const result = await client.query(insertQuery, values);
                const newEmpresaId = result.rows[0].id;

                // 2. Inserir o tipo de parceria
                await client.query(`
                    INSERT INTO public.empresas_tipos_parceria (empresa_id, tipo_parceria_id, data_inicio)
                    VALUES ($1, $2, $3)
                `, [newEmpresaId, tipo_parceria_id, data_inicio_parceria]);

                // 3. Inserir endereços
                for (const end of enderecos) {
                    if (end.morada) {
                        await client.query(`
                            INSERT INTO public.empresas_enderecos (empresa_id, morada, codigo_postal, localidade)
                            VALUES ($1, $2, $3, $4)
                        `, [newEmpresaId, end.morada, end.codigo_postal, end.localidade]);
                    }
                }

                // 4. Inserir contactos
                for (const contacto of contactos) {
                    await client.query(`
                        INSERT INTO public.empresas_contactos (
                            empresa_id, nome_pessoa, cargo, email, telefone, telemovel, principal, observacoes
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    `, [
                        newEmpresaId, contacto.nome_pessoa, contacto.cargo,
                        contacto.email, contacto.telefone, contacto.telemovel,
                        contacto.principal || false, contacto.observacoes
                    ]);
                }

                return newEmpresaId;
            });

            res.status(201).json({ 
                success: true, 
                message: 'Empresa criada com sucesso.', 
                id: empresaId 
            });

        } catch (error) {
            console.error('Erro ao criar empresa:', error);
            
            if (error.code === '23505') {
                if (error.constraint === 'uq_empresas_nif') {
                    return res.status(400).json({ error: 'NIF já registado.' });
                }
                if (error.constraint === 'uq_empresas_email') {
                    return res.status(400).json({ error: 'Email já registado.' });
                }
            }
            
            res.status(500).json({ error: 'Erro interno do servidor ao criar empresa.' });
        }
    };

    /**
     * Atualizar empresa existente
     */
    const updateEmpresa = async (req, res) => {
        const { id } = req.params;
        const userId = req.user.id;
        const isAdmin = req.user.tipo_utilizador === 'ADMIN';

        const {
            nome, nome_curto, nif,
            email_contacto, telefone, pessoa_contacto, website,
            setor_atividade, numero_colaboradores, observacoes,
            logo_url, ativo, data_inicio_parceria, data_fim_parceria,
            tipo_parceria_id,
            enderecos = [],
            contactos = []
        } = req.body;

        try {
            // Verificar permissão
            const checkResult = await db.query('SELECT criador_id FROM public.empresas WHERE id = $1', [id]);
            
            if (checkResult.rows.length === 0) {
                return res.status(404).json({ error: 'Empresa não encontrada.' });
            }

            if (!isAdmin && checkResult.rows[0].criador_id !== userId) {
                return res.status(403).json({ error: 'Sem permissão para atualizar esta empresa.' });
            }

            await withTransaction(async (client) => {
                // 1. Atualizar empresa
                const updateQuery = `
                    UPDATE public.empresas SET
                        nome = COALESCE($1, nome),
                        nome_curto = COALESCE($2, nome_curto),
                        nif = COALESCE($3, nif),
                        email_contacto = COALESCE($4, email_contacto),
                        telefone = COALESCE($5, telefone),
                        pessoa_contacto = COALESCE($6, pessoa_contacto),
                        website = COALESCE($7, website),
                        setor_atividade = COALESCE($8, setor_atividade),
                        numero_colaboradores = COALESCE($9, numero_colaboradores),
                        observacoes = COALESCE($10, observacoes),
                        logo_url = COALESCE($11, logo_url),
                        ativo = COALESCE($12, ativo),
                        data_inicio_parceria = COALESCE($13, data_inicio_parceria),
                        data_fim_parceria = COALESCE($14, data_fim_parceria)
                    WHERE id = $15
                    RETURNING *
                `;

                const values = [
                    nome, nome_curto, nif,
                    email_contacto, telefone, pessoa_contacto, website,
                    setor_atividade, numero_colaboradores, observacoes,
                    logo_url, ativo, data_inicio_parceria, data_fim_parceria, id
                ];

                await client.query(updateQuery, values);

                // 2. Atualizar tipo de parceria
                if (tipo_parceria_id) {
                    await client.query(`
                        DELETE FROM public.empresas_tipos_parceria 
                        WHERE empresa_id = $1 AND tipo_parceria_id NOT IN (
                            SELECT id FROM public.tipos_parceria WHERE id = $2
                        )
                    `, [id, tipo_parceria_id]);

                    await client.query(`
                        INSERT INTO public.empresas_tipos_parceria (empresa_id, tipo_parceria_id, data_inicio, data_fim)
                        VALUES ($1, $2, $3, $4)
                        ON CONFLICT (empresa_id, tipo_parceria_id) DO UPDATE SET
                            data_inicio = EXCLUDED.data_inicio,
                            data_fim = EXCLUDED.data_fim
                    `, [id, tipo_parceria_id, data_inicio_parceria, data_fim_parceria]);
                }

                // 3. Atualizar endereços
                const existingEnderecosResult = await client.query('SELECT id FROM public.empresas_enderecos WHERE empresa_id = $1', [id]);
                const existingEnderecoIds = existingEnderecosResult.rows.map(row => row.id);
                const updatedEnderecoIds = [];

                for (const end of enderecos) {
                    if (end.morada) {
                        if (end.id) {
                            await client.query(`
                                UPDATE public.empresas_enderecos SET
                                    morada = $1, codigo_postal = $2, localidade = $3
                                WHERE id = $4 AND empresa_id = $5
                            `, [end.morada, end.codigo_postal, end.localidade, end.id, id]);
                            updatedEnderecoIds.push(end.id);
                        } else {
                            const newEndResult = await client.query(`
                                INSERT INTO public.empresas_enderecos (empresa_id, morada, codigo_postal, localidade)
                                VALUES ($1, $2, $3, $4)
                                RETURNING id
                            `, [id, end.morada, end.codigo_postal, end.localidade]);
                            updatedEnderecoIds.push(newEndResult.rows[0].id);
                        }
                    }
                }

                const enderecosToDelete = existingEnderecoIds.filter(existingId => !updatedEnderecoIds.includes(existingId));
                if (enderecosToDelete.length > 0) {
                    await client.query(`DELETE FROM public.empresas_enderecos WHERE id = ANY($1::int[]) AND empresa_id = $2`, [enderecosToDelete, id]);
                }

                // 4. Atualizar contactos
                await client.query('DELETE FROM public.empresas_contactos WHERE empresa_id = $1', [id]);
                for (const contacto of contactos) {
                    await client.query(`
                        INSERT INTO public.empresas_contactos (
                            empresa_id, nome_pessoa, cargo, email, telefone, telemovel, principal, observacoes
                        ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                    `, [
                        id, contacto.nome_pessoa, contacto.cargo,
                        contacto.email, contacto.telefone, contacto.telemovel,
                        contacto.principal || false, contacto.observacoes
                    ]);
                }
            });

            res.json({ 
                success: true, 
                message: 'Empresa atualizada com sucesso.', 
            });

        } catch (error) {
            console.error('Erro ao atualizar empresa:', error);
            
            if (error.code === '23505') {
                if (error.constraint === 'uq_empresas_nif') {
                    return res.status(400).json({ error: 'NIF já registado.' });
                }
                if (error.constraint === 'uq_empresas_email') {
                    return res.status(400).json({ error: 'Email já registado.' });
                }
            }
            
            res.status(500).json({ error: 'Erro interno do servidor ao atualizar empresa.' });
        }
    };

    /**
     * Eliminar empresa (soft delete)
     */
    const deleteEmpresa = async (req, res) => {
        const { id } = req.params;
        const userId = req.user.id;
        const isAdmin = req.user.tipo_utilizador === 'ADMIN';

        try {
            const checkResult = await db.query('SELECT criador_id FROM public.empresas WHERE id = $1', [id]);
            
            if (checkResult.rows.length === 0) {
                return res.status(404).json({ error: 'Empresa não encontrada.' });
            }

            if (!isAdmin && checkResult.rows[0].criador_id !== userId) {
                return res.status(403).json({ error: 'Sem permissão para eliminar esta empresa.' });
            }

            await db.query(`
                UPDATE public.empresas 
                SET ativo = false, data_inativacao = NOW() 
                WHERE id = $1
            `, [id]);

            res.json({ success: true, message: 'Empresa desativada com sucesso.' });

        } catch (error) {
            console.error('Erro ao eliminar empresa:', error);
            res.status(500).json({ error: 'Erro interno do servidor ao eliminar empresa.' });
        }
    };

    // ============================================================================
    // TIPOS DE PARCERIA
    // ============================================================================

    const getTiposParceria = async (req, res) => {
        try {
            const result = await db.query(`
                SELECT id, nome FROM public.tipos_parceria 
                WHERE ativo = true 
                ORDER BY nome
            `);
            res.json(result.rows);
        } catch (error) {
            console.error('Erro ao listar tipos de parceria:', error);
            res.status(500).json({ error: 'Erro ao listar tipos de parceria.' });
        }
    };

    // ============================================================================
    // CONTACTOS
    // ============================================================================

    const addContacto = async (req, res) => {
        const { id } = req.params;
        const { nome_pessoa, cargo, email, telefone, telemovel, principal, observacoes } = req.body;

        if (!nome_pessoa) {
            return res.status(400).json({ error: 'Nome do contacto é obrigatório.' });
        }

        try {
            if (principal) {
                await db.query(`
                    UPDATE public.empresas_contactos 
                    SET principal = false 
                    WHERE empresa_id = $1
                `, [id]);
            }

            const result = await db.query(`
                INSERT INTO public.empresas_contactos (
                    empresa_id, nome_pessoa, cargo, email, telefone, telemovel, principal, observacoes
                ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
                RETURNING *
            `, [id, nome_pessoa, cargo, email, telefone, telemovel, principal || false, observacoes]);

            res.status(201).json({ 
                success: true, 
                message: 'Contacto adicionado com sucesso.', 
                contacto: result.rows[0] 
            });

        } catch (error) {
            console.error('Erro ao adicionar contacto:', error);
            res.status(500).json({ error: 'Erro ao adicionar contacto.' });
        }
    };

    const updateContacto = async (req, res) => {
        const { id, contactoId } = req.params;
        const { nome_pessoa, cargo, email, telefone, telemovel, principal, observacoes, ativo } = req.body;

        try {
            if (principal) {
                await db.query(`
                    UPDATE public.empresas_contactos 
                    SET principal = false 
                    WHERE empresa_id = $1 AND id != $2
                `, [id, contactoId]);
            }

            const result = await db.query(`
                UPDATE public.empresas_contactos SET
                    nome_pessoa = COALESCE($1, nome_pessoa),
                    cargo = COALESCE($2, cargo),
                    email = COALESCE($3, email),
                    telefone = COALESCE($4, telefone),
                    telemovel = COALESCE($5, telemovel),
                    principal = COALESCE($6, principal),
                    observacoes = COALESCE($7, observacoes),
                    ativo = COALESCE($8, ativo)
                WHERE id = $9 AND empresa_id = $10
                RETURNING *
            `, [nome_pessoa, cargo, email, telefone, telemovel, principal, observacoes, ativo, contactoId, id]);

            if (result.rows.length === 0) {
                return res.status(404).json({ error: 'Contacto não encontrado.' });
            }

            res.json({ 
                success: true, 
                message: 'Contacto atualizado com sucesso.', 
                contacto: result.rows[0] 
            });

        } catch (error) {
            console.error('Erro ao atualizar contacto:', error);
            res.status(500).json({ error: 'Erro ao atualizar contacto.' });
        }
    };

    const deleteContacto = async (req, res) => {
        const { id, contactoId } = req.params;

        try {
            const result = await db.query(`
                UPDATE public.empresas_contactos 
                SET ativo = false 
                WHERE id = $1 AND empresa_id = $2
            `, [contactoId, id]);

            if (result.rowCount === 0) {
                return res.status(404).json({ error: 'Contacto não encontrado.' });
            }

            res.json({ success: true, message: 'Contacto desativado com sucesso.' });

        } catch (error) {
            console.error('Erro ao eliminar contacto:', error);
            res.status(500).json({ error: 'Erro ao eliminar contacto.' });
        }
    };

    // ============================================================================
    // ESTATÍSTICAS
    // ============================================================================

    const getEstatisticas = async (req, res) => {
        const userId = req.user.id;
        const isAdmin = req.user.tipo_utilizador === 'ADMIN';

        try {
            const whereClause = isAdmin ? '' : 'WHERE criador_id = $1';
            const params = isAdmin ? [] : [userId];

            const result = await db.query(`
                SELECT 
                    COUNT(*) as total_empresas,
                    COUNT(*) FILTER (WHERE ativo = true) as empresas_ativas,
                    COUNT(*) FILTER (WHERE ativo = false) as empresas_inativas,
                    COUNT(DISTINCT localidade) as total_localidades,
                    COUNT(DISTINCT setor_atividade) as total_setores
                FROM public.empresas
                ${whereClause}
            `, params);

            res.json(result.rows[0]);

        } catch (error) {
            console.error('Erro ao obter estatísticas:', error);
            res.status(500).json({ error: 'Erro ao obter estatísticas.' });
        }
    };

    // ============================================================================
    // ROUTES
    // ============================================================================

    // Tipos de Parceria
    router.get('/tipos-parceria', authenticateJWT, getTiposParceria);

    // Empresas - CRUD completo
    router.get('/', authenticateJWT, getEmpresas);
    router.get('/:id', authenticateJWT, getEmpresaById);
    router.post('/', authenticateJWT, authenticateAdminOrProfessor, createEmpresa);
    router.put('/:id', authenticateJWT, authenticateAdminOrProfessor, updateEmpresa);
    router.delete('/:id', authenticateJWT, authenticateAdminOrProfessor, deleteEmpresa);

    // Contactos
    router.post('/:id/contactos', authenticateJWT, authenticateAdminOrProfessor, addContacto);
    router.put('/:id/contactos/:contactoId', authenticateJWT, authenticateAdminOrProfessor, updateContacto);
    router.delete('/:id/contactos/:contactoId', authenticateJWT, authenticateAdminOrProfessor, deleteContacto);

    // Estatísticas
    router.get('/estatisticas', authenticateJWT, getEstatisticas);

    return router;
};
