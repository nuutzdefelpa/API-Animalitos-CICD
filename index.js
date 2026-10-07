const express = require('express');
const net = require('net');
const sqlite3 = require('sqlite3').verbose();
const fs = require('fs');
const app = express();
app.use(express.json());

const db = new sqlite3.Database('./zoologico.db');
db.serialize(() => {
    db.run("CREATE TABLE IF NOT EXISTS habitats (id INTEGER PRIMARY KEY, nombre TEXT)");
    db.run("CREATE TABLE IF NOT EXISTS animales (id INTEGER PRIMARY KEY, nombre TEXT, especie TEXT, habitat_id INTEGER)");
});
const formatRes = (data) => ({ statusCode: 200, data }); 

// Endpoints 1-3: Habitats (GET, POST, DELETE)
app.get('/api/habitats', (req, res) => {
    db.all("SELECT * FROM habitats", [], (err, rows) => {
        console.log("Mensaje de prueba!!!");
        res.json(formatRes(rows));
    });
});app.post('/api/habitats', (req, res) => {
    db.run("INSERT INTO habitats (nombre) VALUES (?)", [req.body.nombre], function() { res.json(formatRes({ id: this.lastID })); });
});
app.delete('/api/habitats/:id', (req, res) => db.run("DELETE FROM habitats WHERE id = ?", req.params.id, () => res.json(formatRes("Hábitat eliminado"))));

// Endpoints 4-6: Animales (GET, POST, DELETE)
app.get('/api/animales', (req, res) => db.all("SELECT * FROM animales", [], (err, rows) => res.json(formatRes(rows))));
app.post('/api/animales', (req, res) => {
    if (!req.body || !req.body.nombre) {
        return res.status(400).json(formatRes("Error: Faltan datos o formato no soportado"));
    }
    
    db.run("INSERT INTO animales (nombre, especie, habitat_id) VALUES (?, ?, ?)", 
        [req.body.nombre, req.body.especie, req.body.habitat_id], 
        function() { 
            res.json(formatRes({ id: this.lastID })); 
        }
    );
});
app.delete('/api/animales/:id', (req, res) => db.run("DELETE FROM animales WHERE id = ?", req.params.id, () => res.json(formatRes("Animal eliminado"))));

// Endpoints 7-8: Consultas extras para llegar a los 10 endpoints[cite: 1]
app.get('/api/animales/habitat/:id', (req, res) => db.all("SELECT * FROM animales WHERE habitat_id = ?", [req.params.id], (err, rows) => res.json(formatRes(rows))));
app.get('/api/estadisticas', (req, res) => db.get("SELECT COUNT(*) as total_animales FROM animales", [], (err, row) => res.json(formatRes(row))));

// Endpoints 9-10: Backup y Vaciar BD[cite: 1]
app.post('/api/backup', (req, res) => {
    try {
        fs.copyFileSync('./zoologico.db', './zoologico_backup.db');
        res.json(formatRes("Backup creado con éxito"));
    } catch (error) {
        // Atrapamos el error para que no se muera la petición
        res.status(500).json(formatRes("Error al hacer backup: " + error.message));
    }
});
app.delete('/api/vaciar', (req, res) => {
    db.run("DELETE FROM animales");
    db.run("DELETE FROM habitats");
    res.json(formatRes("Base de datos vaciada por completo"));
});

app.put('/api/animales/:id', (req, res) => {
    if (!req.body.nombre) return res.status(400).json({ error: "Falta el nombre" });
    db.run("UPDATE animales SET nombre = ?, especie = ?, habitat_id = ? WHERE id = ?", 
        [req.body.nombre, req.body.especie, req.body.habitat_id, req.params.id], 
        function(err) {
            if (this.changes === 0) return res.status(404).json({ error: "Animal no encontrado" });
            res.json({ statusCode: 200, data: "Animal actualizado" });
        });
});

app.listen(80, () => console.log('API de Animales corriendo en puerto 80'));
module.exports = app;
app.get('/api/backup/descargar', (req, res) => {
    res.download('./zoologico_backup.db', 'zoologico_backup.db', (err) => {
        if (err) {
            res.status(404).json(formatRes("Error: El backup no existe. Ejecuta el POST /api/backup primero."));
        }
    });
});

// ==========================================
// Servidor Socket TCP en puerto 6061
// ==========================================
const tcpServer = net.createServer((socket) => {
    console.log('Cliente TCP conectado');

    socket.on('data', (data) => {
        const mensaje = data.toString().trim();
        console.log(`Mensaje recibido: ${mensaje}`);

        // 1. Detectar comando {insert:...}
        const insertMatch = mensaje.match(/^{insert:(.*)}$/);
        if (insertMatch) {
            try {
                const elemento = JSON.parse(insertMatch[1]);
                // Insertamos el animal en la BD
                db.run("INSERT INTO animales (nombre, especie, habitat_id) VALUES (?, ?, ?)", 
                    [elemento.nombre, elemento.especie, elemento.habitat_id], 
                    function(err) {
                        if (err) {
                            socket.write(JSON.stringify({ error: err.message }) + '\n');
                        } else {
                            socket.write(JSON.stringify({ statusCode: 200, data: { id: this.lastID, msg: "Animal insertado por TCP" } }) + '\n');
                        }
                    }
                );
            } catch (e) {
                socket.write('Error: JSON invalido en el insert\n');
            }
            return; // Salir de la función para no evaluar el get
        }

        // 2. Detectar comando {get:...}
        const getMatch = mensaje.match(/^{get:(.*)}$/);
        if (getMatch) {
            const id = getMatch[1]; // Tomamos el ID que pasen, ej: {get:1}
            db.get("SELECT * FROM animales WHERE id = ?", [id], (err, row) => {
                if (err) {
                    socket.write(JSON.stringify({ error: err.message }) + '\n');
                } else if (row) {
                    socket.write(JSON.stringify({ statusCode: 200, data: row }) + '\n');
                } else {
                    socket.write(JSON.stringify({ statusCode: 404, data: "Animal no encontrado" }) + '\n');
                }
            });
            return;
        }

        socket.write('Comando no reconocido. Formatos validos: {insert:{"nombre":"...","especie":"...","habitat_id":1}} o {get:1}\n');
    });

    socket.on('end', () => console.log('Cliente TCP desconectado'));
});

tcpServer.listen(6061, () => {
    console.log('Servidor Socket TCP de Animales corriendo en puerto 6061');
});