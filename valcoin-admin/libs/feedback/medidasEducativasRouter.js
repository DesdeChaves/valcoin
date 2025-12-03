const express = require('express');
const router = express.Router();
const medidasEducativas = require('./medidasEducativas');

/**
 * GET /api/feedback/medidas/aluno/:alunoId
 * Get all educational measures for a specific student.
 */
router.get('/aluno/:alunoId', async (req, res) => {
    try {
        const { alunoId } = req.params;
        const result = await medidasEducativas.getMedidasEducativasByAluno(alunoId);
        res.json(result);
    } catch (error) {
        console.error('Error fetching educational measures for student:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * GET /api/feedback/medidas/:id
 * Get a single educational measure by its ID.
 */
router.get('/:id', async (req, res) => {
    try {
        const { id } = req.params;
        const result = await medidasEducativas.getMedidaEducativaById(id);
        if (result) {
            res.json(result);
        }
        else {
            res.status(404).json({ error: 'Educational measure not found' });
        }
    } catch (error) {
        console.error('Error fetching educational measure by ID:', error);
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**
 * POST /api/feedback/medidas
 * Create a new educational measure.
 */
router.post('/', async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            console.error('User ID not found on request object in POST /medidas');
            return res.status(401).json({ error: 'Authentication error: User ID not found.' });
        }
        const registadoPorId = req.user.id;
        const newMeasure = await medidasEducativas.createMedidaEducativa(req.body, registadoPorId);
        res.status(201).json(newMeasure);
    } catch (error) {
        if (error.message.startsWith('Validation error')) {
            return res.status(400).json({ error: error.message });
        }
        console.error('Error creating educational measure:', error);
        if (error.code === '23503') { // Foreign key violation
             return res.status(400).json({ error: 'Invalid data: The specified student or subject does not exist.' });
        }
        if (error.code === '23502') { // Not-null violation
             console.error('A not-null constraint was violated. Data:', req.body, 'User:', req.user);
             return res.status(400).json({ error: 'A required field was missing on the server.' });
        }
        if (error.code === '22P02') { // Invalid input syntax (e.g., for a UUID)
            return res.status(400).json({ error: 'Invalid data format for one of the fields.' });
        }
        res.status(500).json({ error: 'Internal server error' });
    }
});

/**

 * PUT /api/feedback/medidas/:id

 * Update an existing educational measure.

 */

router.put('/:id', async (req, res) => {

    try {

        const { id } = req.params;

        const updatedMeasure = await medidasEducativas.updateMedidaEducativa(id, req.body);

        if (updatedMeasure) {

            res.json(updatedMeasure);

        } else {

            res.status(404).json({ error: 'Educational measure not found' });

        }

    } catch (error) {

        if (error.message.startsWith('Validation error')) {

            return res.status(400).json({ error: error.message });

        }

        console.error('Error updating educational measure:', error);

        if (error.code === '23503') { // Foreign key violation

             return res.status(400).json({ error: 'Invalid data: The specified student or subject does not exist.' });

        }

        if (error.code === '23502') { // Not-null violation

             console.error('A not-null constraint was violated. Data:', req.body);

             return res.status(400).json({ error: 'A required field was missing on the server.' });

        }

        if (error.code === '22P02') { // Invalid input syntax (e.g., for a UUID)

            return res.status(400).json({ error: 'Invalid data format for one of the fields.' });

        }

        res.status(500).json({ error: 'Internal server error' });

    }

});



/**

 * DELETE /api/feedback/medidas/:id

 * Delete an educational measure.

 */

router.delete('/:id', async (req, res) => {

    try {

        const { id } = req.params;

        const success = await medidasEducativas.deleteMedidaEducativa(id);

        if (success) {

            res.status(204).send(); // No Content

        } else {

            res.status(404).json({ error: 'Educational measure not found' });

        }

    } catch (error) {

        console.error('Error deleting educational measure:', error);

        res.status(500).json({ error: 'Internal server error' });

    }

});

module.exports = router;
