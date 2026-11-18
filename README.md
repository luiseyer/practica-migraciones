# PRÁCTICA: DESPLIEGUE DE ESQUEMA SIN CAÍDA Y MIGRACIÓN DE DATOS

<img src="assets/unefa.png" alt="UNEFA" width="110" align="left" />

**Universidad Nacional Experimental Politécnica**\
**de la Fuerza Armada Nacional Bolivariana - UNEFA**\
**Ingeniería de Sistemas - 7mo semestre**\
**Asignatura:** Implantación de Sistemas\
**Docente:** Ing. Luis Fernando Reyes\
**Modalidad:** práctica guiada. Cada paso trae lo que se ejecuta, la lectura de cada línea y las preguntas que hay que responder antes de ejecutarlo.

<br clear="all" />

---

**Cada pareja termina con:**

- La tabla `pedidos` tiene la columna nueva y ya no tiene la columna vieja.
- Las 50.000 filas del rango quedaron con el valor nuevo, sin valores vacíos.
- La aplicación vieja ya no arranca y la aplicación nueva sigue escribiendo.
- La validación tiene un veredicto justificado con los cuatro controles.

## Qué contiene

**En `src/`**

- `sql.ts`: ejecuta los archivos de `db/`. No hace falta abrirlo.
- `app-v1.ts`: la aplicación vieja, que solo conoce la columna vieja.
- `app-v2.ts`: la aplicación nueva, que escribe en las dos columnas.
- `bloqueo.ts`: retiene el bloqueo de escritura durante doce segundos.

**En `db/`**

- `semilla.sql`: crea `clientes`, `pedidos` y deja tres filas con un defecto viejo.
- `paso-1-expandir.sql`: agrega la columna nueva.
- `muestra.sql`: muestra tres pedidos recientes con las dos columnas.
- `paso-3-relleno.sql`: rellena un lote y anota el punto de control.
- `controles.sql`: los cuatro controles de validación.
- `paso-5-contraer.sql`: segundo relleno y borrado de la columna vieja.
- `esquema.sql`: las columnas que tiene `pedidos` en ese momento.

La base de datos se crea en la raíz del repositorio, en `pedidos.db`. No se sube al repositorio.

## Antes de empezar

**Requisitos.** Bun 1.4.4 o superior, una terminal y conexión a internet la primera vez, solo para descargar los tipos de Bun. Cada pareja trabaja en su propia máquina y no hace falta cuenta de GitHub.

**Verifiquen la versión de Bun.** Tiene que ser 1.4.4 o superior.

```bash
bun --version
```

**Clonen el repositorio y entren a la carpeta.**

```bash
git clone https://github.com/luiseyer/practica-migraciones.git
cd practica-migraciones
```

**Instalen las dependencias una sola vez.**

```bash
bun install
```

**Comprueben que el proyecto no tiene errores de tipos.**

```bash
bun check
```

**Resultado esperado.** La última línea trae una marca de verificación y anuncia que no hay errores de tipos en los cuatro archivos del código: el ejecutor, las dos aplicaciones y el bloqueo. Los archivos `.sql` no se revisan. Sin el `tsconfig.json` y sin los tipos de Bun, el editor marca errores en las importaciones.

Bun imprime la orden que ejecuta, precedida de `$`, y la reescribe con sus propias comillas. Cuando un programa termina con error, agrega al final una línea `error: script "..." exited with code 1`. Esas dos líneas no son del programa y no cuentan al comparar resultados.

Van a necesitar tres terminales, todas abiertas en la carpeta del repositorio: la primera para la aplicación vieja, la segunda para la aplicación nueva y la tercera para las sentencias de `db/`. Desde el gestor de archivos, el botón derecho sobre la carpeta ofrece abrir una terminal. También sirve la del editor que usen.

## Preparación: la base de datos

**La sentencia.** El archivo `semilla.sql` crea las dos tablas del caso:

```sql
CREATE TABLE clientes (
  id INTEGER PRIMARY KEY,
  nombre TEXT NOT NULL
);

CREATE TABLE pedidos (
  id INTEGER PRIMARY KEY,
  cliente_id INTEGER,
  monto INTEGER NOT NULL
);
```

El resto del archivo inserta 500 clientes y 50.000 pedidos con una consulta recursiva, y después cambia el `cliente_id` de tres pedidos por el valor 9999.

**Qué hace cada línea**

- `INTEGER PRIMARY KEY` declara la columna que identifica cada fila.
- `TEXT NOT NULL` obliga a que el nombre exista. No se admite vacío.
- `cliente_id` admite valores nulos: una fila de `pedidos` no tiene que apuntar a un cliente.
- `monto` es obligatorio: un pedido sin monto no existe.
- Las dos tablas no declaran una llave foránea. La relación existe en los datos, no en el esquema. Por eso la validación la comprueba a mano.
- El `UPDATE` final deja tres pedidos apuntando al cliente 9999, que no existe. Es un defecto anterior a la migración y hay que encontrarlo.

**Preguntas**

1. ¿Qué columna de `pedidos` apunta a una fila de `clientes`?
2. Si se borra un cliente, ¿la base de datos impide que queden pedidos suyos? ¿Por qué?
3. ¿Por qué hay tres pedidos con el cliente 9999?

**Ejecuten y comparen**

```bash
bun sql db/semilla.sql
```

**Resultado esperado.** Primero una tabla de una línea con el modo de registro: `wal`. Después, cinco líneas `ok`, una por cada sentencia de estructura: tres borrados y dos creaciones. A continuación, tres líneas con las filas que tocó cada escritura: 500 clientes insertados, 50000 pedidos insertados y 3 pedidos cambiados para que apunten al cliente 9999. Al final, dos tablas de dos columnas con el nombre de cada tabla y su cantidad de filas.

Si en algún momento la base de datos queda a medias, detengan las dos aplicaciones y ejecuten el archivo otra vez. El archivo borra las tres tablas antes de crearlas, así que la base vuelve al estado inicial.

## Paso 0: desplegar la aplicación vieja

**Qué pasa.** La aplicación vieja es un proceso que inserta un pedido cada dos segundos y lee otro pedido al azar. Solo conoce `cliente_id`.

```bash
bun v1
```

**Resultado esperado.** Una línea de arranque que anuncia de qué columna escribe y de qué columna lee. Después, una línea cada dos segundos con el número del pedido nuevo, el identificador del pedido que leyó y el cliente de ese pedido. Los números cambian en cada ejecución.

Dejen la terminal abierta. La aplicación sigue en línea durante toda la práctica: el esquema cambia mientras ella escribe.

**Preguntas**

1. ¿Qué pasa si la aplicación vieja se cae a mitad de la práctica?
2. ¿Por qué conviene que esté escribiendo mientras se migra, y no detenida?

## La secuencia

La secuencia tiene cinco pasos. Se hacen en este orden y no se puede invertir.

| Paso | Nombre | Qué se hace |
| --- | --- | --- |
| 1 | Expandir | agregar la columna nueva, que admite valores nulos |
| 2 | Doble escritura | la aplicación escribe en la columna vieja y en la columna nueva |
| 3 | Rellenar | copiar los valores viejos a la columna nueva por lotes |
| 4 | Cambiar lectura | la aplicación lee la columna nueva |
| 5 | Contraer | borrar la columna vieja |

Entre el paso 3 y el paso 4 hay un control de validación. No es un paso de la secuencia: comprueba el relleno antes de que la aplicación nueva lea la columna nueva.

## Antes de expandir: intentar desplegar la aplicación nueva

En la segunda terminal:

```bash
bun v2
```

**Resultado esperado.** Una línea con el nombre de la aplicación y el error del motor: `no such column: cliente_principal_id`. El programa termina con un error y no llega a escribir.

**Preguntas**

1. ¿Qué le falta a la base de datos para que la aplicación nueva arranque?
2. ¿Qué demuestra ese error sobre el orden de la secuencia?

## Paso 1: expandir

**La sentencia**

```sql
ALTER TABLE pedidos ADD COLUMN cliente_principal_id INTEGER;
```

**Qué hace cada línea**

- `ALTER TABLE` cambia la definición de una tabla que ya existe y ya tiene filas.
- `ADD COLUMN` agrega una columna al final.
- `INTEGER` es el tipo. Es el mismo tipo que tiene `cliente_id`, porque va a guardar los mismos valores.
- No se declara obligatoria. Si lo fuera, cada inserción de la aplicación vieja fallaría, porque la aplicación vieja no conoce la columna.

**Preguntas**

1. ¿Qué pasa con las 50.000 filas que ya existen?
2. ¿Por qué la columna no se declara obligatoria?
3. La sentencia termina de inmediato. ¿Qué le costó a la tabla?

**Ejecuten y comparen**

```bash
bun sql db/paso-1-expandir.sql
```

**Resultado esperado.** Una sola línea: `ok`. La sentencia no devuelve filas. La columna existe, está vacía y admite valores nulos.

Ahora revisen las filas que escribió la aplicación vieja después de expandir:

```bash
bun sql db/muestra.sql
```

**Resultado esperado.** Una tabla de tres filas y tres columnas. La primera columna es el identificador, de mayor a menor: la fila de arriba es la última que escribió la aplicación vieja. En las tres filas, `cliente_id` tiene un valor y `cliente_principal_id` dice `NULL`.

**Preguntas**

1. La fila de arriba la escribió la aplicación vieja después de expandir. ¿Por qué tiene la columna nueva vacía?
2. ¿Qué pasaría si el relleno se hiciera antes de este paso?

## Paso 2: doble escritura

**Qué pasa.** El paso 2 no es una sentencia: es un despliegue. La aplicación nueva escribe en las dos columnas.

En la segunda terminal:

```bash
bun v2
```

**Resultado esperado.** Una línea de arranque que anuncia que escribe en las dos columnas y lee la columna vieja. Después, una línea cada dos segundos, igual que la de la aplicación vieja pero con el nombre `cliente_id` delante del valor leído. La aplicación nueva inserta aunque la vieja esté escribiendo, así que el número del pedido salta a veces de dos en dos.

**Preguntas**

1. ¿Qué escribe la aplicación vieja? ¿Y la aplicación nueva?
2. La aplicación nueva ya tiene la columna nueva y sin embargo lee la columna vieja. ¿Por qué?
3. ¿Qué ve la aplicación vieja si lee una fila escrita por la aplicación nueva? ¿Y la aplicación nueva si lee una fila escrita por la aplicación vieja?

Las dos aplicaciones están en línea al mismo tiempo y escriben sobre la misma tabla, cada una con la columna que conoce. El esquema cambia sin detener el servicio.

## Paso 3: rellenar

**La sentencia**

```sql
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
```

**Qué hace cada línea**

- `BEGIN IMMEDIATE` abre la transacción y pide el bloqueo de escritura de entrada, no en la primera escritura.
- `CREATE TABLE IF NOT EXISTS` crea el punto de control la primera vez y no hace nada en los lotes siguientes.
- El `INSERT` no guarda pedidos: anota el lote en el punto de control.
- `?1` y `?2` son el inicio y el final del rango, separados por un espacio en la línea de comandos. El inicio queda afuera y el final entra: `0 10000` rellena los pedidos 1 a 10000.
- `COUNT(*)` cuenta las filas antes de tocarlas.
- El `UPDATE` copia `cliente_id` en `cliente_principal_id`.
- `IS NULL` limita el trabajo a las filas que todavía no tienen valor nuevo.
- `COMMIT` confirma el lote y su anotación juntos, o no confirma nada.

**Preguntas**

1. ¿Por qué la condición del `UPDATE` empieza por comprobar que la columna nueva está vacía?
2. ¿Qué pasaría si la anotación del lote quedara fuera de la transacción?
3. ¿Por qué el rango se corta por `id` y no por `monto`?
4. ¿Qué devuelve el segundo intento del mismo lote, y por qué?

**Ejecuten y comparen**

```bash
bun sql db/paso-3-relleno.sql 0 10000
bun sql db/paso-3-relleno.sql 10000 20000
bun sql db/paso-3-relleno.sql 20000 30000
bun sql db/paso-3-relleno.sql 30000 40000
bun sql db/paso-3-relleno.sql 40000 50000
```

**Resultado esperado en cada lote.** Tres líneas. La primera es `ok`: el archivo crea la tabla del punto de control si falta y la deja como está si ya existe. La segunda dice `1 fila`: el lote quedó anotado. La tercera dice `10000 filas`: es el número de pedidos rellenados. La confirmación de la transacción no imprime nada.

Repitan un lote que ya se ejecutó:

```bash
bun sql db/paso-3-relleno.sql 0 10000
```

**Resultado esperado.** Las mismas tres líneas que en el intento anterior, salvo la última, que ahora dice `0 filas`.

**Preguntas**

1. Cero filas. ¿Es un error?
2. El punto de control anota el intento aunque no haya filas que llenar. ¿Para qué sirve ese registro?
3. ¿Por qué no se rellena toda la tabla en una sola transacción?

### Opcional: ver la espera de bloqueo

Este tramo necesita dos terminales libres. Detengan la aplicación nueva con `Ctrl-C` y usen su terminal para el bloqueo:

```bash
bun bloqueo
```

**Resultado esperado.** Dos líneas separadas por doce segundos: la primera anuncia que el bloqueo está tomado y la segunda que se liberó. La terminal queda ocupada hasta el final.

El bloqueo dura doce segundos contados desde la primera línea. En la tercera terminal, lancen el relleno en cuanto la vean:

```bash
bun sql db/paso-3-relleno.sql 0 10000
```

**Resultado esperado.** Una línea que empieza con `se cayó` y nombra el error del motor, `database is locked`. Al final, entre paréntesis, los milisegundos que esperó: alrededor de 3000.

Después del tramo, vuelvan a desplegar la aplicación nueva:

```bash
bun v2
```

**Preguntas**

1. El relleno se rindió a los tres segundos. ¿Por qué la aplicación vieja no se rinde?
2. ¿Qué es preferible que se caiga: el cambio de estructura o la aplicación? ¿Por qué?

## Control: validar

Los cuatro controles se ejecutan sobre las filas del rango, del 1 al 50.000, para que la aplicación en línea no altere el resultado. El archivo `controles.sql` tiene los cuatro. El tercero es el que decide el veredicto:

```sql
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
  AND cliente_id IS NOT NULL
  AND cliente_id NOT IN (SELECT id FROM clientes);
```

**Qué hace cada línea**

- La primera consulta cuenta las filas del rango que quedaron sin valor nuevo.
- La segunda cuenta las filas cuyo valor nuevo apunta a un cliente que no existe.
- `NOT IN` compara el valor con el conjunto de identificadores que sí existen.
- `IS NOT NULL` deja fuera las filas sin valor: una fila sin valor no apunta a ningún cliente y no es huérfana.
- La tercera consulta hace lo mismo con la columna vieja. Es la línea de base: dice cuántas filas huérfanas había antes de migrar.

**Preguntas**

1. ¿Por qué se valida sobre el rango y no sobre toda la tabla?
2. ¿Cuál de los cuatro controles habría detectado un relleno incompleto?
3. Si la columna nueva tiene tres filas huérfanas y la columna vieja también, ¿las creó la migración?

**Ejecuten y comparen**

```bash
bun sql db/controles.sql
```

**Resultado esperado.** Seis tablas, una por cada consulta del archivo. El control 3 ocupa tres, porque cuenta tres cosas distintas: las filas sin rellenar, las huérfanas en la columna nueva y las huérfanas en la columna vieja. En las cinco primeras, la primera columna dice el nombre del control y la segunda el valor. La sexta trae diez filas de pedidos, elegidas al azar en cada ejecución, con la etiqueta, el identificador y las dos columnas de cliente. Los valores que importan: 50000 filas en el rango, 229700000 como suma de los montos, 0 filas sin rellenar, 3 filas huérfanas en la columna nueva y 3 en la columna vieja. En la última, `cliente_id` y `cliente_principal_id` tienen el mismo valor en cada fila.

| Control | Qué comprueba | Criterio |
| --- | --- | --- |
| 1 | que el rango tenga las mismas filas que antes de migrar | 50.000 |
| 2 | que la suma de los montos no haya cambiado | 229.700.000 |
| 3 | que la columna nueva esté llena y no invente referencias | 0 sin rellenar y las mismas filas huérfanas que la columna vieja |
| 4 | que diez filas al azar tengan el mismo valor en las dos columnas | iguales |

**Preguntas**

1. Escriban el veredicto: aceptar, corregir o detener. Justifíquenlo con dos de los cuatro resultados.
2. ¿Qué harían con las tres filas huérfanas?

## Paso 4: cambiar lectura

**Qué pasa.** Otro despliegue, no una sentencia. Primero detengan la aplicación nueva con `Ctrl-C`. La terminal muestra `v2 detenida`.

```bash
bun v2 lee-nueva
```

**Resultado esperado.** Una línea de arranque que anuncia que escribe solo en la columna nueva y que lee esa misma columna. Después, una línea cada dos segundos con el valor leído, con el nombre `cliente_principal_id` delante. En las filas viejas ese valor ya no aparece vacío.

**Preguntas**

1. ¿Por qué ahora sí puede leer la columna nueva?
2. ¿Qué dejó de escribir la aplicación nueva?
3. ¿Qué mostraría esta misma aplicación si se hubiera adelantado antes del relleno?

## Paso 5: contraer

**La sentencia**

```sql
BEGIN IMMEDIATE;

UPDATE pedidos
SET cliente_principal_id = cliente_id
WHERE cliente_principal_id IS NULL AND id > 50000;

ALTER TABLE pedidos DROP COLUMN cliente_id;

COMMIT;
```

**Qué hace cada línea**

- El primer `UPDATE` es el segundo relleno. Toma las filas que quedaron fuera del primer relleno: todas las que escribió la aplicación vieja desde que arrancó, sin valor nuevo.
- `id > 50000` separa lo nuevo de lo que ya se rellenó.
- `DROP COLUMN` borra la columna vieja. La tabla se reescribe entera, así que esta sentencia sí toca las filas.
- Las dos sentencias van en la misma transacción: o se rellena y se borra, o no pasa nada.

**Preguntas**

1. ¿Por qué hace falta un segundo relleno justo antes de borrar?
2. ¿Por qué se detiene la aplicación vieja antes de ejecutar el archivo y no después?
3. ¿Qué pasaría si se ejecutara con la aplicación vieja todavía en línea?

**Ejecuten y comparen**

Primero detengan la aplicación vieja con `Ctrl-C`. La terminal muestra `v1 detenida`. La aplicación nueva sigue en línea.

```bash
bun sql db/paso-5-contraer.sql
```

**Resultado esperado.** Dos líneas. La primera es un número de filas, y son las que escribió la aplicación vieja después del primer relleno; el número cambia de una pareja a otra. La segunda es `ok`, el borrado de la columna.

Comprueben que la aplicación vieja ya no puede volver:

```bash
bun v1
```

**Resultado esperado.** Una línea con el nombre de la aplicación y el error del motor: `no such column: cliente_id`. La aplicación vieja no puede arrancar. La aplicación nueva sigue en línea y la secuencia terminó.

Comprueben el esquema final:

```bash
bun sql db/esquema.sql
```

**Resultado esperado.** Una tabla con una fila por columna y su tipo. Quedan tres: `id`, `monto` y `cliente_principal_id`. `cliente_id` ya no aparece.

## Preguntas de salida

1. ¿Por qué la columna nueva se agrega admitiendo valores nulos?
2. ¿Qué pasa si se ejecuta el paso 4 antes del paso 3?
3. ¿Por qué el punto de control se guarda en la misma transacción que el lote?
4. ¿Cuál de los cuatro controles habría detectado un relleno incompleto?
5. ¿Qué hay que comprobar antes de borrar la columna vieja?

## Fuentes

- SQLite Documentation: https://www.sqlite.org/docs.html
- SQLite `ALTER TABLE`: https://www.sqlite.org/lang_altertable.html
- SQLite `BEGIN IMMEDIATE` y bloqueos: https://www.sqlite.org/lang_transaction.html
- Bun `bun:sqlite`: https://bun.com/docs/runtime/sqlite
