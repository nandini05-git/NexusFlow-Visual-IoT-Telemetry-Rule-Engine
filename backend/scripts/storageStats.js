#!/usr/bin/env node

/**
 * NexusFlow MongoDB Time-Series Storage Footprint Inspector
 *
 * Demonstrates the storage efficiency of native MongoDB Time-Series collections
 * by comparing logical telemetry document counts against compressed disk usage.
 */

import mongoose from 'mongoose';
import dotenv from 'dotenv';
import Telemetry from '../src/models/Telemetry.js';

dotenv.config();

const MONGO_URI =
  process.env.MONGODB_URI || process.env.MONGO_URI || 'mongodb://localhost:27017/nexusflow';

const runStorageStats = async () => {
  console.log('================================================================');
  console.log('       NexusFlow Time-Series Storage Audit & Efficiency');
  console.log('================================================================');

  try {
    const conn = await mongoose.connect(MONGO_URI, {
      serverSelectionTimeoutMS: 8000,
    });
    console.log(` Connected to MongoDB: ${conn.connection.host}`);

    const db = mongoose.connection.db;

    // Check collection type
    const collections = await db.listCollections({ name: 'telemetries' }).toArray();

    if (collections.length === 0) {
      console.warn(
        ' Collection "telemetries" does not exist yet. Run loadtest or mock sensor first.'
      );
      await mongoose.disconnect();
      return;
    }

    const collInfo = collections[0];
    const isTimeSeries = collInfo.type === 'timeseries' || !!collInfo.options?.timeseries;

    // Total logical document count
    const totalDocs = await Telemetry.countDocuments();

    // Query bucket collection stats
    let bucketCount = 0;
    let sizeBytes = 0;
    let storageSizeBytes = 0;
    let totalIndexSizeBytes = 0;

    try {
      bucketCount = await db.collection('system.buckets.telemetries').countDocuments();

      const stats = await db.command({ collStats: 'system.buckets.telemetries' });
      sizeBytes = stats.size || 0;
      storageSizeBytes = stats.storageSize || 0;
      totalIndexSizeBytes = stats.totalIndexSize || 0;
    } catch {
      // Fallback for regular collections if not clustered
      const stats = await db.command({ collStats: 'telemetries' });
      sizeBytes = stats.size || 0;
      storageSizeBytes = stats.storageSize || 0;
      totalIndexSizeBytes = stats.totalIndexSize || 0;
    }

    const uncompressedMB = (sizeBytes / (1024 * 1024)).toFixed(3);
    const storageMB = (storageSizeBytes / (1024 * 1024)).toFixed(3);
    const indexMB = (totalIndexSizeBytes / (1024 * 1024)).toFixed(3);

    const avgLogicalBytes = totalDocs > 0 ? (sizeBytes / totalDocs).toFixed(2) : '0';
    const avgDiskBytes = totalDocs > 0 ? (storageSizeBytes / totalDocs).toFixed(2) : '0';

    // Standard uncompressed document estimate: ~120 bytes
    const standardEstimatedBytes = totalDocs * 120;
    const standardEstimatedMB = (standardEstimatedBytes / (1024 * 1024)).toFixed(2);
    const savingsPercentage =
      standardEstimatedBytes > 0 && storageSizeBytes > 0
        ? Math.max(
            0,
            (((standardEstimatedBytes - storageSizeBytes) / standardEstimatedBytes) * 100).toFixed(
              1
            )
          )
        : '0';

    console.log('\n----------------------------------------------------------------');
    console.log(` Collection Name:             telemetries`);
    console.log(` Native Time-Series:          ${isTimeSeries ? 'YES (Verified)' : 'NO'}`);
    if (collInfo.options?.timeseries) {
      console.log(` TimeField:                   ${collInfo.options.timeseries.timeField}`);
      console.log(` MetaField:                   ${collInfo.options.timeseries.metaField}`);
      console.log(` Granularity:                 ${collInfo.options.timeseries.granularity}`);
    }
    console.log('----------------------------------------------------------------');
    console.log(` Total Telemetry Records:     ${totalDocs.toLocaleString()} documents`);
    console.log(` Underlying Storage Buckets:  ${bucketCount.toLocaleString()} buckets`);
    console.log(
      ` Data Size (Uncompressed):    ${uncompressedMB} MB (${sizeBytes.toLocaleString()} bytes)`
    );
    console.log(
      ` Storage Size (On Disk):      ${storageMB} MB (${storageSizeBytes.toLocaleString()} bytes)`
    );
    console.log(` Index Size:                  ${indexMB} MB`);
    console.log('----------------------------------------------------------------');
    console.log(` Avg Logical Bytes / Record:  ${avgLogicalBytes} bytes`);
    console.log(` Avg On-Disk Bytes / Record:  ${avgDiskBytes} bytes`);
    console.log(` Conventional MongoDB Size:   ~${standardEstimatedMB} MB (at ~120 bytes/doc)`);
    console.log(
      ` Storage Space Reduction:     ~${savingsPercentage}% savings via native bucket compression`
    );
    console.log('================================================================\n');

    await mongoose.disconnect();

    return {
      totalDocs,
      bucketCount,
      uncompressedMB,
      storageMB,
      avgDiskBytes,
      savingsPercentage,
    };
  } catch (error) {
    console.error('Storage stats error:', error.message);
    process.exit(1);
  }
};

runStorageStats();
