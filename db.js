const mysql = require('mysql');
const { promisify } = require('util');

const credentialsDB = {
    host: "127.0.0.1",
    user: "root",
    password: process.env.DB_PASSWORD,
    database: process.env.DB_NAME
}
const pool = mysql.createPool(credentialsDB);

pool.getConnection((err, connection) => {
    if (err) {
        if (err.code === 'PROTOCOL_CONNECTION_LOST') {
            console.log('SE PERDIO CONECCION CON DB');
        }
        if (err.code === 'ER_CON_COUNT_ERROR') {
            console.log('MUCHAS CONEXIONES');
        }
        if (err.code === 'ECONNREFUSED') {
            console.log('CONEXION PERDIDA');
        }
        return
    }
    if (connection) {
        connection.release();
        console.log('DB conectada');
    }
    return;
})

pool.query = promisify(pool.query);
module.exports = pool;