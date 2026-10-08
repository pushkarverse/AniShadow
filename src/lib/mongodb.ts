// import { MongoClient, ServerApiVersion } from "mongodb";

// DATABASE_URL check moved to getDb to prevent module initialization crashes

// const uri = process.env.DATABASE_URL;
// const options = {
//   serverApi: {
//     version: ServerApiVersion.v1,
//     strict: true,
//     deprecationErrors: true,
//   },
// };

// MongoDB is temporarily disabled per user request
// const client = new MongoClient(uri, options);
// const clientPromise = client.connect();
const clientPromise: Promise<unknown> = Promise.resolve(null);

// Export a module-scoped MongoClient promise. By doing this in a
// separate module, the client can be shared across functions.
export default clientPromise;

export async function getDb() {
  if (!process.env.DATABASE_URL) {
    throw new Error('Invalid/Missing environment variable: "DATABASE_URL"');
  }
  const client = await clientPromise;
  if (!client) {
    throw new Error("Database is temporarily disabled per user request.");
  }
   
  return (client as any).db("shadowanime");
}
