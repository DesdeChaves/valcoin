import React, { useState } from 'react';

const TicketValidator = ({ token }) => {
  const [ticketId, setTicketId] = useState('');
  const [validationResult, setValidationResult] = useState(null);
  const [isValidating, setIsValidating] = useState(false);
  const [allTickets, setAllTickets] = useState([]);
  const [showAllTickets, setShowAllTickets] = useState(false);

  const validateTicket = async () => {
    if (!ticketId.trim()) return;
    
    setIsValidating(true);
    console.log(`[FRONTEND] Validating ticket: ${ticketId}`);
    
    try {
      const response = await fetch(`/api/store/validate-ticket/${ticketId}`);
      const data = await response.json();
      
      console.log(`[FRONTEND] Response status: ${response.status}`);
      console.log(`[FRONTEND] Response data:`, data);
      
      // Verificar se a resposta indica sucesso E se o bilhete é válido
      const isValid = response.ok && (data.success === true || data.valid === true);
      
      if (isValid) {
        setValidationResult({
          valid: true,
          success: true,
          message: data.message || 'Bilhete validado com sucesso',
          ticketId,
          ticket: {
            productName: data.product?.name || 'Nome não disponível',
            buyerName: data.purchase?.buyer_name || 'Comprador não identificado', 
            issuedAt: data.purchase?.date || new Date().toISOString()
          }
        });
      } else {
        setValidationResult({
          valid: false,
          success: false,
          message: data.message || 'Erro ao validar bilhete',
          ticketId
        });
      }
    } catch (error) {
      console.error('[FRONTEND] Error validating ticket:', error);
      setValidationResult({
        valid: false,
        success: false,
        message: 'Erro de conexão ao validar bilhete',
        ticketId
      });
    } finally {
      setIsValidating(false);
    }
  };

  const useTicket = async (id) => {
    try {
      const response = await fetch(`/api/store/use-ticket/${id}`, {
        method: 'POST',
        headers: { 
          'Authorization': `Bearer ${token}`,
          'Content-Type': 'application/json'
        }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        alert('Bilhete marcado como utilizado!');
        setValidationResult(null);
        setTicketId('');
        
        // Atualizar lista se estiver visível
        if (showAllTickets) {
          loadAllTickets();
        }
      } else {
        alert(data.message || 'Erro ao marcar bilhete como usado');
      }
    } catch (error) {
      alert('Erro ao marcar bilhete como usado');
    }
  };

  const loadAllTickets = async () => {
    console.log('Token used for /admin/tickets:', token);
    try {
      const response = await fetch('/api/store/admin/tickets', {
        headers: { 'Authorization': `Bearer ${token}` }
      });
      
      const data = await response.json();
      
      if (response.ok) {
        console.log('Tickets received:', data);
        setAllTickets(data);
        setShowAllTickets(true);
      } else {
        console.error('Error loading tickets:', data);
        alert('Erro ao carregar bilhetes ou acesso negado: ' + (data.message || 'Erro desconhecido'));
      }
    } catch (error) {
      console.error('Error loading tickets:', error);
      alert('Erro ao carregar bilhetes ou acesso negado: ' + error.message);
    }
  };

  return (
    <div className="max-w-4xl mx-auto p-6 bg-white rounded-lg shadow-lg">
      <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
        <svg className="h-8 w-8 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v1m6 11h2m-6 0h-2v4m0-11v3m0 0h.01M12 12h4.01M16 20h4M4 12h4m12 0h4m-4 4h4m-4-4v4m-4-4h4m-4 4v4m-8-4h4" />
        </svg>
        Validador de Bilhetes
      </h2>

      {/* Validação Individual */}
      <div className="mb-8 p-4 border rounded-lg">
        <h3 className="text-lg font-semibold mb-4">Validar Bilhete Individual</h3>
        <div className="flex space-x-4 mb-4">
          <input
            type="text"
            value={ticketId}
            onChange={(e) => setTicketId(e.target.value.toLowerCase())}
            placeholder="ID do bilhete ou escaneie QR Code"
            className="flex-1 p-2 border rounded focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            onClick={validateTicket}
            disabled={isValidating || !ticketId.trim()}
            className="px-6 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:bg-gray-400"
          >
            {isValidating ? 'Validando...' : 'Validar'}
          </button>
        </div>

        {/* Resultado da Validação */}
        {validationResult && (
          <div className={`p-4 rounded-lg border-2 ${
            validationResult.valid 
              ? 'bg-green-50 border-green-200' 
              : 'bg-red-50 border-red-200'
          }`}>
            <div className="flex items-center mb-2">
              {validationResult.valid ? (
                <svg className="h-8 w-8 text-green-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              ) : (
                <svg className="h-8 w-8 text-red-600 mr-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              )}
              <span className={`text-xl font-bold ${
                validationResult.valid ? 'text-green-800' : 'text-red-800'
              }`}>
                {validationResult.valid ? '✓ Bilhete Válido' : '✗ Bilhete Inválido'}
              </span>
            </div>
            
            {/* Mostrar mensagem */}
            <div className={`text-sm mb-3 ${
              validationResult.valid ? 'text-green-700' : 'text-red-700'
            }`}>
              {validationResult.message}
            </div>
            
            {/* Informações do bilhete válido */}
            {validationResult.valid && validationResult.ticket && (
              <div className="bg-white p-3 rounded border text-sm text-gray-700 mb-4">
                <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  <div>
                    <strong>Evento:</strong> {validationResult.ticket.productName}
                  </div>
                  <div>
                    <strong>Comprador:</strong> {validationResult.ticket.buyerName}
                  </div>
                  <div>
                    <strong>Emitido em:</strong> {new Date(validationResult.ticket.issuedAt).toLocaleString('pt-PT')}
                  </div>
                  <div>
                    <strong>ID do Bilhete:</strong> <span className="font-mono text-xs">{validationResult.ticketId}</span>
                  </div>
                </div>
              </div>
            )}
            
            {/* Botão para marcar como usado */}
            {validationResult.valid && (
              <button
                onClick={() => useTicket(validationResult.ticketId)}
                className="px-6 py-2 bg-green-600 text-white rounded hover:bg-green-700 font-semibold"
              >
                Marcar como Utilizado
              </button>
            )}
          </div>
        )}
      </div>

      {/* Gestão de Todos os Bilhetes */}
      <div className="p-4 border rounded-lg">
        <div className="flex justify-between items-center mb-4">
          <h3 className="text-lg font-semibold">Gestão de Bilhetes</h3>
          <button
            onClick={loadAllTickets}
            className="px-4 py-2 bg-gray-600 text-white rounded hover:bg-gray-700"
          >
            {showAllTickets ? 'Atualizar Lista' : 'Ver Todos os Bilhetes'}
          </button>
        </div>

        {showAllTickets && (
          <div className="overflow-x-auto">
            <table className="min-w-full table-auto">
              <thead>
                <tr className="bg-gray-50">
                  <th className="px-4 py-2 text-left">ID</th>
                  <th className="px-4 py-2 text-left">Evento</th>
                  <th className="px-4 py-2 text-left">Comprador</th>
                  <th className="px-4 py-2 text-left">Status</th>
                  <th className="px-4 py-2 text-left">Data Emissão</th>
                  <th className="px-4 py-2 text-left">Data Uso</th>
                  <th className="px-4 py-2 text-left">Ações</th>
                </tr>
              </thead>
              <tbody>
                {allTickets.map((ticket, index) => (
                  <tr key={ticket.ticketId || `ticket-${index}`} className={index % 2 === 0 ? 'bg-white' : 'bg-gray-50'}>
                    <td className="px-4 py-2 text-xs font-mono">
                      {ticket.ticketId ? ticket.ticketId.substring(0, 8) : 'N/A'}
                    </td>
                    <td className="px-4 py-2">
                      {ticket.productName || 'N/A'}
                    </td>
                    <td className="px-4 py-2">
                      {ticket.buyerName || 'N/A'}
                    </td>
                    <td className="px-4 py-2">
                      {ticket.isValid ? (
                        <span className="px-2 py-1 text-xs bg-green-100 text-green-800 rounded">
                          Válido
                        </span>
                      ) : (
                        <span className="px-2 py-1 text-xs bg-red-100 text-red-800 rounded">
                          Usado
                        </span>
                      )}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {ticket.issuedAt ? new Date(ticket.issuedAt).toLocaleDateString('pt-PT') : 'N/A'}
                    </td>
                    <td className="px-4 py-2 text-xs">
                      {ticket.usedAt ? new Date(ticket.usedAt).toLocaleDateString('pt-PT') : '-'}
                    </td>
                    <td className="px-4 py-2">
                      {ticket.isValid && ticket.ticketId && (
                        <button
                          onClick={() => useTicket(ticket.ticketId)}
                          className="px-3 py-1 text-xs bg-red-600 text-white rounded hover:bg-red-700"
                        >
                          Marcar Usado
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            
            {allTickets.length === 0 && (
              <p className="text-center text-gray-500 py-4">Nenhum bilhete encontrado</p>
            )}
          </div>
        )}
      </div>

      {/* Instruções */}
      <div className="mt-6 p-4 bg-blue-50 border border-blue-200 rounded-lg">
        <h4 className="font-semibold text-blue-800 mb-2">Como usar:</h4>
        <ul className="text-sm text-blue-700 space-y-1">
          <li>• Escaneie o QR Code do bilhete ou digite o ID manualmente</li>
          <li>• Clique em "Validar" para verificar se o bilhete é válido</li>
          <li>• Se válido, clique em "Marcar como Utilizado" para invalidar o bilhete</li>
          <li>• Use "Ver Todos os Bilhetes" para gestão completa (apenas para professores)</li>
        </ul>
      </div>
    </div>
  );
};

export default TicketValidator;
