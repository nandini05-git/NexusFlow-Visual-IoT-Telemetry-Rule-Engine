import mongoose from 'mongoose';

/**
 * Verifies or provisions the native MongoDB Time-Series collection.
 * Catches and logs collection existence cleanly.
 */
export const verifyTimeSeriesCollection = async (connection) => {
  if (!connection || !connection.db) return;

  try {
    const db = connection.db;
    const collections = await db.listCollections({ name: 'telemetries' }).toArray();

    if (collections.length === 0) {
      try {
        await db.createCollection('telemetries', {
          timeseries: {
            timeField: 'timestamp',
            metaField: 'metadata',
            granularity: 'seconds',
          },
        });
        console.log('[MongoDB] Created native Time-Series collection: "telemetries" (timeField: timestamp, metaField: metadata, granularity: seconds)');
      } catch (createErr) {
        if (createErr.code === 48 || createErr.codeName === 'NamespaceExists') {
          console.log('[MongoDB] Collection "telemetries" already initialized.');
        } else {
          console.warn('[MongoDB] Notice on creating timeseries collection:', createErr.message);
        }
      }
    } else {
      const coll = collections[0];
      const isTimeSeries = coll.type === 'timeseries' || !!coll.options?.timeseries;
      console.log(
        `[MongoDB] Verified collection "telemetries": type="${coll.type || 'normal'}", isTimeSeries=${isTimeSeries}`,
        coll.options?.timeseries ? JSON.stringify(coll.options.timeseries) : ''
      );
    }
  } catch (err) {
    console.warn('[MongoDB] Collection verification check error:', err.message);
  }
};

export const connectDB = async () => {
  const mongoURI = process.env.MONGO_URI || 'mongodb://localhost:27017/nexusflow';

  try {
    const conn = await mongoose.connect(mongoURI, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log(`[MongoDB] Connected successfully: ${conn.connection.host}`);
    
    // Verify native Time-Series collection on startup
    await verifyTimeSeriesCollection(conn.connection);

    return conn;
  } catch (error) {
    console.error(`[MongoDB] Connection error: ${error.message}`);
    console.warn(`[MongoDB] Running without persistent DB connection. Set valid MONGO_URI in .env to persist telemetry.`);
    return null;
  }
};

export const getDBStatus = () => {
  const states = {
    0: 'disconnected',
    1: 'connected',
    2: 'connecting',
    3: 'disconnecting',
  };
  return states[mongoose.connection.readyState] || 'unknown';
};
