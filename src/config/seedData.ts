import mongoose, { Schema } from 'mongoose';
import connectDB from './database';
import Admin from '../models/Admin';
import Collector from '../models/Collector';
import Area, { IArea } from '../models/Area';
import Bin, { IBin } from '../models/Bin';
import Issue from '../models/Issue';
import Schedule from '../models/Schedule';
import { addDays } from 'date-fns';

const seedData = async () => {
  try {
    await connectDB();

    // Clear existing collections
    await Admin.deleteMany({});
    await Collector.deleteMany({});
    await Area.deleteMany({});
    await Bin.deleteMany({});
    await Issue.deleteMany({});
    await Schedule.deleteMany({});

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
        area: areas[0]._id as mongoose.Schema.Types.ObjectId,
        wasteType: 'GENERAL'
      },
      {
        location: { type: 'Point', coordinates: [79.86064470036273, 6.8717394576604445] },
        fillLevel: 80,
        area: areas[0]._id as Schema.Types.ObjectId,
        wasteType: 'ORGANIC'
      },
      {
        location: { type: 'Point', coordinates: [79.85907829040463, 6.8707381906946186] },
        fillLevel: 50,
        area: areas[0]._id as mongoose.Schema.Types.ObjectId,
        wasteType: 'RECYCLE'
      },
      {
        location: { type: 'Point', coordinates: [79.85924995176988, 6.870162993824585] },
        fillLevel: 65,
        area: areas[0]._id as mongoose.Schema.Types.ObjectId,
        wasteType: 'HAZARDOUS'
      },
      {
        location: { type: 'Point', coordinates: [79.85970056285372, 6.869246938113764] },
        fillLevel: 75,
        area: areas[0]._id as mongoose.Schema.Types.ObjectId,
        wasteType: 'GENERAL'
      },
      {
        location: { type: 'Point', coordinates: [79.85980785120702, 6.868437399040273] },
        fillLevel: 25,
        area: areas[0]._id as mongoose.Schema.Types.ObjectId,
        wasteType: 'ORGANIC'
      },
      {
        location: { type: 'Point', coordinates: [79.86163175321305, 6.867798288272194] },
        fillLevel: 90,
        area: areas[0]._id as mongoose.Schema.Types.ObjectId,
        wasteType: 'RECYCLE'
      },
      {
        location: { type: 'Point', coordinates: [79.859872224219, 6.866392241560089] },
        fillLevel: 60,
        area: areas[0]._id as mongoose.Schema.Types.ObjectId,
        wasteType: 'HAZARDOUS'
      },
      {
        location: { type: 'Point', coordinates: [79.86206090662623, 6.866733101750666] },
        fillLevel: 55,
        area: areas[0]._id as mongoose.Schema.Types.ObjectId,
        wasteType: 'GENERAL'
      },
      {
        location: { type: 'Point', coordinates: [79.86109531144658, 6.86558269762886] },
        fillLevel: 70,
        area: areas[0]._id as mongoose.Schema.Types.ObjectId,
        wasteType: 'ORGANIC'
      },
      {
        location: { type: 'Point', coordinates: [79.86199653358216, 6.864980864716436] },
        fillLevel: 40,
        area: areas[0]._id as mongoose.Schema.Types.ObjectId,
        wasteType: 'RECYCLE'
      },
      {
        location: { type: 'Point', coordinates: [79.86220038145342, 6.862839824711644] },
        fillLevel: 85,
        area: areas[0]._id as mongoose.Schema.Types.ObjectId,
        wasteType: 'HAZARDOUS'
      },
      {
        location: { type: 'Point', coordinates: [79.86406719893873, 6.8658223653988] },
        fillLevel: 30,
        area: areas[0]._id as mongoose.Schema.Types.ObjectId,
        wasteType: 'GENERAL'
      },
      {
        location: { type: 'Point', coordinates: [79.86422813146355, 6.867974043853853] },
        fillLevel: 50,
        area: areas[0]._id as mongoose.Schema.Types.ObjectId,
        wasteType: 'ORGANIC'
      },
      {
        location: { type: 'Point', coordinates: [79.86521518431388, 6.869001946205984] },
        fillLevel: 95,
        area: areas[0]._id as mongoose.Schema.Types.ObjectId,
        wasteType: 'RECYCLE'
      },
      {
        location: { type: 'Point', coordinates: [79.86328399395457, 6.868682391308538] },
        fillLevel: 40,
        area: areas[0]._id as mongoose.Schema.Types.ObjectId,
        wasteType: 'GENERAL'
      },

      // Bins for Pamankada West (area[1])
      {
        location: { type: 'Point', coordinates: [79.86465509415085, 6.8708554775313955] },
        fillLevel: 95,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId,
        wasteType: 'RECYCLE'
      },
      {
        location: { type: 'Point', coordinates: [79.86351783760591, 6.871366762927869] },
        fillLevel: 55,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId,
        wasteType: 'HAZARDOUS'
      },
      {
        location: { type: 'Point', coordinates: [79.86645753848622, 6.872027172417887] },
        fillLevel: 70,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId,
        wasteType: 'GENERAL'
      },
      {
        location: { type: 'Point', coordinates: [79.86321743021668, 6.872282814554834] },
        fillLevel: 40,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId,
        wasteType: 'ORGANIC'
      },
      {
        location: { type: 'Point', coordinates: [79.86635025013291, 6.873113650550462] },
        fillLevel: 85,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId,
        wasteType: 'RECYCLE'
      },
      {
        location: { type: 'Point', coordinates: [79.86319597254602, 6.873177560951526] },
        fillLevel: 30,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId,
        wasteType: 'HAZARDOUS'
      },
      {
        location: { type: 'Point', coordinates: [79.86313159953404, 6.874136215936151] },
        fillLevel: 50,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId,
        wasteType: 'GENERAL'
      },
      {
        location: { type: 'Point', coordinates: [79.86540611262393, 6.87437055352718] },
        fillLevel: 65,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId,
        wasteType: 'ORGANIC'
      },
      {
        location: { type: 'Point', coordinates: [79.8679595755857, 6.876884349513849] },
        fillLevel: 45,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId,
        wasteType: 'RECYCLE'
      },
      {
        location: { type: 'Point', coordinates: [79.8679595755857, 6.878908158646716] },
        fillLevel: 75,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId,
        wasteType: 'HAZARDOUS'
      },
      {
        location: { type: 'Point', coordinates: [79.86785228723241, 6.874072305670325] },
        fillLevel: 25,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId,
        wasteType: 'GENERAL'
      },
      {
        location: { type: 'Point', coordinates: [79.86967618923843, 6.875222689254078] },
        fillLevel: 90,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId,
        wasteType: 'ORGANIC'
      },
      {
        location: { type: 'Point', coordinates: [79.87156446450749, 6.878695126555833] },
        fillLevel: 60,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId,
        wasteType: 'RECYCLE'
      },
      {
        location: { type: 'Point', coordinates: [79.8725515173578, 6.875073565656626] },
        fillLevel: 80,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId,
        wasteType: 'HAZARDOUS'
      },
      {
        location: { type: 'Point', coordinates: [79.87343128185485, 6.8747540148402] },
        fillLevel: 35,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId,
        wasteType: 'GENERAL'
      },
      {
        location: { type: 'Point', coordinates: [79.87319524747758, 6.8771399890813525] },
        fillLevel: 70,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId,
        wasteType: 'ORGANIC'
      },
      {
        location: { type: 'Point', coordinates: [79.87062032699848, 6.874945745355843] },
        fillLevel: 55,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId,
        wasteType: 'RECYCLE'
      },
      {
        location: { type: 'Point', coordinates: [79.86963327414816, 6.877289112073571] },
        fillLevel: 45,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId,
        wasteType: 'GENERAL'
      },
      {
        location: { type: 'Point', coordinates: [79.87034137727991, 6.878673823337162] },
        fillLevel: 85,
        area: areas[1]._id as mongoose.Schema.Types.ObjectId,
        wasteType: 'RECYCLE'
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
        efficiency: 92, // High performer
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
        efficiency: 85, // Good performer
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
        efficiency: 68, // Average performer
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
        efficiency: 55, // Lower performer
        lastActive: new Date(Date.now() - 10 * 24 * 60 * 60 * 1000), // 10 days ago
        area: areas[1]._id,
        currentLocation: {
          type: 'Point',
          coordinates: [79.87065509415085, 6.8758554775313955] // Inside Pamankada West
        }
      }
    ];
    const collectors = await Collector.insertMany(collectorsData);

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

    // Calculate dates relative to today
    const today = new Date();
    const yesterday = addDays(today, -1);
    const tomorrow = addDays(today, 1);
    const dayAfterTomorrow = addDays(today, 2);
    const nextWeek = addDays(today, 7);

    // Function to create time on a specific date
    const createDateTime = (date: Date, hours: number, minutes: number) => {
      const newDate = new Date(date);
      newDate.setHours(hours, minutes, 0, 0);
      return newDate;
    };

    // Create Schedules with dynamic dates
    const schedulesData = [
      // Schedule 1: Yesterday - Wellawatte South (completed)
      {
        name: `${yesterday.toLocaleDateString('en-US', { weekday: 'long' })} - Wellawatte South`,
        areaId: areas[0]._id,
        collectorId: collectors[0]._id,
        date: yesterday,
        startTime: createDateTime(yesterday, 8, 30),
        endTime: createDateTime(yesterday, 9, 15),
        status: 'completed',
        route: [
          [79.859699, 6.864507], [79.859503, 6.865262], [79.859194, 6.86633], 
          [79.858671, 6.86915], [79.858758, 6.869168], [79.858835, 6.868746],
          [79.858911, 6.868325], [79.859003, 6.867831], [79.859089, 6.86735],
          [79.860457, 6.867583], [79.861632, 6.867798], [79.862545, 6.867965],
          [79.862357, 6.868852], [79.862275, 6.869292], [79.862186, 6.869827],
          [79.862102, 6.870354], [79.86206, 6.870557], [79.862025, 6.870753],
          [79.862101, 6.870771], [79.86214, 6.870531], [79.862195, 6.870189],
          [79.862256, 6.869835], [79.862294, 6.869611], [79.862381, 6.869165],
          [79.862504, 6.868509], [79.86328, 6.868727], [79.863701, 6.86879],
          [79.864176, 6.868833], [79.865208, 6.869036], [79.864176, 6.868833],
          [79.863701, 6.86879], [79.86328, 6.868727], [79.862504, 6.868509],
          [79.862551, 6.868293], [79.862684, 6.867673], [79.862859, 6.866927],
          [79.862777, 6.86691], [79.862627, 6.867584], [79.862545, 6.867965],
          [79.8611, 6.870372], [79.861041, 6.870714]
        ],
        distance: 1.34,
        duration: 22,
        binSequence: [
          bins[2]._id, // Using actual bin references from the seed data
          bins[4]._id
        ],
        actualStartTime: createDateTime(yesterday, 8, 32),
        actualEndTime: createDateTime(yesterday, 9, 12)
      },
      
      // Schedule 2: Today - Wellawatte South (in-progress)
      {
        name: `${today.toLocaleDateString('en-US', { weekday: 'long' })} - Wellawatte South`,
        areaId: areas[0]._id,
        collectorId: collectors[0]._id,
        date: today,
        startTime: createDateTime(today, 9, 45),
        endTime: createDateTime(today, 10, 20),
        status: 'in-progress',
        route: [
          [79.859699, 6.864507], [79.859503, 6.865262], [79.859194, 6.86633],
          [79.858671, 6.86915], [79.858758, 6.869168], [79.859691, 6.869308],
          [79.859757, 6.869318], [79.860426, 6.869478], [79.862186, 6.869827],
          [79.862102, 6.870354], [79.86206, 6.870557], [79.862025, 6.870753],
          [79.862101, 6.870771], [79.86214, 6.870531], [79.862195, 6.870189],
          [79.862256, 6.869835], [79.862294, 6.869611], [79.862381, 6.869165],
          [79.862504, 6.868509], [79.86328, 6.868727], [79.863701, 6.86879],
          [79.864176, 6.868833], [79.865208, 6.869036], [79.864176, 6.868833],
          [79.863701, 6.86879], [79.86328, 6.868727], [79.862504, 6.868509],
          [79.862551, 6.868293], [79.862684, 6.867673], [79.862859, 6.866927],
          [79.862777, 6.86691], [79.862627, 6.867584], [79.862545, 6.867965],
          [79.862357, 6.868852], [79.862275, 6.869292], [79.862186, 6.869827],
          [79.862102, 6.870354], [79.86206, 6.870557], [79.8611, 6.870372],
          [79.861041, 6.870714]
        ],
        distance: 1.88,
        duration: 32,
        binSequence: [
          bins[0]._id,
          bins[6]._id,
          bins[2]._id
        ],
        actualStartTime: createDateTime(today, 9, 48),
        notes: "Traffic delays on Marine Drive"
      },
      
      // Schedule 3: Tomorrow - Pamankada West (scheduled)
      {
        name: `${tomorrow.toLocaleDateString('en-US', { weekday: 'long' })} - Pamankada West`,
        areaId: areas[1]._id,
        collectorId: collectors[1]._id,
        date: tomorrow,
        startTime: createDateTime(tomorrow, 8, 10),
        endTime: createDateTime(tomorrow, 9, 0),
        status: 'scheduled',
        route: [
          [79.863128, 6.869786], [79.86337, 6.869837], [79.864024, 6.869968],
          [79.865411, 6.870296], [79.865553, 6.870738], [79.865685, 6.870996],
          [79.865473, 6.870988], [79.865238, 6.87095], [79.864668, 6.870805],
          [79.865238, 6.87095], [79.865473, 6.870988], [79.865685, 6.870996],
          [79.865957, 6.871484], [79.866182, 6.871666], [79.866515, 6.871848],
          [79.866487, 6.872023], [79.866435, 6.872424], [79.866419, 6.872547],
          [79.866405, 6.872665], [79.866361, 6.873048], [79.866354, 6.873079],
          [79.866347, 6.873113], [79.866312, 6.873273], [79.866199, 6.87369],
          [79.866167, 6.873804], [79.865967, 6.874553], [79.865903, 6.874829],
          [79.865789, 6.875264], [79.865672, 6.8756], [79.865589, 6.875856],
          [79.865478, 6.87618], [79.865368, 6.876559], [79.865296, 6.876546],
          [79.865279, 6.876598], [79.865354, 6.876612], [79.865986, 6.876684],
          [79.86624, 6.876705], [79.866624, 6.876743], [79.866889, 6.876769],
          [79.867259, 6.876845], [79.86784, 6.876955], [79.868437, 6.877081],
          [79.869473, 6.877311], [79.869529, 6.87732], [79.869542, 6.877273],
          [79.869551, 6.87724], [79.8696, 6.877088], [79.869849, 6.876776],
          [79.86994, 6.876642], [79.870181, 6.876127], [79.870277, 6.875806],
          [79.870357, 6.875493], [79.870395, 6.875404], [79.870535, 6.875137],
          [79.870598, 6.874939], [79.870703, 6.874615], [79.870776, 6.874454],
          [79.870879, 6.874346], [79.871023, 6.874267], [79.871373, 6.874197],
          [79.871685, 6.874135], [79.871862, 6.874103], [79.872082, 6.874043],
          [79.872455, 6.87391], [79.872513, 6.873836], [79.872423, 6.873806],
          [79.872349, 6.873851], [79.87222, 6.873922], [79.872068, 6.873981],
          [79.871849, 6.874041], [79.871094, 6.874174], [79.870996, 6.874203],
          [79.870839, 6.874282], [79.870784, 6.874325], [79.870671, 6.874482],
          [79.87055, 6.874899], [79.870493, 6.87505], [79.870297, 6.875476],
          [79.869668, 6.875245], [79.870297, 6.875476], [79.870163, 6.875974],
          [79.870072, 6.876219], [79.869885, 6.87661], [79.869794, 6.876739],
          [79.869542, 6.877057], [79.869513, 6.877138], [79.869487, 6.877225],
          [79.869473, 6.877311]
        ],
        distance: 1.82,
        duration: 50,
        binSequence: [
          bins[16]._id,
          bins[17]._id,
          bins[22]._id,
          bins[18]._id,
          bins[24]._id,
          bins[19]._id
        ]
      },
      
      // Schedule 4: Day after tomorrow - Wellawatte South (scheduled)
      {
        name: `${dayAfterTomorrow.toLocaleDateString('en-US', { weekday: 'long' })} - Wellawatte South`,
        areaId: areas[0]._id,
        collectorId: collectors[0]._id,
        date: dayAfterTomorrow,
        startTime: createDateTime(dayAfterTomorrow, 7, 30),
        endTime: createDateTime(dayAfterTomorrow, 8, 10),
        status: 'scheduled',
        route: [
          [79.859699, 6.864507], [79.859503, 6.865262], [79.859194, 6.86633],
          [79.858671, 6.86915], [79.858758, 6.869168], [79.859691, 6.869308],
          [79.859757, 6.869318], [79.860426, 6.869478], [79.862186, 6.869827],
          [79.862102, 6.870354], [79.86206, 6.870557], [79.8611, 6.870372],
          [79.861041, 6.870714], [79.860934, 6.870372], [79.860876, 6.870099],
          [79.860809, 6.86979], [79.860756, 6.869539], [79.860736, 6.869451],
          [79.860691, 6.869262], [79.860554, 6.868704], [79.860507, 6.868511],
          [79.860368, 6.868234], [79.859954, 6.867978], [79.859884, 6.867935],
          [79.859798, 6.867881], [79.859713, 6.867826], [79.859628, 6.86777],
          [79.859159, 6.867509], [79.859057, 6.867712], [79.858904, 6.868028],
          [79.858838, 6.868175], [79.858758, 6.868356], [79.858675, 6.868539],
          [79.858625, 6.868641], [79.85855, 6.868811], [79.858495, 6.868927],
          [79.858758, 6.869168], [79.858671, 6.86915]
        ],
        distance: 1.52,
        duration: 40,
        binSequence: [
          bins[1]._id,
          bins[5]._id,
          bins[9]._id,
          bins[10]._id
        ]
      },
      
      // Schedule 5: Next week - Pamankada West (scheduled)
      {
        name: `${nextWeek.toLocaleDateString('en-US', { weekday: 'long' })} - Pamankada West`,
        areaId: areas[1]._id,
        collectorId: collectors[1]._id,
        date: nextWeek,
        startTime: createDateTime(nextWeek, 9, 15),
        endTime: createDateTime(nextWeek, 10, 0),
        status: 'scheduled',
        route: [
          [79.863128, 6.869786], [79.86337, 6.869837], [79.864024, 6.869968],
          [79.865411, 6.870296], [79.865553, 6.870738], [79.865685, 6.870996],
          [79.865473, 6.870988], [79.865238, 6.87095], [79.864668, 6.870805],
          [79.865238, 6.87095], [79.865473, 6.870988], [79.865685, 6.870996],
          [79.865957, 6.871484], [79.866182, 6.871666], [79.866515, 6.871848],
          [79.866487, 6.872023], [79.866435, 6.872424], [79.866419, 6.872547],
          [79.866405, 6.872665], [79.866361, 6.873048], [79.866354, 6.873079],
          [79.866347, 6.873113], [79.866312, 6.873273], [79.866199, 6.87369],
          [79.866586, 6.873803], [79.866722, 6.873849], [79.867208, 6.87399],
          [79.867394, 6.874041], [79.867582, 6.874079], [79.867856, 6.874084],
          [79.868015, 6.874059], [79.868947, 6.874074], [79.868969, 6.874098],
          [79.869078, 6.874515], [79.869137, 6.874552], [79.8697, 6.874539],
          [79.869666, 6.874766], [79.869639, 6.875234], [79.869668, 6.875245],
          [79.870297, 6.875476], [79.870163, 6.875974], [79.870072, 6.876219],
          [79.869885, 6.87661], [79.869794, 6.876739], [79.869542, 6.877057],
          [79.869513, 6.877138], [79.869487, 6.877225], [79.869473, 6.877311],
          [79.869429, 6.877748], [79.869414, 6.877983], [79.869405, 6.878062],
          [79.869399, 6.878151], [79.869371, 6.878591], [79.869431, 6.878594],
          [79.870115, 6.878639], [79.870341, 6.878674], [79.870115, 6.878639],
          [79.869431, 6.878594], [79.869445, 6.878332], [79.869461, 6.878063],
          [79.869489, 6.877755], [79.869529, 6.87732], [79.869542, 6.877273],
          [79.869551, 6.87724], [79.8696, 6.877088], [79.869849, 6.876776],
          [79.869964, 6.876822], [79.870308, 6.87685], [79.87048, 6.8769],
          [79.870531, 6.876943], [79.870583, 6.876986], [79.870842, 6.877236],
          [79.871009, 6.877409], [79.871009, 6.877417]
        ],
        distance: 1.5,
        duration: 36,
        binSequence: [
          bins[17]._id, 
          bins[20]._id,
          bins[25]._id,
          bins[27]._id
        ],
        notes: "Focus on recycling bins this week"
      }
    ];
    
    await Schedule.insertMany(schedulesData);

    console.log('Seed data added successfully.');
    process.exit();
  } catch (error) {
    console.error('Error seeding data:', error);
    process.exit(1);
  }
};

seedData();
