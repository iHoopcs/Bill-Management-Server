/**
 * Server.js
 * This file is the entry point of the application. 
 * It sets up the Express server, connects to the database, and starts listening on the specified port.
 */
require("dotenv").config();
const app = require("./app");   
const connectDB = require("./configs/database.config");

const port = process.env.PORT || 8080;

const startServer = async () => {
    try {
        await connectDB();
        app.listen(port, () => {
            console.log(`Bill Management Server is running on port ${port}!!!`);
        });
    } catch (error) {
        console.error("Failed to start server:", error);
        process.exit(1);
    }
}
startServer();