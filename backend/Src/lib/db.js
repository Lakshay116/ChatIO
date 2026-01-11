import mongoose from "mongoose"

export const connectDB = async () => {
    try {
        const { MONGO_URI } = process.env;
        if (!MONGO_URI) throw new Error("MonGO_URI is not set");
        const conn = await mongoose.connect(process.env.MONGO_URI)
        console.log("MONGO DB CONNECTED: ", conn.connection.host)
    } catch (error) {
        console.log("Error in mongo: ", error);
        process.exit(1);//fails 0 means sucess
    }
}