import React, { useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell,
  PieChart, Pie
} from 'recharts';
import { FiUser, FiCheckCircle, FiDownload, FiTrendingUp, FiClock, FiLayers, FiTarget, FiZap } from 'react-icons/fi';
import * as XLSX from 'xlsx';

/**
 * Dashboard - Apple Design System
 * Estadísticas y métricas del proyecto con diseño limpio y minimalista
 */
const Dashboard = ({ stories, columns, currentJsonFile, startDate, endDate }) => {
  // Calcular estadísticas
  const totalStories = stories.length;
  const completedStories = stories.filter(story => story.completedAt).length;
  const pendingStories = totalStories - completedStories;
  const progressPercentage = totalStories > 0
    ? Math.round((completedStories / totalStories) * 100)
    : 0;

  // Criterios
  const totalCriteria = stories.reduce((acc, story) => acc + (story.criteria?.length || 0), 0);
  const completedCriteria = stories.reduce((acc, story) =>
    acc + (story.criteria?.filter(c => c.checked).length || 0), 0);
  const criteriaPercentage = totalCriteria > 0
    ? Math.round((completedCriteria / totalCriteria) * 100)
    : 0;

  // Tiempo promedio de finalización
  const completedStoriesWithDuration = stories.filter(story =>
    story.completedAt && story.createdAt);
  const avgCompletionTime = completedStoriesWithDuration.length > 0
    ? Math.round(completedStoriesWithDuration.reduce((acc, story) =>
      acc + (new Date(story.completedAt) - new Date(story.createdAt)) / (1000 * 60 * 60 * 24), 0)
      / completedStoriesWithDuration.length)
    : 0;

  // Métricas por tipo de tarea (esfuerzo en horas): planificado vs realizado
  const tipoMetrics = useMemo(() => {
    const TIPOS_ORDEN = ['Operativa', 'Soporte', 'Comercial', 'Administrativa', 'Sin tipo'];
    const TIPO_CONFIG = {
      'Operativa': { color: '#0a84ff', colorLight: '#0a84ff22', text: 'text-blue-700' },
      'Soporte': { color: '#ff9f0a', colorLight: '#ff9f0a22', text: 'text-amber-700' },
      'Comercial': { color: '#30d158', colorLight: '#30d15822', text: 'text-emerald-700' },
      'Administrativa': { color: '#bf5af2', colorLight: '#bf5af222', text: 'text-violet-700' },
      'Sin tipo': { color: '#8e8e93', colorLight: '#8e8e9322', text: 'text-neutral-600' },
    };

    // Normalizar tipos para manejar variaciones de género (masculino/femenino)
    const normalizeTipo = (tipo) => {
      if (!tipo || tipo.trim() === '') return 'Sin tipo';
      const tipoLower = tipo.toLowerCase().trim();
      // Mapear variaciones al tipo canónico
      if (tipoLower === 'operativa' || tipoLower === 'operativo') return 'Operativa';
      if (tipoLower === 'administrativa' || tipoLower === 'administrativo') return 'Administrativa';
      if (tipoLower === 'soporte') return 'Soporte';
      if (tipoLower === 'comercial') return 'Comercial';
      return 'Sin tipo'; // Historias con tipo no reconocido van a "Sin tipo"
    };

    const parseEsfuerzo = (val) => {
      if (!val) return 0;
      const num = parseFloat(String(val).replace(',', '.'));
      return isNaN(num) ? 0 : num;
    };

    // Acumular horas planificadas y realizadas por tipo
    const tipoMap = {};
    TIPOS_ORDEN.forEach(t => { tipoMap[t] = { planificado: 0, realizado: 0 }; });

    stories.forEach(story => {
      const tipoNormalizado = normalizeTipo(story.tipo);
      const hrs = parseEsfuerzo(story.esfuerzo);
      if (tipoMap.hasOwnProperty(tipoNormalizado)) {
        tipoMap[tipoNormalizado].planificado += hrs;
        if (story.completedAt) {
          tipoMap[tipoNormalizado].realizado += hrs;
        }
      }
    });

    const totalPlanificado = Object.values(tipoMap).reduce((a, b) => a + b.planificado, 0);
    const totalRealizado = Object.values(tipoMap).reduce((a, b) => a + b.realizado, 0);

    const items = TIPOS_ORDEN.map(tipo => ({
      tipo,
      planificado: tipoMap[tipo].planificado,
      realizado: tipoMap[tipo].realizado,
      porcentaje: totalPlanificado > 0 ? Math.round((tipoMap[tipo].planificado / totalPlanificado) * 100) : 0,
      progreso: tipoMap[tipo].planificado > 0 ? Math.round((tipoMap[tipo].realizado / tipoMap[tipo].planificado) * 100) : 0,
      config: TIPO_CONFIG[tipo],
    })).filter(i => i.planificado > 0); // Solo mostrar tipos con horas

    // Datos para el donut chart (solo tipos con horas > 0)
    const donutData = items
      .map(i => ({ name: i.tipo, value: i.planificado, color: i.config.color }));

    return { items, donutData, totalPlanificado, totalRealizado };
  }, [stories]);

  // Métricas por usuario
  const userMetrics = useMemo(() => {
    const userMap = new Map();
    stories.forEach(story => {
      const user = story.user || 'Sin asignar';
      if (!userMap.has(user)) {
        userMap.set(user, {
          name: user,
          totalStories: 0,
          completedStories: 0,
          totalCriteria: 0,
          completedCriteria: 0
        });
      }
      const userData = userMap.get(user);
      userData.totalStories++;
      if (story.completedAt) userData.completedStories++;
      (story.criteria || []).forEach(c => {
        userData.totalCriteria++;
        if (c.checked) userData.completedCriteria++;
      });
    });
    return Array.from(userMap.values())
      .map(user => ({
        ...user,
        completionRate: user.totalStories > 0
          ? Math.round((user.completedStories / user.totalStories) * 100)
          : 0,
        criteriaRate: user.totalCriteria > 0
          ? Math.round((user.completedCriteria / user.totalCriteria) * 100)
          : 0
      }))
      .sort((a, b) => b.completionRate - a.completionRate);
  }, [stories]);

  // Métricas de esfuerzo por persona y tipo de tarea
  const userEffortMetrics = useMemo(() => {
    const TIPOS_ORDEN = ['Operativa', 'Soporte', 'Comercial', 'Administrativa', 'Sin tipo'];
    const users = [...new Set(stories.map(s => s.user || 'Sin asignar'))].sort();

    const normalizeTipo = (tipo) => {
      if (!tipo || tipo.trim() === '') return 'Sin tipo';
      const tipoLower = tipo.toLowerCase().trim();
      if (tipoLower === 'operativa' || tipoLower === 'operativo') return 'Operativa';
      if (tipoLower === 'administrativa' || tipoLower === 'administrativo') return 'Administrativa';
      if (tipoLower === 'soporte') return 'Soporte';
      if (tipoLower === 'comercial') return 'Comercial';
      return 'Sin tipo';
    };

    const parseEsfuerzo = (val) => {
      if (!val) return 0;
      const num = parseFloat(String(val).replace(',', '.'));
      return isNaN(num) ? 0 : num;
    };

    return users.map(user => {
      const userStories = stories.filter(s => (s.user || 'Sin asignar') === user);
      const metrics = TIPOS_ORDEN.map(tipo => {
        const storiesOfThisType = userStories.filter(s => normalizeTipo(s.tipo) === tipo);
        const planificado = storiesOfThisType.reduce((acc, s) => acc + parseEsfuerzo(s.esfuerzo), 0);
        const realizado = storiesOfThisType.reduce((acc, s) => s.completedAt ? acc + parseEsfuerzo(s.esfuerzo) : acc, 0);
        return { tipo, planificado, realizado };
      }).filter(m => m.planificado > 0);

      const totalPlan = metrics.reduce((a, b) => a + b.planificado, 0);
      const totalReal = metrics.reduce((a, b) => a + b.realizado, 0);

      return { user, metrics, totalPlan, totalReal };
    }).filter(u => u.totalPlan > 0)
      .sort((a, b) => b.totalPlan - a.totalPlan);
  }, [stories]);

  // Métricas por proyecto
  const projectMetrics = useMemo(() => {
    const projectMap = new Map();
    stories.forEach(story => {
      let clientId = 'Sin proyecto';
      if (story.id_historia) {
        // Extraer prefijo del proyecto: "ANDERSEN-001" → "ANDERSEN", "HU-DOBRA-001" → "HU-DOBRA"
        const match = story.id_historia.match(/^(.+?)-\d+$/i);
        if (match && match[1]) clientId = match[1];
      }
      if (clientId === 'Sin proyecto' && story.jsonFileName) {
        clientId = story.jsonFileName.replace('.json', '');
      }
      if (!projectMap.has(clientId)) {
        projectMap.set(clientId, {
          name: clientId,
          totalStories: 0,
          completedStories: 0,
          totalCriteria: 0,
          completedCriteria: 0
        });
      }
      const data = projectMap.get(clientId);
      data.totalStories++;
      if (story.completedAt) data.completedStories++;
      (story.criteria || []).forEach(c => {
        data.totalCriteria++;
        if (c.checked) data.completedCriteria++;
      });
    });
    return Array.from(projectMap.values())
      .map(p => ({
        ...p,
        completionRate: p.totalStories > 0 ? Math.round((p.completedStories / p.totalStories) * 100) : 0,
        criteriaRate: p.totalCriteria > 0 ? Math.round((p.completedCriteria / p.totalCriteria) * 100) : 0
      }))
      .sort((a, b) => b.completionRate - a.completionRate);
  }, [stories]);

  // Colores Apple-inspired para gráficos
  const COLORS = ['#0a84ff', '#30d158', '#ff9f0a', '#ff453a', '#bf5af2', '#64d2ff', '#ff375f', '#ffd60a', '#ac8e68', '#5e5ce6'];

  // Tooltip personalizado
  const CustomTooltip = ({ active, payload, label }) => {
    if (active && payload && payload.length) {
      return (
        <div className="bg-white/95 backdrop-blur-sm border border-neutral-200 shadow-apple-lg rounded-apple px-3 py-2">
          <p className="text-xs font-medium text-neutral-900 mb-1">{label}</p>
          {payload.map((entry, idx) => (
            <p key={idx} className="text-xs" style={{ color: entry.color }}>
              {entry.value}%
            </p>
          ))}
        </div>
      );
    }
    return null;
  };

  // Export helpers
  const exportProjectsToExcel = () => {
    const data = projectMetrics.map(p => ({
      'Proyecto': p.name,
      'Historias Completadas': p.completedStories,
      'Historias Totales': p.totalStories,
      '% Completado': `${p.completionRate}%`,
      'Criterios Completados': p.completedCriteria,
      'Criterios Totales': p.totalCriteria,
      '% Criterios': `${p.criteriaRate}%`
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Proyectos');
    const timestamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `proyectos_${timestamp}.xlsx`);
  };

  const exportUsersToExcel = () => {
    const data = userMetrics.map(u => ({
      'Asignado': u.name,
      'Historias Completadas': u.completedStories,
      'Historias Totales': u.totalStories,
      '% Completado': `${u.completionRate}%`,
      'Criterios Completados': u.completedCriteria,
      'Criterios Totales': u.totalCriteria,
      '% Criterios': `${u.criteriaRate}%`
    }));
    const ws = XLSX.utils.json_to_sheet(data);
    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, 'Asignados');
    const timestamp = new Date().toISOString().slice(0, 10);
    XLSX.writeFile(wb, `asignados_${timestamp}.xlsx`);
  };

  return (
    <div className="space-y-6 w-full max-w-full box-border">
      {/* Header */}
      <div className="flex items-center justify-between flex-wrap gap-2">
        <div className="min-w-0">
          <h2 className="text-xl font-semibold text-neutral-900">Dashboard</h2>
          {currentJsonFile && (
            <p className="text-sm text-neutral-500 mt-0.5 truncate">{currentJsonFile}</p>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 w-full">
        {/* Progress */}
        <div className="card p-4 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-apple bg-primary-50 flex items-center justify-center">
              <FiTrendingUp className="w-4.5 h-4.5 text-primary-500" />
            </div>
            <span className="text-2xl font-bold text-neutral-900">{progressPercentage}%</span>
          </div>
          <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-primary-500 rounded-full transition-all duration-500 ease-apple"
              style={{ width: `${progressPercentage}%` }}
            />
          </div>
          <p className="text-xs text-neutral-500 mt-2">Progreso general</p>
        </div>

        {/* Stories */}
        <div className="card p-4 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-apple bg-success-50 flex items-center justify-center">
              <FiCheckCircle className="w-4.5 h-4.5 text-success-500" />
            </div>
            <span className="text-2xl font-bold text-neutral-900">{completedStories}<span className="text-sm font-normal text-neutral-400">/{totalStories}</span></span>
          </div>
          <div className="flex items-center gap-3 text-xs">
            <span className="text-success-600">{completedStories} completadas</span>
            <span className="text-neutral-300">|</span>
            <span className="text-warning-600">{pendingStories} pendientes</span>
          </div>
          <p className="text-xs text-neutral-500 mt-2">Historias de usuario</p>
        </div>

        {/* Criteria */}
        <div className="card p-4 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-apple bg-purple-50 flex items-center justify-center">
              <FiTarget className="w-4.5 h-4.5 text-purple-500" />
            </div>
            <span className="text-2xl font-bold text-neutral-900">{criteriaPercentage}%</span>
          </div>
          <div className="h-1.5 bg-neutral-100 rounded-full overflow-hidden">
            <div
              className="h-full bg-purple-500 rounded-full transition-all duration-500 ease-apple"
              style={{ width: `${criteriaPercentage}%` }}
            />
          </div>
          <p className="text-xs text-neutral-500 mt-2">{completedCriteria}/{totalCriteria} criterios</p>
        </div>

        {/* Avg Time */}
        <div className="card p-4 min-w-0">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-apple bg-warning-50 flex items-center justify-center">
              <FiClock className="w-4.5 h-4.5 text-warning-500" />
            </div>
            <span className="text-2xl font-bold text-neutral-900">{avgCompletionTime}<span className="text-sm font-normal text-neutral-400"> días</span></span>
          </div>
          <p className="text-xs text-neutral-500 mt-2">Tiempo promedio por historia</p>
        </div>
      </div>

      {/* Esfuerzo por Tipo de Tarea — Donut + Planificado vs Realizado */}
      <div className="card p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-5">
          <FiZap className="w-5 h-5 text-neutral-400 flex-shrink-0" />
          <h3 className="text-base font-semibold text-neutral-900">Esfuerzo por Tipo de Tarea</h3>
        </div>

        <div className="flex flex-col lg:flex-row items-center lg:items-start gap-6 lg:gap-8">
          {/* Donut Chart — distribución planificada */}
          <div className="relative flex-shrink-0" style={{ width: 200, height: 200 }}>
            {tipoMetrics.donutData.length > 0 ? (
              <ResponsiveContainer width="100%" height="100%">
                <PieChart>
                  <Pie
                    data={tipoMetrics.donutData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={90}
                    paddingAngle={3}
                    dataKey="value"
                    stroke="none"
                    animationBegin={0}
                    animationDuration={800}
                  >
                    {tipoMetrics.donutData.map((entry, idx) => (
                      <Cell key={idx} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip
                    content={({ active, payload }) => {
                      if (active && payload && payload.length) {
                        const d = payload[0].payload;
                        return (
                          <div className="bg-white/95 backdrop-blur-sm border border-neutral-200 shadow-apple-lg rounded-apple px-3 py-2">
                            <p className="text-xs font-semibold" style={{ color: d.color }}>{d.name}</p>
                            <p className="text-xs text-neutral-600">{d.value % 1 === 0 ? d.value : d.value.toFixed(1)} hrs</p>
                          </div>
                        );
                      }
                      return null;
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <div className="w-full h-full rounded-full border-[12px] border-neutral-100 flex items-center justify-center">
                <span className="text-xs text-neutral-400">Sin datos</span>
              </div>
            )}
            {/* Centro del donut */}
            {tipoMetrics.donutData.length > 0 && (
              <div className="absolute inset-0 flex flex-col items-center justify-center pointer-events-none">
                <span className="text-2xl font-bold text-neutral-900">
                  {tipoMetrics.totalPlanificado % 1 === 0 ? tipoMetrics.totalPlanificado : tipoMetrics.totalPlanificado.toFixed(1)}
                </span>
                <span className="text-[11px] text-neutral-400 -mt-0.5">hrs totales</span>
              </div>
            )}
          </div>

          {/* Breakdown por tipo: planificado vs realizado */}
          <div className="flex-1 w-full min-w-0 space-y-4">
            {tipoMetrics.items.map(({ tipo, planificado, realizado, porcentaje, progreso, config }) => {
              const fmtHrs = (v) => v % 1 === 0 ? v : v.toFixed(1);
              return (
                <div key={tipo} className="group">
                  {/* Encabezado del tipo */}
                  <div className="flex items-center justify-between mb-1.5">
                    <div className="flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full flex-shrink-0" style={{ backgroundColor: config.color }} />
                      <span className="text-sm font-semibold text-neutral-900">{tipo}</span>
                      <span className={`text-[11px] font-medium ${config.text}`}>{porcentaje}%</span>
                    </div>
                    <div className="flex items-baseline gap-1">
                      <span className="text-sm font-bold text-neutral-900">{fmtHrs(realizado)}</span>
                      <span className="text-[11px] text-neutral-400">/ {fmtHrs(planificado)} hrs</span>
                    </div>
                  </div>

                  {/* Barra de progreso: planificado (fondo) vs realizado (relleno) */}
                  <div className="h-2 rounded-full overflow-hidden" style={{ backgroundColor: config.colorLight }}>
                    <div
                      className="h-full rounded-full transition-all duration-700 ease-apple"
                      style={{ width: `${progreso}%`, backgroundColor: config.color }}
                    />
                  </div>

                  {/* Label de progreso */}
                  <div className="flex justify-between mt-1">
                    <span className="text-[11px] text-neutral-400">
                      {progreso === 100 ? 'Completado' : progreso === 0 ? 'Pendiente' : `${progreso}% realizado`}
                    </span>
                    {planificado > 0 && realizado < planificado && (
                      <span className="text-[11px] text-neutral-400">
                        Restan {fmtHrs(planificado - realizado)} hrs
                      </span>
                    )}
                  </div>
                </div>
              );
            })}

            {/* Resumen total */}
            <div className="pt-3 mt-1 border-t border-neutral-100 flex items-center justify-between">
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-neutral-300" />
                  <span className="text-xs text-neutral-500">
                    Planificado: <span className="font-semibold text-neutral-700">
                      {tipoMetrics.totalPlanificado % 1 === 0 ? tipoMetrics.totalPlanificado : tipoMetrics.totalPlanificado.toFixed(1)} hrs
                    </span>
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <div className="w-2 h-2 rounded-full bg-neutral-900" />
                  <span className="text-xs text-neutral-500">
                    Realizado: <span className="font-semibold text-neutral-700">
                      {tipoMetrics.totalRealizado % 1 === 0 ? tipoMetrics.totalRealizado : tipoMetrics.totalRealizado.toFixed(1)} hrs
                    </span>
                  </span>
                </div>
              </div>
              <span className="text-sm font-bold" style={{ color: tipoMetrics.totalPlanificado > 0 && tipoMetrics.totalRealizado >= tipoMetrics.totalPlanificado ? '#30d158' : '#0a84ff' }}>
                {tipoMetrics.totalPlanificado > 0 ? Math.round((tipoMetrics.totalRealizado / tipoMetrics.totalPlanificado) * 100) : 0}%
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Esfuerzo por Persona y Tipo — Nueva sección solicitada */}
      {userEffortMetrics.length > 0 && (
        <div className="card p-4 sm:p-6 animate-in">
          <div className="flex items-center gap-2 mb-5">
            <FiUser className="w-5 h-5 text-neutral-400 flex-shrink-0" />
            <h3 className="text-base font-semibold text-neutral-900">Esfuerzo por Persona y Tipo de Tarea</h3>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {userEffortMetrics.map((userMetric, idx) => (
              <div key={userMetric.user} className="p-4 bg-neutral-50 rounded-apple-lg border border-neutral-100 flex flex-col">
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-2">
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-[10px] font-bold" style={{ backgroundColor: COLORS[idx % COLORS.length] }}>
                      {userMetric.user.charAt(0).toUpperCase()}
                    </div>
                    <span className="text-sm font-bold text-neutral-900 truncate max-w-[120px]">{userMetric.user}</span>
                  </div>
                  <div className="text-right">
                    <p className="text-[10px] text-neutral-400 uppercase tracking-wider font-medium">Total</p>
                    <p className="text-xs font-bold text-neutral-900">{userMetric.totalReal.toFixed(1)} / {userMetric.totalPlan.toFixed(1)} hrs</p>
                  </div>
                </div>

                <div className="space-y-3 mt-auto">
                  {userMetric.metrics.map((m) => {
                    const TIPO_CONFIG = {
                      'Operativa': { color: '#0a84ff' },
                      'Soporte': { color: '#ff9f0a' },
                      'Comercial': { color: '#30d158' },
                      'Administrativa': { color: '#bf5af2' },
                      'Sin tipo': { color: '#8e8e93' },
                    };
                    const config = TIPO_CONFIG[m.tipo] || { color: '#8e8e93' };
                    const progreso = m.planificado > 0 ? Math.round((m.realizado / m.planificado) * 100) : 0;

                    return (
                      <div key={m.tipo}>
                        <div className="flex justify-between text-[10px] mb-1">
                          <span className="font-medium text-neutral-600">{m.tipo}</span>
                          <span className="text-neutral-400">{m.realizado.toFixed(1)} / {m.planificado.toFixed(1)} hrs</span>
                        </div>
                        <div className="h-1 bg-neutral-200 rounded-full overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${progreso}%`, backgroundColor: config.color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Project Progress */}
      <div className="card p-4 sm:p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FiLayers className="w-5 h-5 text-neutral-400 flex-shrink-0" />
            <h3 className="text-base font-semibold text-neutral-900">Progreso por Proyecto</h3>
          </div>
          <button
            onClick={exportProjectsToExcel}
            className="btn btn-secondary text-xs inline-flex items-center gap-1.5 flex-shrink-0"
          >
            <FiDownload className="w-3.5 h-3.5" />
            Excel
          </button>
        </div>

        {projectMetrics.length > 0 ? (
          <div className="space-y-5">
            {/* Bar Chart */}
            <div className="h-48 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={projectMetrics}
                  layout="vertical"
                  margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                  barSize={20}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#8e8e93' }} axisLine={false} tickLine={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={100}
                    tick={{ fontSize: 11, fill: '#3a3a3c' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="completionRate" radius={[0, 6, 6, 0]}>
                    {projectMetrics.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* Project cards */}
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-3">
              {projectMetrics.map((project, index) => (
                <div key={project.name} className="p-4 bg-neutral-50 rounded-apple-lg border border-neutral-100">
                  <div className="flex items-center gap-2 mb-2">
                    <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: COLORS[index % COLORS.length] }} />
                    <span className="text-sm font-semibold text-neutral-900">{project.name}</span>
                  </div>
                  <div className="space-y-2">
                    <div>
                      <div className="flex justify-between text-xs text-neutral-500 mb-1">
                        <span>Historias</span>
                        <span className="font-medium text-neutral-700">{project.completedStories}/{project.totalStories}</span>
                      </div>
                      <div className="h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                        <div className="h-full rounded-full transition-all duration-300" style={{ width: `${project.completionRate}%`, backgroundColor: COLORS[index % COLORS.length] }} />
                      </div>
                    </div>
                    <div>
                      <div className="flex justify-between text-xs text-neutral-500 mb-1">
                        <span>Criterios</span>
                        <span className="font-medium text-neutral-700">{project.completedCriteria}/{project.totalCriteria}</span>
                      </div>
                      <div className="h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                        <div className="h-full bg-purple-400 rounded-full transition-all duration-300" style={{ width: `${project.criteriaRate}%` }} />
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-neutral-400 text-center py-8">No hay datos de proyectos disponibles.</p>
        )}
      </div>

      {/* User Progress */}
      <div className="card p-4 sm:p-6">
        <div className="flex items-center justify-between mb-5 flex-wrap gap-2">
          <div className="flex items-center gap-2 min-w-0">
            <FiUser className="w-5 h-5 text-neutral-400 flex-shrink-0" />
            <h3 className="text-base font-semibold text-neutral-900">Progreso por Asignado</h3>
          </div>
          <button
            onClick={exportUsersToExcel}
            className="btn btn-secondary text-xs inline-flex items-center gap-1.5 flex-shrink-0"
          >
            <FiDownload className="w-3.5 h-3.5" />
            Excel
          </button>
        </div>

        {userMetrics.length > 0 ? (
          <div className="space-y-5">
            {/* Bar Chart */}
            <div className="h-48 w-full min-w-0">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={userMetrics}
                  layout="vertical"
                  margin={{ top: 0, right: 20, left: 0, bottom: 0 }}
                  barSize={20}
                >
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" horizontal={false} />
                  <XAxis type="number" domain={[0, 100]} tick={{ fontSize: 11, fill: '#8e8e93' }} axisLine={false} tickLine={false} />
                  <YAxis
                    dataKey="name"
                    type="category"
                    width={100}
                    tick={{ fontSize: 11, fill: '#3a3a3c' }}
                    axisLine={false}
                    tickLine={false}
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <Bar dataKey="completionRate" radius={[0, 6, 6, 0]}>
                    {userMetrics.map((_, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>

            {/* User cards */}
            <div className="space-y-2">
              {userMetrics.map((user, index) => (
                <div key={user.name} className="flex items-center gap-4 p-3 bg-neutral-50 rounded-apple-lg border border-neutral-100">
                  <div className="w-8 h-8 rounded-full flex items-center justify-center text-white text-xs font-bold" style={{ backgroundColor: COLORS[index % COLORS.length] }}>
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between mb-1">
                      <span className="text-sm font-medium text-neutral-900 truncate">{user.name}</span>
                      <span className="text-xs font-semibold text-neutral-700 ml-2">{user.completionRate}%</span>
                    </div>
                    <div className="h-1.5 bg-neutral-200 rounded-full overflow-hidden">
                      <div className="h-full rounded-full transition-all duration-300" style={{ width: `${user.completionRate}%`, backgroundColor: COLORS[index % COLORS.length] }} />
                    </div>
                    <div className="flex gap-4 mt-1.5 text-[11px] text-neutral-500">
                      <span>{user.completedStories}/{user.totalStories} historias</span>
                      <span>{user.completedCriteria}/{user.totalCriteria} criterios</span>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <p className="text-sm text-neutral-400 text-center py-8">No hay datos de asignados disponibles.</p>
        )}
      </div>

      {/* Recently Completed Stories */}
      <div className="card p-4 sm:p-6">
        <div className="flex items-center gap-2 mb-4">
          <FiCheckCircle className="w-5 h-5 text-success-500 flex-shrink-0" />
          <h3 className="text-base font-semibold text-neutral-900">Completadas Recientemente</h3>
        </div>

        {completedStoriesWithDuration.length > 0 ? (
          <div className="space-y-2">
            {completedStoriesWithDuration
              .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
              .slice(0, 5)
              .map(story => (
                <div key={story._id} className="flex items-center justify-between p-3 bg-neutral-50 rounded-apple-lg border border-neutral-100">
                  <div className="flex-1 min-w-0">
                    <p className="text-sm font-medium text-neutral-900 truncate">{story.title}</p>
                    <p className="text-[11px] text-neutral-400 mt-0.5">
                      {new Date(story.completedAt).toLocaleDateString('es-ES', { day: '2-digit', month: 'short', year: 'numeric' })}
                    </p>
                  </div>
                  <span className="badge-success text-[11px] ml-3 flex-shrink-0">
                    {Math.ceil((new Date(story.completedAt) - new Date(story.createdAt)) / (1000 * 60 * 60 * 24))} días
                  </span>
                </div>
              ))}
          </div>
        ) : (
          <div className="text-center py-8">
            <FiCheckCircle className="w-10 h-10 text-neutral-200 mx-auto mb-2" />
            <p className="text-sm text-neutral-400">No hay historias completadas aún.</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
