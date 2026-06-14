import os
import psycopg2
import psycopg2.extras
from flask import Flask, render_template, request, jsonify

app = Flask(__name__)


def get_db():
    return psycopg2.connect(os.environ['DATABASE_URL'])


def init_db():
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute('''
                CREATE TABLE IF NOT EXISTS entries (
                    id SERIAL PRIMARY KEY,
                    date TEXT NOT NULL,
                    type TEXT NOT NULL,
                    title TEXT NOT NULL,
                    content TEXT,
                    time TEXT,
                    category TEXT,
                    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
                )
            ''')
        conn.commit()


@app.route('/')
def index():
    return render_template('index.html')


@app.route('/entries/<int:year>/<int:month>')
def get_entries(year, month):
    date_prefix = f'{year:04d}-{month:02d}'
    with get_db() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                'SELECT * FROM entries WHERE date LIKE %s ORDER BY date, time',
                (f'{date_prefix}%',)
            )
            rows = cur.fetchall()
    return jsonify([dict(row) for row in rows])


@app.route('/entries', methods=['POST'])
def create_entry():
    data = request.json
    with get_db() as conn:
        with conn.cursor(cursor_factory=psycopg2.extras.RealDictCursor) as cur:
            cur.execute(
                '''INSERT INTO entries (date, type, title, content, time, category)
                   VALUES (%s, %s, %s, %s, %s, %s) RETURNING *''',
                (data['date'], data['type'], data['title'],
                 data.get('content'), data.get('time'), data.get('category'))
            )
            entry = cur.fetchone()
        conn.commit()
    return jsonify(dict(entry)), 201


@app.route('/entries/<int:entry_id>', methods=['DELETE'])
def delete_entry(entry_id):
    with get_db() as conn:
        with conn.cursor() as cur:
            cur.execute('DELETE FROM entries WHERE id = %s', (entry_id,))
        conn.commit()
    return jsonify({'success': True})


with app.app_context():
    init_db()

if __name__ == '__main__':
    app.run(debug=True)
