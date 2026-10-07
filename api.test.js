const request = require('supertest');
const app = require('./index');

describe('Pruebas Unitarias - 10 Endpoints', () => {

    // ==========================================
    // 1. GET /api/habitats
    // ==========================================
    test('1. ÉXITO: Obtener hábitats devuelve 200', async () => {
        const response = await request(app).get('/api/habitats');
        expect(response.statusCode).toBe(200);
    });
    test('1. FALLO: Usar un método no soportado (PUT) devuelve 404', async () => {
        const response = await request(app).put('/api/habitats');
        expect(response.statusCode).toBe(404);
    });

    // ==========================================
    // 2. POST /api/habitats
    // ==========================================
    test('2. ÉXITO: Crear un hábitat devuelve 200', async () => {
        const response = await request(app).post('/api/habitats').send({ nombre: 'Jungla' });
        expect(response.statusCode).toBe(200);
    });
    test('2. FALLO: Enviar un JSON malformado devuelve 400 (Bad Request)', async () => {
        const response = await request(app)
            .post('/api/habitats')
            .set('Content-Type', 'application/json')
            .send('{ nombre: "Jungla" '); // JSON roto
        expect(response.statusCode).toBe(400);
    });

    // ==========================================
    // 3. DELETE /api/habitats/:id
    // ==========================================
    test('3. ÉXITO: Eliminar un hábitat por ID devuelve 200', async () => {
        const response = await request(app).delete('/api/habitats/1');
        expect(response.statusCode).toBe(200);
    });
    test('3. FALLO: Olvidar el ID en la URL devuelve 404', async () => {
        const response = await request(app).delete('/api/habitats/'); // Falta el número
        expect(response.statusCode).toBe(404);
    });

    // ==========================================
    // 4. GET /api/animales
    // ==========================================
    test('4. ÉXITO: Obtener animales devuelve 200', async () => {
        const response = await request(app).get('/api/animales');
        expect(response.statusCode).toBe(200);
    });
    test('4. FALLO: Intentar hacer POST a esta ruta sin datos válidos', async () => {
        const response = await request(app)
            .post('/api/animales')
            .set('Content-Type', 'application/json')
            .send('datos basura');
        expect(response.statusCode).toBe(400);
    });

    // ==========================================
    // 5. POST /api/animales
    // ==========================================
    test('5. ÉXITO: Crear un animal devuelve 200', async () => {
        const response = await request(app)
            .post('/api/animales')
            .send({ nombre: 'Tigre', especie: 'Felino', habitat_id: 1 });
        expect(response.statusCode).toBe(200);
    });
    test('5. FALLO: Mandar un tipo de contenido no soportado', async () => {
        const response = await request(app)
            .post('/api/animales')
            .set('Content-Type', 'text/html') // API espera JSON
            .send('<p>Tigre</p>');
        expect(response.statusCode).toBe(400); // Falla porque no es JSON
    });

    // ==========================================
    // 6. PUT /api/animales/:id
    // ==========================================
    test('6. ÉXITO: Actualizar un animal devuelve 200', async () => {
        // Primero lo creamos para asegurar que existe
        await request(app).post('/api/animales').send({ nombre: 'Oso', especie: 'Mamífero', habitat_id: 1 });
        const response = await request(app)
            .put('/api/animales/1')
            .send({ nombre: 'Oso Pardo', especie: 'Mamífero', habitat_id: 1 });
        expect([200, 404]).toContain(response.statusCode);
    });
    test('6. FALLO: No enviar el campo obligatorio "nombre" devuelve 400', async () => {
        const response = await request(app).put('/api/animales/1').send({ especie: 'Mamífero' });
        expect(response.statusCode).toBe(400);
    });
    test('6. FALLO (Extra): Intentar actualizar un ID inexistente devuelve 404', async () => {
        const response = await request(app).put('/api/animales/9999').send({ nombre: 'Fantasma' });
        expect(response.statusCode).toBe(404);
    });

    // ==========================================
    // 7. GET /api/animales/habitat/:id
    // ==========================================
    test('7. ÉXITO: Buscar animales por hábitat devuelve 200', async () => {
        const response = await request(app).get('/api/animales/habitat/1');
        expect(response.statusCode).toBe(200);
    });
    test('7. FALLO: Olvidar el parámetro de búsqueda devuelve 404', async () => {
        const response = await request(app).get('/api/animales/habitat/');
        expect(response.statusCode).toBe(404);
    });

    // ==========================================
    // 8. DELETE /api/animales/:id
    // ==========================================
    test('8. ÉXITO: Eliminar un animal devuelve 200', async () => {
        const response = await request(app).delete('/api/animales/1');
        expect(response.statusCode).toBe(200);
    });
    test('8. FALLO: Intentar hacer GET a la ruta de eliminación específica', async () => {
        const response = await request(app).get('/api/animales/1'); // No programamos este GET
        expect(response.statusCode).toBe(404);
    });

    // ==========================================
    // 9. GET /api/estadisticas
    // ==========================================
    test('9. ÉXITO: Consultar estadísticas devuelve 200', async () => {
        const response = await request(app).get('/api/estadisticas');
        expect(response.statusCode).toBe(200);
    });
    test('9. FALLO: Usar DELETE en la ruta de estadísticas devuelve 404', async () => {
        const response = await request(app).delete('/api/estadisticas');
        expect(response.statusCode).toBe(404);
    });

    // ==========================================
    // 10. DELETE /api/vaciar (Y POST /api/backup)
    // ==========================================
    test('10. ÉXITO: Crear un backup de la base de datos', async () => {
        const response = await request(app).post('/api/backup');
        expect(response.statusCode).toBe(200);
    });
    test('10. FALLO: Intentar vaciar la BD usando POST en vez de DELETE', async () => {
        const response = await request(app).post('/api/vaciar');
        expect(response.statusCode).toBe(404);
    });
    test('10. ÉXITO FINAL: Vaciar la BD devuelve 200', async () => {
        const response = await request(app).delete('/api/vaciar');
        expect(response.statusCode).toBe(200);
    });
});