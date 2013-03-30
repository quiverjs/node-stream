
var createChannel = require('quiver-stream-channel').createStreamChannel

var createNodeReadStreamAdapter = function(nodeReadStream) {
  var channel = createChannel()
  var writeStream = channel.writeStream
  var readStream = channel.readStream

  nodeReadStream.on('end', function() {
    writeStream.closeWrite(null)
  })

  nodeReadStream.on('error', function(err) {
    writeStream.closeWrite(err)
  })

  var doPipe = function() {
    writeStream.prepareWrite(function(streamClosed) {
      if(streamClosed) return nodeReadStream.end()

      var data = nodeReadStream.read()
      if(data) {
        writeStream.write(data)
        doPipe()
      } else {
        nodeReadStream.once('readable', function() {
          data = nodeReadStream.read()

          if(!data) throw new Error(
            'Fatal: Node.js read stream return null even after readable event')
          
          writeStream.write(data)
          doPipe()
        })
      }
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
      if(streamClosed) return nodeWriteStream.end()

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

module.exports = {
  createNodeReadStreamAdapter: createNodeReadStreamAdapter,
  createNodeWriteStreamAdapter: createNodeWriteStreamAdapter
}
