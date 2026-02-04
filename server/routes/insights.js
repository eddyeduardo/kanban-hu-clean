const express = require('express');
const router = express.Router();
const OpenAI = require('openai');

// Inicializar cliente de OpenAI
const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

// @route   POST /api/insights
// @desc    Generate AI-powered insights from stories and columns
// @access  Public
router.post('/', async (req, res) => {
  try {
    const { stories, columns } = req.body;

    if (!stories || !columns) {
      return res.status(400).json({ msg: 'Missing stories or columns data' });
    }

    if (stories.length === 0) {
      return res.json({
        insights: ['No hay historias en el tablero para analizar. Agrega algunas historias para obtener insights.']
      });
    }

    // Preparar datos para el análisis
    const boardData = prepareDataForAnalysis(stories, columns);

    // Generar insights con OpenAI
    const aiInsights = await generateAIInsights(boardData);

    res.json({ insights: aiInsights });

  } catch (err) {
    console.error('Error generating insights:', err.message);

    // Si falla OpenAI, generar insights básicos
    try {
      const { stories, columns } = req.body;
      const fallbackInsights = generateFallbackInsights(stories, columns);
      res.json({ insights: fallbackInsights });
    } catch (fallbackErr) {
      res.status(500).json({ msg: 'Error al generar insights', error: err.message });
    }
  }
});

function prepareDataForAnalysis(stories, columns) {
  const totalStories = stories.length;

  // Distribución por columna
  const columnDistribution = columns.map(col => {
    const storiesInCol = stories.filter(s =>
      s.column && (s.column._id === col._id || s.column === col._id)
    );
    return {
      name: col.name,
      count: storiesInCol.length,
      stories: storiesInCol.map(s => ({
        title: s.title,
        description: s.description || '',
        user: s.user || 'Sin asignar',
        estimation: s.estimation || null,
        taskType: s.taskType || 'feature',
        createdAt: s.createdAt,
        completedAt: s.completedAt
      }))
    };
  });

  // Estadísticas de completados
  const completed = stories.filter(s => s.completedAt).length;
  const pending = totalStories - completed;

  // Usuarios asignados
  const userCounts = {};
  stories.forEach(s => {
    const user = s.user || 'Sin asignar';
    userCounts[user] = (userCounts[user] || 0) + 1;
  });

  // Tipos de tarea
  const taskTypes = {};
  stories.forEach(s => {
    const type = s.taskType || 'feature';
    taskTypes[type] = (taskTypes[type] || 0) + 1;
  });

  // Estimaciones
  const estimations = stories
    .filter(s => s.estimation)
    .map(s => parseFloat(s.estimation) || 0);
  const totalEstimation = estimations.reduce((a, b) => a + b, 0);
  const avgEstimation = estimations.length > 0 ? totalEstimation / estimations.length : 0;

  // Historias sin asignar
  const unassigned = stories.filter(s => !s.user || s.user === 'Sin asignar').length;

  // Posibles cuellos de botella
  const bottleneck = columnDistribution.reduce((max, col) =>
    col.count > (max?.count || 0) ? col : max, null
  );

  return {
    totalStories,
    completed,
    pending,
    completionRate: totalStories > 0 ? ((completed / totalStories) * 100).toFixed(1) : 0,
    columnDistribution,
    userCounts,
    taskTypes,
    totalEstimation,
    avgEstimation: avgEstimation.toFixed(1),
    unassigned,
    bottleneck: bottleneck?.name || null,
    bottleneckCount: bottleneck?.count || 0,
    columnsCount: columns.length
  };
}

async function generateAIInsights(data) {
  const prompt = `Eres un experto en gestión de proyectos ágiles y análisis de tableros Kanban. Analiza los siguientes datos de un tablero Kanban y genera 5-7 insights ACCIONABLES y de ALTO VALOR para el equipo.

DATOS DEL TABLERO:
- Total de historias: ${data.totalStories}
- Completadas: ${data.completed} (${data.completionRate}%)
- Pendientes: ${data.pending}
- Columnas: ${data.columnsCount}
- Historias sin asignar: ${data.unassigned}
- Estimación total: ${data.totalEstimation} puntos
- Estimación promedio: ${data.avgEstimation} puntos

DISTRIBUCIÓN POR COLUMNA:
${data.columnDistribution.map(c => `- ${c.name}: ${c.count} historias`).join('\n')}

DISTRIBUCIÓN POR USUARIO:
${Object.entries(data.userCounts).map(([user, count]) => `- ${user}: ${count} historias`).join('\n')}

TIPOS DE TAREA:
${Object.entries(data.taskTypes).map(([type, count]) => `- ${type}: ${count}`).join('\n')}

${data.bottleneck ? `POSIBLE CUELLO DE BOTELLA: "${data.bottleneck}" con ${data.bottleneckCount} historias` : ''}

INSTRUCCIONES:
1. Genera insights que sean ESPECÍFICOS y ACCIONABLES, no genéricos
2. Identifica patrones, riesgos y oportunidades de mejora
3. Si hay cuellos de botella, sugiere acciones concretas
4. Evalúa la distribución de carga de trabajo entre el equipo
5. Proporciona recomendaciones basadas en mejores prácticas ágiles
6. Usa un tono profesional pero accesible
7. Cada insight debe empezar con un emoji relevante (📊, ⚠️, ✅, 🎯, 💡, 🔄, 👥)

Responde SOLO con los insights, uno por línea, sin numeración ni viñetas adicionales.`;

  const completion = await openai.chat.completions.create({
    model: 'gpt-4o-mini',
    messages: [
      {
        role: 'system',
        content: 'Eres un consultor experto en metodologías ágiles y gestión de proyectos. Proporcionas insights claros, concisos y accionables en español.'
      },
      {
        role: 'user',
        content: prompt
      }
    ],
    temperature: 0.7,
    max_tokens: 1000
  });

  const response = completion.choices[0].message.content;
  const insights = response
    .split('\n')
    .map(line => line.trim())
    .filter(line => line.length > 0);

  return insights;
}

function generateFallbackInsights(stories, columns) {
  const insights = [];
  const totalStories = stories.length;

  // Insight 1: Resumen general
  const completed = stories.filter(s => s.completedAt).length;
  const completionRate = totalStories > 0 ? ((completed / totalStories) * 100).toFixed(0) : 0;
  insights.push(`📊 El tablero tiene ${totalStories} historias con una tasa de completado del ${completionRate}%.`);

  // Insight 2: Distribución
  columns.forEach(col => {
    const count = stories.filter(s =>
      s.column && (s.column._id === col._id || s.column === col._id)
    ).length;
    if (count > 0) {
      insights.push(`📋 La columna "${col.name}" tiene ${count} historia(s).`);
    }
  });

  // Insight 3: Cuellos de botella
  let maxCount = 0;
  let bottleneck = null;
  columns.forEach(col => {
    const count = stories.filter(s =>
      s.column && (s.column._id === col._id || s.column === col._id)
    ).length;
    if (count > maxCount) {
      maxCount = count;
      bottleneck = col.name;
    }
  });

  if (bottleneck && maxCount > 2) {
    insights.push(`⚠️ Posible cuello de botella en "${bottleneck}" con ${maxCount} historias acumuladas.`);
  }

  // Insight 4: Sin asignar
  const unassigned = stories.filter(s => !s.user || s.user === 'Sin asignar').length;
  if (unassigned > 0) {
    insights.push(`👥 Hay ${unassigned} historia(s) sin responsable asignado.`);
  }

  // Insight 5: Estimaciones
  const withEstimation = stories.filter(s => s.estimation).length;
  if (withEstimation < totalStories && totalStories > 0) {
    const missing = totalStories - withEstimation;
    insights.push(`🎯 ${missing} historia(s) no tienen estimación de esfuerzo.`);
  }

  return insights;
}

module.exports = router;
