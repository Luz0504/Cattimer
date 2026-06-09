/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface MascotMessageSet {
  onboardingSelect: string;
  dashboardGreeting: string;
  taskCompleted: string;
  taskUncompleted: string;
  googleConnected: string;
  taskAddedToday: string;
  taskAddedPending: string;
  taskPriorityHigh: string;
  limitChanged: (limit: number) => string;
}

export const MASCOT_MESSAGES: Record<string, MascotMessageSet> = {
  'Distracciones': {
    onboardingSelect: 'Entiendo miau. Con tantas notificaciones y ruidos, mantener el foco cuesta el doble de energía. ¡Hagamos equipo para proteger tu atención! ⚡',
    dashboardGreeting: 'El truco es hacer de a una cosa por vez, miau. En Cattimer cuidaré que no te desvíes. ¡Yo sugiero que apagues las pestañas que no sumen hoy! 🐾',
    taskCompleted: '🎯 ¡Miau! ¡Una tarea menos! Viste que esquivando los ruidos de alrededor avanzamos un montón. ¡Aplausos para vos!',
    taskUncompleted: 'Yo ya reactivé la tarea, miau. Sin apuros, volvamos a meterle foco limpio cuando estés listo.',
    googleConnected: '🐾 ¡Miau! Sincronicé tu cuenta de Google Calendar. Con esto agendado, no habrá notificación distractiva que te desvíe del camino. 🌸',
    taskAddedToday: '🐾 ¡Miau! Sumamos una tarea a tu Hoy. Centremos la mirada únicamente en esto ahora. ¡Vos podés!',
    taskAddedPending: '¡Entendido, miau! Va derechito a la bandeja de pendientes. Un distractor menos en tu pantalla por ahora.',
    taskPriorityHigh: '⚡ Miau, ¡prioridad máxima! Pestañeás y ya estás haciendo foco total en este objetivo clave.',
    limitChanged: (limit: number) => `🐾 ¡Miau! Reorganicé tus tareas de hoy para adaptarme a tu nuevo límite diario de ${limit} ${limit === 1 ? 'tarea' : 'tareas'}. Reducir el espectro ayuda a evitar las tentaciones de distraerse.`
  },
  'Redes sociales': {
    onboardingSelect: '¡Te comprendo miau! El feed infinito está diseñado para atraparnos las 24 horas. Vamos a crear un espacio de trabajo a salvo del scroll eterno. 📱',
    dashboardGreeting: 'Miau 🐾 Yo ya guardé las redes sociales en un cajón mental. Hoy no hay notificaciones, solo progreso real e inteligente.',
    taskCompleted: '✅ ¡Miau! ¡Completada! Esto vale por mil me gustas reales en redes. ¡Qué gran victoria sin pantallas de por medio!',
    taskUncompleted: 'Reactivamos el pendiente, miau. Pero recordá guardar el teléfono boca abajo antes de empezar, ¿dale?',
    googleConnected: '🐾 ¡Calendar sincronizado miau! Así no tendrás excusa de abrir redes sociales para chequear fechas mientras debés avanzar.',
    taskAddedToday: '🐾 ¡Excelente! Sumado hoy. Cada minuto que pones en esto es un minuto ganado de libertad real fuera del feed.',
    taskAddedPending: 'Guardado en Pendientes, miau. Fuera de tu vista principal para no tentar al scroll improductivo.',
    taskPriorityHigh: '🔥 ¡Súper prioritario! Vamos a bloquear el teléfono y dedicarnos a esta tarea urgente, miau.',
    limitChanged: (limit: number) => `🐾 ¡Miau! Reorganicé tus tareas de hoy para adaptarme a tu nuevo límite diario de ${limit} ${limit === 1 ? 'tarea' : 'tareas'}. Menos objetivos significa menos ganas de escaparse a Instagram.`
  },
  'Videojuegos': {
    onboardingSelect: '¡Miau! Una partida rápida que se convierte en horas... a todos nos pasa, de verdad. Vamos a estructurar el día para que juegues con la mente 100% libre de culpa. 🎮',
    dashboardGreeting: '¡Solo un bloque Pomodoro más y luego yo te prometo que desbloqueamos tiempo libre en la consola! ¡A ganar XP de progreso real hoy! 👾',
    taskCompleted: '👾 ¡Misión cumplida y EXP ganada! Cada tarea terminada es un drop de recompensa y te acerca más a tu tiempo libre de juegos.',
    taskUncompleted: 'Reanudamos esta misión principal, miau. ¡No hagamos rage-quit, todavía podemos completarla!',
    googleConnected: '🐾 ¡Google Calendar listo! Tu agenda está blindada en la nube. Los juegos vendrán después del deber, ahora es momento de cumplir el horario.',
    taskAddedToday: '🐾 ¡Nueva misión diaria agregada, miau! Prepará tu inventario y hagamos foco.',
    taskAddedPending: '¡Anotado en Pendientes, miau! Queda en la cola de misiones secundarias para después.',
    taskPriorityHigh: '👑 ¡Este es un Boss de nivel alto! Exije tu atención prioritaria inmediata, miau.',
    limitChanged: (limit: number) => `🐾 ¡Miau! Reorganicé tus tareas de hoy para adaptarme a tu nuevo límite diario de ${limit} ${limit === 1 ? 'tarea' : 'tareas'}. Ideal para un speedrun ordenado y con tiempo para jugar después.`
  },
  'Falta de motivación': {
    onboardingSelect: 'Comprendo perfectamente, miau. Trabajar con el tanque de energía vacío es durísimo. No te exijas perfección hoy, solo daremos pasitos de gato muy cortos. 💭',
    dashboardGreeting: 'No intentes escalar la montaña de golpe hoy, miau, solo da un paso cortito. Yo preparé una lista súper digerible para hoy.',
    taskCompleted: '✨ ¡Miau! ¡Lo lograste! ¿Viste cómo la motivación efervescente aparece de a poquito cuando empezamos a actuar? Súper orgulloso de vos, de verdad.',
    taskUncompleted: 'Miau... No pasa nada si querés pausarla e intentarlo de nuevo más tarde. No nos apuremos.',
    googleConnected: '🐾 ¡Tu cuenta de Google ya está vinculada! Ver tus plazos ordenados de forma visual te dará una chispa de claridad para motivarte hoy. ✨',
    taskAddedToday: '🐾 ¡Sumada al plan de hoy! Con calma y sin presiones, miau. Lo importante es intentar mover la patita.',
    taskAddedPending: 'Bandeja de Pendientes lista, miau. No te preocupes por hacerla hoy, ya está ahí guardada.',
    taskPriorityHigh: '🕯️ Miau, esta tarea tiene luz propia. Es la más importante, enfoquemos aquí con cariño y sin culpa.',
    limitChanged: (limit: number) => `🐾 ¡Miau! Reorganicé tus tareas de hoy para adaptarme a tu nuevo límite diario de ${limit} ${limit === 1 ? 'tarea' : 'tareas'}. La motivación florece cuando las metas lucen amigables.`
  },
  'Ansiedad': {
    onboardingSelect: 'Inhalá, exhalá... 🐾 Miau. El miedo a no hacerlo perfecto o a fallar puede paralizarnos por completo. Aquí vamos despacio, cuidando tu salud mental ante todo. 😰',
    dashboardGreeting: 'Inhalá... exhalá... Despacito miau. No tenés que hacer todo perfecto. El primer paso es el único que cuenta. Yo te guío con calma. 🐾🌸',
    taskCompleted: '🌱 ¡Excelente, miau! Completaste esta tarea con paz y a tu propio ritmo. El monstruo del agobio se hace cada vez más chiquito.',
    taskUncompleted: 'Volvió a pendientes, miau. Respirá hondo. No hay castigos, solo tu propia línea de tiempo segura y amable.',
    googleConnected: '🐾 ¡Calendar listo miau! Tener todo agendado en un solo lugar nos ayuda a sacar los miedos de la cabeza y ver que todo es súper manejable.',
    taskAddedToday: '🐾 Tarea sumada hoy, miau. Acordate de que podés pausar y respirar cuando sientas el pecho apretado.',
    taskAddedPending: 'Anotada con cariño en tus pendientes. Aquí está a salvo, no tenés que correr tras ella hoy.',
    taskPriorityHigh: '🤍 Miau... Esta es la única tarea en la que pensaremos por ahora. Olvidate del resto del universo, solo existís vos y este paso.',
    limitChanged: (limit: number) => `🐾 ¡Miau! Reorganicé tus tareas de hoy para adaptarme a tu nuevo límite diario de ${limit} ${limit === 1 ? 'tarea' : 'tareas'}. Cuidar tu salud mental significa no cargarse de más.`
  },
  'Demasiadas tareas': {
    onboardingSelect: '¡Miau! Ver una montaña eterna de pendientes causa un cortocircuito en el cerebro de cualquiera. Yo me encargaré de filtrarlos para que vayas de a uno por vez. 📚',
    dashboardGreeting: 'Tranquilo miau, yo ya filtré tus tareas de hoy para que solo veas las indispensables de forma realista. El resto puede esperar tranquilamente.',
    taskCompleted: '📚 ¡Una parte de la montaña menos, miau! El gran bloque de tareas se va reduciendo con estos pequeños triunfos consistentes.',
    taskUncompleted: 'Reestablecí el pendiente miau. Vamos a re-priorizar con cabeza fría para no atosigarte.',
    googleConnected: '🐾 ¡Sincronizado con éxito! Con esto Google Calendar nos ayudará a modular el caos y ver que podemos abordar cada cosa a su debido tiempo.',
    taskAddedToday: '🐾 Agregada hoy. Recordá que podemos segmentar las cosas grandes en pedacitos de gato chiquitos.',
    taskAddedPending: 'Derecho a Pendientes, miau. Así la sacamos del foco del día de hoy para que no se vea tan abrumador.',
    taskPriorityHigh: '🔍 De toda la pila gigante de cosas, miau... esta es la verdaderamente crucial. Hagamos zoom solo aquí.',
    limitChanged: (limit: number) => `🐾 ¡Miau! Reorganicé tus tareas de hoy para adaptarme a tu nuevo límite diario de ${limit} ${limit === 1 ? 'tarea' : 'tareas'}. Tu aliada Minnity cuidará que la montaña no te aplaste hoy.`
  },
  'Cansancio': {
    onboardingSelect: 'Entiendo miau... El cansancio físico o mental no se cura empujándote más fuerte. Vamos a planificar de manera súper liviana hoy para que descanses sano. 😴',
    dashboardGreeting: 'Yo sugiero que vayamos súper liviano hoy miau. Estirate bien, tomá agua. Es mejor avanzar lento como caracol que romperse por completo. 🌱',
    taskCompleted: '💪 ¡Increíble esfuerzo, miau! Aún con las baterías bajas pudiste tacharlo. Ahora estirate y andá a descansar un ratito, en serio.',
    taskUncompleted: 'Miau, no pasa nada si la batería no da hoy para esto. La guardamos para cuando recargues energía.',
    googleConnected: '🐾 ¡Vinculado de forma segura! Con Calendar organizándote los plazos, podés cerrar los ojos y descansar sabiendo que el mañana está agendado.',
    taskAddedToday: '🐾 Sumada hoy, miau. Por favor, hacela despacio y acostado o cómodo si es posible.',
    taskAddedPending: 'La guardamos cómoda en Pendientes miau. Hoy priorizamos tu descanso y recuperación.',
    taskPriorityHigh: '💤 Miau... si solo tenés energía para una sola cosa de valor alto hoy, que sea este bloque. El resto es opcional.',
    limitChanged: (limit: number) => `🐾 ¡Miau! Reorganicé tus tareas de hoy para adaptarme a tu nuevo límite diario de ${limit} ${limit === 1 ? 'tarea' : 'tareas'}. Con el cuerpo cansado, es súper inteligente bajar la marcha.`
  },
  'Dificultad para empezar': {
    onboardingSelect: '¡Uf, miau! Dar el primer paso de la primera tarea es, por lejos, lo más difícil del día. Diseñaremos trucos de 5 minutos para engañar a tu cerebro e iniciar sin esfuerzo! ⏳',
    dashboardGreeting: 'La regla de oro de la gata: empezá la tarea solo por 5 minutos de reloj miau. ¡Si después querés parar, podés! ¿Probamos entrar en acción?',
    taskCompleted: '⏱️ ¡Miau! ¡Venciste la parte más difícil del universo entero, que era empezar! Y mirá, ¡ya la terminaste de punta a punta! ¡Qué gran logro!',
    taskUncompleted: 'Volvió al tablero, miau. No te culpes, solo dale play por solo 3 minutos la próxima y mirá qué bien se siente.',
    googleConnected: '🐾 ¡Sincronización activa miau! Ver el bloque de tiempo en tu calendario oficial es la mejor señal de arranque. ¡A por ello con todo!',
    taskAddedToday: '🐾 ¡Añadida hoy de una! Recordá: no pienses en terminar, solo dale "iniciar" al temporizador miau.',
    taskAddedPending: 'Para pendientes, miau. Ya diste el primer paso anotándola, ¡eso cuenta un montón!',
    taskPriorityHigh: '🔥 ¡Esta es la que tiene la mecha encendida! Rompamos la inercia con ella hoy mismo, miau.',
    limitChanged: (limit: number) => `🐾 ¡Miau! Reorganicé tus tareas de hoy para adaptarme a tu nuevo límite diario de ${limit} ${limit === 1 ? 'tarea' : 'tareas'}. Reducir la fricción inicial es clave cuando cuesta arrancar.`
  },
  'Otra': {
    onboardingSelect: 'Entiendo miau🐾 No te preocupes por la etiqueta o la razón. El simple hecho de estar acá buscando organizarte de forma sutil es un paso gigante. ¡Avanzaremos juntos! 🐱',
    dashboardGreeting: 'Miau 🐾 Pasito a pasito. Yo estoy acá hoy para recordarte que sos súper capaz de avanzar con orden y mucho mimo personal. ✨🐾',
    taskCompleted: '🎉 ¡Miau! ¡Qué satisfacción tachar esto de la lista! Tu progreso va sumando una montaña hermosa. ¡Felicitaciones!',
    taskUncompleted: 'Reactiva y lista miau. En Cattimer no hay plazos de hierro, podés volver a empezar cuando quieras.',
    googleConnected: '🐾 ¡Sincronizado miau! Google Calendar y Cattimer cooperarán para mantener tus días ordenados con total flexibilidad.',
    taskAddedToday: '🐾 ¡Puesta en el plan de hoy con éxito! Un pasito de gato a la vez miau.',
    taskAddedPending: 'Enviada de forma segura a tus Pendientes. Listo para cuando tengas el momento óptimo.',
    taskPriorityHigh: '⭐ Marcada como prioritaria, miau. Tu gata guardiana le prestará especial atención hoy.',
    limitChanged: (limit: number) => `🐾 ¡Miau! Reorganicé tus tareas de hoy para adaptarme a tu nuevo límite diario de ${limit} ${limit === 1 ? 'tarea' : 'tareas'}. Adaptándonos siempre a tu ritmo.`
  }
};

export function getMascotMessage(reason: string | undefined | null, event: keyof MascotMessageSet, limitValue?: number): string {
  const normReason = reason && MASCOT_MESSAGES[reason] ? reason : 'Otra';
  const set = MASCOT_MESSAGES[normReason];
  const value = set[event];
  if (typeof value === 'function') {
    return value(limitValue ?? 4);
  }
  return value;
}
