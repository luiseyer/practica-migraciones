// Aplicación nueva, versión 2.
// Escribe en la columna vieja y en la nueva. Puede leer una u otra.
// Uso: bun v2            lee la columna vieja
//      bun v2 lee-nueva  lee la columna nueva

import { Database } from "bun:sqlite";

const leeNueva = process.argv[2] === "lee-nueva";

const db = new Database(`${import.meta.dir}/../pedidos.db`);
db.run("PRAGMA busy_timeout = 15000");

try {
  db.query("SELECT cliente_id, cliente_principal_id FROM pedidos LIMIT 1").get();
} catch (error) {
  console.error(`v2 no arranca: ${(error as Error).message}`);
  process.exit(1);
}

const insertarDoble = db.query(
  "INSERT INTO pedidos (cliente_id, cliente_principal_id, monto) VALUES (?1, ?1, ?2)",
);
const insertarNueva = db.query(
  "INSERT INTO pedidos (cliente_principal_id, monto) VALUES (?1, ?2)",
);
const leerVieja = db.query("SELECT cliente_id FROM pedidos WHERE id = ?1");
const leerNuevaColumna = db.query(
  "SELECT cliente_principal_id FROM pedidos WHERE id = ?1",
);
const ultimo = db.query("SELECT MAX(id) AS id FROM pedidos");

const columna = leeNueva ? "cliente_principal_id" : "cliente_id";
console.log(
  leeNueva
    ? "v2 en línea: escribe cliente_principal_id, lee cliente_principal_id"
    : "v2 en línea: escribe cliente_id y cliente_principal_id, lee cliente_id",
);

const intervalo = setInterval(() => {
  try {
    const cliente = 1 + Math.floor(Math.random() * 500);
    const monto = 100 + Math.floor(Math.random() * 9000);
    if (leeNueva) {
      insertarNueva.run(cliente, monto);
    } else {
      insertarDoble.run(cliente, monto);
    }
    const { id } = ultimo.get() as { id: number };
    const otro = 1 + Math.floor(Math.random() * 50000);
    const fila = (
      leeNueva ? leerNuevaColumna.get(otro) : leerVieja.get(otro)
    ) as Record<string, number> | null;
    console.log(`v2: nuevo ${id}, lee ${otro}, ${columna} ${fila?.[columna] ?? "NULL"}`);
  } catch (error) {
    console.error(`v2 se detiene: ${(error as Error).message}`);
    clearInterval(intervalo);
    process.exit(1);
  }
}, 2000);

process.on("SIGINT", () => {
  console.log("v2 detenida");
  process.exit(0);
});
