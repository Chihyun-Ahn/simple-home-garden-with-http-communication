var express = require('express');
var path = require('path');
var bodyParser = require('body-parser');

var httpApp = express();

var mysql = require('mysql');
var math = require('math');
const mcpadc = require('mcp-spi-adc');
const gpio = require('onoff').Gpio;
const water = new gpio(17, 'out');
const HIGH = 1;
const LOW = 0;
var soilHumid, sql, relayOutput, relayInput;
var mode='AUTO';

httpApp.use(bodyParser.json());
httpApp.use(bodyParser.urlencoded({extended: true}));

const hostname = '192.168.86.23';
const port = 5000;

var connection = mysql.createConnection({
  host		: 'localhost',
  user		: 'aaa',
  password	: '1234',
  database	: 'anchiDB'
});

connection.connect();

const tempSensor = mcpadc.open(0, {speedHz: 20000}, (err) => {
  if (err) throw err;

  setInterval(() => {

    tempSensor.read((err, reading) => {
      if (err) throw err;
      soilHumid = math.round(1023 - reading.value*1024);
      if(mode=="AUTO"){
        console.log("mode: AUTO");
        if(soilHumid < 200){
          console.log("Soil is too dry. water ON!!");
          water.writeSync(HIGH);
          relayOutput = 'HIGH';
        }else{
          console.log("Soil is wet enough. water OFF!!");
          water.writeSync(LOW);
          relayOutput = 'LOW';
        }
      }else{
        console.log("mode: MANUAL");
        console.log("manual relayInput: "+relayInput);
        if(relayInput=="HIGH"){
          water.writeSync(HIGH); 
          relayOutput = relayInput;
        }else{
          water.writeSync(LOW);
          relayOutput = relayInput;}
      }
      console.log(soilHumid);
      sql = 'INSERT INTO SENSORS(soilHumid, relay) VALUES('+mysql.escape(soilHumid)+', '+mysql.escape(relayOutput)+')';
      connection.query(sql, function(err){
        if(err) throw err;
      });
    });
  }, 1500);
});

httpApp.get('/', function(req,res){
    console.log("Get request arrived. index2.html is sent.");
    res.sendFile(path.join(__dirname,'node_modules','views','index2.html'));
});


httpApp.post('/getData.do', function(req, res){
    console.log("request received");
    relayInput = req.body.relay;
    mode = req.body.mode;
    res.send({soilHumid:soilHumid, relay:relayOutput});
});

httpApp.listen(5000, function(){
  console.log('listening on 5000');
});

