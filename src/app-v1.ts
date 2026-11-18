// Aplicación vieja, versión 1.
// No conoce la columna nueva y no hay que tocarla: está desplegada.
// Uso: bun v1

import { Database } from "bun:sqlite";

const db = new Database(`${import.meta.dir}/../pedidos.db`);
db.run("PRAGMA busy_timeout = 15000");

try {
  db.query("SELECT cliente_id, monto FROM pedidos LIMIT 1").get();
} catch (error) {
  console.error(`v1 no arranca: ${(error as Error).message}`);
  process.exit(1);
}

const insertar = db.query(
  "INSERT INTO pedidos (cliente_id, monto) VALUES (?1, ?2)",
);
const leer = db.query("SELECT cliente_id FROM pedidos WHERE id = ?1");
const ultimo = db.query("SELECT MAX(id) AS id FROM pedidos");

console.log("v1 en línea: escribe cliente_id, lee cliente_id");

const intervalo = setInterval(() => {
  try {
    insertar.run(
      1 + Math.floor(Math.random() * 500),
      100 + Math.floor(Math.random() * 9000),
    );
    const { id } = ultimo.get() as { id: number };
    const otro = 1 + Math.floor(Math.random() * 50000);
    const fila = leer.get(otro) as { cliente_id: number } | null;
    console.log(
      `v1: nuevo ${id}, lee ${otro}, cliente ${fila?.cliente_id ?? "NULL"}`,
    );
  } catch (error) {
    console.error(`v1 se detiene: ${(error as Error).message}`);
    clearInterval(intervalo);
    process.exit(1);
  }
}, 2000);

process.on("SIGINT", () => {
  console.log("v1 detenida");
  process.exit(0);
});
