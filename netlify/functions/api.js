const serverless = require('serverless-http');
const app = require('../../backend/server');

// Export the serverless handler
const handler = serverless(app);

module.exports.handler = async (event, context) => {
  // Set context to not wait for empty event loop
  context.callbackWaitsForEmptyEventLoop = false;
  
  // Call the serverless handler
  const result = await handler(event, context);
  return result;
};
