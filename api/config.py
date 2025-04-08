import mysql.connector
from datetime import datetime

def get_db_connection():
    return mysql.connector.connect(
        host="localhost",
        user="root",
        password="12345678",
        database="attendx"
    )