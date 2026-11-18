// Simula una transacción abierta que retiene el bloqueo de escritura.
// Mientras dura, cualquier cambio de estructura espera y se cae.
// Uso: bun bloqueo

import { Database } from "bun:sqlite";

const db = new Database(`${import.meta.dir}/../pedidos.db`);
db.run("PRAGMA busy_timeout = 15000");

db.run("BEGIN IMMEDIATE");
console.log("bloqueo tomado por 12 s");

await Bun.sleep(12000);

db.run("COMMIT");
console.log("bloqueo liberado");
