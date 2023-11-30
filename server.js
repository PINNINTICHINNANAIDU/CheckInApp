// server.js
const express = require('express');
const bodyParser = require('body-parser');

const app = express();
const PORT = 3000;

app.use(bodyParser.json());

app.post('/checkin', (req, res) => {
  const { userName, location, timestamp,checkOut } = req.body;

  if (!userName || !location || !timestamp) {
    return res.status(400).json({ error: 'Invalid request format' });
  }
if (checkOut===true){
  res.json({ message: 'Check-Out successful' });
}
  // Here, you can process the check-in data as needed
  // For simplicity, we're just logging the location data
  console.log('Check-In Data:', { userName, location, timestamp,checkOut});
  if (checkOut===undefined){
    
    res.json({ message: 'Check-In successful' });// Respond with a success message
  }
  

});

app.listen(PORT, () => {
  console.log(`Server is running on http://192.168.1.48:${PORT}`);
});
