import mongoose, { Schema } from 'mongoose';
import connectDB from './database';
import Admin from '../models/Admin';
import Collector from '../models/Collector';
import Area, { IArea } from '../models/Area';
import Bin, { IBin } from '../models/Bin';
import Issue from '../models/Issue';
import Dump from '../models/Dump';

const seedData = async () => {
  try {
    await connectDB();

    // Clear existing collections
    await Admin.deleteMany({});
    await Collector.deleteMany({});
    await Area.deleteMany({});
    await Bin.deleteMany({});
    await Issue.deleteMany({});
    await Dump.deleteMany({});

    // Create Admin
    const admin = new Admin({
      username: 'admin',
      password: 'password',
      email: 'admin@example.com'
    });
    await admin.save();
    
    // Create Dumps
    const dumps = await Dump.insertMany([
      { name: 'Downtown Waste Facility', coordinates: [-73.940, 40.725] },
      { name: 'Uptown Recycling Center', coordinates: [-73.980, 40.745] }
    ]);

    // Create Areas with references to dumps
    const areaData = [
      { 
        name: 'Downtown', 
        coordinates: [[-73.935242, 40.730610], [-73.925242, 40.730610], [-73.925242, 40.720610]],
        dump: dumps[0]._id 
      },
      { 
        name: 'Uptown', 
        coordinates: [[-73.985242, 40.750610], [-73.975242, 40.750610], [-73.975242, 40.740610]],
        dump: dumps[1]._id
      }
    ];
    const areas = await Area.insertMany(areaData) as unknown as IArea[];

    // Create Bins assigned to Areas - bin_id removed.
    const binsData: Partial<IBin>[] = [
      // Bins for Downtown (area[0])
      {
        location: { type: 'Point', coordinates: [-73.9300, 40.7280] },
        fillLevel: 45,
        area: areas[0]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [-73.9290, 40.7270] },
        fillLevel: 80,
        area: areas[0]._id as Schema.Types.ObjectId
      },
      // Additional bins for Downtown
      {
        location: { type: 'Point', coordinates: [-73.9310, 40.7290] },
        fillLevel: 50,
        area: areas[0]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [-73.9320, 40.7275] },
        fillLevel: 65,
        area: areas[0]._id as Schema.Types.ObjectId
      },
      // Bins for Uptown (area[1])
      {
        location: { type: 'Point', coordinates: [-73.9800, 40.7480] },
        fillLevel: 60,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [-73.9790, 40.7470] },
        fillLevel: 95,
        area: areas[1]._id as Schema.Types.ObjectId
      },
      // Additional bins for Uptown
      {
        location: { type: 'Point', coordinates: [-73.9810, 40.7490] },
        fillLevel: 55,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [-73.9820, 40.7485] },
        fillLevel: 70,
        area: areas[1]._id as Schema.Types.ObjectId
      }
    ];
    const bins = await Bin.insertMany(binsData);

    // Create Collectors each assigned an Area with currentLocation within their assigned area
    const collectorsData = [
      {
        username: 'collector1',
        password: '$2a$10$Ipo2iSuZyQ868XSK2W.Mk.Chbm0wcjhri8zl5mTq3eVYyqxeEV9iO',
        email: 'collector1@example.com',
        area: areas[0]._id,
        currentLocation: [-73.9310, 40.7275] // Set location within Downtown area
      },
      {
        username: 'collector2',
        password: '$2a$10$Ipo2iSuZyQ868XSK2W.Mk.Chbm0wcjhri8zl5mTq3eVYyqxeEV9iO',
        email: 'collector2@example.com',
        area: areas[1]._id,
        currentLocation: [-73.9805, 40.7485] // Set location within Uptown area
      }
    ];
    await Collector.insertMany(collectorsData);

    // Create Issues for some bins
    const issuesData = [
      {
        bin: bins[1]._id,
        issueType: 'Sensor Malfunction',
        description: 'Fill level sensor not reporting correctly.'
      },
      {
        bin: bins[3]._id,
        issueType: 'Damaged Bin',
        description: 'Physical damage observed on the bin.'
      }
    ];
    await Issue.insertMany(issuesData);

    console.log('Seed data added successfully.');
    process.exit();
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
