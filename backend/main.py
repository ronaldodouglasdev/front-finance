"""API local de lançamentos do AGL Finance, ainda sem autenticação."""
from contextlib import asynccontextmanager, contextmanager, closing
from datetime import date
from enum import Enum
from pathlib import Path
import sqlite3
import os
from typing import Annotated
from uuid import UUID, uuid4

from fastapi import Depends, FastAPI, HTTPException, Request, Response, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from pydantic import EmailStr
import auth
from pydantic import BaseModel, ConfigDict, Field, StringConstraints

DB_PATH = Path(__file__).resolve().parent / 'agl_finance.sqlite3'
Text = Annotated[str, StringConstraints(strip_whitespace=True, min_length=1, max_length=100)]

class TransactionType(str, Enum):
    income = 'income'
    fixed = 'fixed'
    variable = 'variable'
    saved = 'saved'

class Credentials(BaseModel):
    model_config = ConfigDict(extra='forbid')
    email: EmailStr
    password: Annotated[str, StringConstraints(min_length=12, max_length=256)]

class EmailInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    email: EmailStr

class TokenInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    token: Annotated[str, StringConstraints(min_length=20, max_length=200)]

class ResetInput(TokenInput):
    password: Annotated[str, StringConstraints(min_length=12, max_length=256)]

class TransactionInput(BaseModel):
    model_config = ConfigDict(extra='forbid')
    description: Text
    category: Text
    type: TransactionType
    amount_cents: Annotated[int, Field(strict=True, gt=0, le=100_000_000_000)]
    date: date

class Transaction(TransactionInput):
    id: UUID


def create_app(database_path: Path = DB_PATH, *, dev_mail: bool = False) -> FastAPI:
    @contextmanager
    def connect():
        with closing(sqlite3.connect(database_path, timeout=10)) as connection:
            connection.row_factory = sqlite3.Row
            with connection:
                yield connection

    @asynccontextmanager
    async def lifespan(_app: FastAPI):
        with connect() as db:
            db.execute('''CREATE TABLE IF NOT EXISTS transactions (
                id TEXT PRIMARY KEY, description TEXT NOT NULL, category TEXT NOT NULL,
                type TEXT NOT NULL, amount_cents INTEGER NOT NULL CHECK (amount_cents > 0),
                date TEXT NOT NULL)''')
            auth.create_tables(db)
            auth.create_action_table(db)
        yield

    app = FastAPI(title='AGL Finance API (desenvolvimento local)', version='0.1.0', lifespan=lifespan)

    bearer = HTTPBearer(auto_error=False)

    def current_user(credentials: Annotated[HTTPAuthorizationCredentials | None, Depends(bearer)]):
        if credentials is None:
            raise HTTPException(status_code=401, detail='Autenticação necessária', headers={'WWW-Authenticate': 'Bearer'})
        with connect() as db:
            return auth.get_user(db, credentials.credentials)

    @app.post('/api/auth/register', status_code=201)
    def register(credentials: Credentials):
        with connect() as db:
            auth.register(db, str(credentials.email), credentials.password)
        return {'message': 'Conta criada. Faça login para continuar.'}

    @app.post('/api/auth/login')
    def login(credentials: Credentials):
        with connect() as db:
            token = auth.login(db, str(credentials.email), credentials.password)
        return {'access_token': token, 'token_type': 'bearer', 'expires_in': auth.SESSION_SECONDS}

    @app.post('/api/auth/logout', status_code=204)
    def logout(credentials: Annotated[HTTPAuthorizationCredentials, Depends(bearer)], user: Annotated[str, Depends(current_user)]):
        with connect() as db:
            db.execute('DELETE FROM sessions WHERE token_hash=? AND user_id=?', (auth.token_hash(credentials.credentials), user))
        return Response(status_code=204)

    # Test-only routes are registered only when explicitly enabled.
    if dev_mail:
        inbox = []
        def local_only(request: Request):
            if request.client is None or request.client.host not in ('127.0.0.1', '::1', 'testclient'):
                raise HTTPException(status_code=403, detail='Disponível apenas localmente')

        @app.post('/api/dev/mail/request', dependencies=[Depends(local_only)])
        def request_test_mail(data: EmailInput, purpose: str):
            if purpose not in ('verify', 'reset'):
                raise HTTPException(status_code=400, detail='Finalidade inválida')
            with connect() as db:
                row = db.execute('SELECT id FROM users WHERE email=?', (str(data.email).lower(),)).fetchone()
                if row:
                    token = auth.issue_action(db, row['id'], purpose)
                    inbox.append({'email': str(data.email).lower(), 'purpose': purpose, 'token': token})
                    del inbox[:-20]
            return {'message': 'Se a conta existir, a mensagem de teste estará na caixa local.'}

        @app.get('/api/dev/mail', dependencies=[Depends(local_only)])
        def list_test_mail():
            return list(reversed(inbox))

        @app.post('/api/dev/mail/verify', dependencies=[Depends(local_only)])
        def verify_test_mail(data: TokenInput):
            try:
                with connect() as db:
                    auth.verify_email(db, data.token)
            except ValueError:
                raise HTTPException(status_code=400, detail='Link inválido ou expirado')
            return {'message': 'E-mail verificado no teste local.'}

        @app.post('/api/dev/mail/reset', dependencies=[Depends(local_only)])
        def reset_test_password(data: ResetInput):
            try:
                with connect() as db:
                    auth.reset_password(db, data.token, data.password)
            except ValueError:
                raise HTTPException(status_code=400, detail='Link inválido ou expirado')
            return {'message': 'Senha alterada no teste local.'}

    @app.get('/api/transactions', response_model=list[Transaction])
    def list_transactions(user: Annotated[str, Depends(current_user)]):
        with connect() as db:
            rows = db.execute('SELECT id, description, category, type, amount_cents, date FROM user_transactions WHERE owner_id=? ORDER BY date DESC, id', (user,)).fetchall()
            return [dict(row) for row in rows]

    @app.post('/api/transactions', response_model=Transaction, status_code=status.HTTP_201_CREATED)
    def create_transaction(item: TransactionInput, user: Annotated[str, Depends(current_user)]):
        transaction = Transaction(id=uuid4(), **item.model_dump())
        with connect() as db:
            db.execute('INSERT INTO user_transactions VALUES (?, ?, ?, ?, ?, ?, ?)', (str(transaction.id), user, transaction.description, transaction.category, transaction.type.value, transaction.amount_cents, transaction.date.isoformat()))
        return transaction

    @app.put('/api/transactions/{transaction_id}', response_model=Transaction)
    def update_transaction(transaction_id: UUID, item: TransactionInput, user: Annotated[str, Depends(current_user)]):
        with connect() as db:
            cursor = db.execute('UPDATE user_transactions SET description=?, category=?, type=?, amount_cents=?, date=? WHERE id=? AND owner_id=?', (item.description, item.category, item.type.value, item.amount_cents, item.date.isoformat(), str(transaction_id), user))
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail='Lançamento não encontrado')
        return Transaction(id=transaction_id, **item.model_dump())

    @app.delete('/api/transactions/{transaction_id}', status_code=status.HTTP_204_NO_CONTENT)
    def delete_transaction(transaction_id: UUID, user: Annotated[str, Depends(current_user)]):
        with connect() as db:
            cursor = db.execute('DELETE FROM user_transactions WHERE id=? AND owner_id=?', (str(transaction_id), user))
            if cursor.rowcount == 0:
                raise HTTPException(status_code=404, detail='Lançamento não encontrado')
        return Response(status_code=status.HTTP_204_NO_CONTENT)

    return app

app = create_app(dev_mail=os.environ.get('AGL_DEV_MAIL') == '1')
