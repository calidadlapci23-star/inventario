# Blueprint: Sistema de Mantenimiento BS-240 Pro

## Visión General

Este documento detalla la arquitectura y componentes de la solución para el registro y seguimiento del mantenimiento del equipo de laboratorio Mindray BS-240 Pro. El sistema está integrado en la plataforma de inventario existente y utiliza un stack tecnológico moderno basado en Next.js y Prisma.

## Arquitectura y Diseño

La aplicación sigue un diseño robusto y escalable, implementando las mejores prácticas tanto en el backend como en el frontend.

### 1. Modelo de Datos (Prisma)

Se ha definido un esquema de base de datos relacional utilizando Prisma, con una base de datos PostgreSQL. El modelo distingue entre Equipos, Tareas de mantenimiento y Registros de mantenimiento.

- **`Equipo`**: Almacena la información del equipo (nombre, modelo, etc.).
- **`Tarea`**: Contiene la descripción y frecuencia de cada tarea de mantenimiento (DIARIO, SEMANAL, etc.).
- **`RegistroMantenimiento`**: Guarda cada instancia de una tarea realizada, vinculada a una tarea, un equipo, una fecha y un usuario.
- **`Incidente`**: Un modelo adicional para registrar eventos no planificados o averías.

### 2. Backend (API Routes)

La lógica de negocio se expone a través de API routes de Next.js.

- **`POST /api/mantenimiento/registros`**: Permite guardar nuevos registros de mantenimiento. Recibe una fecha, el ID del equipo, el usuario y una lista de tareas para crear múltiples registros en una sola transacción.
- **`GET /api/mantenimiento/registros`**: Recupera los registros de un mes y año específicos para un equipo, permitiendo la visualización en la bitácora.

### 3. Frontend (React Components)

La interfaz de usuario está construida con React y componentes "use client" para la interactividad.

- **`BS240Dashboard` (`page.tsx`)**: Es la página principal que utiliza un sistema de pestañas (`Tabs`) para organizar las dos vistas principales.
- **`RegistroMantenimiento.tsx`**: Un componente de checklist que permite a los usuarios seleccionar las tareas de mantenimiento realizadas en una fecha específica.
- **`BitacoraMensual.tsx`**: Un componente que presenta una tabla visual del mantenimiento diario realizado durante el mes.

---

## Plan de Implementación Actual

### 4. Gestión de Reportes y Documentos (En progreso)

Se está implementando un sistema robusto para la carga, visualización y gestión de archivos asociados a los equipos.

- **Almacenamiento de Archivos (Firebase Storage)**:
    - Se utilizará Firebase Storage para almacenar de forma segura y permanente los archivos de reportes (PDF, DOCX, etc.).
    - Se creará una estructura de carpetas para organizar los archivos, por ejemplo, `/reports/{equipoId}/{fileName}`.

- **Lógica de Subida de Archivos**:
    - El componente `GestionarReportesPage` se conectará a Firebase.
    - La función `handleGuardarReporte` será reescrita para:
        1. **Instalar el SDK de `firebase`**: Añadir la dependencia al proyecto.
        2. **Configurar la conexión con Firebase**: Crear un archivo de inicialización del SDK en el cliente.
        3. **Subir el archivo seleccionado a Firebase Storage**.
        4. **Obtener la URL de descarga permanente** del archivo subido.
        5. **Actualizar el estado de la aplicación** con la información del nuevo archivo para que persista.

- **Reglas de Seguridad**:
    - Se configurarán las reglas de seguridad de Firebase Storage (`storage.rules`) para permitir que solo los usuarios autenticados puedan subir archivos, garantizando la integridad y privacidad de los datos.

- **Visualización de PDFs**:
    - Se utiliza la librería `react-pdf` para previsualizar archivos PDF directamente en la aplicación a través de un modal.
    - El componente `PdfViewer` se carga dinámicamente (`next/dynamic` con `ssr: false`) para evitar problemas de renderizado en el lado del servidor y se configura el `workerSrc` dentro de un `useEffect` para garantizar la ejecución solo en el cliente.

