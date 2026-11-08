"""Serviços locais de autenticação; não prontos para publicação."""
import hashlib
import secrets
import time
from uuid import uuid4
from argon2 import PasswordHasher
from argon2.exceptions import VerificationError, InvalidHashError
from fastapi import HTTPException

hasher = PasswordHasher(time_cost=2, memory_cost=19456, parallelism=1)
SESSION_SECONDS = 43200

def token_hash(token):
    return hashlib.sha256(token.encode()).hexdigest()

def create_tables(db):
    db.execute('CREATE TABLE IF NOT EXISTS users (id TEXT PRIMARY KEY, email TEXT UNIQUE NOT NULL, password_hash TEXT NOT NULL)')
    db.execute('CREATE TABLE IF NOT EXISTS sessions (token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id), expires_at INTEGER NOT NULL)')
    db.execute('CREATE TABLE IF NOT EXISTS user_transactions (id TEXT PRIMARY KEY, owner_id TEXT NOT NULL REFERENCES users(id), description TEXT NOT NULL, category TEXT NOT NULL, type TEXT NOT NULL, amount_cents INTEGER NOT NULL CHECK(amount_cents > 0), date TEXT NOT NULL)')

def register(db, email, password):
    import sqlite3
    try:
        db.execute('INSERT INTO users VALUES (?, ?, ?)', (str(uuid4()), email.lower(), hasher.hash(password)))
    except sqlite3.IntegrityError:
        raise HTTPException(status_code=409, detail='Não foi possível criar a conta com este e-mail')

def login(db, email, password):
    row = db.execute('SELECT id, password_hash FROM users WHERE email=?', (email.lower(),)).fetchone()
    if row is None:
        raise HTTPException(status_code=401, detail='E-mail ou senha inválidos')
    try:
        hasher.verify(row['password_hash'], password)
    except (VerificationError, InvalidHashError):
        raise HTTPException(status_code=401, detail='E-mail ou senha inválidos')
    token = secrets.token_urlsafe(32)
    db.execute('DELETE FROM sessions WHERE expires_at <= ?', (int(time.time()),))
    db.execute('INSERT INTO sessions VALUES (?, ?, ?)', (token_hash(token), row['id'], int(time.time()) + SESSION_SECONDS))
    return token

def get_user(db, token):
    row = db.execute('SELECT user_id FROM sessions WHERE token_hash=? AND expires_at>?', (token_hash(token), int(time.time()))).fetchone()
    if row is None:
        raise HTTPException(status_code=401, detail='Sessão inválida ou expirada', headers={'WWW-Authenticate': 'Bearer'})
    return row['user_id']

# Serviços internos de uso único. Não conectados a rotas nem a envio real de e-mail.
ACTION_TTL = 30 * 60

def create_action_table(db):
    db.execute('''CREATE TABLE IF NOT EXISTS auth_actions (
        token_hash TEXT PRIMARY KEY, user_id TEXT NOT NULL REFERENCES users(id),
        purpose TEXT NOT NULL CHECK(purpose IN ('verify', 'reset')),
        expires_at INTEGER NOT NULL)''')
    db.execute('CREATE TABLE IF NOT EXISTS verified_emails (user_id TEXT PRIMARY KEY REFERENCES users(id), verified_at INTEGER NOT NULL)')

def issue_action(db, user_id, purpose, now=None):
    if purpose not in ('verify', 'reset'):
        raise ValueError('Finalidade inválida')
    now = int(time.time()) if now is None else now
    token = secrets.token_urlsafe(32)
    db.execute('DELETE FROM auth_actions WHERE user_id=? AND purpose=?', (user_id, purpose))
    db.execute('INSERT INTO auth_actions VALUES (?, ?, ?, ?)', (token_hash(token), user_id, purpose, now + ACTION_TTL))
    return token

def consume_action(db, token, purpose, now=None):
    now = int(time.time()) if now is None else now
    row = db.execute('DELETE FROM auth_actions WHERE token_hash=? AND purpose=? AND expires_at>? RETURNING user_id', (token_hash(token), purpose, now)).fetchone()
    if row is None:
        raise ValueError('Link inválido, expirado ou já utilizado')
    return row['user_id']

def verify_email(db, token, now=None):
    now = int(time.time()) if now is None else now
    user_id = consume_action(db, token, 'verify', now)
    db.execute('INSERT OR REPLACE INTO verified_emails VALUES (?, ?)', (user_id, now))

def reset_password(db, token, password, now=None):
    if not 12 <= len(password) <= 256:
        raise ValueError('Senha deve ter entre 12 e 256 caracteres')
    user_id = consume_action(db, token, 'reset', now)
    db.execute('UPDATE users SET password_hash=? WHERE id=?', (hasher.hash(password), user_id))
    db.execute('DELETE FROM sessions WHERE user_id=?', (user_id,))
    db.execute("DELETE FROM auth_actions WHERE user_id=? AND purpose='reset'", (user_id,))
