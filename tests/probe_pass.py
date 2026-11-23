import mysql.connector
c = mysql.connector.connect(host='127.0.0.1', port=3306, user='root', database='civicore_laravel')
cur = c.cursor()
cur.execute("SHOW TABLES")
print("TABLES:", [r[0] for r in cur.fetchall()])