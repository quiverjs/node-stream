
var createChannel = require('quiver-stream-channel').createStreamChannel

var createNodeReadStream1Adapter = function(nodeReadStream) {
  var channel = createChannel()
  var writeStream = channel.writeStream
  var readStream = channel.readStream

  var self = { }
  writeStream.acquireOwnership(self)

  var pausing = false

  var pauseStream = function() {
    nodeReadStream.pause()
    pausing = true
  }

  var resumeStream = function() {
    nodeReadStream.resume()
    pausing = false
  }

  nodeReadStream.on('data', function(data) {
    if(pausing) throw new Error(
      'underlying node read stream do not obey pause instruction')

    writeStream.write(data)
    doPipe()
  })

  nodeReadStream.on('error', function(err) {
    writeStream.closeWrite(err)
  })

  nodeReadStream.on('end', function() {
    writeStream.closeWrite()
  })

  var doPipe = function() {
    pauseStream()

    writeStream.prepareWrite(function(streamClosed, writer) {
      if(streamClosed) return nodeReadStream.close(streamClosed.err)

      resumeStream()
    })
  }

  doPipe()

  return readStream
}

var createNodeWriteStream1Adapter = function(nodeWriteStream) {
  var channel = createChannel()
  var writeStream = channel.writeStream
  var readStream = channel.readStream

  var self = { }
  readStream.acquireOwnership(self)

  nodeWriteStream.on('error', function(err) {
    readStream.closeRead(err)
  })

  nodeWriteStream.on('close', function() {
    readStream.closeRead(null)
  })

  var doPipe = function() {
    readStream.read(function(streamClosed, data) {
      if(streamClosed) return nodeWriteStream.close(err)
      if(!nodeWriteStream.writable) return readStream.closeRead(
        error(500, 'node write stream closed prematurely'))

      var writeAvailable = nodeWriteStream.write(data)

      if(writeAvailable) doPipe()
    })
  }

  nodeWriteStream.on('drain', doPipe)

  return writeStream
}

module.exports = {
  createNodeReadStream1Adapter: createNodeReadStream1Adapter
}