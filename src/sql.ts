// Ejecuta un archivo .sql contra pedidos.db.
// Uso: bun sql archivo.sql [valor1] [valor2]
// Los valores se enlazan a ?1, ?2 en el orden en que se escriben.

import { Database } from "bun:sqlite";

const [archivo, ...argumentos] = process.argv.slice(2);

if (!archivo) {
  console.error("uso: bun sql archivo.sql [valor1] [valor2]");
  process.exit(1);
}

const valores = argumentos.map((valor) =>
  /^-?\d+$/.test(valor) ? Number(valor) : valor,
);

const db = new Database(`${import.meta.dir}/../pedidos.db`);
db.run("PRAGMA busy_timeout = 3000");

const texto = await Bun.file(archivo).text();

const sentencias = texto
  .split("\n")
  .filter((linea) => !linea.trimStart().startsWith("--"))
  .join("\n")
  .split(";")
  .map((sentencia) => sentencia.trim())
  .filter((sentencia) => sentencia.length > 0);

for (const sentencia of sentencias) {
  const consulta = db.query<
    Record<string, unknown>,
    (string | number)[]
  >(sentencia);
  const inicio = performance.now();

  try {
    if (consulta.reader) {
      console.log(tabla(consulta.all(...valores)));
      continue;
    }

    const resultado = consulta.run(...valores);
    if (/^(begin|commit|rollback|pragma)\b/i.test(sentencia)) {
      continue;
    }
    if (/^(insert|update|delete|replace)\b/i.test(sentencia)) {
      const n = resultado.changes;
      console.log(`${n} ${n === 1 ? "fila" : "filas"}`);
      continue;
    }
    console.log("ok");
  } catch (error) {
    const ms = Math.round(performance.now() - inicio);
    console.error(`se cayó: ${(error as Error).message} (${ms} ms)`);
    process.exit(1);
  }
}

db.close();

function tabla(filas: Record<string, unknown>[]): string {
  if (filas.length === 0) {
    return "sin filas";
  }

  const columnas = Object.keys(filas[0]);
  const textos = filas.map((fila) =>
    columnas.map((columna) => String(fila[columna] ?? "NULL")),
  );
  const anchos = columnas.map((columna, i) =>
    Math.max(columna.length, ...textos.map((fila) => fila[i].length)),
  );
  const linea = (valores: string[]) =>
    valores.map((valor, i) => valor.padEnd(anchos[i])).join("  ");

  return [
    linea(columnas),
    linea(anchos.map((ancho) => "-".repeat(ancho))),
    ...textos.map(linea),
  ].join("\n");
}
