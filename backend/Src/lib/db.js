import mongoose from "mongoose"

export const connectDB = async () => {
    try {
        const conn = await mongoose.connect(process.env.MONGO_URI)
        console.log("MONGO DB CONNECTED: ", conn.connection.host)
    } catch (error) {
        console.log("Error in mongo: ", error);
        process.exit(1);//fails 0 means sucess
    }
}