import React, { useState, useEffect } from 'react';
import { Trophy, Users, TrendingUp, Heart, Target, Crown, Star, Shield, Sparkles, Zap, Award, ChevronRight } from 'lucide-react';
import { BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, RadarChart, PolarGrid, PolarAngleAxis, PolarRadiusAxis, Radar, Legend } from 'recharts';

import { getHousesStats } from '../services/api';

const HousesDashboard = () => {
  const [data, setData] = useState(null);
  const [selectedHouse, setSelectedHouse] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getHousesStats()
      .then(stats => {
        setData(stats);
        setLoading(false);
      })
      .catch(err => {
        console.error('Erro ao carregar houses:', err);
        setLoading(false);
      });
  }, []);

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 flex items-center justify-center">
        <div className="text-center">
          <Shield className="w-16 h-16 text-blue-600 animate-pulse mx-auto mb-4" />
          <p className="text-xl font-semibold text-gray-700">A carregar Sistema de Houses...</p>
        </div>
      </div>
    );
  }

  if (!data) return null;

  const sortedHouses = [...data.houses].sort((a, b) => b.total_balance - a.total_balance);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-purple-50 to-pink-50 p-8">
      <div className="max-w-7xl mx-auto space-y-8">

        {/* Header Inspirador */}
        <div className="text-center mb-12">
          <div className="flex items-center justify-center gap-4 mb-4">
            <Shield className="w-14 h-14 text-blue-600" />
            <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 bg-clip-text text-transparent">
              Sistema de Houses
            </h1>
            <Shield className="w-14 h-14 text-purple-600" />
          </div>
          <p className="text-xl text-gray-600 max-w-4xl mx-auto leading-relaxed">
            Ideia de <span className="font-bold text-blue-600">Jorge Magalhães</span> no seu projeto 
            <span className="font-bold text-purple-600"> Construir Amanhãs</span> — 
            promovendo mentoria inter-anos, excelência académica, espírito desportivo e valores de união
          </p>
          <div className="mt-4 flex items-center justify-center gap-4 text-sm text-gray-500">
            <span className="flex items-center gap-1"><Users className="w-4 h-4" /> Comunidade</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Heart className="w-4 h-4" /> Pertença</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Target className="w-4 h-4" /> Liderança</span>
            <span>•</span>
            <span className="flex items-center gap-1"><Award className="w-4 h-4" /> Excelência</span>
          </div>
        </div>

        {/* Classificação das Houses - Pódio Visual */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
          {sortedHouses.map((house, idx) => (
            <div 
              key={house.house_id}
              onClick={() => setSelectedHouse(house)}
              className={`
                relative overflow-hidden rounded-3xl p-6 cursor-pointer
                transform transition-all duration-300 hover:scale-105 hover:shadow-2xl
                ${idx === 0 ? 'md:col-span-4 md:scale-110 shadow-2xl' : 'shadow-xl'}
              `}
              style={{ 
                backgroundColor: house.cor + '15',
                borderLeft: `8px solid ${house.cor}`,
                borderRight: `8px solid ${house.cor}`
              }}
            >
              {/* Badge de Posição */}
              <div 
                className="absolute top-4 right-4 w-12 h-12 rounded-full flex items-center justify-center text-white font-bold text-xl shadow-lg"
                style={{ backgroundColor: house.cor }}
              >
                {idx === 0 && '👑'}
                {idx === 1 && '🥈'}
                {idx === 2 && '🥉'}
                {idx === 3 && '⭐'}
              </div>

              <div className="flex items-start gap-6">
                {/* Logo/Emoji */}
                <div 
                  className="text-6xl flex items-center justify-center w-24 h-24 rounded-full shadow-lg"
                  style={{ backgroundColor: house.cor + '30' }}
                >
                  {house.logo_url}
                </div>

                {/* Info Principal */}
                <div className="flex-1">
                  <h2 className="text-3xl font-bold mb-2" style={{ color: house.cor }}>
                    {house.nome}
                  </h2>
                  <p className="text-lg text-gray-600 mb-3 italic">{house.valor_associado}</p>
                  <p className="text-gray-700 mb-4">{house.descricao}</p>

                  {/* Estatísticas */}
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    <div className="bg-white/70 rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold" style={{ color: house.cor }}>
                        {house.total_balance.toLocaleString()}
                      </div>
                      <div className="text-xs text-gray-600">Pontos Totais</div>
                    </div>
                    <div className="bg-white/70 rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold text-gray-700">{house.member_count}</div>
                      <div className="text-xs text-gray-600">Membros</div>
                    </div>
                    <div className="bg-white/70 rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold text-green-600">{house.savings_percentage}%</div>
                      <div className="text-xs text-gray-600">Com Poupanças</div>
                    </div>
                    <div className="bg-white/70 rounded-xl p-3 text-center">
                      <div className="text-2xl font-bold text-blue-600">
                        {Math.round(house.total_balance / house.member_count)}
                      </div>
                      <div className="text-xs text-gray-600">Média/Aluno</div>
                    </div>
                  </div>

                  {/* Liderança */}
                  <div className="mt-4 flex gap-4 text-sm">
                    <div className="flex items-center gap-2">
                      <Crown className="w-4 h-4" style={{ color: house.cor }} />
                      <span className="font-semibold">Líder:</span>
                      <span>{house.leader.nome}</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <Star className="w-4 h-4" style={{ color: house.cor }} />
                      <span className="font-semibold">Professor:</span>
                      <span>{house.professor.nome}</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Evolução Semanal */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <TrendingUp className="w-8 h-8 text-blue-600" />
            Evolução Semanal - Competição Saudável
          </h2>
          <ResponsiveContainer width="100%" height={400}>
            <BarChart data={data.weeklyPoints}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="semana" />
              <YAxis />
              <Tooltip 
                contentStyle={{ borderRadius: '12px', border: '2px solid #e5e7eb' }}
              />
              <Legend />
              {data.houses.map(house => (
                <Bar 
                  key={house.house_id}
                  dataKey={house.nome} 
                  fill={house.cor}
                  radius={[8, 8, 0, 0]}
                />
              ))}
            </BarChart>
          </ResponsiveContainer>
        </div>

        {/* Radar Chart - Categorias */}
        <div className="bg-white rounded-3xl shadow-2xl p-8">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Target className="w-8 h-8 text-purple-600" />
            Performance por Categoria
          </h2>
          <p className="text-gray-600 mb-6">
            Avaliação multidimensional: académico, comportamento, liderança, desporto e serviço comunitário
          </p>
          <ResponsiveContainer width="100%" height={500}>
            <RadarChart data={data.categoryPoints}>
              <PolarGrid stroke="#e5e7eb" />
              <PolarAngleAxis dataKey="categoria" />
              <PolarRadiusAxis />
              <Tooltip />
              <Legend />
              {data.houses.map(house => (
                <Radar 
                  key={house.house_id}
                  name={house.nome}
                  dataKey={house.nome}
                  stroke={house.cor}
                  fill={house.cor}
                  fillOpacity={0.2}
                  strokeWidth={3}
                />
              ))}
            </RadarChart>
          </ResponsiveContainer>
        </div>

        {/* Eventos Recentes */}
        <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-3xl shadow-2xl p-8 border-2 border-indigo-200">
          <h2 className="text-3xl font-bold mb-6 flex items-center gap-3">
            <Sparkles className="w-8 h-8 text-indigo-600" />
            Conquistas Recentes
          </h2>
          <div className="space-y-4">
            {data.recentEvents.map((event, idx) => {
              const house = data.houses.find(h => h.nome === event.house);
              const houseColor = house ? house.cor : '#cccccc';
              return (
                <div 
                  key={idx}
                  className="bg-white rounded-2xl p-6 flex items-center gap-6 shadow-lg hover:shadow-xl transition-all"
                >
                  <div 
                    className="w-16 h-16 rounded-full flex items-center justify-center text-3xl shadow-lg"
                    style={{ backgroundColor: houseColor + '30' }}
                  >
                    {house ? house.logo_url : '❓'}
                  </div>
                  <div className="flex-1">
                    <div className="flex items-center gap-3 mb-2">
                      <h3 className="text-xl font-bold" style={{ color: houseColor }}>
                        {event.house}
                      </h3>
                      <span 
                        className="px-3 py-1 rounded-full text-xs font-semibold text-white"
                        style={{ backgroundColor: houseColor }}
                      >
                        {event.tipo}
                      </span>
                    </div>
                    <p className="text-gray-700 font-medium">{event.evento}</p>
                    <p className="text-sm text-gray-500 mt-1">
                      {new Date(event.data).toLocaleDateString('pt-PT', { 
                        day: 'numeric', 
                        month: 'long', 
                        year: 'numeric' 
                      })}
                    </p>
                  </div>
                  <div className="text-right">
                    <div 
                      className="text-4xl font-bold"
                      style={{ color: houseColor }}
                    >
                      +{event.pontos}
                    </div>
                    <div className="text-sm text-gray-600">pontos</div>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Rodapé Inspirador */}
        <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-pink-600 text-white rounded-3xl shadow-2xl p-8 text-center">
          <div className="flex items-center justify-center gap-3 mb-4">
            <Heart className="w-8 h-8" />
            <h3 className="text-3xl font-bold">Juntos Somos Mais Fortes</h3>
            <Heart className="w-8 h-8" />
          </div>
          <p className="text-xl opacity-90 max-w-3xl mx-auto">
            Cada House é uma família. Cada vitória é coletiva. Cada desafio é uma oportunidade de crescer juntos.
          </p>
          <div className="mt-6 flex items-center justify-center gap-8 text-sm">
            <div className="flex items-center gap-2">
              <Trophy className="w-5 h-5" />
              <span>Excelência</span>
            </div>
            <div className="flex items-center gap-2">
              <Users className="w-5 h-5" />
              <span>Comunidade</span>
            </div>
            <div className="flex items-center gap-2">
              <Zap className="w-5 h-5" />
              <span>Energia</span>
            </div>
            <div className="flex items-center gap-2">
              <Award className="w-5 h-5" />
              <span>Reconhecimento</span>
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};

export default HousesDashboard;
