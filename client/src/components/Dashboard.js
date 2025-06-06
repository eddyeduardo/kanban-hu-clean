import React, { useMemo } from 'react';
import { 
  LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, Legend, 
  ResponsiveContainer, AreaChart, Area, BarChart, Bar, Cell 
} from 'recharts';
import { User, CheckCircle } from 'react-feather';

// Tooltip personalizado para los gráficos Burn Down
const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{ background: '#fff', border: '1px solid #ccc', padding: 10, borderRadius: 6 }}>
        <strong>Fecha: {label}</strong>
        <ul style={{ margin: 0, padding: 0, listStyle: 'none' }}>
          {payload.map((entry, idx) => (
            <li key={idx} style={{ color: entry.color, fontWeight: 'bold' }}>
              {entry.name}: {entry.value}
            </li>
          ))}
        </ul>
      </div>
    );
  }
  return null;
};


// Función para crear datos de ejemplo para el Burn Down Chart
// totalCriteria debe ser el valor real de criterios para la columna
const createExampleBurnDownData = (startDate, endDate, totalCriteria) => {
  const dateArray = [];
  // Normalizar fechas de entrada a medianoche UTC para evitar desfases
  const start = new Date(startDate);
  start.setHours(0, 0, 0, 0);
  const end = new Date(endDate);
  end.setHours(0, 0, 0, 0);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  // Generar todas las fechas entre start y end (ambos inclusive, sin desfase)
  let loopDate = new Date(start);
  while (loopDate <= end) {
    // Usar formato ISO YYYY-MM-DD para fechas en el eje X y los datos
    const isoDate = loopDate.toISOString().slice(0, 10); // YYYY-MM-DD
    dateArray.push({
      dateStr: isoDate,
      date: new Date(loopDate.getTime())
    });
    loopDate.setDate(loopDate.getDate() + 1);
  }

  // Calcular la pendiente para la línea ideal
  const totalDays = dateArray.length - 1; // Restar 1 para que el último día sea exactamente 0
  const criteriosPerDay = totalDays > 0 ? totalCriteria / totalDays : totalCriteria;
  
  // Crear datos para el gráfico
  console.log('DEBUG dateArray:', dateArray);
  // Mostrar también el startDate y endDate que entran a la función
  console.log('DEBUG createExampleBurnDownData startDate:', startDate, 'endDate:', endDate);
  return dateArray.map((dateObj, index) => {
    const { dateStr, date } = dateObj;
    const dataPoint = { date: dateStr };
    
    // Línea ideal: comienza con el total de criterios y disminuye linealmente hasta 0
    if (index === 0) {
      // Primer día: exactamente el total de criterios
      dataPoint['Ideal'] = totalCriteria;
    } else if (index === dateArray.length - 1) {
      // Último día: exactamente 0
      dataPoint['Ideal'] = 0;
    } else {
      // Días intermedios: disminución lineal
      const idealRemaining = totalCriteria - (index * criteriosPerDay);
      dataPoint['Ideal'] = Math.round(idealRemaining * 100) / 100;
    }
    
    // Línea real: solo mostrar datos hasta la fecha actual
    if (date <= today) {
      if (index === 0) {
        // Primer día: exactamente el total de criterios
        dataPoint['Real'] = totalCriteria;
      } else {
        // Calcular progreso real hasta hoy
        const daysElapsed = Math.min(index, dateArray.findIndex(d => d.date > today));
        const progress = daysElapsed / totalDays;
        const randomFactor = 0.8 + (Math.random() * 0.4); // Entre 0.8 y 1.2
        const realProgress = progress < 0.3 ? progress * 0.5 : progress * 1.2;
        const realRemaining = Math.max(0, totalCriteria - (totalCriteria * realProgress * randomFactor));
        dataPoint['Real'] = Math.round(realRemaining);
      }
    }
    // No incluir datos de 'Real' para fechas futuras
    
    return dataPoint;
  });
};

/**
 * Dashboard component for displaying project statistics and metrics
 * 
 * @param {Object} props - Component props
 * @param {Array} props.stories - List of stories
 * @param {Array} props.columns - List of columns
 * @param {String} props.currentJsonFile - Current JSON file name
 * @param {Date} props.startDate - Start date for the Burn Down Chart
 * @param {Date} props.endDate - End date for the Burn Down Chart
 */
const Dashboard = ({ stories, columns, currentJsonFile, startDate, endDate }) => {
  console.log('Dashboard recibe startDate:', startDate, 'endDate:', endDate);

  // Calcular estadísticas
  const totalStories = stories.length;
  const completedStories = stories.filter(story => story.completedAt).length;
  const pendingStories = totalStories - completedStories;
  
  // Calcular porcentaje de progreso
  const progressPercentage = totalStories > 0 
    ? Math.round((completedStories / totalStories) * 100) 
    : 0;
  
  // Calcular criterios completados
  const totalCriteria = stories.reduce((acc, story) => acc + story.criteria.length, 0);
  const completedCriteria = stories.reduce((acc, story) => 
    acc + story.criteria.filter(criterion => criterion.checked).length, 0);
  
  // Calcular tiempo promedio de finalización (en días)
  const completedStoriesWithDuration = stories.filter(story => 
    story.completedAt && story.createdAt);
  
  const avgCompletionTime = completedStoriesWithDuration.length > 0 
    ? Math.round(completedStoriesWithDuration.reduce((acc, story) => 
        acc + (new Date(story.completedAt) - new Date(story.createdAt)) / (1000 * 60 * 60 * 24), 0) 
        / completedStoriesWithDuration.length)
    : 0;
    
  // Calcular métricas por usuario
  const userMetrics = useMemo(() => {
    const userMap = new Map();
    
    stories.forEach(story => {
      const user = story.user || 'Sin asignar';
      if (!userMap.has(user)) {
        userMap.set(user, {
          name: user,
          totalStories: 0,
          completedStories: 0,
          pendingStories: 0,
          totalCriteria: 0,
          completedCriteria: 0
        });
      }
      
      const userData = userMap.get(user);
      userData.totalStories++;
      
      if (story.completedAt) {
        userData.completedStories++;
      } else {
        userData.pendingStories++;
      }
      
      // Contar criterios
      story.criteria.forEach(criterion => {
        userData.totalCriteria++;
        if (criterion.checked) {
          userData.completedCriteria++;
        }
      });
    });
    
    // Calcular porcentajes
    return Array.from(userMap.values()).map(user => ({
      ...user,
      completionRate: user.totalStories > 0 
        ? Math.round((user.completedStories / user.totalStories) * 100) 
        : 0,
      criteriaCompletionRate: user.totalCriteria > 0
        ? Math.round((user.completedCriteria / user.totalCriteria) * 100)
        : 0
    }));
  }, [stories]);
  
  // Colores para las barras
  const COLORS = ['#0088FE', '#00C49F', '#FFBB28', '#FF8042', '#8884d8'];

  // Preparar datos para los gráficos de Burn Down Chart por columna
  const burnDownDataByColumn = useMemo(() => {
    console.log('Generando Burn Down Charts con:', { startDate, endDate, columns, stories });
    
    // Validar que las fechas sean válidas
    if (!startDate || !endDate || !startDate.getTime || !endDate.getTime) {
      console.log('Fechas no válidas:', { startDate, endDate });
      return {};
    }
    
    // Filtrar solo las columnas de trabajo (excluir la primera columna "To Do")
    const workColumns = columns.slice(1);
    
    // Generar un array de fechas entre startDate y endDate
    const dateArray = [];
    const currentDate = new Date(startDate);
    const lastDate = new Date(endDate);
    
    // Fecha actual para limitar los datos reales
    const today = new Date();
    today.setHours(0, 0, 0, 0); // Normalizar a inicio del día
    
    // Asegurarse de que las fechas son válidas
    if (isNaN(currentDate.getTime()) || isNaN(lastDate.getTime())) {
      return {};
    }
    
    // Generar todas las fechas entre startDate y endDate
    while (currentDate <= lastDate) {
      // Formatear la fecha como DD/MM/YYYY para asegurar consistencia
      const day = currentDate.getDate().toString().padStart(2, '0');
      const month = (currentDate.getMonth() + 1).toString().padStart(2, '0');
      const year = currentDate.getFullYear();
      dateArray.push({
        dateStr: `${day}/${month}/${year}`,
        date: new Date(currentDate.getTime()) // Copia exacta
      });
      // Avanzar al siguiente día
      currentDate.setDate(currentDate.getDate() + 1);
    }
    
    // Si no hay fechas, devolver objeto vacío
    if (dateArray.length === 0) return {};
    
    // Crear un objeto con datos para cada columna
    const chartDataByColumn = {};
    
    // Para cada columna, crear un conjunto de datos
    workColumns.forEach(column => {
      // Normalizar ambos valores a string para comparar correctamente
      // Comparar directamente story.column._id con column._id (ambos string)
      const columnStories = stories.filter(story => {
        const match = story.column && story.column._id === column._id;
        if (match) {
          console.log(`MATCH: story.column._id = ${story.column._id}, column._id = ${column._id}`);
        }
        return match;
      });
      console.log(`Filtrando historias para columna ${column.name}`, columnStories);
      
      // Calcular el total de criterios de aceptación para esta columna (por hacer + concluidos)
      let actualTotalCriteriaCount = 0;
      console.log('Historias en columna', column.name, columnStories);
      // Mostrar detalles de cada historia y sus criterios
      console.log(`Analizando criterios para ${columnStories.length} historias en la columna ${column.name}:`);
      
      // Verificar si hay historias en esta columna
      if (columnStories.length === 0) {
        console.log(`No hay historias en la columna ${column.name}`);
      } else {
        // Contar criterios para cada historia
        columnStories.forEach(story => {
          // Verificar que story.criteria sea un array válido
          if (!story.criteria || !Array.isArray(story.criteria)) {
            console.warn(`Historia "${story.title}" (ID: ${story._id}): No tiene criterios válidos`, story);
            return;
          }
          
          const criteriaCount = Array.isArray(story.criteria) ? story.criteria.length : 0;
          console.log(`Historia "${story.title}" (ID: ${story._id}): tiene ${criteriaCount} criterios`, story.criteria);

          
          // Verificar cada criterio individualmente
          if (criteriaCount > 0) {
            story.criteria.forEach((criterion, index) => {
              console.log(`  Criterio ${index + 1}: ${criterion.texto} (${criterion.checked ? 'Completado' : 'Pendiente'})`);
            });
          }
          
          actualTotalCriteriaCount += criteriaCount; // Sum into actualTotalCriteriaCount
        });
      }
      
      console.log(`Columna ${column.name} (ID: ${column._id}): ${columnStories.length} historias, ${actualTotalCriteriaCount} criterios totales`);
      
      // Si no hay criterios, usar un valor por defecto para mostrar el gráfico
      if (actualTotalCriteriaCount === 0) {
        console.warn(`ADVERTENCIA: El total de criterios de la columna '${column.name}' es 0. ¿Debería ser mayor?`);
        console.log(`Columna ${column.name}: No hay criterios, usando valor por defecto SOLO para ejemplo`);
        const exampleDisplayTotal = 10; // Solo para columnas vacías
        // Línea ideal solo dos puntos
        const exampleChartData = [];
        if (dateArray.length >= 2) {
          exampleChartData.push({
            date: dateArray[0].dateStr,
            Ideal: exampleDisplayTotal,
            Total: exampleDisplayTotal
          });
          for (let i = 1; i < dateArray.length - 1; i++) {
            exampleChartData.push({ date: dateArray[i].dateStr, Total: exampleDisplayTotal });
          }
          exampleChartData.push({
            date: dateArray[dateArray.length - 1].dateStr,
            Ideal: 0,
            Total: exampleDisplayTotal
          });
        }
        // Eje Y solo para ejemplo
        const yAxisValuesExample = [0, 2, 4, 6, 8, 10];
        chartDataByColumn[column._id] = {
          columnName: column.name,
          chartData: exampleChartData,
          totalCriteria: exampleDisplayTotal,
          yAxisValues: yAxisValuesExample,
          isExample: true
        };
        return;
      }
      
      // --- If we are here, actualTotalCriteriaCount > 0 ---
      let effectiveTotalCriteria = actualTotalCriteriaCount; // Start with the actual count

      // Forzar un valor mínimo para evitar problemas con el eje Y si es muy bajo (e.g. 1)
      if (effectiveTotalCriteria < 2) {
        console.log(`Columna ${column.name}: Ajustando effectiveTotalCriteria de ${effectiveTotalCriteria} a 2 para evitar problemas con el eje Y`);
        effectiveTotalCriteria = 2;
      }
      
      // Registrar el valor real de criterios para depuración
      console.log(`Columna ${column.name}: Usando valor efectivo de ${effectiveTotalCriteria} criterios (actual: ${actualTotalCriteriaCount})`);
      
      // Crear datos para el gráfico de esta columna
      // Línea ideal: solo dos puntos, el resto undefined
      const chartData = dateArray.map((dateObj, index) => {
        const { dateStr, date } = dateObj;
        const dataPoint = { date: dateStr, Total: effectiveTotalCriteria };
        // Línea ideal: solo primer y último punto
        if (index === 0) {
          dataPoint['Ideal'] = effectiveTotalCriteria;
        } else if (index === dateArray.length - 1) {
          dataPoint['Ideal'] = 0;
        } else {
          dataPoint['Ideal'] = null; // Para que Recharts dibuje solo la recta
        }
        // Línea real: criterios pendientes en la fecha actual (solo hasta hoy)
        if (date <= today) {
          // Restar criterios completados hasta esa fecha
          const pendingCriteria = columnStories.reduce((acc, story) => {
            const pendingInStory = story.criteria.filter(criterion => {
              // Si el criterio está completado Y su completedAt es <= la fecha, se descuenta
              if (criterion.checked && criterion.completedAt) {
                return new Date(criterion.completedAt) > date;
              }
              return !criterion.checked;
            }).length;
            return acc + pendingInStory;
          }, 0);
          dataPoint['Real'] = pendingCriteria;
        }
        return dataPoint;
      });
      
      // Calcular los valores exactos para el eje Y basados en el número real de criterios
      const yAxisValues = [];
      yAxisValues.push(0); // Siempre incluir 0
      
      if (effectiveTotalCriteria <= 5) {
        // Para 5 o menos criterios, mostrar cada valor entero
        for (let i = 1; i <= effectiveTotalCriteria; i++) {
          yAxisValues.push(i);
        }
      } else if (effectiveTotalCriteria <= 10) {
        // Para 6-10 criterios, mostrar valores distribuidos (aprox. 5 ticks)
        const step = effectiveTotalCriteria / 5;
        for (let i = 1; i <= 5; i++) {
          yAxisValues.push(Math.round(i * step));
        }
      } else {
        // Para más de 10 criterios, mostrar 5 marcas distribuidas (0%, 25%, 50%, 75%, 100%)
        yAxisValues.push(Math.round(0.25 * effectiveTotalCriteria));
        yAxisValues.push(Math.round(0.50 * effectiveTotalCriteria));
        yAxisValues.push(Math.round(0.75 * effectiveTotalCriteria));
        yAxisValues.push(effectiveTotalCriteria);
      }
      
      // Asegurar que los valores sean únicos, estén ordenados y el máximo esté presente
      let uniqueSortedYAxisValues = [...new Set(yAxisValues)].sort((a, b) => a - b);
      if (effectiveTotalCriteria > 0 && !uniqueSortedYAxisValues.includes(effectiveTotalCriteria)) {
        uniqueSortedYAxisValues.push(effectiveTotalCriteria);
        uniqueSortedYAxisValues = uniqueSortedYAxisValues.sort((a, b) => a - b);
      }
      
      chartDataByColumn[column._id] = {
        columnName: column.name,
        chartData: chartData,
        totalCriteria: effectiveTotalCriteria, // Guardar el total efectivo para el dominio del eje Y
        yAxisValues: uniqueSortedYAxisValues, // Guardar los ticks calculados
        isExample: false
      };
    });
    
    console.log('Datos generados para los Burn Down Charts:', chartDataByColumn);
    console.log('Número de columnas con gráficos:', Object.keys(chartDataByColumn).length);
    
    console.log('chartDataByColumn FINAL:', chartDataByColumn);
    return chartDataByColumn;
  }, [stories, columns, startDate, endDate]);
  
  return (
    <div className="dashboard">
      <h2 className="text-xl font-semibold text-slate-700 mb-4">
        Dashboard
        {currentJsonFile && (
          <span className="ml-2 text-sm font-normal text-blue-600">
            (Proyecto: {currentJsonFile})
          </span>
        )}
      </h2>
      
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        {/* Tarjeta de progreso general */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="text-sm font-medium text-slate-500 mb-1">Progreso General</h3>
          <div className="text-2xl font-bold text-slate-700">{progressPercentage}%</div>
          <div className="w-full bg-slate-200 rounded-full h-2.5 mt-2">
            <div 
              className="bg-blue-600 h-2.5 rounded-full" 
              style={{ width: `${progressPercentage}%` }}
            ></div>
          </div>
        </div>
        
        {/* Tarjeta de historias */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="text-sm font-medium text-slate-500 mb-1">Historias</h3>
          <div className="text-2xl font-bold text-slate-700">{completedStories} / {totalStories}</div>
          <div className="text-xs text-slate-500 mt-1">
            <span className="text-green-600">{completedStories} completadas</span> • 
            <span className="text-amber-600 ml-1">{pendingStories} pendientes</span>
          </div>
        </div>
        
        {/* Tarjeta de criterios */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="text-sm font-medium text-slate-500 mb-1">Criterios de Aceptación</h3>
          <div className="text-2xl font-bold text-slate-700">{completedCriteria} / {totalCriteria}</div>
          <div className="text-xs text-slate-500 mt-1">
            {totalCriteria > 0 ? Math.round((completedCriteria / totalCriteria) * 100) : 0}% completados
          </div>
        </div>
        
        {/* Tarjeta de tiempo promedio */}
        <div className="bg-white p-4 rounded-lg shadow-sm">
          <h3 className="text-sm font-medium text-slate-500 mb-1">Tiempo Promedio</h3>
          <div className="text-2xl font-bold text-slate-700">{avgCompletionTime} días</div>
          <div className="text-xs text-slate-500 mt-1">
            por historia completada
          </div>
        </div>
      </div>
      
      {/* Métricas por Usuario */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <h3 className="text-lg font-semibold text-slate-700 mb-4 flex items-center">
          <User className="mr-2" />
          Progreso por Asignado
        </h3>
        
        {userMetrics.length > 0 ? (
          <div className="space-y-6">
            {/* Gráfico de barras */}
            <div className="h-64">
              <ResponsiveContainer width="100%" height="100%">
                <BarChart
                  data={userMetrics}
                  layout="vertical"
                  margin={{ top: 5, right: 30, left: 20, bottom: 5 }}
                >
                  <CartesianGrid strokeDasharray="3 3" />
                  <XAxis type="number" domain={[0, 100]} />
                  <YAxis dataKey="name" type="category" width={120} />
                  <Tooltip 
                    formatter={(value, name) => [`${value}%`, name === 'completionRate' ? 'Historias Completadas' : 'Criterios Completados']}
                    labelFormatter={(name) => `Asignado: ${name}`}
                  />
                  <Legend />
                  <Bar dataKey="completionRate" name="Historias Completadas" fill="#8884d8">
                    {userMetrics.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                    ))}
                  </Bar>
                </BarChart>
              </ResponsiveContainer>
            </div>
            
            {/* Tabla detallada */}
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-slate-200">
                <thead className="bg-slate-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Asignado</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Historias</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Progreso</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Criterios</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-slate-200">
                  {userMetrics.map((user, index) => (
                    <tr key={user.name}>
                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-slate-900">
                        {user.name}
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        <div className="flex items-center">
                          <CheckCircle className="h-4 w-4 text-green-500 mr-1" />
                          {user.completedStories} de {user.totalStories} completadas
                        </div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap">
                        <div className="w-full bg-slate-200 rounded-full h-2.5">
                          <div 
                            className="h-2.5 rounded-full bg-blue-600" 
                            style={{ width: `${user.completionRate}%` }}
                          />
                        </div>
                        <div className="text-xs text-slate-500 mt-1">{user.completionRate}% completado</div>
                      </td>
                      <td className="px-6 py-4 whitespace-nowrap text-sm text-slate-500">
                        {user.completedCriteria} de {user.totalCriteria} criterios
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No hay datos de usuarios disponibles.</p>
        )}
      </div>
      
      {/* Burn Down Charts por columna */}
      <h3 className="text-lg font-semibold text-slate-700 mb-3">Burn Down Charts por Columna</h3>
      {console.log('Renderizando Burn Down Charts, datos disponibles:', Object.keys(burnDownDataByColumn).length)}
      
      {Object.keys(burnDownDataByColumn).length > 0 ? (
        Object.entries(burnDownDataByColumn).map(([columnId, data]) => (
          <div key={columnId} className="bg-white p-4 rounded-lg shadow-sm mb-6">
            <h3 className="text-sm font-medium text-slate-700 mb-1">{data.columnName}</h3>
            <p className="text-xs text-slate-500 mb-3">
              Total de criterios de aceptación: <span className="font-semibold">{data.totalCriteria}</span>
            </p>
            {data.chartData.length > 0 ? (
              <div className="h-80">
                <div className="text-center mb-2">
                  <span className="font-bold text-sm text-blue-600">Escala máxima: {data.totalCriteria} criterios</span>
                </div>
                <ResponsiveContainer width="100%" height="100%">
                  <LineChart
                    data={data.chartData}
                    margin={{
                      top: 10,
                      right: 30,
                      left: 20,
                      bottom: 5,
                    }}
                  >
                    <CartesianGrid strokeDasharray="3 3" />
                    <XAxis dataKey="date" />
                    <YAxis
                      type="number"
                      domain={[0, data.totalCriteria]}
                      ticks={data.yAxisValues}
                    />
                    <Tooltip />
                    <Line type="linear" dataKey="Ideal" stroke="#8884d8" strokeWidth={2} dot={false} />
                    <Line type="linear" dataKey="Total" stroke="#82ca9d" strokeWidth={2} dot={false} />
                    <Line type="linear" dataKey="Real" stroke="#82ca9d" strokeWidth={2} dot={false} activeDot={{ r: 6 }} connectNulls={true} />
                  </LineChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <p className="text-sm text-slate-500">No hay suficientes datos para mostrar el gráfico.</p>
            )}
          </div>
        ))
      ) : (
        <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
          <p className="text-sm text-slate-500">No hay suficientes datos para mostrar los gráficos de Burn Down.</p>
        </div>
      )}

      {/* Historias completadas recientemente */}
      <div className="bg-white p-4 rounded-lg shadow-sm mb-6">
        <h3 className="text-sm font-medium text-slate-700 mb-3">Historias Completadas Recientemente</h3>
        {completedStoriesWithDuration.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-slate-200">
              <thead>
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Historia</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Fecha de Finalización</th>
                  <th className="px-3 py-2 text-left text-xs font-medium text-slate-500 uppercase tracking-wider">Duración</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200">
                {completedStoriesWithDuration
                  .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt))
                  .slice(0, 5)
                  .map(story => (
                    <tr key={story._id}>
                      <td className="px-3 py-2 text-sm text-slate-700">{story.title}</td>
                      <td className="px-3 py-2 text-sm text-slate-500">{new Date(story.completedAt).toLocaleDateString()}</td>
                      <td className="px-3 py-2 text-sm text-slate-500">
                        {Math.ceil((new Date(story.completedAt) - new Date(story.createdAt)) / (1000 * 60 * 60 * 24))} días
                      </td>
                    </tr>
                  ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-sm text-slate-500">No hay historias completadas aún.</p>
        )}
      </div>
    </div>
  );
};

export default Dashboard;
