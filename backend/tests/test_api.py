import sqlite3
from fastapi.testclient import TestClient
from main import create_app

PASSWORD = 'senha-longa-de-teste'
def register_login(client, email):
    credentials = {'email': email, 'password': PASSWORD}
    assert client.post('/api/auth/register', json=credentials).status_code == 201
    response = client.post('/api/auth/login', json=credentials)
    assert response.status_code == 200
    return {'Authorization': 'Bearer ' + response.json()['access_token']}


def test_accounts_crud_and_isolation(tmp_path):
    db = tmp_path / 'test.sqlite3'
    item = {'description': ' Mercado ', 'category': 'Alimentação', 'type': 'variable', 'amount_cents': 5825, 'date': '2026-11-02'}
    with TestClient(create_app(db)) as client:
        assert client.get('/api/transactions').status_code == 401
        a = register_login(client, 'a@example.com')
        b = register_login(client, 'b@example.com')
        assert client.post('/api/auth/register', json={'email': 'a@example.com', 'password': PASSWORD}).status_code == 409
        assert client.post('/api/auth/login', json={'email': 'a@example.com', 'password': 'senha-errada-teste'}).status_code == 401
        result = client.post('/api/transactions', json=item, headers=a)
        assert result.status_code == 201
        created = result.json()
        assert created['description'] == 'Mercado'
        assert client.get('/api/transactions', headers=b).json() == []
        path = '/api/transactions/' + created['id']
        assert client.put(path, json=item, headers=b).status_code == 404
        assert client.delete(path, headers=b).status_code == 404
        item['amount_cents'] = 6000
        assert client.put(path, json=item, headers=a).json()['amount_cents'] == 6000
    with TestClient(create_app(db)) as client:
        assert client.get('/api/transactions', headers=a).json()[0]['amount_cents'] == 6000
        assert client.delete(path, headers=a).status_code == 204
        assert client.post('/api/auth/logout', headers=a).status_code == 204
        assert client.get('/api/transactions', headers=a).status_code == 401
    with sqlite3.connect(db) as connection:
        value = connection.execute('SELECT password_hash FROM users WHERE email=?', ('a@example.com',)).fetchone()[0]
        assert value != PASSWORD and value.startswith('$argon2id$')


def test_validation_and_legacy_preserved(tmp_path):
    db = tmp_path / 'test.sqlite3'
    with sqlite3.connect(db) as connection:
        connection.execute('CREATE TABLE transactions (id TEXT PRIMARY KEY, description TEXT, category TEXT, type TEXT, amount_cents INTEGER, date TEXT)')
        connection.execute("INSERT INTO transactions VALUES ('legacy', 'Antigo', 'X', 'income', 100, '2026-11-02')")
    with TestClient(create_app(db)) as client:
        a = register_login(client, 'a@example.com')
        assert client.get('/api/transactions', headers=a).json() == []
        valid = {'description': 'A', 'category': 'B', 'type': 'income', 'amount_cents': 100, 'date': '2026-11-02'}
        for field, value in [('description', '  '), ('amount_cents', 0), ('amount_cents', 1.5), ('date', '2026-02-30'), ('type', 'unknown')]:
            assert client.post('/api/transactions', json={**valid, field: value}, headers=a).status_code == 422
    with sqlite3.connect(db) as connection:
        assert connection.execute('SELECT id FROM transactions').fetchone()[0] == 'legacy'


def test_dev_mail_is_opt_in_and_single_use(tmp_path):
    db = tmp_path / 'mail.sqlite3'
    with TestClient(create_app(db)) as client:
        assert client.get('/api/dev/mail').status_code == 404
    with TestClient(create_app(db, dev_mail=True)) as client:
        register_login(client, 'mail@example.com')
        assert client.post('/api/dev/mail/request?purpose=verify', json={'email': 'mail@example.com'}).status_code == 200
        token = client.get('/api/dev/mail').json()[0]['token']
        assert client.post('/api/dev/mail/verify', json={'token': token}).status_code == 200
        assert client.post('/api/dev/mail/verify', json={'token': token}).status_code == 400
        assert client.post('/api/dev/mail/request?purpose=reset', json={'email': 'mail@example.com'}).status_code == 200
        reset = client.get('/api/dev/mail').json()[0]['token']
        assert client.post('/api/dev/mail/reset', json={'token': reset, 'password': 'nova-senha-segura'}).status_code == 200
        assert client.post('/api/auth/login', json={'email': 'mail@example.com', 'password': 'nova-senha-segura'}).status_code == 200
