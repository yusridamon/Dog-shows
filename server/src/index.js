require('dotenv').config();
const app = require('./app');

const PORT = process.env.PORT || 5001;
// Bind to 0.0.0.0 so managed hosts (Railway, etc.) can route traffic in.
const HOST = '0.0.0.0';

app.listen(PORT, HOST, () => {
  console.log(`Dog Shows API running on port ${PORT}`);
  console.log(`   Environment: ${process.env.NODE_ENV || 'development'}`);
});
