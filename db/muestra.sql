-- Tres pedidos recientes, con la columna vieja y la columna nueva.
-- Sirve para ver que la aplicación vieja sigue escribiendo sin rellenar la columna nueva.

SELECT id, cliente_id, cliente_principal_id
FROM pedidos
ORDER BY id DESC
LIMIT 3;
