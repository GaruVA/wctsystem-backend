import mongoose, { Schema } from 'mongoose';
import connectDB from './database';
import Admin from '../models/Admin';
import Collector from '../models/Collector';
import Area, { IArea } from '../models/Area';
import Bin, { IBin } from '../models/Bin';
import Issue from '../models/Issue';

const seedData = async () => {
  try {
    await connectDB();

    // Clear existing collections
    await Admin.deleteMany({});
    await Collector.deleteMany({});
    await Area.deleteMany({});
    await Bin.deleteMany({});
    await Issue.deleteMany({});

    // Create Admin
    const admin = new Admin({
      username: 'admin',
      password: 'password',
      email: 'admin@example.com'
    });
    await admin.save();

    // Create Areas with detailed polygon boundaries, start and end locations
    const areaData = [
      { 
        name: 'Wellawatte South', 
        // Wellawatte South area with proper polygon
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [79.85977764795284, 6.862733394612715],
            [79.86052866642592, 6.862733394612715],
            [79.86145134626426, 6.862584267056121],
            [79.86213799172536, 6.862584267056121],
            [79.86280317951578, 6.862776002477451],
            [79.86327524827028, 6.863138169173699],
            [79.86462708152182, 6.864267275340424],
            [79.86479874288709, 6.864565529352353],
            [79.86428375879126, 6.865119429164335],
            [79.8642193857793, 6.865502897887296],
            [79.86432667413258, 6.866269834406153],
            [79.86449833549786, 6.8665254796377395],
            [79.86473436987511, 6.866887643480688],
            [79.86539955766554, 6.867611970339524],
            [79.86561413437215, 6.868528029199246],
            [79.8653137269829, 6.8692949608412945],
            [79.86546393067752, 6.8701258020579195],
            [79.8636400286715, 6.86976364068041],
            [79.86376877469544, 6.8694227826614025],
            [79.86271734883314, 6.869167138986823],
            [79.86194487268942, 6.873640883448893],
            [79.857980567769, 6.872865970090766],
            [79.85910709547862, 6.866616020703193],
            [79.85940750286787, 6.864613463094285],
            [79.85979374093972, 6.862781328539159],
            [79.85977764795284, 6.862733394612715]  // Closing the polygon
          ]]
        },
        startLocation: {
          type: 'Point',
          coordinates: [79.85970548542655, 6.864508658378935] // Starting point
        },
        endLocation: {
          type: 'Point',
          coordinates: [79.86118114212921, 6.870376029783507] // End location
        }
      },
      { 
        name: 'Pamankada West', 
        // Pamankada West area with proper polygon
        geometry: {
          type: 'Polygon',
          coordinates: [[
            [79.86272177805365, 6.869207964172276],
            [79.86370883075729, 6.869415674583163],
            [79.86364445774531, 6.869788488034494],
            [79.8654790887057, 6.870171953002596],
            [79.86596188637294, 6.871343649587683],
            [79.86643395512745, 6.871695157995914],
            [79.86727080436417, 6.871652550937563],
            [79.86792526331926, 6.871940148558586],
            [79.8690196046769, 6.872760333429751],
            [79.87053237054016, 6.873346178892236],
            [79.87212023831421, 6.873740292714753],
            [79.87303218931721, 6.873804203031544],
            [79.87368664827234, 6.874208968171688],
            [79.87394414032023, 6.874975890649743],
            [79.87391195381426, 6.876232788701129],
            [79.87357935993585, 6.877116876066664],
            [79.87321457953462, 6.877894445478168],
            [79.87266740893281, 6.879002213400222],
            [79.87191588373588, 6.879712975094884],
            [79.87099320389754, 6.880692920020726],
            [79.87095028855622, 6.881417225839951],
            [79.87010271056518, 6.881374619645871],
            [79.87062842349634, 6.880256205684015],
            [79.87018854124781, 6.880149689931209],
            [79.87009248825505, 6.879833037654058],
            [79.8691590795814, 6.879588051168564],
            [79.86871919710657, 6.879843689264793],
            [79.86584386923825, 6.879545444837644],
            [79.86642322631828, 6.87680797830086],
            [79.8659189710578, 6.876456473674054],
            [79.86611209007329, 6.875625643503036],
            [79.8618098268499, 6.874592429606752],
            [79.86233766555694, 6.871617079453271],
            [79.86272177805365, 6.869207964172276]  // Closing the polygon
          ]]
        },
        startLocation: {
          type: 'Point',
          coordinates: [79.86313159953404, 6.869768994238548] // Starting point
        },
        endLocation: {
          type: 'Point',
          coordinates: [79.87100656507035, 6.87741693174393] // End location
        }
      }
    ];
    const areas = await Area.insertMany(areaData) as unknown as IArea[];

    // Create Bins positioned exactly on streets
    const binsData: Partial<IBin>[] = [
      // Bins for Wellawatte South (area[0])
      {
        location: { type: 'Point', coordinates: [79.85912120574592, 6.8720590105035315] },
        fillLevel: 45,
        area: areas[0]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [79.86064470036273, 6.8717394576604445] },
        fillLevel: 80,
        area: areas[0]._id as Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [79.85907829040463, 6.8707381906946186] },
        fillLevel: 50,
        area: areas[0]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [79.85924995176988, 6.870162993824585] },
        fillLevel: 65,
        area: areas[0]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [79.85970056285372, 6.869246938113764] },
        fillLevel: 75,
        area: areas[0]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [79.85980785120702, 6.868437399040273] },
        fillLevel: 25,
        area: areas[0]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [79.86163175321305, 6.867798288272194] },
        fillLevel: 90,
        area: areas[0]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [79.859872224219, 6.866392241560089] },
        fillLevel: 60,
        area: areas[0]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [79.86206090662623, 6.866733101750666] },
        fillLevel: 55,
        area: areas[0]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [79.86109531144658, 6.86558269762886] },
        fillLevel: 70,
        area: areas[0]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [79.86199653358216, 6.864980864716436] },
        fillLevel: 40,
        area: areas[0]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [79.86220038145342, 6.862839824711644] },
        fillLevel: 85,
        area: areas[0]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [79.86406719893873, 6.8658223653988] },
        fillLevel: 30,
        area: areas[0]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [79.86422813146355, 6.867974043853853] },
        fillLevel: 50,
        area: areas[0]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [79.86521518431388, 6.869001946205984] },
        fillLevel: 95,
        area: areas[0]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [79.86328399395457, 6.868682391308538] },
        fillLevel: 40,
        area: areas[0]._id as mongoose.Schema.Types.ObjectId
      },

      // Bins for Pamankada West (area[1])
      {
        location: { type: 'Point', coordinates: [79.86313159953404, 6.869768994238548] },
        fillLevel: 60,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [79.86465509415085, 6.8708554775313955] },
        fillLevel: 95,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [79.86351783760591, 6.871366762927869] },
        fillLevel: 55,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [79.86645753848622, 6.872027172417887] },
        fillLevel: 70,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [79.86321743021668, 6.872282814554834] },
        fillLevel: 40,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [79.86635025013291, 6.873113650550462] },
        fillLevel: 85,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [79.86319597254602, 6.873177560951526] },
        fillLevel: 30,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [79.86313159953404, 6.874136215936151] },
        fillLevel: 50,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [79.86540611262393, 6.87437055352718] },
        fillLevel: 65,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [79.8679595755857, 6.876884349513849] },
        fillLevel: 45,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [79.8679595755857, 6.878908158646716] },
        fillLevel: 75,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [79.86785228723241, 6.874072305670325] },
        fillLevel: 25,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [79.86967618923843, 6.875222689254078] },
        fillLevel: 90,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [79.87156446450749, 6.878695126555833] },
        fillLevel: 60,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [79.8725515173578, 6.875073565656626] },
        fillLevel: 80,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [79.87343128185485, 6.8747540148402] },
        fillLevel: 35,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [79.87319524747758, 6.8771399890813525] },
        fillLevel: 70,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [79.87062032699848, 6.874945745355843] },
        fillLevel: 55,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [79.86963327414816, 6.877289112073571] },
        fillLevel: 45,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [79.87100656507035, 6.87741693174393] },
        fillLevel: 65,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId
      },
      {
        location: { type: 'Point', coordinates: [79.87034137727991, 6.878673823337162] },
        fillLevel: 85,
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
        firstName: 'John',
        lastName: 'Smith',
        phone: '+94 77 123 4567',
        status: 'active',
        lastActive: new Date(),
        area: areas[0]._id,
        currentLocation: {
          type: 'Point',
          coordinates: [79.86118114212921, 6.870376029783507] // Inside Wellawatte South
        }
      },
      {
        username: 'collector2',
        password: '$2a$10$Ipo2iSuZyQ868XSK2W.Mk.Chbm0wcjhri8zl5mTq3eVYyqxeEV9iO',
        email: 'collector2@example.com',
        firstName: 'Sarah',
        lastName: 'Johnson',
        phone: '+94 76 234 5678',
        status: 'active',
        lastActive: new Date(),
        area: areas[1]._id,
        currentLocation: {
          type: 'Point',
          coordinates: [79.86465509415085, 6.8708554775313955] // Inside Pamankada West
        }
      },
      {
        username: 'collector3',
        password: '$2a$10$Ipo2iSuZyQ868XSK2W.Mk.Chbm0wcjhri8zl5mTq3eVYyqxeEV9iO',
        email: 'collector3@example.com',
        firstName: 'Michael',
        lastName: 'Williams',
        phone: '+94 75 345 6789',
        status: 'on-leave',
        lastActive: new Date(Date.now() - 3 * 24 * 60 * 60 * 1000), // 3 days ago
        area: areas[0]._id,
        currentLocation: {
          type: 'Point',
          coordinates: [79.86018114212921, 6.869376029783507] // Inside Wellawatte South
        }
      },
      {
        username: 'collector4',
        password: '$2a$10$Ipo2iSuZyQ868XSK2W.Mk.Chbm0wcjhri8zl5mTq3eVYyqxeEV9iO',
        email: 'collector4@example.com',
        firstName: 'Emily',
        lastName: 'Brown',
        phone: '+94 74 456 7890',
        status: 'inactive',
        lastActive: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        area: areas[1]._id,
        currentLocation: {
          type: 'Point',
          coordinates: [79.87065509415085, 6.8758554775313955] // Inside Pamankada West
        }
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
      },
      {
        bin: bins[3]._id,
        issueType: 'new Bin',
        description: 'new bin bin.'
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
