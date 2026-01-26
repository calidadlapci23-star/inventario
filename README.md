# 🏥 Sistema de Inventario de Laboratorio

Sistema moderno de gestión de inventario para laboratorios médicos desarrollado con Next.js 14 y Supabase.

## 🚀 Características Principales

### 📦 Gestión de Inventario
- **Multi-disciplina**: 8 disciplinas especializadas
- **Control de lotes**: Seguimiento por número de lote
- **Stock automático**: Consolidación automática de inventario
- **Alertas inteligentes**: Stock bajo y vencimientos próximos

### 📊 Funcionalidades
- **Dashboard interactivo**: Estadísticas en tiempo real
- **Recepción de productos**: Registro consolidado automático
- **Control de consumos**: Registro con verificación de stock
- **Reportes avanzados**: Exportación a Excel
- **Notificaciones**: Alertas por email integradas

### 🔒 Seguridad y Confiabilidad
- **Autenticación segura**: Integración con Supabase Auth
- **Base de datos PostgreSQL**: Esquema relacional optimizado
- **API RESTful**: Endpoints protegidos
- **Backups automáticos**: Funcionalidades de respaldo

## 🛠️ Tecnologías Utilizadas

- **Frontend**: Next.js 14, TypeScript, Tailwind CSS
- **Backend**: Supabase (PostgreSQL, Auth, Storage)
- **UI Components**: Shadcn/ui, Radix UI
- **Gráficos**: Recharts
- **Formularios**: React Hook Form + Zod
- **Utilidades**: Date-fns, Lucide Icons

## 📦 Instalación y Configuración

### 1. Prerrequisitos
```bash
Node.js 18+ 
npm o yarn
Cuenta de Supabase
```

### 2. Clonar repositorio
```bash
git clone https://github.com/tu-usuario/inventario-laboratorio.git
cd inventario-laboratorio
```

### 3. Instalar dependencias
```bash
npm install
# o
yarn install
```

### 4. Configurar variables de entorno

cp .env.example .env.local

Editar `.env.local`:

```
NEXT_PUBLIC_SUPABASE_URL=tu_url_supabase
NEXT_PUBLIC_SUPABASE_ANON_KEY=tu_anon_key
SUPABASE_SERVICE_ROLE_KEY=tu_service_role_key
```
