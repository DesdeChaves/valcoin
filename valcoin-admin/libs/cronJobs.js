const cron = require('node-cron');
const db = require('./db');
const redis = require('./redis');

const startInterestPaymentCron = () => {
  console.log('Scheduling interest payment cron job...');
  
  // Schedule a cron job to run every day at midnight
  cron.schedule('05 20 * * *', async () => {
    console.log('Running interest payment cron job...');
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Get interest source user
      const { rows: settingsRows } = await client.query('SELECT value FROM settings WHERE key = $1', ['interestSourceUserId']);
      const interestSourceUserId = settingsRows[0]?.value?.replace(/"/g, '');
      if (!interestSourceUserId) {
        console.error('Interest payment cron job: interestSourceUserId not configured.');
        await client.query('ROLLBACK');
        return;
      }

      // Get all active student savings accounts
      const { rows: accounts } = await client.query(`
        SELECT 
          ssa.id as account_id, 
          ssa.student_id, 
          ssa.balance, 
          ssa.start_date, 
          ssa.maturity_date, 
          sp.interest_rate,
          sp.name as product_name,
          sp.payment_period
        FROM 
          student_savings_accounts ssa
        JOIN 
          savings_products sp ON ssa.product_id = sp.id
        WHERE 
          ssa.start_date <= CURRENT_DATE AND ssa.maturity_date >= CURRENT_DATE
      `);

      console.log(`Found ${accounts.length} active savings accounts`);

      for (const account of accounts) {
        const today = new Date();
        const startDate = new Date(account.start_date);
        let isPaymentDay = false;
        let interestAmount = 0;
        let description = '';

        switch (account.payment_period) {
          case 'daily':
            isPaymentDay = true;
            const dailyInterestRate = account.interest_rate / 365;
            interestAmount = (account.balance * dailyInterestRate) / 100;
            description = `Juros Poupança Diária: ${account.product_name}`;
            break;
          case 'weekly':
            isPaymentDay = today.getDay() === startDate.getDay();
            const weeklyInterestRate = account.interest_rate / 52;
            interestAmount = (account.balance * weeklyInterestRate) / 100;
            description = `Juros Poupança Semanal: ${account.product_name}`;
            break;
          case 'monthly':
            const todayDate = today.getDate();
            const startDateDay = startDate.getDate();
            const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
            
            // Payment on the same day of month, or last day if start date doesn't exist in current month
            isPaymentDay = todayDate === startDateDay || 
                           (startDateDay > lastDayOfMonth && todayDate === lastDayOfMonth);
            
            const monthlyInterestRate = account.interest_rate / 12;
            interestAmount = (account.balance * monthlyInterestRate) / 100;
            description = `Juros Poupança Mensal: ${account.product_name}`;
            break;
          case 'quarterly':
            const isQuarterlyMonth = (today.getMonth() % 3 === startDate.getMonth() % 3);
            const isSameDay = today.getDate() === startDate.getDate();
            isPaymentDay = isQuarterlyMonth && isSameDay;
            
            const quarterlyInterestRate = account.interest_rate / 4;
            interestAmount = (account.balance * quarterlyInterestRate) / 100;
            description = `Juros Poupança Trimestral: ${account.product_name}`;
            break;
          case 'at_maturity':
            const todayTime = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
            const maturityTime = new Date(account.maturity_date).getTime();
            isPaymentDay = todayTime === maturityTime;
            
            const daysDiff = Math.ceil((new Date(account.maturity_date) - startDate) / (1000 * 60 * 60 * 24));
            const annualizedDays = daysDiff / 365;
            interestAmount = (account.balance * (account.interest_rate / 100) * annualizedDays);
            description = `Juros Poupança no Vencimento: ${account.product_name}`;
            break;
        }

        if (isPaymentDay && interestAmount > 0) {
          // Round interest amount to 2 decimal places
          interestAmount = Math.round(interestAmount * 100) / 100;
          
          // Check if interest has already been paid for this period
          const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const { rows: transactionRows } = await client.query(
            'SELECT id FROM transactions WHERE utilizador_destino_id = $1 AND descricao = $2 AND data_transacao >= $3', 
            [account.student_id, description, todayStart]
          );

          if (transactionRows.length === 0) {
            // Check if source user has sufficient balance
            const { rows: sourceBalance } = await client.query('SELECT saldo FROM users WHERE id = $1', [interestSourceUserId]);
            if (!sourceBalance[0] || sourceBalance[0].saldo < interestAmount) {
              console.error(`Insufficient balance in source account ${interestSourceUserId} for interest payment of ${interestAmount}`);
              continue;
            }

            // Debit from interest source user
            await client.query('UPDATE users SET saldo = saldo - $1 WHERE id = $2', [interestAmount, interestSourceUserId]);

            // Credit to student's main account
            await client.query('UPDATE users SET saldo = saldo + $1 WHERE id = $2', [interestAmount, account.student_id]);

            // Log the transaction
            await client.query(
              'INSERT INTO transactions (utilizador_origem_id, utilizador_destino_id, montante, tipo, status, descricao) VALUES ($1, $2, $3, $4, $5, $6)',
              [interestSourceUserId, account.student_id, interestAmount, 'DEBITO', 'APROVADA', description]
            );
            console.log(`Paid ${interestAmount} interest to student ${account.student_id} for savings account ${account.account_id}`);
          } else {
            console.log(`Interest already paid today for account ${account.account_id}`);
          }
        }
      }

      await client.query('COMMIT');
      console.log('Interest payment cron job finished successfully.');
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error running interest payment cron job:', error);
    } finally {
      client.release();
    }
  }, {
    scheduled: true,
    timezone: "Europe/Lisbon" // Adjust timezone as needed
  });
};

const startLoanRepaymentCron = () => {
    console.log('Scheduling loan repayment cron job...');
    
    cron.schedule('06 19 * * *', async () => {
        console.log('Running loan repayment and interest cron job...');
        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            const { rows: settingsRows } = await client.query('SELECT value FROM settings WHERE key = $1', ['interestSourceUserId']);
            const bankUserId = settingsRows[0]?.value?.replace(/"/g, '');
            if (!bankUserId) {
                console.error('Loan repayment cron job: interestSourceUserId not configured.');
                await client.query('ROLLBACK');
                return;
            }

            const { rows: loans } = await client.query(`
                SELECT sl.*, cp.interest_rate, cp.term_months, cp.payment_period, cp.name as product_name
                FROM student_loans sl
                JOIN credit_products cp ON sl.credit_product_id = cp.id
                WHERE sl.status = 'ACTIVE' AND sl.maturity_date >= CURRENT_DATE
            `);

            console.log(`Found ${loans.length} active loans`);

            for (const loan of loans) {
                const today = new Date();
                const startDate = new Date(loan.start_date);
                let isInterestPaymentDay = false;
                let interestAmount = 0;
                let description = '';

                // Calculate interest based on remaining balance, not initial amount
                const remainingBalance = loan.amount - (parseFloat(loan.paid_amount) || 0);

                switch (loan.payment_period) {
                    case 'daily':
                        isInterestPaymentDay = true;
                        const dailyInterestRate = loan.interest_rate / 365;
                        interestAmount = (remainingBalance * dailyInterestRate) / 100;
                        description = `Juros Diários de Empréstimo: ${loan.product_name}`;
                        break;
                    case 'weekly':
                        isInterestPaymentDay = today.getDay() === startDate.getDay();
                        const weeklyInterestRate = loan.interest_rate / 52;
                        interestAmount = (remainingBalance * weeklyInterestRate) / 100;
                        description = `Juros Semanais de Empréstimo: ${loan.product_name}`;
                        break;
                    case 'monthly':
                        const todayDate = today.getDate();
                        const startDateDay = startDate.getDate();
                        const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
                        
                        isInterestPaymentDay = todayDate === startDateDay || 
                                               (startDateDay > lastDayOfMonth && todayDate === lastDayOfMonth);
                        
                        const monthlyInterestRate = loan.interest_rate / 12;
                        interestAmount = (remainingBalance * monthlyInterestRate) / 100;
                        description = `Juros Mensais de Empréstimo: ${loan.product_name}`;
                        break;
                }

                if (isInterestPaymentDay && interestAmount > 0) {
                    interestAmount = Math.round(interestAmount * 100) / 100;
                    
                    // Check student balance
                    const { rows: studentBalance } = await client.query('SELECT saldo FROM users WHERE id = $1', [loan.student_id]);
                    if (!studentBalance[0] || studentBalance[0].saldo < interestAmount) {
                        console.error(`Insufficient balance for student ${loan.student_id} to pay interest of ${interestAmount}`);
                        continue;
                    }

                    // Check for duplicate payment today
                    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                    const { rows: interestCheck } = await client.query(
                        'SELECT id FROM transactions WHERE utilizador_origem_id = $1 AND descricao = $2 AND data_transacao >= $3',
                        [loan.student_id, description, todayStart]
                    );

                    if (interestCheck.length === 0) {
                        // Debit from student account
                        await client.query('UPDATE users SET saldo = saldo - $1 WHERE id = $2', [interestAmount, loan.student_id]);

                        // Credit to bank account
                        await client.query('UPDATE users SET saldo = saldo + $1 WHERE id = $2', [interestAmount, bankUserId]);

                        // Log the transaction
                        await client.query(
                            'INSERT INTO transactions (utilizador_origem_id, utilizador_destino_id, montante, tipo, status, descricao) VALUES ($1, $2, $3, $4, $5, $6)',
                            [loan.student_id, bankUserId, interestAmount, 'DEBITO', 'APROVADA', description]
                        );

                        console.log(`Interest payment of ${interestAmount} processed for loan ${loan.id}`);
                    }
                }

                // Principal payment logic (monthly only)
                const todayDate = today.getDate();
                const startDateDay = startDate.getDate();
                const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
                
                const isPrincipalPaymentDay = todayDate === startDateDay || 
                           (startDateDay > lastDayOfMonth && todayDate === lastDayOfMonth);

                if (isPrincipalPaymentDay && remainingBalance > 0) {
                    const monthlyPrincipal = Math.min(loan.amount / loan.term_months, remainingBalance);
                    const roundedPrincipal = Math.round(monthlyPrincipal * 100) / 100;

                    // Check for duplicate principal payment today
                    const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
                    const { rows: principalCheck } = await client.query(
                        'SELECT id FROM transactions WHERE utilizador_origem_id = $1 AND tipo = $2 AND data_transacao >= $3',
                        [loan.student_id, 'DEBITO', todayStart]
                    );

                    if (principalCheck.length === 0) {
                        // Check student balance
                        const { rows: studentBalance } = await client.query('SELECT saldo FROM users WHERE id = $1', [loan.student_id]);
                        if (!studentBalance[0] || studentBalance[0].saldo < roundedPrincipal) {
                            console.error(`Insufficient balance for student ${loan.student_id} to pay principal of ${roundedPrincipal}`);
                            continue;
                        }

                        // Debit from student account
                        await client.query('UPDATE users SET saldo = saldo - $1 WHERE id = $2', [roundedPrincipal, loan.student_id]);

                        // Credit to bank account
                        await client.query('UPDATE users SET saldo = saldo + $1 WHERE id = $2', [roundedPrincipal, bankUserId]);

                        // Log the transaction
                        await client.query(
                            'INSERT INTO transactions (utilizador_origem_id, utilizador_destino_id, montante, tipo, status, descricao) VALUES ($1, $2, $3, $4, $5, $6)',
                            [loan.student_id, bankUserId, roundedPrincipal, 'DEBITO', 'APROVADA', `Pagamento de empréstimo`]
                        );

                        // Update paid amount and check if loan is fully paid
                        const newPaidAmount = (parseFloat(loan.paid_amount) || 0) + roundedPrincipal;
                        const newRemainingAmount = loan.amount - newPaidAmount;

                        if (newRemainingAmount <= 0.01) { // Account for rounding errors
                            await client.query('UPDATE student_loans SET status = $1, paid_amount = $2 WHERE id = $3', ['PAID', loan.amount, loan.id]);
                            console.log(`Loan ${loan.id} marked as PAID`);
                        } else {
                            await client.query('UPDATE student_loans SET paid_amount = $1 WHERE id = $2', [newPaidAmount, loan.id]);
                        }

                        console.log(`Principal payment of ${roundedPrincipal} processed for loan ${loan.id}`);
                    }
                }
            }

            await client.query('COMMIT');
            console.log('Loan repayment and interest cron job finished successfully.');
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error running loan repayment and interest cron job:', error);
        } finally {
            client.release();
        }
    }, {
        scheduled: true,
        timezone: "Europe/Lisbon"
    });
};

const startProfessorSalaryCron = () => {
    console.log('Scheduling professor salary cron job...');
    
    cron.schedule('07 19 * * *', async () => { // Agendado para 17:15 em Lisboa
        console.log('=== PROFESSOR SALARY CRON JOB STARTED ===');
        console.log('Current time:', new Date().toISOString());
        console.log('Current timezone:', Intl.DateTimeFormat().resolvedOptions().timeZone);
        
        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            // Check if enabled
            const { rows: settingsRows } = await client.query('SELECT value FROM settings WHERE key = $1', ['professorSalaryEnabled']);
            const isEnabled = settingsRows[0]?.value?.replace(/"/g, '') === 'true';
            console.log('Professor salary enabled:', isEnabled);

            if (!isEnabled) {
                console.log('Professor salary payment is disabled.');
                await client.query('ROLLBACK');
                return;
            }

            // Check salary day
            const { rows: dayRows } = await client.query('SELECT value FROM settings WHERE key = $1', ['professorSalaryDay']);
            const salaryDay = parseInt(dayRows[0]?.value?.replace(/"/g, ''), 10);
            const currentDay = new Date().getDate();
            
            console.log('Configured salary day:', salaryDay);
            console.log('Current day:', currentDay);
            console.log('Is salary day?:', currentDay === salaryDay);

            if (isNaN(salaryDay) || currentDay !== salaryDay) {
                console.log(`Not professor salary day. Today: ${currentDay}, Salary day: ${salaryDay}`);
                await client.query('ROLLBACK');
                return;
            }

            // Get professor salary amount per student
            const { rows: amountRows } = await client.query('SELECT value FROM settings WHERE key = $1', ['professorSalaryAmountPerStudent']);
            const amountPerStudent = parseFloat(amountRows[0]?.value?.replace(/"/g, '')) || 5.0;
            console.log('Amount per student:', amountPerStudent);

            // Check if already paid this month
            const today = new Date();
            const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
            console.log('Checking for payments since:', firstOfMonth.toISOString());
            
            const { rows: salaryCheck } = await client.query(
                'SELECT id, data_transacao FROM transactions WHERE tipo = $1 AND data_transacao >= $2 AND descricao = $3',
                ['DEBITO', firstOfMonth, 'Transferência mensal proporcional aos alunos']
            );

            console.log('Found existing salary transactions this month:', salaryCheck.length);
            
            if (salaryCheck.length > 0) {
                console.log('Professor salary already paid this month.');
                console.log('Existing transactions:', salaryCheck);
                await client.query('ROLLBACK');
                return;
            }
            
            console.log('=== PROCEEDING WITH SALARY PAYMENT ===');
            
            // Check active students and professors before payment
            const { rows: activeStudents } = await client.query(`
                SELECT COUNT(*) as count FROM users 
                WHERE tipo_utilizador = 'ALUNO' AND ativo = true
            `);
            
            const { rows: activeProfessors } = await client.query(`
                SELECT COUNT(*) as count FROM users 
                WHERE tipo_utilizador = 'PROFESSOR' AND ativo = true
            `);
            
            console.log('Active students:', activeStudents[0].count);
            console.log('Active professors:', activeProfessors[0].count);
            
            const sql = `
                WITH transaction_group AS (
                    SELECT gen_random_uuid() AS group_id
                ),
                aluno_professores AS (
                    SELECT 
                        ad.aluno_id,
                        dt.professor_id
                    FROM aluno_disciplina ad
                    JOIN disciplina_turma dt ON ad.disciplina_turma_id = dt.id
                    WHERE ad.ativo = true
                        AND dt.ativo = true
                        AND EXISTS (
                            SELECT 1
                            FROM users u
                            WHERE u.id = ad.aluno_id
                                AND u.tipo_utilizador = 'ALUNO'
                                AND u.ativo = true
                        )
                        AND EXISTS (
                            SELECT 1
                            FROM users u
                            WHERE u.id = dt.professor_id
                                AND u.tipo_utilizador = 'PROFESSOR'
                                AND u.ativo = true
                        )
                ),
                num_professores_por_aluno AS (
                    SELECT 
                        aluno_id,
                        COUNT(DISTINCT professor_id) AS num_professores
                    FROM aluno_professores
                    GROUP BY aluno_id
                ),
                montantes_por_professor AS (
                    SELECT 
                        ap.professor_id,
                        ROUND(SUM($1 / npa.num_professores)::NUMERIC, 2) AS montante
                    FROM aluno_professores ap
                    JOIN num_professores_por_aluno npa ON ap.aluno_id = npa.aluno_id
                    GROUP BY ap.professor_id
                )
                INSERT INTO transactions (
                    id,
                    transaction_group_id,
                    utilizador_origem_id,
                    utilizador_destino_id,
                    montante,
                    tipo,
                    status,
                    data_transacao,
                    data_atualizacao,
                    descricao,
                    taxa_iva_ref,
                    motivo_rejeicao,
                    icon,
                    transaction_rule_id
                )
                SELECT 
                    gen_random_uuid(),
                    (SELECT group_id FROM transaction_group),
                    (SELECT id FROM users WHERE tipo_utilizador = 'ADMIN' AND ativo = true LIMIT 1), -- origem: admin
                    mpp.professor_id, -- destino: professor
                    mpp.montante,
                    'DEBITO',
                    'APROVADA',
                    now(),
                    now(),
                    'Transferência mensal proporcional aos alunos',
                    'isento',
                    NULL,
                    NULL,
                    NULL
                FROM montantes_por_professor mpp
                WHERE mpp.montante > 0
                    AND EXISTS (
                        SELECT 1
                        FROM users u
                        WHERE u.id = mpp.professor_id
                            AND u.tipo_utilizador = 'PROFESSOR'
                            AND u.ativo = true
                    );
            `;

            const result = await client.query(sql, [amountPerStudent]);
            console.log(`Created ${result.rowCount} salary transactions`);

            // Update professor balances
            const updateResult = await client.query(`
                UPDATE users u
                SET saldo = u.saldo + t.montante
                FROM transactions t
                WHERE u.id = t.utilizador_destino_id
                AND t.descricao = 'Transferência mensal proporcional aos alunos'
                AND t.data_transacao >= $1
            `, [firstOfMonth]);
            
            console.log(`Updated ${updateResult.rowCount} professor balances`);

            // Clear Redis cache
            if (redis && redis.del) {
                await redis.del('transactions');
                console.log('Redis cache cleared');
            }

            await client.query('COMMIT');
            console.log('=== PROFESSOR SALARY CRON JOB FINISHED SUCCESSFULLY ===');
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('=== ERROR IN PROFESSOR SALARY CRON JOB ===');
            console.error('Error details:', error);
            console.error('Stack trace:', error.stack);
        } finally {
            client.release();
        }
    }, {
        scheduled: true,
        timezone: "Europe/Lisbon"
    });
};

const startInactivityFeeCron = () => {
    console.log('Scheduling inactivity fee cron job...');

    cron.schedule('0 1 * * *', async () => { // Runs every day at 1 AM
        console.log('Running inactivity fee cron job...');
        const client = await db.getClient();
        try {
            await client.query('BEGIN');

            const { rows: feeSettings } = await client.query('SELECT value FROM settings WHERE key = $1', ['inactivityFeePercentage']);
            const inactivityFeePercentage = parseFloat(feeSettings[0]?.value);

            if (!inactivityFeePercentage || inactivityFeePercentage <= 0) {
                console.log('Inactivity fee is not configured or is zero. Skipping job.');
                await client.query('ROLLBACK');
                return;
            }

            const { rows: ivaDestRows } = await client.query('SELECT value FROM settings WHERE key = $1', ['ivaDestinationUserId']);
            let ivaDestinationUserId = ivaDestRows[0]?.value?.replace(/"/g, '');

            if (!ivaDestinationUserId) {
                const { rows: adminRows } = await client.query('SELECT id FROM users WHERE tipo_utilizador = \'ALUNO\' LIMIT 1');
                if (adminRows.length > 0) {
                    ivaDestinationUserId = adminRows[0].id;
                } else {
                    console.error('Inactivity fee cron job: IVA destination user not found.');
                    await client.query('ROLLBACK');
                    return;
                }
            }

            const { rows: inactiveStudents } = await client.query(`
                SELECT id, saldo
                FROM users
                WHERE tipo_utilizador = 'ALUNO'
                  AND ativo = true
                  AND last_activity_date < NOW() - INTERVAL '30 days'
            `);

            console.log(`Found ${inactiveStudents.length} inactive students.`);

            for (const student of inactiveStudents) {
                const feeAmount = Math.round((student.saldo * (inactivityFeePercentage / 100)) * 100) / 100;

                if (feeAmount > 0) {
                    // Debit from student
                    await client.query('UPDATE users SET saldo = saldo - $1 WHERE id = $2', [feeAmount, student.id]);

                    // Credit to IVA destination user
                    await client.query('UPDATE users SET saldo = saldo + $1 WHERE id = $2', [feeAmount, ivaDestinationUserId]);

                    // Create transaction record
                    await client.query(
                        'INSERT INTO transactions (utilizador_origem_id, utilizador_destino_id, montante, tipo, status, descricao) VALUES ($1, $2, $3, $4, $5, $6)',
                        [student.id, ivaDestinationUserId, feeAmount, 'DEBITO', 'APROVADA', 'Taxa de inatividade']
                    );

                    // Update last activity date
                    await client.query('UPDATE users SET last_activity_date = NOW() WHERE id = $1', [student.id]);

                    console.log(`Applied inactivity fee of ${feeAmount} to student ${student.id}`);
                }
            }

            await client.query('COMMIT');
            console.log('Inactivity fee cron job finished successfully.');
        } catch (error) {
            await client.query('ROLLBACK');
            console.error('Error running inactivity fee cron job:', error);
        } finally {
            client.release();
        }
    }, {
        scheduled: true,
        timezone: "Europe/Lisbon"
    });
};

const testProfessorSalaryManually = async () => {
    console.log('=== MANUAL PROFESSOR SALARY TEST ===');
    const client = await db.getClient();
    
    try {
        // Check current settings
        const { rows: enabledRows } = await client.query('SELECT value FROM settings WHERE key = $1', ['professorSalaryEnabled']);
        const { rows: dayRows } = await client.query('SELECT value FROM settings WHERE key = $1', ['professorSalaryDay']);
        
        console.log('Settings check:');
        console.log('- Enabled:', enabledRows[0]?.value);
        console.log('- Day:', dayRows[0]?.value);
        console.log('- Current date:', new Date().toISOString());
        console.log('- Current day:', new Date().getDate());
        
        // Check for existing payments this month
        const today = new Date();
        const firstOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
        const { rows: existingPayments } = await client.query(
            'SELECT COUNT(*) as count FROM transactions WHERE tipo = $1 AND data_transacao >= $2 AND descricao = $3',
            ['DEBITO', firstOfMonth, 'Transferência mensal proporcional aos alunos']
        );
        
        console.log('Existing payments this month:', existingPayments[0].count);
        
        // Check student-professor relationships
        const { rows: relationships } = await client.query(`
            SELECT COUNT(*) as total_relationships,
                   COUNT(DISTINCT ad.aluno_id) as unique_students,
                   COUNT(DISTINCT dt.professor_id) as unique_professors
            FROM aluno_disciplina ad
            JOIN disciplina_turma dt ON ad.disciplina_turma_id = dt.id
            WHERE ad.ativo = true AND dt.ativo = true
        `);
        
        console.log('Student-Professor relationships:', relationships[0]);
        
    } catch (error) {
        console.error('Error in manual test:', error);
    } finally {
        client.release();
    }
};



const runInterestPaymentManually = async () => {
    console.log('Running interest payment manually...');
    const client = await db.getClient();
    try {
      await client.query('BEGIN');

      // Get interest source user
      const { rows: settingsRows } = await client.query('SELECT value FROM settings WHERE key = $1', ['interestSourceUserId']);
      const interestSourceUserId = settingsRows[0]?.value?.replace(/"/g, '');
      if (!interestSourceUserId) {
        throw new Error('Interest payment cron job: interestSourceUserId not configured.');
      }

      // Get all active student savings accounts
      const { rows: accounts } = await client.query(`
        SELECT 
          ssa.id as account_id, 
          ssa.student_id, 
          ssa.balance, 
          ssa.start_date, 
          ssa.maturity_date, 
          sp.interest_rate,
          sp.name as product_name,
          sp.payment_period
        FROM 
          student_savings_accounts ssa
        JOIN 
          savings_products sp ON ssa.product_id = sp.id
        WHERE 
          ssa.start_date <= CURRENT_DATE AND ssa.maturity_date >= CURRENT_DATE
      `);

      console.log(`Found ${accounts.length} active savings accounts`);
      let paymentsProcessed = 0;

      for (const account of accounts) {
        const today = new Date();
        const startDate = new Date(account.start_date);
        let isPaymentDay = false;
        let interestAmount = 0;
        let description = '';

        switch (account.payment_period) {
          case 'daily':
            isPaymentDay = true;
            const dailyInterestRate = account.interest_rate / 365;
            interestAmount = (account.balance * dailyInterestRate) / 100;
            description = `Juros Poupança Diária: ${account.product_name}`;
            break;
          case 'weekly':
            isPaymentDay = today.getDay() === startDate.getDay();
            const weeklyInterestRate = account.interest_rate / 52;
            interestAmount = (account.balance * weeklyInterestRate) / 100;
            description = `Juros Poupança Semanal: ${account.product_name}`;
            break;
          case 'monthly':
            const todayDate = today.getDate();
            const startDateDay = startDate.getDate();
            const lastDayOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0).getDate();
            
            isPaymentDay = todayDate === startDateDay || 
                           (startDateDay > lastDayOfMonth && todayDate === lastDayOfMonth);
            
            const monthlyInterestRate = account.interest_rate / 12;
            interestAmount = (account.balance * monthlyInterestRate) / 100;
            description = `Juros Poupança Mensal: ${account.product_name}`;
            break;
          case 'quarterly':
            const isQuarterlyMonth = (today.getMonth() % 3 === startDate.getMonth() % 3);
            const isSameDay = today.getDate() === startDate.getDate();
            isPaymentDay = isQuarterlyMonth && isSameDay;
            
            const quarterlyInterestRate = account.interest_rate / 4;
            interestAmount = (account.balance * quarterlyInterestRate) / 100;
            description = `Juros Poupança Trimestral: ${account.product_name}`;
            break;
          case 'at_maturity':
            const todayTime = new Date(today.getFullYear(), today.getMonth(), today.getDate()).getTime();
            const maturityTime = new Date(account.maturity_date).getTime();
            isPaymentDay = todayTime === maturityTime;
            
            const daysDiff = Math.ceil((new Date(account.maturity_date) - startDate) / (1000 * 60 * 60 * 24));
            const annualizedDays = daysDiff / 365;
            interestAmount = (account.balance * (account.interest_rate / 100) * annualizedDays);
            description = `Juros Poupança no Vencimento: ${account.product_name}`;
            break;
        }

        if (isPaymentDay && interestAmount > 0) {
          interestAmount = Math.round(interestAmount * 100) / 100;
          
          const todayStart = new Date(today.getFullYear(), today.getMonth(), today.getDate());
          const { rows: transactionRows } = await client.query(
            'SELECT id FROM transactions WHERE utilizador_destino_id = $1 AND descricao = $2 AND data_transacao >= $3',
            [account.student_id, description, todayStart]
          );

          if (transactionRows.length === 0) {
            const { rows: sourceBalance } = await client.query('SELECT saldo FROM users WHERE id = $1', [interestSourceUserId]);
            if (!sourceBalance[0] || sourceBalance[0].saldo < interestAmount) {
              console.error(`Insufficient balance in source account ${interestSourceUserId} for interest payment of ${interestAmount}`);
              continue;
            }

            await client.query('UPDATE users SET saldo = saldo - $1 WHERE id = $2', [interestAmount, interestSourceUserId]);
            await client.query('UPDATE users SET saldo = saldo + $1 WHERE id = $2', [interestAmount, account.student_id]);

            await client.query(
              'INSERT INTO transactions (utilizador_origem_id, utilizador_destino_id, montante, tipo, status, descricao) VALUES ($1, $2, $3, $4, $5, $6)',
              [interestSourceUserId, account.student_id, interestAmount, 'DEBITO', 'APROVADA', description]
            );
            console.log(`Paid ${interestAmount} interest to student ${account.student_id} for savings account ${account.account_id}`);
            paymentsProcessed++;
          } else {
            console.log(`Interest already paid today for account ${account.account_id}`);
          }
        }
      }

      await client.query('COMMIT');
      console.log('Interest payment finished successfully.');
      return { success: true, message: `${paymentsProcessed} pagamentos de juros processados.` };
    } catch (error) {
      await client.query('ROLLBACK');
      console.error('Error running interest payment manually:', error);
      return { success: false, message: error.message };
    } finally {
      client.release();
    }
};

module.exports = {
    startInterestPaymentCron,
    startLoanRepaymentCron,
    startProfessorSalaryCron,
    startInactivityFeeCron,
    testProfessorSalaryManually,
    runInterestPaymentManually
};
