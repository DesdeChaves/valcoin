import React from 'react';

const Filtros = ({ filters, setFilters }) => {
    // Opções fixas para os dropdowns
  const anosLetivosOptions = [
    { value: '', label: 'Todas' },
    { value: '2023/24', label: '2023/24' },
    { value: '2024/25', label: '2024/25' },
    { value: '2025/26', label: '2025/26' },
  ];

  const anosEscolaresOptions = [
    { value: '', label: 'Todos' },
    ...Array.from({ length: 12 }, (_, i) => ({
      value: `${i + 1}.º`,
      label: `${i + 1}º`,
    })),
  ];
  return (
    <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-8 bg-gray-50 p-4 rounded-lg">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Ano Letivo
        </label>
        <select
          value={filters.anoLetivo}
          onChange={(e) => setFilters({ ...filters, anoLetivo: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg text-sm"
        >
          {anosLetivosOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Período
        </label>
        <select
          value={filters.periodo}
          onChange={(e) => setFilters({ ...filters, periodo: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">Todos</option>
          <option value="1">1º</option>
          <option value="2">2º</option>
          <option value="3">3º</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Ciclo
        </label>
        <select
          value={filters.ciclo}
          onChange={(e) => setFilters({ ...filters, ciclo: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg text-sm"
        >
          <option value="">Todos</option>
          <option value="1_ciclo">1º Ciclo</option>
          <option value="2_ciclo">2º Ciclo</option>
          <option value="3_ciclo">3º Ciclo</option>
          <option value="secundario">Secundário</option>
        </select>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Ano Escolar
        </label>
        <select
          value={filters.ano}
          onChange={(e) => setFilters({ ...filters, ano: e.target.value })}
          className="w-full px-3 py-2 border rounded-lg text-sm"
        >
          {anosEscolaresOptions.map((opt) => (
            <option key={opt.value} value={opt.value}>
              {opt.label}
            </option>
          ))}
        </select>
      </div>
    </div>
  );
};

export default Filtros;
