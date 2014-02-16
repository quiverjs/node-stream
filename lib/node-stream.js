
var createChannel = require('quiver-stream-channel').createStreamChannel

var createNodeReadStreamAdapter = function(nodeReadStream) {
  var channel = createChannel()
  var writeStream = channel.writeStream
  var readStream = channel.readStream
  var nodeStreamEnded = false

  nodeReadStream.on('end', function() {
    if(nodeStreamEnded) return
    writeStream.closeWrite(null)
    nodeStreamEnded = true
  })

  nodeReadStream.on('error', function(err) {
    if(nodeStreamEnded) return
    writeStream.closeWrite(err)
    nodeStreamEnded = true
  })

  var readData = function(callback) {
    if(nodeStreamEnded) return

    var data = nodeReadStream.read()
    if(data) return callback(null, data)
    
    nodeReadStream.once('readable', function() {
      readData(callback)
    })
  }

  var doPipe = function() {
    writeStream.prepareWrite(function(streamClosed) {
      if(nodeStreamEnded) return
      if(streamClosed) return

      readData(function(err, data) {
        if(err) return writeStream.closeWrite(err)

        writeStream.write(data)
        doPipe()
      })
    })
  }

  doPipe()

  return readStream
}

var createNodeWriteStreamAdapter = function(nodeWriteStream) {
  var channel = createChannel()
  var writeStream = channel.writeStream
  var readStream = channel.readStream

  nodeWriteStream.on('error', function(err) {
    readStream.closeRead(err)
  })

  var doPipe = function() {
    readStream.read(function(streamClosed, data) {
      if(streamClosed) {
        nodeWriteStream.end()
        return
      }

      var ready = nodeWriteStream.write(data)

      if(ready) {
        doPipe()
      } else {
        nodeWriteStream.once('drain', doPipe)
      }
    })
  }

  doPipe()

  return writeStream
}

var createNodeReadWriteStreamAdapter = function(nodeWriteStream, nodeReadStream) {
  var writeStream = createNodeWriteStreamAdapter(nodeWriteStream)
  var readStream = createNodeReadStreamAdapter(nodeReadStream)

  var streamChannel = {
    writeStream: writeStream,
    readStream: readStream
  }

  return streamChannel
}

module.exports = {
  createNodeReadStreamAdapter: createNodeReadStreamAdapter,
  createNodeWriteStreamAdapter: createNodeWriteStreamAdapter,
  createNodeReadWriteStreamAdapter: createNodeReadWriteStreamAdapter
}
