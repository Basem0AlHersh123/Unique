import mongoose from "mongoose";

const MONGODB_URI = process.env.MONGODB_URI;

/**
 * Why we cache the connection on `global`:
 * In development, Next.js hot-reloads your code on every file save.
 * Without caching, every reload would open a NEW database connection,
 * and MongoDB Atlas free tier only allows a limited number of connections.
 * By stashing the connection (and the in-flight connect promise) on the
 * Node global object, we reuse the same connection across reloads.
 */
declare global {
  var mongooseConn:
    | { conn: typeof mongoose | null; promise: Promise<typeof mongoose> | null }
    | undefined;
}

const cached = global.mongooseConn ?? { conn: null, promise: null };
global.mongooseConn = cached;

export async function connectDB() {
  if (cached.conn) {
    return cached.conn;
  }

  if (!MONGODB_URI) {
    throw new Error(
      "MONGODB_URI is not set. Add it to your .env.local file."
    );
  }

  if (!cached.promise) {
    cached.promise = mongoose.connect(MONGODB_URI, {
      bufferCommands: false, // fail fast instead of queueing ops silently
    });
  }

  cached.conn = await cached.promise;
  return cached.conn;
}
