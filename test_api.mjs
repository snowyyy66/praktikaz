import fs from 'fs';

const API_URL = 'http://localhost:3000/api';

const accounts = {
    admin: { email: 'admin@demo.com', password: 'admin123' },
    seller1: { email: 'alex@demo.com', password: 'user123' },
    seller2: { email: 'maria@demo.com', password: 'user123' },
    buyer1: { email: 'ivan@demo.com', password: 'user123' },
    buyer2: { email: 'olga@demo.com', password: 'user123' }
};

let tokens = {};

async function req(method, endpoint, body = null, token = null) {
    const start = performance.now();
    const headers = { 'Content-Type': 'application/json' };
    if (token) headers['Authorization'] = `Bearer ${token}`;
    
    let res;
    try {
        res = await fetch(`${API_URL}${endpoint}`, {
            method,
            headers,
            body: body ? (typeof body === 'string' ? body : JSON.stringify(body)) : null
        });
    } catch (e) {
        return { error: e.message, time: performance.now() - start };
    }
    
    const time = performance.now() - start;
    const status = res.status;
    let data = null;
    try {
        const text = await res.text();
        try {
            data = JSON.parse(text);
        } catch {
            data = text;
        }
    } catch {
        data = null;
    }
    return { status, data, time };
}

async function runTests() {
    const results = [];
    
    function logResult(scenario, expectedStatus, actualStatus, time, data, fields = []) {
        const hasFields = fields.length === 0 || fields.every(f => {
            if (Array.isArray(data)) return data.length > 0 && data[0][f] !== undefined;
            return data && data[f] !== undefined;
        });
        
        results.push({
            scenario,
            expectedStatus,
            actualStatus,
            time: Math.round(time),
            hasFields: hasFields ? 'Yes' : 'No',
            dataPreview: typeof data === 'string' ? data.substring(0, 50) : JSON.stringify(data).substring(0, 100)
        });
        console.log(`[${actualStatus === expectedStatus ? 'PASS' : 'FAIL'}] ${scenario} | Status: ${actualStatus} (Exp: ${expectedStatus}) | Time: ${Math.round(time)}ms`);
    }

    // 1. АВТОРИЗАЦИЯ
    let res = await req('POST', '/auth/register', { username: 'testuser', email: `test${Date.now()}@demo.com`, password: 'password123' });
    logResult('Регистрация нового пользователя', 200, res.status, res.time, res.data, ['token', 'user']);

    res = await req('POST', '/auth/login', { email: accounts.admin.email, password: accounts.admin.password });
    tokens.admin = res.data?.token;
    logResult('Логин с верными данными (Admin)', 200, res.status, res.time, res.data, ['token', 'user']);
    
    res = await req('POST', '/auth/login', { email: accounts.seller1.email, password: accounts.seller1.password });
    tokens.seller1 = res.data?.token;
    
    res = await req('POST', '/auth/login', { email: accounts.buyer1.email, password: accounts.buyer1.password });
    tokens.buyer1 = res.data?.token;

    res = await req('POST', '/auth/login', { email: accounts.admin.email, password: 'wrongpassword' });
    logResult('Логин с неверным паролем', 401, res.status, res.time, res.data);

    res = await req('POST', '/auth/login', { email: 'nonexistent@demo.com', password: 'password123' });
    logResult('Логин с несуществующим email', 401, res.status, res.time, res.data);

    res = await req('POST', '/auth/register', { username: 'admin', email: accounts.admin.email, password: 'password123' });
    logResult('Регистрация с уже занятым email', 400, res.status, res.time, res.data);

    // 2. ТОВАРЫ
    res = await req('GET', '/products?page=1&limit=10');
    logResult('GET /products (пагинация)', 200, res.status, res.time, res.data, ['items', 'totalCount']);
    let productId = res.data?.items?.[0]?.id || 1;

    res = await req('GET', '/products?category=1');
    logResult('GET /products (категория)', 200, res.status, res.time, res.data);

    res = await req('GET', '/products?city=Москва');
    logResult('GET /products (город)', 200, res.status, res.time, res.data);

    res = await req('GET', '/products?min_price=1000&max_price=5000');
    logResult('GET /products (цены)', 200, res.status, res.time, res.data);

    res = await req('GET', '/products/my?user_id=2'); // assuming user 2 is a seller
    logResult('GET /products/my?user_id=2', 200, res.status, res.time, res.data);

    res = await req('GET', `/products/${productId}`);
    logResult('GET /products/:id', 200, res.status, res.time, res.data, ['id', 'title', 'price']);

    res = await req('POST', '/products', { title: 'New Product', price: 100, description: 'Test', categoryId: 1, condition: 'new', city: 'Москва', images: ['url'], isAuction: false }, tokens.seller1);
    logResult('POST /products (создать товар)', 201, res.status, res.time, res.data, ['id']);
    let newProductId = res.data?.id;

    if (newProductId) {
        res = await req('PUT', `/products/${newProductId}`, { title: 'Updated Product', price: 150 }, tokens.seller1);
        logResult('PUT /products/:id (обновить)', 200, res.status, res.time, res.data);

        res = await req('DELETE', `/products/${newProductId}`, null, tokens.seller1);
        logResult('DELETE /products/:id (удалить)', 204, res.status, res.time, res.data);
    }

    // 3. ПОИСК
    res = await req('GET', '/search?q=велосипед');
    logResult('GET /search?q=велосипед', 200, res.status, res.time, res.data);

    res = await req('GET', '/search?q=а');
    logResult('GET /search?q=а', 200, res.status, res.time, res.data);

    res = await req('GET', '/search?q=');
    logResult('GET /search?q=пустой', 200, res.status, res.time, res.data); // Or maybe 400?

    // 4. КАТЕГОРИИ
    res = await req('GET', '/categories');
    logResult('GET /categories', 200, res.status, res.time, res.data, ['id', 'name', 'fields', 'conditions', 'checkoutSteps']);

    // 5. ОТЗЫВЫ
    res = await req('POST', '/reviews', { productId: productId, rating: 0, comment: 'Bad' }, tokens.buyer1);
    logResult('POST /reviews (rating=0)', 400, res.status, res.time, res.data);

    res = await req('POST', '/reviews', { productId: productId, rating: 6, comment: 'Bad' }, tokens.buyer1);
    logResult('POST /reviews (rating=6)', 400, res.status, res.time, res.data);

    res = await req('POST', '/reviews', { productId: productId, rating: 5, comment: 'Good' }, tokens.buyer1);
    logResult('POST /reviews (rating=5)', 201, res.status, res.time, res.data);

    res = await req('GET', `/reviews?product_id=${productId}`);
    logResult('GET /reviews?product_id=1', 200, res.status, res.time, res.data);

    res = await req('GET', '/reviews?seller_id=2');
    logResult('GET /reviews?seller_id=2', 200, res.status, res.time, res.data);

    // 6. СООБЩЕНИЯ
    res = await req('POST', '/conversations', { productId: productId, otherUserId: 2 }, tokens.buyer1); // User 2 is seller
    logResult('POST /conversations (создать)', 200, res.status, res.time, res.data);
    let convId = res.data?.id || 1;

    let meRes = await req('GET', '/auth/me', null, tokens.buyer1);
    let myId = meRes.data?.id;

    res = await req('POST', '/conversations', { productId: productId, otherUserId: myId }, tokens.buyer1);
    logResult('POST /conversations (одинаковый user_id)', 400, res.status, res.time, res.data);

    res = await req('GET', `/conversations?user_id=${myId}`, null, tokens.buyer1);
    logResult('GET /conversations?user_id=X', 200, res.status, res.time, res.data);

    res = await req('POST', `/conversations/${convId}/messages`, { content: 'Hello' }, tokens.buyer1);
    logResult('POST /conversations/:id/messages', 200, res.status, res.time, res.data);

    res = await req('POST', `/conversations/${convId}/messages`, { content: '' }, tokens.buyer1);
    logResult('POST /conversations/:id/messages (пустое)', 400, res.status, res.time, res.data);

    // 7. ИЗБРАННОЕ
    res = await req('POST', '/favorites/toggle', { productId: productId }, tokens.buyer1);
    logResult('POST /favorites/toggle (добавить)', 200, res.status, res.time, res.data);

    res = await req('POST', '/favorites/toggle', { productId: productId }, tokens.buyer1);
    logResult('POST /favorites/toggle (убрать)', 200, res.status, res.time, res.data);

    res = await req('GET', `/users/${myId}/favorites`, null, tokens.buyer1);
    logResult('GET /users/:id/favorites', 200, res.status, res.time, res.data);

    // 8. ПРОФИЛЬ
    res = await req('GET', '/users/2');
    logResult('GET /users/:id', 200, res.status, res.time, res.data, ['id', 'username']);

    res = await req('GET', '/users/2/products?page=1');
    logResult('GET /users/:id/products', 200, res.status, res.time, res.data);

    res = await req('PUT', `/users/${myId}`, { username: 'updated_name' }, tokens.buyer1);
    logResult('PUT /users/:id', 200, res.status, res.time, res.data);

    // 9. ЗАКАЗЫ
    res = await req('POST', '/orders', { productId: productId, amount: 100, status: 'pending' }, tokens.buyer1);
    logResult('POST /orders', 201, res.status, res.time, res.data);

    res = await req('GET', `/orders?user_id=${myId}`, null, tokens.buyer1);
    logResult('GET /orders?user_id=X', 200, res.status, res.time, res.data);

    // 10. ГРАНИЧНЫЕ СЛУЧАИ
    res = await req('GET', '/products/99999');
    logResult('Запрос несуществующего ID', 404, res.status, res.time, res.data);

    res = await req('POST', '/products', 'invalid json {', tokens.seller1);
    logResult('Невалидный JSON в body', 400, res.status, res.time, res.data);

    const longStr = 'a'.repeat(2000);
    res = await req('GET', `/search?q=${longStr}`);
    logResult('Очень длинная строка в поиске', 400, res.status, res.time, res.data); // Status could vary, expect client error or handled

    res = await req('GET', '/products?min_price=-100&page=-1');
    logResult('Отрицательные значения цены/страницы', 400, res.status, res.time, res.data);

    fs.writeFileSync('test_results.json', JSON.stringify(results, null, 2));
}

runTests();
