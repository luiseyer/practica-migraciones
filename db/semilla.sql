-- Deja la base en el estado inicial del caso.
-- Se puede ejecutar las veces que haga falta: borra y vuelve a crear todo.

PRAGMA journal_mode = WAL;

DROP TABLE IF EXISTS migraciones;
DROP TABLE IF EXISTS pedidos;
DROP TABLE IF EXISTS clientes;

CREATE TABLE clientes (
  id INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL
);

CREATE TABLE pedidos (
  id INTEGER PRIMARY KEY,
  cliente_id INTEGER,
  monto INTEGER NOT NULL
);

INSERT INTO clientes (id, nombre)
WITH RECURSIVE n(i) AS (
  SELECT 1
  UNION ALL
  SELECT i + 1 FROM n WHERE i < 500
)
SELECT i, 'Cliente ' || i FROM n;

INSERT INTO pedidos (id, cliente_id, monto)
WITH RECURSIVE n(i) AS (
  SELECT 1
  UNION ALL
  SELECT i + 1 FROM n WHERE i < 50000
)
SELECT i, (i % 500) + 1, ((i * 37) % 9000) + 100 FROM n;

-- Tres pedidos apuntan a un cliente que no existe. Es un defecto viejo,
-- anterior a la migración, y la validación lo tiene que encontrar.
UPDATE pedidos SET cliente_id = 9999 WHERE id IN (12345, 23456, 34567);

SELECT 'clientes' AS tabla, COUNT(*) AS filas FROM clientes;
SELECT 'pedidos' AS tabla, COUNT(*) AS filas FROM pedidos;
