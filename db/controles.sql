-- Los cuatro controles de validación.
-- No es un paso de la secuencia: es el control que autoriza el paso 5.

-- Control 1: el rango tiene las mismas filas que antes de migrar.
SELECT 'Control 1: filas del rango' AS control, COUNT(*) AS valor
FROM pedidos WHERE id <= 50000;

-- Control 2: la suma de los montos no cambió.
SELECT 'Control 2: suma de los montos' AS control, SUM(monto) AS valor
FROM pedidos WHERE id <= 50000;

-- Control 3: la columna nueva está llena y no inventó referencias.
SELECT 'Control 3: filas sin rellenar' AS control, COUNT(*) AS valor
FROM pedidos WHERE id <= 50000 AND cliente_principal_id IS NULL;

SELECT 'Control 3: filas huérfanas en la columna nueva' AS control, COUNT(*) AS valor
FROM pedidos
WHERE id <= 50000
  AND cliente_principal_id IS NOT NULL
  AND cliente_principal_id NOT IN (SELECT id FROM clientes);

SELECT 'Control 3: filas huérfanas en la columna vieja' AS control, COUNT(*) AS valor
FROM pedidos
WHERE id <= 50000
  AND cliente_id NOT IN (SELECT id FROM clientes);

-- Control 4: muestra de diez filas, para comparar las dos columnas.
SELECT 'Control 4: muestra de diez filas' AS control, id, cliente_id, cliente_principal_id
FROM pedidos WHERE id <= 50000 ORDER BY RANDOM() LIMIT 10;
