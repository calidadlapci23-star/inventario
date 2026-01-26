-- Disciplinas del laboratorio
CREATE TABLE disciplinas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  codigo TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  icono TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Proveedores
CREATE TABLE proveedores (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  contacto TEXT,
  telefono TEXT,
  email TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Categorías de productos
CREATE TABLE categorias (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL UNIQUE,
  descripcion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Productos principales
CREATE TABLE productos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  nombre TEXT NOT NULL,
  descripcion TEXT,
  disciplina_id UUID REFERENCES disciplinas(id) ON DELETE CASCADE,
  categoria_id UUID REFERENCES categorias(id) ON DELETE SET NULL,
  proveedor_id UUID REFERENCES proveedores(id) ON DELETE SET NULL,
  unidad_medida TEXT NOT NULL DEFAULT 'piezas',
  alerta_minima INTEGER DEFAULT 5,
  ubicacion TEXT,
  codigo_barras TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Lotes específicos
CREATE TABLE lotes (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  producto_id UUID REFERENCES productos(id) ON DELETE CASCADE,
  numero_lote TEXT NOT NULL,
  fecha_recepcion DATE NOT NULL,
  fecha_vencimiento DATE NOT NULL,
  cantidad_inicial INTEGER NOT NULL,
  cantidad_actual INTEGER NOT NULL,
  precio_unitario DECIMAL(10,2),
  estado TEXT CHECK (estado IN ('activo', 'agotado', 'vencido', 'alerta')) DEFAULT 'activo',
  observaciones TEXT,
  usuario_recepcion TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL,
  UNIQUE(producto_id, numero_lote)
);

-- Movimientos de inventario
CREATE TABLE movimientos (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT CHECK (tipo IN ('recepcion', 'consumo', 'ajuste', 'transferencia', 'apertura', 'agotamiento')) NOT NULL,
  lote_id UUID REFERENCES lotes(id) ON DELETE CASCADE,
  cantidad INTEGER NOT NULL,
  usuario_id TEXT NOT NULL,
  fecha DATE NOT NULL DEFAULT CURRENT_DATE,
  observaciones TEXT,
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Alertas y notificaciones
CREATE TABLE alertas (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  tipo TEXT CHECK (tipo IN ('stock_bajo', 'vencimiento', 'agotado', 'error')) NOT NULL,
  producto_id UUID REFERENCES productos(id) ON DELETE CASCADE,
  lote_id UUID REFERENCES lotes(id) ON DELETE CASCADE,
  mensaje TEXT NOT NULL,
  leida BOOLEAN DEFAULT FALSE,
  prioridad TEXT CHECK (prioridad IN ('baja', 'media', 'alta', 'critica')) DEFAULT 'media',
  created_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Configuración del sistema
CREATE TABLE configuracion (
  clave TEXT PRIMARY KEY,
  valor JSONB NOT NULL,
  descripcion TEXT,
  updated_at TIMESTAMP WITH TIME ZONE DEFAULT TIMEZONE('utc'::text, NOW()) NOT NULL
);

-- Índices para optimización
CREATE INDEX idx_lotes_producto ON lotes(producto_id);
CREATE INDEX idx_lotes_estado ON lotes(estado);
CREATE INDEX idx_lotes_vencimiento ON lotes(fecha_vencimiento);
CREATE INDEX idx_movimientos_fecha ON movimientos(fecha);
CREATE INDEX idx_movimientos_lote ON movimientos(lote_id);
CREATE INDEX idx_alertas_leida ON alertas(leida);
CREATE INDEX idx_alertas_prioridad ON alertas(prioridad);

-- Triggers para actualización automática
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = TIMEZONE('utc'::text, NOW());
    RETURN NEW;
END;
$$ language 'plpgsql';

CREATE TRIGGER update_productos_updated_at BEFORE UPDATE ON productos
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_lotes_updated_at BEFORE UPDATE ON lotes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Función para verificar vencimientos
CREATE OR REPLACE FUNCTION verificar_vencimientos()
RETURNS void AS $$
BEGIN
    UPDATE lotes 
    SET estado = 'vencido'
    WHERE fecha_vencimiento < CURRENT_DATE 
    AND estado != 'vencido';
    
    INSERT INTO alertas (tipo, lote_id, producto_id, mensaje, prioridad)
    SELECT 'vencimiento', l.id, l.producto_id,
           'Lote ' || l.numero_lote || ' vencido',
           'alta'
    FROM lotes l
    WHERE l.fecha_vencimiento < CURRENT_DATE 
    AND l.estado != 'vencido';
END;
$$ LANGUAGE plpgsql;

-- Vista para reportes
CREATE VIEW vista_inventario AS
SELECT 
    p.nombre as producto,
    d.nombre as disciplina,
    c.nombre as categoria,
    pr.nombre as proveedor,
    l.numero_lote,
    l.fecha_recepcion,
    l.fecha_vencimiento,
    l.cantidad_actual as stock,
    p.unidad_medida,
    l.estado,
    p.alerta_minima,
    p.ubicacion
FROM productos p
JOIN disciplinas d ON p.disciplina_id = d.id
LEFT JOIN categorias c ON p.categoria_id = c.id
LEFT JOIN proveedores pr ON p.proveedor_id = pr.id
LEFT JOIN lotes l ON p.id = l.producto_id
WHERE l.estado != 'agotado' OR l.estado IS NULL;