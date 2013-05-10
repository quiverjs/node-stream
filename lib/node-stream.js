
var streamAdapter = require('./stream-adapter')

module.exports = {
  createNodeReadStreamAdapter: streamAdapter.createNodeReadStreamAdapter,
  createNodeWriteStreamAdapter: streamAdapter.createNodeWriteStreamAdapter
}