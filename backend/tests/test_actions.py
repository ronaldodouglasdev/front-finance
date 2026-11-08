import sqlite3
import pytest
import auth

@pytest.fixture
def db():
    connection = sqlite3.connect(':memory:')
    connection.row_factory = sqlite3.Row
    auth.create_tables(connection)
    auth.create_action_table(connection)
    auth.register(connection, 'teste@example.com', 'senha-original-teste')
    yield connection
    connection.close()

def user_id(db):
    return db.execute('SELECT id FROM users').fetchone()['id']

def test_verification_single_use_and_purpose(db):
    user = user_id(db)
    token = auth.issue_action(db, user, 'verify', now=100)
    with pytest.raises(ValueError):
        auth.consume_action(db, token, 'reset', now=101)
    auth.verify_email(db, token, now=101)
    assert db.execute('SELECT user_id FROM verified_emails').fetchone()['user_id'] == user
    with pytest.raises(ValueError):
        auth.verify_email(db, token, now=102)

def test_expiry_and_replacement(db):
    user = user_id(db)
    old = auth.issue_action(db, user, 'reset', now=100)
    new = auth.issue_action(db, user, 'reset', now=101)
    with pytest.raises(ValueError): auth.consume_action(db, old, 'reset', now=102)
    with pytest.raises(ValueError): auth.consume_action(db, new, 'reset', now=101 + auth.ACTION_TTL)

def test_password_reset_revokes_sessions(db):
    user = user_id(db)
    session = auth.login(db, 'teste@example.com', 'senha-original-teste')
    token = auth.issue_action(db, user, 'reset', now=100)
    with pytest.raises(ValueError): auth.reset_password(db, token, 'curta', now=101)
    auth.reset_password(db, token, 'nova-senha-segura', now=101)
    with pytest.raises(Exception): auth.get_user(db, session)
    with pytest.raises(Exception): auth.login(db, 'teste@example.com', 'senha-original-teste')
    assert auth.login(db, 'teste@example.com', 'nova-senha-segura')
    with pytest.raises(ValueError): auth.reset_password(db, token, 'outra-senha-segura', now=102)
