const express = require('express');
const cors = require('cors');

const app = express();
app.use(cors());

const socketIO = require('socket.io');
const server = require('http').createServer(app);
const errorHandler = require('./src/middlewares/errorHandler');
const dotenv = require('dotenv');
if (!process.env.PORTABLE_EXECUTABLE_DIR) {
  dotenv.config();
} else {
  const path = require('path');
  dotenv.config({ path: path.join(process.env.PORTABLE_EXECUTABLE_DIR, '.env') });
}



// mix v_chat
const helmet = require('helmet'); // helmet morgan body-parser mongoose
const morgan = require('morgan');
const bodyParser = require('body-parser');
app.use(express.static(`${__dirname}/public`));
app.use(express.json());

// adding Helmet to enhance your API's security
app.use(helmet());

// adding morgan to log HTTP requests
app.use(morgan('combined'));

// to send data from post man and any front end
app.use(bodyParser.urlencoded({ extended: false }));

// parse an HTML body into a string
app.use(bodyParser.json());

const auth = require('./src/routes/auth');

app.use('/api/v1/auth', auth);

app.use(errorHandler);

// socket

const io = socketIO(server);

io.onlineUsers = {};
require("./sockets/init.socket")(io);
require("./sockets/ethers.socket")(io);

// --------------------------------

app.get('/', (req, res) => {
  res.send('server work');
});

const port = process.env.PORT || 4000;

server.listen(port, () => {
  console.log(`Listening *: ${port}`);
});

// Handle unhandle promise rejections
process.on('unhandledRejection', (err, promise) => {
  console.log(`Error: ${err.message}`);
  server.close(() => process.exit(1));
});
