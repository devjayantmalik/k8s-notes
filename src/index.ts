import express from "express";
import path from "path";
import multer from "multer";
import db from "mariadb";
import fs from "fs/promises";

const __UPLOADS_DIR__ = path.join(__dirname, "..", "uploads");

const main = async (): Promise<void> => {
  const app = express();

  // make sure uploads folder exists
  try {
    await fs.stat(__UPLOADS_DIR__);
  } catch (err) {
    await fs.mkdir(__UPLOADS_DIR__);
  }

  const db_url = process.env.DATABASE_URL;
  if (!db_url) {
    console.error("DATABASE_URL is required...");
    process.exit(1);
  }

  const conn = await new Promise<db.Connection>(async (resolve, reject) => {
    let conn: db.Connection | null = null;

    const timeout = setTimeout(() => {
      // Resolve or reject the promise based on connection established after max of 30 seconds.
      return !!conn
        ? resolve(conn)
        : reject(new Error("Failed to connect to database..."));
    }, 30000);

    while (!conn) {
      try {
        conn = await db.createConnection(db_url);
      } catch (err) {}
    }

    // clear timeout if executing reaches this point.
    clearTimeout(timeout);
    resolve(conn);
  });

  if (!conn) {
    console.error("Database not connected...");
    process.exit(1);
  }

  // Run your migrations
  await conn.query(`CREATE TABLE IF NOT EXISTS notes(
    id INT PRIMARY KEY AUTO_INCREMENT,
    title VARCHAR(200) NOT NULL,
    description VARCHAR(200) DEFAULT '',
    filename TEXT NOT NULL
    );`);

  app.use(express.json());
  app.use(express.urlencoded({ extended: false }));

  app.use("/picture", express.static(__UPLOADS_DIR__));

  app.get("/notes", async (_req, res) => {
    const result = await conn.query(
      "select title, description, filename from notes LIMIT 100;"
    );

    let html = ``;
    for (let note of Array.from(result)) {
      html += `<div>
        <p><strong>title: </strong>${(note as any).title}</p>
        <p><strong>description: </strong> ${(note as any).description}</p>
        <img width="500" height="300" src="/picture/${
          (note as any).filename
        }" />
      </div>`;
    }

    return res.contentType("text/html").send(`<section>${html}</section>`);
  });

  app.get("/", (_req, res) => {
    return res.sendFile(path.join(__dirname, "views", "index.html"));
  });

  app.post(
    "/note",
    multer({
      dest: __UPLOADS_DIR__,
      preservePath: true,
    }).single("picture"),
    async (req, res) => {
      const { title, description } = req.body as { [key: string]: string };

      if (!title.trim()) {
        return res.json({
          success: false,
          error: "please provide title to upload note.",
        });
      }

      if (!req.file) {
        return res.json({
          success: false,
          error: "please select file to upload note.",
        });
      }

      const filename =
        req.file.filename + "." + req.file.originalname.split(".").pop();

      await fs.rename(
        path.join(__UPLOADS_DIR__, req.file.filename),
        path.join(__UPLOADS_DIR__, filename)
      );

      await conn.query(
        `INSERT INTO notes(title, description, filename) VALUES(?, ?, ?);`,
        [title, description, filename]
      );

      const note = {
        title: title,
        description: description,
        picture: filename,
      };
      return res.json({ success: true, note: note });
    }
  );

  const port = process.env.PORT || 4000;
  app.listen(port, () =>
    console.log(`Server started at: http://localhost:${port}`)
  );
};

main().catch(console.error);

// enviromnent variables
// DATABASE_URL
// STORAGE_PATH (try to omit it.)
