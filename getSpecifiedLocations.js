// Import statements...
const express = require('express');
const mongoose = require('mongoose');
const cors = require('cors');

const app = express();
app.use(cors());
app.use(express.json());

// Connect to MongoDB Atlas
const atlasUri = 'mongodb+srv://database:dev12345@atlascluster.xzd1mkt.mongodb.net/checkInDB?retryWrites=true&w=majority';
mongoose.connect(atlasUri, { useNewUrlParser: true, useUnifiedTopology: true });

// Define a MongoDB schema for specified locations
const specifiedLocationSchema = new mongoose.Schema({
  latitude: String,
  longitude: String,
  locationName: String,
});

// Create a model for the specified locations
const SpecifiedLocation = mongoose.model('SpecifiedLocation', specifiedLocationSchema);

// Define a MongoDB schema for check-in and check-out data
const checkInOutSchema = new mongoose.Schema({
  userName: { type: String, unique: true },
  checkInEvents: [
    {
      location: Object,
      timestamp: String,
    },
  ],
  checkOutEvents: [
    {
      location: Object,
      timestamp: String,
    },
  ],
});

// Create a model for the check-in and check-out data
const CheckInOut = mongoose.model('CheckInOut', checkInOutSchema);

// Endpoint to get specified locations
app.get('/api/specifiedLocations', async (req, res) => {
  try {
    const locations = await SpecifiedLocation.find();
    console.log(locations);
    res.json(locations);
  } catch (error) {
    console.error('Error getting specified locations:', error);
    res.status(500).json({ error: 'Internal Server Error' });
  }
});

// Endpoint for check-in
app.post('/checkin', async (req, res) => {
  await handleCheckInOut(req, res, 'checkInEvents');
});

// Endpoint for check-out
app.post('/checkout', async (req, res) => {
  await handleCheckInOut(req, res, 'checkOutEvents');
});

// Common function for check-in and check-out logic
const handleCheckInOut = async (req, res, eventType) => {
  const { userName, location, timestamp } = req.body;

  try {
    // Example: Check if the specified location exists
    const specifiedLocationExists = await SpecifiedLocation.exists({
      locationName: location.locationName, // Assuming locationName is the identifier
    });

    if (specifiedLocationExists) {
      // Continue with the check-in or check-out logic
      const checkInOutData = await CheckInOut.findOne({ userName });

      if (checkInOutData) {
        // Check if the user has already checked in or checked out for the current day
        const today = new Date().toISOString().split('T')[0];
        const hasCheckedInToday = checkInOutData.checkInEvents.some(event => event.timestamp.startsWith(today));
        const hasCheckedOutToday = checkInOutData.checkOutEvents.some(event => event.timestamp.startsWith(today));

        // Check if the user has checked out yesterday
        const yesterday = new Date();
        yesterday.setDate(yesterday.getDate() - 1);
        const hasCheckedOutYesterday = checkInOutData.checkOutEvents.some(event => event.timestamp.startsWith(yesterday.toISOString().split('T')[0]));

        if (hasCheckedOutYesterday || eventType === 'checkOutEvents') {
          // If user has checked out yesterday or it's a check-out operation, proceed
          if (eventType === 'checkInEvents' && hasCheckedInToday) {
            res.status(400).json({ error: 'User has already checked in today' });
            return;
          }

          if (eventType === 'checkOutEvents' && hasCheckedOutToday) {
            res.status(400).json({ error: 'User has already checked out today' });
            return;
          }

          // Check if the user is trying to check out with less than 4 hours of check-in
          if (
            eventType === 'checkOutEvents' &&
            hasCheckedInToday &&
            checkInOutData.checkInEvents[checkInOutData.checkInEvents.length - 1].timestamp
          ) {
            const lastCheckInTimestamp = new Date(
              checkInOutData.checkInEvents[checkInOutData.checkInEvents.length - 1].timestamp
            );
            const currentTimestamp = new Date(timestamp);

            const timeDifferenceInHours =
              (currentTimestamp - lastCheckInTimestamp) / (1000 * 60 * 60);

            if (timeDifferenceInHours < 4) {
              res.status(400).json({
                error: 'User cannot check out within 4 hours of checking in',
              });
              return;
            }
          }

          // If the user already has check-in and check-out data, update the existing document
          checkInOutData[eventType].push({ location, timestamp });
          await checkInOutData.save();
          res.json({ message: `${eventType === 'checkInEvents' ? 'Check-In' : 'Check-Out'} successful`, data: checkInOutData });
        } else {
          // User has not checked out yesterday, disallow check-in or check-out for today
          res.status(400).json({ error: 'User must check out the day before checking in or out' });
        }
      } else {
        // If the user doesn't have check-in and check-out data, create a new document
        const newCheckInOutData = new CheckInOut({
          userName,
          [eventType]: [{ location, timestamp }],
        });
        await newCheckInOutData.save();
        res.json({ message: `${eventType === 'checkInEvents' ? 'Check-In' : 'Check-Out'} successful`, data: newCheckInOutData });
      }
    } else {
      res.status(400).json({ error: 'Specified location not found' });
    }
  } catch (error) {
    if (error.code === 11000) {
      res.status(400).json({ error: 'Username already exists' });
    } else {
      console.error(`${eventType === 'checkOutEvents' ? 'Error during check-out' : 'Error during check-in'}:`, error);
      res.status(500).json({ error: 'Internal Server Error' });
    }
  }
};

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
  console.log(`Server is running on port 192.168.1.2 ${PORT}`);
});
