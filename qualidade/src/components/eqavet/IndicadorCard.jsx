// src/components/eqavet/IndicadorCard.jsx
const IndicadorCard = ({ label, resultado, meta, unidade = '%' }) => {
  const valor = Number(resultado) || 0;
  const metaValor = Number(meta) || 0;
  const cumprida = label.includes('Abandono') ? valor <= metaValor : valor >= metaValor;

  return (
    <div className={`p-4 rounded-lg border-l-4 ${cumprida ? 'border-green-500 bg-green-50' : 'border-red-500 bg-red-50'}`}>
      <h4 className="font-semibold text-gray-700">{label}</h4>
      <div className="mt-2 flex items-baseline justify-between">
        <span className="text-2xl font-bold">{valor.toFixed(1)}{unidade}</span>
        <span className="text-sm text-gray-600">meta: {metaValor}{unidade}</span>
      </div>
      <div className={`mt-2 text-sm font-medium ${cumprida ? 'text-green-700' : 'text-red-700'}`}>
        {cumprida ? 'Cumprida' : 'Não cumprida'}
      </div>
    </div>
  );
};

export default IndicadorCard;
