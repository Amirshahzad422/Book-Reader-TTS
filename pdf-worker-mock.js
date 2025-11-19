// Mock PDF worker for serverless environments
// This prevents pdf-parse from trying to load worker files
// Export as both CommonJS and ES module
module.exports = {};
module.exports.default = {};
if (typeof exports !== 'undefined') {
  exports.default = {};
}

