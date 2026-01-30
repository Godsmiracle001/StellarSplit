import * as fs from "fs";

export async function streamQueryToCsv(
  sql: string,
  params: any[],
  filePath: string,
  headers: string[],
  sectionLabel?: string,
) {
  const { Pool } = require("pg");
  const QueryStream = require("pg-query-stream");

  const pool = new Pool({
    host: process.env.DB_HOST || "localhost",
    port: parseInt(process.env.DB_PORT || "5432", 10),
    user: process.env.DB_USERNAME || "postgres",
    password: process.env.DB_PASSWORD || "postgres",
    database: process.env.DB_NAME || "stellarsplit_dev",
  });

  const client = await pool.connect();
  try {
    const qs = new QueryStream(sql, params);
    const dbStream = client.query(qs);

    if (sectionLabel) {
      await fs.promises.appendFile(filePath, `${sectionLabel}\n`);
    }

    const writeStream = fs.createWriteStream(filePath, {
      flags: "a",
      encoding: "utf8",
    });
    writeStream.write(headers.join(",") + "\n");

    await new Promise<void>((resolve, reject) => {
      dbStream.on("data", (row: any) => {
        try {
          const line = headers
            .map((h) => {
              const v = String(row[h] ?? "");
              if (v.includes(",") || v.includes("\n") || v.includes('"')) {
                return '"' + v.replace(/"/g, '""') + '"';
              }
              return v;
            })
            .join(",");
          writeStream.write(line + "\n");
        } catch (err) {
          reject(err);
        }
      });
      dbStream.on("end", () => {
        writeStream.end();
        resolve();
      });
      dbStream.on("error", (err: any) => reject(err));
      writeStream.on("error", (err) => reject(err));
    });
  } finally {
    client.release();
    await pool.end();
  }
}
