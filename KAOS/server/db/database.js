var crypto 		= require('crypto');
var MongoDB 	= require('mongodb').Db;
var Server 		= require('mongodb').Server;
var moment 		= require('moment');
var shuffle     = require('knuth-shuffle').knuthShuffle;
var async 		= require('async');
var fs 			= require('fs');

var dbPort 		= 61288;
var dbHost 		= 'MONGO_HOST';
var dbName 		= 'DB_NAME';
var dbURI;

// Change settings depending on env (changed in app.js)
if ('development' === global.env) {
	dbURI = 'TEST_MONGODB_HERE'; //DB
} else if ('test' === global.env) {
	dbURI = 'DEV_MONGODB_HERE';
} else if ('production' === global.env) {
	dbURI = 'PRODUCTION_MONGODB_HERE' ;
}

/* establish the database connection */
	//Init collections with false variable TODO: Bad. Shouldn't need to connect twice
	var accounts = 0;
	var games = 0;

	//First, connect to local as safety TODO: It probably shouldn't need this
	// var db = new MongoDB(dbName, new Server(dbHost, dbPort, {auto_reconnect: true}), {w: 1});

	//Attempt to connect to real one
	MongoDB.connect(dbURI, {}, function (err, data) {
		if (err) {
			console.log(err);
		}	else{
			console.log('connected to database :: ' + dbURI);
			db = data;

			//Setup collections
			accounts = db.collection('accounts');
			games = db.collection('games');
		}
	});

/*Account Manipulation Methods*/
/********************************/

	/* login validation methods */
	exports.autoLogin = function(user, pass, callback)
	{
		accounts.findOne({user:user}, function(e, o) {
			if (o){
				o.pass == pass ? callback(o) : callback(null);
			}	else{
				callback(null);
			}
		});
	}

	exports.manualLogin = function(user, pass, callback)
	{
		accounts.findOne({user:user}, function(e, o) {
			if (o == null){
				callback('user-not-found');
			}	else{
				validatePassword(pass, o.pass, function(err, res) {
					if (res){
						callback(null, o);
					}	else{
						callback('invalid-password');
					}
				});
			}
		});
	}

	/* record insertion, update & deletion methods */

	exports.addNewAccount = function(newData, callback)
	{
		accounts.findOne({user:newData.user}, function(e, o) {
			if (o){
				callback('username-taken');
			}	else{
				accounts.findOne({email:newData.email}, function(e, o) {
					if (o){
						callback('email-taken');
					}	else{
						saltAndHash(newData.pass, function(hash){
							newData.pass = hash;
						// append date stamp when record was created //
							newData.date = moment().format('MMMM Do YYYY, h:mm:ss a');
							accounts.insert(newData, {safe: true}, function(){
								accounts.findOne({user:newData.user}, function(e, o) {
									callback(e,o);
								});
							});
						});
					}
				});
			}
		});
	}

	exports.updateAccount = function(newData, callback)
	{
		accounts.findOne({user:newData.user}, function(e, o){
			o.email 	= newData.email;
			if (newData.pass == ''){
				accounts.save(o, {safe: true}, function(err) {
					if (err) callback(err);
					else callback(null, o);
				});
			}	else{
				saltAndHash(newData.pass, function(hash){
					o.pass = hash;
					accounts.save(o, {safe: true}, function(err) {
						if (err) callback(err);
						else callback(null, o);
					});
				});
			}
		});
	}

	exports.updatePassword = function(user, newPass, callback)
	{
		accounts.findOne({user:user}, function(e, o){
			if (e){
				callback(e, null);
			}	else{
				saltAndHash(newPass, function(hash){
			        o.pass = hash;
			        accounts.save(o, {safe: true}, callback);
				});
			}
		});
	}

	exports.resetPassword = function(email, callback)
	{
		accounts.findOne({email:email}, function(e, o){
			if (e||o===null){
				callback("Email not found.", null, null);
			}	else{
				var newPass = Math.random().toString(36).substring(9);
				saltAndHash(newPass, function(hash){
			        o.pass = hash;
			        accounts.save(o, {safe: true}, function(){});
			        callback(null,o.user,newPass);
				});
			}
		});
	}

	exports.updateProfile = function(photo, user, data, callback){
		accounts.findOne({user:user}, function(e, o){
			if (e){
				callback(e, null);
			}	else{

				if(data.name != '') o.info.name = data.name;
				// if(data.unix != '') o.info.unix = data.unix;
				if(data.location != '') o.info.location = data.location;
				if(photo) o.info.pic = photo;
				if(data.email != ''){
					accounts.findOne({email:data.email}, function(e2, o2) {
						if (o2){
							callback("That email address is taken.");
						}else{
							o.email = data.email;
							accounts.save(o, {safe: true}, function(){});
							callback(null);
						}
					});
				}else{
					accounts.save(o, {safe: true}, function(){});
					callback(null);

				}				
			}
		});
	}

	/* account lookup methods */

	exports.deleteAccount = function(id, callback)
	{
		accounts.remove({_id: getObjectId(id)}, callback);
	}

	exports.getAccountByEmail = function(email, callback)
	{
		accounts.findOne({email:email}, function(e, o){ callback(o); });
	}

	exports.getAccountByUser = function(user, callback)
	{
		accounts.findOne({user:user}, function(e, o){ callback(e,o); });
	}

	exports.validateResetLink = function(email, passHash, callback)
	{
		accounts.find({ $and: [{email:email, pass:passHash}] }, function(e, o){
			callback(o ? 'ok' : null);
		});
	}

	exports.getAllRecords = function(callback)
	{
		accounts.find().toArray(
			function(e, res) {
			if (e) callback(e)
			else callback(null, res)
		});
	};

	exports.delAllRecords = function(callback)
	{
		accounts.remove({}, callback); // reset accounts collection for testing //
	}

	/* private encryption & validation methods */

	var generateSalt = function()
	{
		var set = 'SALTSEEDfjkasndjakfkjewbglnlkwesnfklasdas';
		var salt = '';
		for (var i = 0; i < 10; i++) {
			var p = Math.floor(Math.random() * set.length);
			salt += set[p];
		}
		return salt;
	}

	var md5 = function(str) {
		return crypto.createHash('md5').update(str).digest('hex');
	}

	var saltAndHash = function(pass, callback)
	{
		var salt = generateSalt();
		callback(salt + md5(pass + salt));
	}

	var validatePassword = function(plainPass, hashedPass, callback)
	{
		var salt = hashedPass.substr(0, 10);
		var validHash = salt + md5(plainPass + salt);
		callback(null, hashedPass === validHash);
	}

/*Game Manipulation Methods*/
/********************************/

exports.addNewGame = function(newData, callback)
	{
		//Add game to DB
		games.findOne({name:newData.name}, function(e, o) {
			if (o){
				callback('url-taken', null);
			}	else{
				//Assuming name is good, make the room and update the account
				accounts.findOne({user:newData.owner}, function(e, o){
					games.insert(newData, {safe: true}, function(){});
					o.game = newData.name;
					accounts.save(o, {safe: true}, function(){});
					callback(null,o);

				});
			}
		});

	}


exports.joinGame = function(game,player,callback)
	{
		//Make player member of game
		games.findOne({name:game}, function(e, o){
			if(o.players.indexOf(player) == -1){
				o.players.push(player);
				games.save(o, {safe: true}, function(){});
			}

		});

		//Reset the players stats
		accounts.findOne({user:player}, function(e, o){
			o.game = game;
			o.info =  { pic: o.info.pic, name: o.info.name, location: "Somewhere", 
						bio: null, target: null, kills: null, dead: null, timeLastKill: null, timeOffList: null, 
						pendKill: null, pendKillTime:null, pendDeath:null, pendDeathTime:null, pendKillDenied:false, pendingDeathPoint: null, confirmed: false, isSquad: false,  inLimbo: false}
			accounts.save(o, {safe: true}, function(){});
			callback(null,o);

		});

	}

exports.leaveGame = function(game,player,callback)
	{
		//Remove player from game and from death squad if on it
		games.findOne({name:game}, function(e, o){
			if(o.squadList.indexOf(player) !== -1){
				o.squadList.splice( o.squadList.indexOf(player), 1 );
			}else if(o.players.indexOf(player) !== -1){
				o.players.splice( o.players.indexOf( player ), 1 );
			}

			games.save(o, {safe: true}, function(){});
			
		});


		//Clear player's active game
		accounts.findOne({user:player}, function(e, o){
			o.game = null;
			o.info.isSquad = false;
			accounts.save(o, {safe: true}, function(){});
			callback(null,o);

		});


	}

exports.deleteGame = function(game,caller,callback)
	{
		//Remove players from game
		games.findOne({name:game}, function(e, o){
			var players = o.players;
			var owner = o.owner;

			//add death squad
			players = players.concat(o.squadList);

			if(caller === owner || caller === "admin"){
				//For each player, clear their current game
				for(var i=0; i<players.length; i++){
					accounts.findOne({user:players[i]}, function(e, o){
						o.game = null;
						accounts.save(o, {safe: true}, function(){});
					});
				}

				//Delete the game
				games.remove({name:game}, function(e,o){});

				//Clear admin from the game as well
				accounts.findOne({user:owner}, function(e, o){
					o.game = null;
					accounts.save(o, {safe: true}, function(){});
					callback(null,o);

				});
			}else{
				callback("Access Denied", null);
			}
		});
	}


exports.startGame = function(game,player,callback)
	{
		//Start the game
		games.findOne({name:game}, function(e, o){

				if(!o.started){
					var len = o.players.length;
					if(len < o.endCount){
						callback("You should have at least "+o.endCount+" players to start!",null);
					}else{
						//Create Circle, (Slice makes a clone of player array)
						o.circle = shuffle(o.players.slice(0));
						
						//Assign Targets 
						assignTargets(o.circle,function(){});

						//Start Game
						o.started = true;

						//Save
						games.save(o, {safe: true}, function(){});
						callback(null,o);
					}
				}else{
					callback("Already Started!",null);
				}
		});
	}

exports.endGame = function(game,player,callback)
	{
		//Start the game
		games.findOne({name:game}, function(e, o){

			if(!o.ended && o.started){
				o.ended = true;
				games.save(o, {safe: true}, function(){});
				callback(null,o);
			}else{
				callback("Error: Can't end game!",null);
			}
		});

	}

exports.promotePlayer = function(game,player,callback)
	{
		games.findOne({name:game}, function(e, o){ 
			if(o.squadList.indexOf(player) == -1){
				o.players.splice( o.players.indexOf(player), 1 );
				o.squadList.push(player);
				accounts.findOne({user:player}, function(e, o){ 
					o.info.isSquad = true;
					accounts.save(o, {safe: true}, function(){});
				});
				games.save(o, {safe: true}, function(){});
			}
			callback(null,null);
		});

	}

exports.confirmPlayer = function(game,player,callback)
	{
		accounts.findOne({user:player}, function(e, o){ 
			o.info.confirmed = true;
			accounts.save(o, {safe: true}, function(){});
			callback(null,null);
		});

	}

//Called by the killer
//Set all confirmation-related variables
exports.registerKill = function(game,player,callback)
	{
		var killer;
		accounts.findOne({user:player}, function(e, o){ //Returns Killer
			killer = o.user;
			o.info.pendKill = o.info.target;
			o.info.pendKillTime = moment().utc().format();
			o.info.inLimbo = true;
			accounts.save(o, {safe: true}, function(){});

			accounts.findOne({user:o.info.target}, function(e, o){ //Return soon-dead
				o.info.pendDeath = killer;
				o.info.pendDeathTime = moment().utc().format();
				o.info.pendDeathPoint = killer;
				o.info.inLimbo = true;
				accounts.save(o, {safe: true}, function(){});
				callback(null,null);
			});
		});

	}

//Called by the Target
exports.fightKill = function(game,player,callback)
	{
		var killer;
		var claimant;
		accounts.findOne({user:player}, function(e, o){ //Returns no longer soon-dead
			killer = o.info.pendDeath;
			claimant = o.info.pendDeathPoint;
			o.info.pendDeath = null;
			o.info.pendDeathTime = null;
			o.info.pendDeathPoint = null;
			o.info.inLimbo = false;
			accounts.save(o, {safe: true}, function(){});

			accounts.findOne({user:killer}, function(e, o){ //returns fake killer
				o.info.pendKill = null;
				o.info.pendKillTime = null;

				if(killer != claimant){
					accounts.findOne({user:claimant}, function(e, o){ 
						o.info.pendKill = null;
						o.info.pendKillTime = null;
						o.info.pendKillDenied = true;
						o.info.inLimbo = false;
						accounts.save(o, {safe: true}, function(){});
						callback(null,null);
					});
				}else{
					o.info.pendKillDenied = true;
					o.info.inLimbo = false;
				}
				accounts.save(o, {safe: true}, function(){});
				callback(null,null);
			});
		});

	}


//Called by the target
//Resolve the kill, preserve the circle, do deathlist stuff. Also handles the killing of a player waiting for confirm
//Note: Complex as fuck
//TODO: Streamline. Vars like "pendDeath" are equal to other things. ("Target" in this case)
//TODO: Bug in here. A dead pointgetter will not have their pendKill reset after the kill is made
var confirmKill = function(game,player,callback)
	{
		var killer;
		var pendKill = null;
		var pendKillTime = null;
		var pointGetter;
		var newTarget;
		var gObj;

		games.findOne({name:game}, function(e,o){
			gObj = o;


			//To explain this- When a player dies, he passes the following: 
				//To his "killer" or rather whomever is waiting on his death (pendDeath):
					//-Whomever he has a pending a kill on (pendKill), if exists.
				//To his "target" or (pendKill), if he has one:
					//-Whomever was waiting on his death.(pendDeath)

				//The killer(1) in this case now waits on the recently killed's(2) (pendKill), while
				//the killed's (pendKill)(3) now will modify the first killer's(1) information since HE(3)
				//now has a (pendDeath) naming the killer.(1)

				//However, the point will go to the original killer of (3), since in the initial claim, the 
				//person entitled to the point is marked.(2).

			accounts.findOne({user:player}, function(e, o){ //Returns the soon-to-be dead player
				newTarget = o.info.target;
				killer = o.info.pendDeath;
				pointGetter = o.info.pendDeathPoint;
				o.info.inLimbo = false;

				if(o.info.pendKill){
					pendKill = o.info.pendKill;
					pendKillTime = o.info.pendKillTime;

					accounts.findOne({user:o.info.pendKill}, function(e, o){
						o.info.pendDeath = killer;
						accounts.save(o, {safe: true}, function(){});
					});
				}

				o.info.dead = true;
				o.info.target = null;
				o.info.pendDeathTime = null;
				o.info.pendDeath = null;
				o.info.pendDeathPoint = null;
				gObj.circle.splice( gObj.circle.indexOf(o.user), 1 );
				updateDeathListAndClocks(gObj,o,false,true,function(g,p){
					o = p;
					gObj = g;
					accounts.save(o, {safe: true}, function(){});

					accounts.findOne({user:killer}, function(e, o){ //Returns the killer
						o.info.target = newTarget;
						if(killer != pointGetter){
							accounts.findOne({user:pointGetter}, function(e, o){ //Returns the pointgetter
								o.info.kills += 1;
								o.info.pendKill = null;
								o.info.pendKillTime = null;
								accounts.save(o, {safe: true}, function(){});
							});
						}else{
							o.info.kills += 1;
						}


						o.info.pendKill = pendKill;
						o.info.pendKillTime = pendKillTime;

						if(pendKill){
							o.info.inLimbo = true;
						}else{
							o.info.inLimbo = false;
						}

						updateDeathListAndClocks(gObj,o,true,false,function(g,p){
							o = p;
							gObj = g;
							accounts.save(o, {safe: true}, function(){});
							games.save(gObj, {safe: true}, function(){});
							callback(null,o);
						});
					});
				});
			});
		});
	}

exports.confirmKill = confirmKill;
//Similar to confirmKill. Kills and preserves the circle. Also deals with deathsquad stuffs

exports.killPlayer = function(game,player,callback)
	{
		var pendKill = null;
		var pendKillTime = null;
		var pointGetter;
		var newTarget;
		var gObj;

		games.findOne({name:game}, function(e,o){
			gObj = o;

			accounts.findOne({user:player}, function(e, o){ //Returns the soon-to-be dead player
				if(o.info.pendDeath){
					confirmKill(game,player,callback);
				}else if(!o.info.dead){
					newTarget = o.info.target;
					o.info.inLimbo = false;


					// if(o.info.pendKill){
					// 	pendKill = o.info.pendKill;
					// 	pendKillTime = o.info.pendKillTime;

					// 	accounts.findOne({user:o.info.pendKill}, function(e, o){
					// 		o.info.pendDeath = killer;
					// 		accounts.save(o, {safe: true}, function(){});
					// 	});
					// }

					accounts.findOne({"info.target":o.user}, function(e, k){ //Returns Killer of soon-dead
						if(o.info.pendKill){ 
							pendKill = o.info.pendKill;
							pendKillTime = o.info.pendKillTime;

							if(pendKill){
								o.info.inLimbo = true;
							}else{
								o.info.inLimbo = false;
							}

							accounts.findOne({user:o.info.pendKill}, function(e, o){ //Returns soon-dead's target
								o.info.pendDeath = k.user;
								accounts.save(o, {safe: true}, function(){});
							});
						}

						k.info.target = newTarget;
						k.info.pendKill = pendKill;
						k.info.pendKillTime = pendKillTime;
						accounts.save(k, {safe: true}, function(){});
					});

					o.info.dead = true;
					o.info.target = null;
					o.info.pendDeathTime = null;
					o.info.pendDeath = null;
					o.info.pendDeathPoint = null;
					gObj.circle.splice( gObj.circle.indexOf(o.user), 1 );
					updateDeathListAndClocks(gObj,o,false,true,function(g,p){
						o = p;
						gObj = g;

						accounts.save(o, {safe: true}, function(){});
						games.save(gObj, {safe: true}, function(){});
						callback(null,o);
					});
				}
			});
		});
	}

exports.resolveConflict = function(user, callback)
{
	accounts.findOne({user:user}, function(e, o){ 
		o.info.pendKillDenied = false;
		accounts.save(o, {safe: true}, function(){});
		callback(null, null);
	});
}

exports.listGames = function(callback)
	{
		games.find().toArray(
			function(e, o) {
			if (e) callback(e)
			else callback(null, o)
		});
	}

exports.getPlayerRoster = function(name, callback)
	{
		accounts.find({game:name}).toArray(
			function(e, o) {
			if (e) callback(e)
			else callback(null, o)
		});
	}

exports.getSquadRoster = function(name, callback)
	{
		games.findOne({name:name}, function(e, o){
			squad = o.squadList;
			getPlayerArray(squad,null,function(e,o){
				if (e) callback(e)
				else callback(null, o)
			})
		});
	}

exports.getCircleRoster = function(name, callback)
	{
		games.findOne({name:name}, function(e, o){
			circle = o.circle;
			getPlayerArray(circle,null,function(e,o){
				if (e) callback(e)
				else callback(null, o)
			})
		});
	}

exports.getEmailList = function(name, callback)
	{
		accounts.find({game:name},{email:1}).toArray(
			function(e, o) {
			if (e) callback(e)
			else callback(null, o)
		});
	}

exports.getLeaders = function(name, callback)
	{
		accounts.find({game:name}).toArray(
			function(e, o) {
			if (e) callback(e)
			else callback(null, sortByScore(o))
		});
	}

function sortByScore(playerArr){

	playerArr.sort(function (a, b) {
		if(a.info.kills == null && b.info.kills == null){
			return 0
		}else if(a.info.kills == null && b.info.kills != null){
			return 1;
		}else if(a.info.kills != null && b.info.kills == null){
			return -1;
		}else if (a.info.kills > b.info.kills){
	      return -1;
	    }else if (a.info.kills < b.info.kills){
	      return 1;
	    }else{
	      return 0;
	    }
	});

	var strippedArr = [];
	strippedArr.push({user: playerArr[0].user, name: playerArr[0].info.name, kills: playerArr[0].info.kills});
	strippedArr.push({user: playerArr[1].user, name: playerArr[1].info.name, kills: playerArr[1].info.kills});
	strippedArr.push({user: playerArr[2].user, name: playerArr[2].info.name, kills: playerArr[2].info.kills});

	
	console.log(playerArr);
	// return playerArr;
	return strippedArr;


}

exports.getDeathList = function(name, callback)
	{
		games.findOne({name:name}, function(e, o){
			circle = o.circle;
			var dlist;

			//Once to update deathlist
			getPlayerArray(circle,o,function(e,g){
				dlist = g.deathList;

				//Another time to output deathlist
				getPlayerArray(dlist,null,function(e,o){
					if (e) callback(e)
					else callback(null, o)
				});
			});

		});
	}

exports.findGameByName = function(name, callback)
	{
		games.findOne({name: name},
			function(e, o) {
				if(o) callback(null, o);
				else callback("Not found", null);
			});
	};

//Used to see if any time based triggers are due
exports.clockCheck = function(game, player, callback)
	{
		var gObj;
		games.findOne({name: game},function(e,o){
			gObj = o;

			accounts.findOne({user:player},function(e,o){
				updateDeathListAndClocks(gObj,o,false,false,function(g,p){
					o = p;
					gObj = g;
					games.save(gObj, {safe: true}, function(){});
					accounts.save(o, {safe: true}, function(){});
					callback(null,o);
				});
			});
		});
	};

exports.changeModMesg = function(game, mesg, callback){
	games.findOne({name: game},function(e,o){
		o.modMessage = mesg;
		games.save(o, {safe: true}, function(){});
		callback(null,null);
	});
}

/*Debug Methods*/
/********************************/
	//Will add a game without verification//
	exports.addNewGameForce = function(newData, callback)
		{
			games.insert(newData, {safe: true}, callback);
		}

	exports.blowUpDB = function(callback)
		{
			accounts.remove(function(){
				games.remove(callback);
			});
		}


/*Auxilary Methods*/
/********************************/
	var getObjectId = function(collection,id)
	{
		return collection.db.bson_serializer.ObjectID.createFromHexString(id)
	}

	var findById = function(id, callback)
	{
		accounts.findOne({_id: getObjectId(id)},
			function(e, res) {
			if (e) callback(e)
			else callback(null, res)
		});
	};


	var findByMultipleFields = function(a, callback)
	{
	// this takes an array of name/val pairs to search against {fieldName : 'value'} //
		accounts.find( { $or : a } ).toArray(
			function(e, results) {
			if (e) callback(e)
			else callback(null, results)
		});
	}	

	//TODO: Possibly redundant and inefficent
	function updateNeeded(game, player, asKill, asDeath){
		var limit = moment(player.info.timeLastKill).add("hours",game.timeLimit);

		//If players target is dead, then add set new times depending if on list or not
		return (asKill || asDeath || player.info.pendDeath || (limit.diff(moment().utc()) <=0 && game.deathList.indexOf(player.user) == -1) || 
			 (game.deathList.indexOf(player.user) != -1 && moment(player.info.timeOffList).diff(moment().utc()) <= 0)||
			 game.circle.length <= game.endCount) || (game.deathList.indexOf(player.user) != -1 && player.info.inLimbo);

	}

	//At the moment, handles deathlist and confirms, also game-end conditions
	//TODO: Make this less intrusive?
	function updateDeathListAndClocks(game, player, asKill, asDeath, callback){
		if(player !== null){
			//**Death List Stuff**//
			var limit = moment(player.info.timeLastKill).add("hours",game.timeLimit);

			//If players target is dead, then add set new times depending if on list or not
			if(asKill){
				if(game.deathList.indexOf(player.user) != -1 && player.info.timeOffList == null){ 
					player.info.timeOffList = moment(player.info.timeLastKill).add("hours",game.timeSquad).format();
				}

				player.info.timeLastKill = moment().utc().format();

			//If player is dead, clear deathlist status
			}else if(asDeath){
				if(game.deathList.indexOf(player.user) != -1){
					game.deathList.splice(game.deathList.indexOf(player.user), 1);
				}

				player.info.timeOffList = null;
			}else{
				//Check for being in limbo
				if(player.info.inLimbo){
					if(game.deathList.indexOf(player.user) != -1){ //Hide them from the squad while they are in limbo
						game.deathList.splice(game.deathList.indexOf(player.user), 1); 
					}

				//If over the time-limit, then enter deathlist 
				}else if(limit.diff(moment().utc()) <=0 && game.deathList.indexOf(player.user) == -1){ 
					game.deathList.push(player.user);

				//If a player on deathlist is supposed to be off, then leave deathlist and clear offlist time
				}else if(game.deathList.indexOf(player.user) != -1 && moment(player.info.timeOffList).diff(moment().utc()) <= 0){
					game.deathList.splice(game.deathList.indexOf(player.user), 1);
					player.info.timeOffList = null;

				}

			} 
		}	

		//**Check if game over**//
		if(game.circle.length <= game.endCount){
			game.ended = true;
		}

		//**Confirmation Clocks, End callback**//
		if(player.info.pendDeath && player !== null){
			var limit = moment(player.info.pendDeathTime).add("hours",game.confirmLimit);
			if(limit.diff(moment().utc()) <=0){
				confirmKill(game.name,player.user,function(g,p){
					game = g;
					player = p;
					callback(game,player);
				});
			}else{
				callback(game,player);
			}
		}else{
			callback(game,player);

		}
	}

	function assignTargets(pCircle, callback){
		var i = 0;

		//Effectively a for-loop. For each player in pCircle, call this function. The function
		//then assigns the target for the player, depending on how many calls have been made previously
		var iFcn = function(player,done){
			accounts.findOne({user:player}, function(e, o){
				if(i == pCircle.length -1){
					o.info.target = pCircle[0];
				}else{
					o.info.target = pCircle[i+1];
				}
				o.info.kills  = 0;
				o.info.dead   = false;
				o.info.timeOffList = null;
				o.info.timeLastKill = moment().utc().format();
				accounts.save(o, {safe: true}, function(){});
				i++;
				done();
				return;
			});
		}

		var doneFcn = function(err) {
	        callback(err, null);
	    };

	    async.eachSeries(pCircle, iFcn, doneFcn);
	}

	//Recently changed to run in paralell
	function getPlayerArray(pArr, g, callback){
		var gObj = g;
		var jobArray = [];

		var iFcn = function(player,done){
			pIndex = pArr.indexOf(player);
			accounts.findOne({user:player}, function(e, o){
				done(null,o);
				return;
			});
		}

		var dFcn = function(player,done){
			accounts.findOne({user:player}, function(e, o){
				if(updateNeeded(gObj,o,false,false)){
					jobArray.push(function(){
						updateDeathListAndClocks(gObj,o,false,false,function(g,p){
							o = p;
							gObj = g;
							accounts.save(o, {safe: true}, function(){});
						});
					})
				}
				done();
				return;
			});
		}

		var doneFcn = function(err,o) {
			if(gObj){
				async.eachSeries(jobArray,function(f,done){
					f();
					done();
					return;
				}, function(err,o){
					games.save(gObj, {safe: true}, function(){});
					callback(err, gObj);
				})
			}else{
	        	callback(err, o);
	    	}
	    };

	    //If a game was passed, assume it was to refresh the death-list
	    if(gObj){ 
	    	async.each(pArr, dFcn, doneFcn);

	    }else{
	    	async.map(pArr, iFcn, doneFcn);
	    }
	}


