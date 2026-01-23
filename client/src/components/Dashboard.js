import React, { useMemo } from 'react';
import {
  ResponsiveContainer, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Cell
} from 'recharts';
import { FiUser, FiCheckCircle, FiDownload, FiTrendingUp, FiClock, FiLayers, FiTarget } from 'react-icons/fi';
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

  // Métricas por proyecto
  const projectMetrics = useMemo(() => {
    const projectMap = new Map();
    stories.forEach(story => {
      let clientId = 'Sin proyecto';
      if (story.id_historia) {
        const match = story.id_historia.match(/^HU-([A-Za-z0-9]{2,5})-/i);
        if (match && match[1]) clientId = match[1];
      } else if (story.jsonFileName) {
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
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-neutral-900">Dashboard</h2>
          {currentJsonFile && (
            <p className="text-sm text-neutral-500 mt-0.5">{currentJsonFile}</p>
          )}
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* Progress */}
        <div className="card p-5">
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
        <div className="card p-5">
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
        <div className="card p-5">
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
        <div className="card p-5">
          <div className="flex items-center justify-between mb-3">
            <div className="w-9 h-9 rounded-apple bg-warning-50 flex items-center justify-center">
              <FiClock className="w-4.5 h-4.5 text-warning-500" />
            </div>
            <span className="text-2xl font-bold text-neutral-900">{avgCompletionTime}<span className="text-sm font-normal text-neutral-400"> días</span></span>
          </div>
          <p className="text-xs text-neutral-500 mt-2">Tiempo promedio por historia</p>
        </div>
      </div>

      {/* Project Progress */}
      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <FiLayers className="w-5 h-5 text-neutral-400" />
            <h3 className="text-base font-semibold text-neutral-900">Progreso por Proyecto</h3>
          </div>
          <button
            onClick={exportProjectsToExcel}
            className="btn btn-secondary text-xs inline-flex items-center gap-1.5"
          >
            <FiDownload className="w-3.5 h-3.5" />
            Excel
          </button>
        </div>

        {projectMetrics.length > 0 ? (
          <div className="space-y-5">
            {/* Bar Chart */}
            <div className="h-48">
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
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
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
      <div className="card p-6">
        <div className="flex items-center justify-between mb-5">
          <div className="flex items-center gap-2">
            <FiUser className="w-5 h-5 text-neutral-400" />
            <h3 className="text-base font-semibold text-neutral-900">Progreso por Asignado</h3>
          </div>
          <button
            onClick={exportUsersToExcel}
            className="btn btn-secondary text-xs inline-flex items-center gap-1.5"
          >
            <FiDownload className="w-3.5 h-3.5" />
            Excel
          </button>
        </div>

        {userMetrics.length > 0 ? (
          <div className="space-y-5">
            {/* Bar Chart */}
            <div className="h-48">
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
      <div className="card p-6">
        <div className="flex items-center gap-2 mb-4">
          <FiCheckCircle className="w-5 h-5 text-success-500" />
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
