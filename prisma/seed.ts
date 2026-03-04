import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

const templates = [
    // Salud física
    { name: 'Hacer ejercicio', description: 'Cualquier actividad física del día', type: 'CHECK', defaultFrequency: 'DAILY', icon: '💪', category: 'salud' },
    { name: 'Beber agua', description: 'Vasos de agua por día', type: 'COUNTER', defaultFrequency: 'DAILY', icon: '💧', category: 'salud' },
    { name: 'Dormir 8 horas', description: 'Registrar un buen descanso', type: 'CHECK', defaultFrequency: 'DAILY', icon: '😴', category: 'salud' },
    { name: 'Meditar', description: 'Sesión de meditación o respiración', type: 'CHECK', defaultFrequency: 'DAILY', icon: '🧘', category: 'salud' },
    { name: 'Caminar', description: 'Salir a caminar al menos 30 minutos', type: 'CHECK', defaultFrequency: 'DAILY', icon: '🚶', category: 'salud' },
    { name: 'Estiramientos', description: '5-10 min de movilidad matutina', type: 'CHECK', defaultFrequency: 'DAILY', icon: '🤸', category: 'salud' },

    // Mente y Crecimiento
    { name: 'Leer', description: 'Leer al menos 20 páginas', type: 'CHECK', defaultFrequency: 'DAILY', icon: '📚', category: 'mente' },
    { name: 'Practicar idioma', description: 'Practicar un idioma extranjero', type: 'CHECK', defaultFrequency: 'DAILY', icon: '🌎', category: 'mente' },
    { name: 'Escribir en diario', description: 'Escribir reflexiones del día', type: 'CHECK', defaultFrequency: 'DAILY', icon: '📝', category: 'mente' },
    { name: 'Estudiar 1 hora', description: 'Enfoque total en aprendizaje', type: 'CHECK', defaultFrequency: 'DAILY', icon: '🎓', category: 'mente' },
    { name: 'Escuchar Podcast', description: 'Episodio educativo o inspirador', type: 'CHECK', defaultFrequency: 'SPECIFIC_DAYS', icon: '🎙️', category: 'mente' },

    // Productividad
    { name: 'Revisar tareas', description: 'Planificar al inicio del día', type: 'CHECK', defaultFrequency: 'DAILY', icon: '✅', category: 'productividad' },
    { name: 'Sin redes sociales', description: 'Día libre de scrolls infinitos', type: 'CHECK', defaultFrequency: 'SPECIFIC_DAYS', icon: '📵', category: 'productividad' },
    { name: 'Trabajo profundo', description: '90 min de trabajo sin distracciones', type: 'CHECK', defaultFrequency: 'DAILY', icon: '🎯', category: 'productividad' },
    { name: 'Inbox zero', description: 'Limpiar correos y pendientes', type: 'CHECK', defaultFrequency: 'DAILY', icon: '📧', category: 'productividad' },

    // Nutrición
    { name: 'Comer saludable', description: 'Evitar ultraprocesados', type: 'CHECK', defaultFrequency: 'DAILY', icon: '🥗', category: 'nutricion' },
    { name: 'No alcohol', description: 'Día sin consumir alcohol', type: 'CHECK', defaultFrequency: 'DAILY', icon: '🚫', category: 'nutricion' },
    { name: 'Fruta al día', description: 'Comer al menos 2 piezas de fruta', type: 'CHECK', defaultFrequency: 'DAILY', icon: '🍎', category: 'nutricion' },

    // Hogar y Finanzas
    { name: 'Limpiar 15 min', description: 'Orden rápido de la casa', type: 'CHECK', defaultFrequency: 'DAILY', icon: '🧹', category: 'hogar' },
    { name: 'Cuidar plantas', description: 'Riego y mantenimiento', type: 'CHECK', defaultFrequency: 'WEEKLY', icon: '🌿', category: 'hogar' },
    { name: 'Registrar gastos', description: 'Anotar gastos del día', type: 'CHECK', defaultFrequency: 'DAILY', icon: '💰', category: 'finanzas' },
    { name: 'Ahorrar dinero', description: 'Apartar una pequeña suma', type: 'CHECK', defaultFrequency: 'WEEKLY', icon: '🏦', category: 'finanzas' },
];

async function main() {
    console.log('Seeding habit templates...');

    for (const template of templates) {
        await prisma.habitTemplate.upsert({
            where: { id: template.name }, // use name as stable seed key via createMany
            update: {},
            create: {
                name: template.name,
                description: template.description,
                type: template.type as any,
                defaultFrequency: template.defaultFrequency as any,
                icon: template.icon,
                category: template.category,
            },
        });
    }

    // Use createMany for cleaner seeding
    await prisma.habitTemplate.deleteMany();
    await prisma.habitTemplate.createMany({
        data: templates.map(t => ({
            name: t.name,
            description: t.description,
            type: t.type as any,
            defaultFrequency: t.defaultFrequency as any,
            icon: t.icon,
            category: t.category,
        })),
    });

    console.log(`Seeded ${templates.length} habit templates.`);
}

main()
    .catch(console.error)
    .finally(() => prisma.$disconnect());
