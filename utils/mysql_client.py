import mysql.connector
from config.config import settings

def get_connection():
    return mysql.connector.connect(
        host=settings.AIVEN_HOST,
        port=settings.AIVEN_PORT,
        user=settings.AIVEN_USER,
        password=settings.AIVEN_PASSWORD,
        database=settings.AIVEN_DATABASE,
        ssl_disabled=False,  
    )