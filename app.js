var express = require('express');
var crypto = require('crypto');
var fs = require('fs');
var app = express();
var easyimg = require('easyimage');

var phantom = require('phantom'), _ph;

phantom.create("--web-security=no", "--ignore-ssl-errors=yes", { port: 12345 }, function (ph) {
    console.log("Phantom Bridge Initiated");
    _ph = ph;
});

app.get(/(.*)/, function (req, res) {

  var date = new Date();
  var current_hour = date.getHours();
  var url = req.params[0].substring(1);
  var hash = crypto.createHash('sha1').update(url + current_hour).digest('hex');
  var path = 'cache/' + hash + '.png';
  var path_small = 'cache/' + hash + '_s.png';

  fs.exists(path, function (exists) {
    if (exists == false) {
      console.log('Cache Miss: ' + url);
      _ph.createPage(function (page) {
        page.set('viewportSize', { width: 1440, height: 900 });
        page.open(url, function() {
          console.log('Rendering: ' + url);
          page.render(path);
          console.log('Rendered: ' + url);
          var interval = setInterval(function(){
            fs.exists(path, function (exists) {
              if (exists) {
                if (clearInterval(interval) == undefined){
                  setTimeout(function(){
                    easyimg.rescrop({
                         src: path,
                         dst: path_small,
                         width: 400,
                         cropheight: 800,
                         x:0, y:0
                      }).then(
                      function(image) {
                         console.log('Resized and cropped: ' + image.width + ' x ' + image.height);
                      },
                      function (err) {
                        console.log(err);
                      }
                    );
                    fs.readFile(path, function(err, data){
                      res.writeHead(200, {'Content-Type': 'image/png' });
                      res.end(data, 'binary');
                    });
                  }, 5000);
                }
              }
            });
          }, 100);
        });
      });
    } else {
      console.log('Cache Hit: ' + url);
      var img = fs.readFileSync(path);
      res.writeHead(200, {'Content-Type': 'image/png' });
      res.end(img, 'binary');
    }
  });



});

var server = app.listen(process.env.PORT, function () {
  var host = process.env.IP;
  var port = process.env.PORT;
  console.log('Example app listening at http://%s:%s', host, port);
});