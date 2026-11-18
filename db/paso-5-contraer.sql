-- Paso 5 de la secuencia: contraer.
-- Se ejecuta con la aplicación vieja ya detenida.
-- Primero el segundo relleno: las filas que escribió la aplicación vieja
-- después del primer relleno. Después se borra la columna vieja.

BEGIN IMMEDIATE;

UPDATE pedidos
SET cliente_principal_id = cliente_id
WHERE cliente_principal_id IS NULL AND id > 50000;

ALTER TABLE pedidos DROP COLUMN cliente_id;

COMMIT;
