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
    
    // Create Dumps (waste facilities) on actual road locations
    const dumps = await Dump.insertMany([
      { 
        name: 'Downtown Waste Facility', 
        coordinates: [-73.9952, 40.7183]  // On Grand Street & Broadway
      },
      { 
        name: 'Uptown Recycling Center', 
        coordinates: [-73.9590, 40.7728]  // On Lexington Avenue near E 79th St
      }
    ]);

    // Create Areas with more detailed polygon boundaries
    const areaData = [
      { 
        name: 'Downtown', 
        // Lower East Side area with proper polygon (returns to starting point)
        coordinates: [
          [-73.9845, 40.7159], // Houston St & Bowery (northwest corner)
          [-73.9772, 40.7167], // Houston St & Essex St (northeast corner)
          [-73.9786, 40.7122], // Delancey St & Essex St (southeast corner)
          [-73.9825, 40.7092], // Grand St & Chrystie St (south point)
          [-73.9872, 40.7118], // Grand St & Bowery (southwest corner)
          [-73.9845, 40.7159]  // Closing the polygon exactly on streets
        ],
        dump: dumps[0]._id 
      },
      { 
        name: 'Uptown', 
        // Upper East Side area with proper polygon
        coordinates: [
          [-73.9621, 40.7794], // 86th St & Park Ave (northwest)
          [-73.9546, 40.7810], // 86th St & 2nd Ave (northeast)
          [-73.9536, 40.7730], // 79th St & 2nd Ave (southeast)
          [-73.9564, 40.7698], // 76th St & 3rd Ave (south)
          [-73.9608, 40.7712], // 77th St & Park Ave (southwest)
          [-73.9621, 40.7794]  // Closing the polygon exactly on streets
        ],
        dump: dumps[1]._id
      }
    ];
    const areas = await Area.insertMany(areaData) as unknown as IArea[];

    // Create Bins positioned exactly on streets
    const binsData: Partial<IBin>[] = [
      // Bins for Downtown (area[0]) - precisely on streets
      {
        location: { type: 'Point', coordinates: [-73.9825, 40.7143] }, // Houston & Bowery
        fillLevel: 45,
        area: areas[0]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [-73.9799, 40.7134] }, // Stanton & Bowery
        fillLevel: 80,
        area: areas[0]._id as Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [-73.9794, 40.7147] }, // Stanton & Chrystie St
        fillLevel: 50,
        area: areas[0]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [-73.9821, 40.7125] }, // Rivington & Chrystie St
        fillLevel: 65,
        area: areas[0]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [-73.9807, 40.7108] }, // Delancey & Bowery
        fillLevel: 35,
        area: areas[0]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [-73.9834, 40.7105] }, // Broome & Bowery
        fillLevel: 75,
        area: areas[0]._id as mongoose.Schema.Types.ObjectId
      },
      // Two additional bins for Downtown
      {
        location: { type: 'Point', coordinates: [-73.9795, 40.7097] }, // Grand & Eldridge
        fillLevel: 25,
        area: areas[0]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [-73.9812, 40.7155] }, // Houston & Eldridge
        fillLevel: 90,
        area: areas[0]._id as mongoose.Schema.Types.ObjectId
      },

      // Bins for Uptown (area[1]) - precisely on streets
      {
        location: { type: 'Point', coordinates: [-73.9568, 40.7789] }, // 86th St & Lexington
        fillLevel: 60,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [-73.9599, 40.7778] }, // 84th St & Park Ave
        fillLevel: 95,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [-73.9580, 40.7742] }, // 81st St & Park Ave
        fillLevel: 55,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [-73.9556, 40.7749] }, // 81st St & Lexington
        fillLevel: 70,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [-73.9551, 40.7724] }, // 78th St & Lexington
        fillLevel: 40,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [-73.9583, 40.7711] }, // 77th St & Park Ave
        fillLevel: 85,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId
      },
      // Two additional bins for Uptown
      {
        location: { type: 'Point', coordinates: [-73.9566, 40.7766] }, // 83rd St & Lexington
        fillLevel: 30,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [-73.9603, 40.7746] }, // 81st St & Madison
        fillLevel: 50,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId
      }
    ];
    const bins = await Bin.insertMany(binsData);

    // Create Collectors with positions on actual streets within their areas
    const collectorsData = [
      {
        username: 'collector1',
        password: '$2a$10$Ipo2iSuZyQ868XSK2W.Mk.Chbm0wcjhri8zl5mTq3eVYyqxeEV9iO',
        email: 'collector1@example.com',
        area: areas[0]._id,
        currentLocation: [-73.9812, 40.7128] // Precisely on Rivington St
      },
      {
        username: 'collector2',
        password: '$2a$10$Ipo2iSuZyQ868XSK2W.Mk.Chbm0wcjhri8zl5mTq3eVYyqxeEV9iO',
        email: 'collector2@example.com',
        area: areas[1]._id,
        currentLocation: [-73.9575, 40.7763] // Precisely on 83rd St
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
      },
      {
        bin: bins[7]._id,
        issueType: 'Graffiti',
        description: 'Bin covered in graffiti needs cleaning.'
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
