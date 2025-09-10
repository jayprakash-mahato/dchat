import mongoose from "mongoose";


// const url = `mongodb+srv://chat_app_admin:Chatapp%401234@cluster0.jyixhcf.mongodb.net/chatApp?retryWrites=true&w=majority&appName=Cluster0`;

// const url = `mongodb+srv://${process.env.DB_USERNAME}:${encodeURIComponent(process.env.DB_PASSWORD)}@cluster0.jyixhcf.mongodb.net/${process.env.DB_NAME}?retryWrites=true&w=majority&appName=Cluster0`;


// mongoose.connect(url, {
//     useNewUrlParser: true, 
//     useUnifiedTopology: true
// }).then(() => console.log('Connected to DB')).catch((e)=> console.log('Error', e))


const connectDB = async () => {
  try {
    const user = process.env.DB_USERNAME;
    const pass = encodeURIComponent(process.env.DB_PASSWORD);
    const dbName = process.env.DB_NAME;
    const host = process.env.MONGO_HOST;

    const uri = `mongodb+srv://${user}:${pass}@${host}/${dbName}?retryWrites=true&w=majority`;

    await mongoose.connect(uri);
    console.log("✅ MongoDB connected");
  } catch (err) {
    console.error("❌ MongoDB connection error", err);
    process.exit(1);
  }
};

export default connectDB;