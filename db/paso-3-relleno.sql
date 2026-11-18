-- Paso 3 de la secuencia: rellenar.
-- Recibe el rango del lote: ?1 = desde, ?2 = hasta.
-- El punto de control se guarda en la misma transacción que el lote:
-- si el lote falla, tampoco queda registrado.

BEGIN IMMEDIATE;

CREATE TABLE IF NOT EXISTS migraciones (
  id INTEGER PRIMARY KEY AUTOINCREMENT,
  paso TEXT NOT NULL,
  desde INTEGER NOT NULL,
  hasta INTEGER NOT NULL,
  filas INTEGER NOT NULL,
  terminado_en TEXT NOT NULL
);

INSERT INTO migraciones (paso, desde, hasta, filas, terminado_en)
SELECT 'relleno', ?1, ?2, COUNT(*), datetime('now')
FROM pedidos
WHERE cliente_principal_id IS NULL AND id > ?1 AND id <= ?2;

UPDATE pedidos
SET cliente_principal_id = cliente_id
WHERE cliente_principal_id IS NULL AND id > ?1 AND id <= ?2;

COMMIT;
