-- Paso 1 de la secuencia: expandir.
-- La columna nueva queda vacía y admite valores nulos, así la aplicación vieja
-- puede seguir escribiendo sin saber que existe.

ALTER TABLE pedidos ADD COLUMN cliente_principal_id INTEGER;
