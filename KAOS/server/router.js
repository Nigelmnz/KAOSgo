var DB = require('./db/database.js');
var fs = require('fs');
var cloudinary = require('cloudinary');
var moment 		= require('moment');
var email   = require("emailjs/email");
var server  = email.server.connect({
   user:    "EMAIL@SERVER.COM", 
   password: "PASSWORD", 
   host:    "smtp.HOST.COM",
   ssl:     true

});

//Config image DB
	cloudinary.config({ 
	  cloud_name: 'CLOUD_NAME', 
	  api_key: 'API_KEY', 
	  api_secret: 'API_SECRET' 
	});

module.exports = function(app) {
//**Debug**//
	// app.get("/generate", function(req, res) { 
	// 	var playerList = [];
	// 	if(global.env !== 'production'){
	// 		DB.blowUpDB(function(e,o){
	// 			for(var i = 0; i<20; i++){
	// 				generateTestGame("player"+i, 60);
	// 			}
	// 			//Make a neutral user
	// 			DB.addNewAccount({
	// 				email 	: "sample@email.com",
	// 				user 	: "user",
	// 				pass	: "password",
	// 				game 	: null,
	// 				info 	: { pic: null, name: "nigel", unix: ("aa"), location: "Faye 24", 
	// 				bio: null, target: null, kills: null, dead: null, timeLastKill: null, timeOffList: null, 
	// 							pendKill: null, pendKillTime:null, pendDeath:null, pendDeathTime:null, pendKillDenied:false, pendingDeathPoint: null, confirmed: false, isSquad: false, inLimbo: false }
	// 			}, function(e){});			
	// 		});
	// 		res.render('404', { title: 'Page Not Found ;)'}); 
	// 	}else{
	// 		res.render('404', { title: 'Page Not Found'}); 
	// 	}
	// });


// Login page //
	app.get('/', function(req, res){
		if(req.session.user == null){
			res.render('login', { title: 'KAOSgo - Assassins Game Hosting' });
		}else{
			res.redirect('/home');
		}
	});

	app.post('/', function(req, res){
		//Login and remove spaces from username
		DB.manualLogin(req.body.user.replace(/\s+/g, ''), req.body.pass, function(e, o){
			if (!o){
				res.send(e, 400);
			}	else{
			    req.session.user = o.user;
				res.send(o, 200);
			}
		});
	});

// Home Page //
	
	app.get('/home', function(req, res) {
	    goHome(req,res);
	});

	app.post('/home', function(req, res){
		if (req.param('type') == "logout"){
			req.session.destroy(function(e){ res.send('ok', 200); });
		}
	});

// Account Related //
	app.post('/signup', function(req, res){
		DB.addNewAccount({
			email 	: req.body.email,
			user 	: req.body.user.replace(/\s+/g, ''),
			pass	: req.body.pass,
			game 	: null,
			info 	: { pic: null, name: null, unix: null, location: null, 
				bio: null, target: null, kills: null, dead: null, timeLastKill: null, timeOffList: null }
		}, function(e,o){
			if (e){
				res.send(e, 400);
			}	else{
				req.session.user = o.user;
				//Will redirect to last visited page if user didn't come from the main site
				if(req.session.hasOwnProperty('history')) res.send({redirect: '/' + req.session.history},200);
				else res.send({redirect: '/home'},200);
			}
		});
	});

	app.post('/lost-password', function(req, res){
		DB.resetPassword(req.body.email, function(e,o,p){
			if (e){
				res.send(e, 400);

			}	else{
				// send the message and get a callback with an error or details of the message that was sent
				server.send({
				   text:    "Hello from KAOSgo. Your username is \""+o+"\" and your new temporary password is \""+p+"\". "+
				   "Be sure to change it! (Use the account settings button located at the top of the page.)", 
				   from:    "KAOSGo<EMAIL@SERVER.COM>", 
				   to:      o+" <"+req.body.email+">",
				   subject: "KAOSGo Password Reset"
				}, function(err, message) { console.log(err || message); });

				res.send(200);
			}
		});
	});

	app.post('/update-password', function(req, res){
		DB.updatePassword(req.session.user,req.body.pass,function(e,o,p){
			if (e){
				res.send(e, 400);
			}	else{
				res.send(200);
			}
		});
	});

// Game Pages //

	//Manual call to delete games
	app.get('/del/:game', function(req, res) {
		var gameName = req.params.game.toLowerCase();

	    if(req.session.user === "nigelmnz"){
	    	DB.deleteGame(gameName,"nigelmnz",function(e,o){
				if (e){
					res.send(400);
					res.render('404');
				}	else{
					res.send(null,200);
				}
			});
	    }else{
	    	res.render('404', { title: 'Game Not Found'});
	    	res.send(400);
	    }
	});

	app.get('/url', function(req,res){ //Stange patch for a strange bug. "URL" the string is passed on login, which breaks this.
		res.send(200);
	})

	app.get('/:game', function(req, res) {
		var gameName = req.params.game.toLowerCase();

		if(req.session.user == null){
			//If not logged in, save attempted page and go to login page
			req.session.history = gameName;
	        res.redirect('/');

		}else{
			//Get game data, and render page
			DB.findGameByName(gameName,function(e,o){
				if (e){
					res.render('404', { title: 'Game Not Found'});
				}	else{
					res.render('game', {
						title : o.casedName,
						user: req.session.user
					});
				}
			});
		}
	});

	app.get('/:game/getRoster', function(req, res) {
		var gameName = req.params.game.toLowerCase();

		if(req.xhr){
			DB.getPlayerRoster(gameName,function(e,o){
				if (e){
					res.send(400);
				}	else{
					res.send(o,200);
				}
			});
			
		}else{
			res.render('404', { title: 'Page Not Found'}); 
		}
	});

	app.get('/:game/getSquadRoster', function(req, res) {
		var gameName = req.params.game.toLowerCase();

		if(req.xhr){
			DB.getSquadRoster(gameName,function(e,o){
				if (e){
					res.send(400);
				}	else{
					res.send(o,200);
				}
			});
			
		}else{
			res.render('404', { title: 'Page Not Found'}); 
		}
	});

	app.get('/:game/getCircleRoster', function(req, res) {
		var gameName = req.params.game.toLowerCase();

		if(req.xhr){
			DB.getCircleRoster(gameName,function(e,o){
				if (e){
					res.send(400);
				}	else{
					res.send(o,200);
				}
			});
			
		}else{
			res.render('404', { title: 'Page Not Found'}); 
		}
	});

	app.get('/:game/getdeathlist', function(req, res) {
		var gameName = req.params.game.toLowerCase();

		if(req.xhr){
			DB.getDeathList(gameName,function(e,o){
				if (e){
					res.send(400);
				}	else{
					res.send(o,200);
				}
			});
			
		}else{
			res.render('404', { title: 'Page Not Found'}); 
		}
	});

	app.get('/:game/email-list', function(req, res) {
		var gameName = req.params.game.toLowerCase();

		if(req.xhr){
			DB.getEmailList(gameName,function(e,o){
				if (e){
					res.send(400);
				}	else{
					res.send(o,200);
				}
			});
			
		}else{
			res.render('404', { title: 'Page Not Found'}); 
		}
	});

	app.get('/:game/leaders', function(req, res) {
		var gameName = req.params.game.toLowerCase();

		if(req.xhr){
			DB.getLeaders(gameName,function(e,o){
				if (e){
					res.send(400);
				}	else{
					res.send(o,200);
				}
			});
			
		}else{
			res.render('404', { title: 'Page Not Found'}); 
		}
	});

	//Handles game joining within a game
	app.post('/:game/join', function(req, res) {
		var game = req.params.game.toLowerCase();
		if(req.xhr){
			//Check that the game isn't already running
			var isRunning;
			var isOver;
			DB.findGameByName(req.body.game.name,function(e,o){

				if (e){
					res.send(400);
				}else{
					isRunning = o.started;
					isOver = o.ended;

					if(o && (!isRunning && !isOver)){
						DB.joinGame(req.body.game.name, req.body.player.user,function(e,o){
							if (e){
								res.send(e, 400);
							}	else{
								res.send(null,200);
							}
						});
					}else{
						res.send("Can't join this game!", 400);
					}
				}
			});

		}else{
			res.render('404', { title: 'Page Not Found'}); 
		}
		 
	});

	app.post('/:game/leave', function(req, res) {
		var game = req.params.game.toLowerCase();
		if(req.xhr){
			DB.leaveGame(req.body.game.name, req.body.player.user,function(e,o){
				if (e){
					res.send(e, 400);
				}	else{
					res.send(null,200);
				}
			});
		}else{
			res.render('404', { title: 'Page Not Found'}); 
		}
		
	});

	app.post('/:game/kick', function(req, res) {
		var game = req.params.game.toLowerCase();
		var target = req.body.data;
		if(req.xhr){
			DB.leaveGame(req.body.game.name, target,function(e,o){
				if (e){
					res.send(e, 400);
				}	else{
					res.send(null,200);
				}
			});
		}else{
			res.render('404', { title: 'Page Not Found'}); 
		}
		
	});

	app.post('/:game/confirm', function(req, res) {
		var game = req.params.game.toLowerCase();
		var target = req.body.data;
		if(req.xhr){
			DB.confirmPlayer(req.body.game.name, target,function(e,o){
				if (e){
					res.send(e, 400);
				}	else{
					res.send(null,200);
				}
			});
		}else{
			res.render('404', { title: 'Page Not Found'}); 
		}
		
	});

	app.post('/:game/delete', function(req, res) {
		var game = req.params.game.toLowerCase();
		if(req.xhr){
			DB.deleteGame(req.body.game.name, req.body.player.user,function(e,o){
				if (e){
					res.send(e, 400);
				}	else{
					res.send(null,200);
				}
			});
		}else{
			res.render('404', { title: 'Page Not Found'}); 
		}
		
	});

	app.post('/:game/start', function(req, res) {
		var game = req.params.game.toLowerCase();
		if(req.xhr){
			DB.startGame(req.body.game.name, req.body.player.user,function(e,o){
				if (e){
					res.send(e, 400);
				}	else{
					res.send(null,200);
				}
			});
		}else{
			res.render('404', { title: 'Page Not Found'}); 
		}
		
	});

	app.post('/:game/end', function(req, res) {
		var game = req.params.game.toLowerCase();
		if(req.xhr){
			DB.endGame(req.body.game.name, req.body.player.user,function(e,o){
				if (e){
					res.send(e, 400);
				}	else{
					res.send(null,200);
				}
			});
		}else{
			res.render('404', { title: 'Page Not Found'}); 
		}
		
	});

	app.post('/:game/kill', function(req, res) {
		var game = req.params.game.toLowerCase();
		if(req.xhr){
			DB.registerKill(req.body.game.name, req.body.player.user,function(e,o){
				if (e){
					res.send(e, 400);
				}	else{
					res.send(null,200);
				}
			});
		}else{
			res.render('404', { title: 'Page Not Found'}); 
		}
		
	});

	app.post('/:game/confirmkill', function(req, res) {
		var game = req.params.game.toLowerCase();
		if(req.xhr){
			DB.confirmKill(req.body.game.name, req.body.player.user,function(e,o){
				if (e){
					res.send(e, 400);
				}	else{
					res.send(null,200);
				}
			});
		}else{
			res.render('404', { title: 'Page Not Found'}); 
		}
		
	});

	app.post('/:game/fightkill', function(req, res) {
		var game = req.params.game.toLowerCase();
		if(req.xhr){
			DB.fightKill(req.body.game.name, req.body.player.user,function(e,o){
				if (e){
					res.send(e, 400);
				}	else{
					res.send(null,200);
				}
			});
		}else{
			res.render('404', { title: 'Page Not Found'}); 
		}
		
	});

	app.post('/:game/conflictresolved', function(req, res) {
		var game = req.params.game.toLowerCase();
		if(req.xhr){
			DB.resolveConflict(req.body.player.user,function(e,o){
				if (e){
					res.send(e, 400);
				}	else{
					res.send(null,200);
				}
			});
		}else{
			res.render('404', { title: 'Page Not Found'}); 
		}
		
	});

	app.post('/:game/elim', function(req, res) {
		var game = req.params.game.toLowerCase();
		var target = req.body.data;
		if(req.xhr){
			DB.killPlayer(req.body.game.name, target, function(e,o){
				if (e){
					res.send(e, 400);
				}	else{
					res.send(null,200);
				}
			});
		}else{
			res.render('404', { title: 'Page Not Found'}); 
		}
		
	});

	app.post('/:game/promote', function(req, res) {
		var game = req.params.game.toLowerCase();
		var target = req.body.data;
		if(req.xhr){
			DB.promotePlayer(req.body.game.name, target, function(e,o){
				if (e){
					res.send(e, 400);
				}	else{
					res.send(null,200);
				}
			});
		}else{
			res.render('404', { title: 'Page Not Found'}); 
		}
		
	});

	app.post('/:game/clockCheck', function(req, res) {
		var game = req.params.game.toLowerCase();
		if(req.xhr){
			DB.clockCheck(req.body.game.name, req.body.user, function(e,o){
				if (e){
					res.send(e, 400);
				}	else{
					res.send(o,200);
				}
			});
		}else{
			res.render('404', { title: 'Page Not Found'}); 
		}
		
	});

	app.post('/:game/changeModMesg', function(req, res) {
		var game = req.params.game.toLowerCase();
		var mesg = req.body.data;
		if(req.xhr){
			DB.changeModMesg(req.body.game.name, mesg, function(e,o){
				if (e){
					res.send(e, 400);
				}	else{
					res.send(o, 200);
				}
			});
		}else{
			res.render('404', { title: 'Page Not Found'}); 
		}
		
	});



// General Ajax Requests //
	app.get('/ajax/:type', function(req, res) { 
		var type = req.params.type.toLowerCase();

		//If xhr request, then serve the requested page
		if(req.xhr){
			switch(type){
				case "listgames":
					DB.listGames(function(e,o){
						if (e){
							res.send(e, 400);
						}	else{
							res.send(o, 200);
						}
					});
					break;

				case "whoami":
					var me = req.session.user;
					DB.getAccountByUser(me,function(e,o){
						if (e){
							res.send(400);
						}	else{
							res.send(o, 200);
						}
					});					
					break;

				case "whoisthis":
					DB.getAccountByUser(req.query.user,function(e,o){
						if (e){
							res.send(400);
						}	else{
							res.send(o, 200);
						}
					});					
					break;

				case "getgame":
					var g = req.query.game;
					DB.findGameByName(g,function(e,o){
						if (e){
							res.send(400);
						}	else{
							res.send(o, 200);
						}
					});	
					break;

				default:
					res.send(400);
					break;
			}
		}else{
			res.render('404', { title: 'Page Not Found'}); 
		}
	});


	app.post('/ajax/:type' , function(req, res) { 
		var type = req.params.type.toLowerCase();

		switch(type){
			case "newgame":
				DB.getAccountByUser(req.session.user,function(e,o){
					DB.addNewGame({
						name 	  : req.body.url.toLowerCase().replace(/\s+/g, ''),
						casedName : req.body.name,
						owner     : req.session.user,
						players   : [],
						started   : false,
						ended     : false,
						circle    : [],
						squadList : [],
						deathList : [],
						modMessage : "Welcome to KAOS! Be sure to read the game rules. --- To become confirmed, update your profile with accurate information and an accurate photo. Keep alert for further updates.",
						timeLimit : 48,
						timeSquad : 12,  //Time until a listed player is removed off death list after target is gone 
						confirmLimit: 12, //Time until a pending kill goes through automatically   
						ownerEmail: o.email,
						endCount : 3 //The player count at which the game finishes          

					}, function(e,o){
						if (e){
							res.send(e, 400);
						}	else{
							res.send(null, 200);
						}
					});




				});
				break;
			case "changeprofile":
				if(req.files.image.size == 0){
					DB.updateProfile(null,req.session.user,req.body,function(e){
						if (e){
							res.send(e, 400);
						}	else{
							res.send(205);  //205 is used to differ from the reccuring 200 that come in
						}
					});
				}else{
					cloudinary.uploader.upload(req.files.image.path, function(result) { 
						if(result){
							DB.updateProfile(result.url,req.session.user,req.body,function(e){
								if (e){
									res.send(e, 400);
								}	else{
									res.send(205);
								}
							});
						}else{
							res.send(400);
						}
					}); 
				}

				break;
			default:
				res.send(400);
				break;
		}

	});

// 404 Page //
	app.get('*', function(req, res) { 
		res.render('404', { title: 'Page Not Found'}); 

	});


//Router Functions//
	
	//Will go to home page if user is logged in. Will redirect based on whether the use is in a game//
	var goHome = function(req,res){
		if (req.session.user == null){
			res.redirect('/');
		}else{
			DB.getAccountByUser(req.session.user,function(e,o){
				if (e){
					res.send(e ,400);
				}else if(o.game == null){
			    	//Render game join/make page
					res.render('home', {
						title : "Not in a game",
						user: req.session.user
					});
			    }else{
			    	var game = o.game;
					res.redirect('/'+game);
			    }
			});		
		}		
	};

	var generateTestGame = function(owner,size){
		var gname  = Math.random().toString(36).substring(5);
		var pCount = size - 10; //10 death squad who don't count as players
		var playerList = [];
		var nameList = [];
		var squadList = [];
		var squadNameList = [];

		for(var i=0; i<size; i++){
			var e = gname+i+"@gmail.com";
			var u = gname+"player"+i;
			var p = {email : e, user: u};
			if(i>= pCount){
				squadList.push(p);
				squadNameList.push(u);
			}else{
				playerList.push(p);
				nameList.push(u);
			}
		}

		//Make Owner
		DB.addNewAccount({
			email 	: owner+"@gmail.com",
			user 	: owner,
			pass	: "password",
			game 	: gname,
			info 	: { pic: null, name: owner, unix: ("aa"), location: "Faye 24", 
			bio: null, target: null, kills: null, dead: null, timeLastKill: null, timeOffList: null, 
						pendKill: null, pendKillTime:null, pendDeath:null, pendDeathTime:null, pendKillDenied:false, pendingDeathPoint: null, confirmed: false, isSquad: false,  inLimbo: false  }
		}, function(e){});

		//Make Players
		for(var i=0; i<pCount; i++){
			var player = playerList[i];
			var nextPlayer = playerList[i+1]
			if(i === 49){
				nextPlayer = playerList[0];
			}


			DB.addNewAccount({
				email 	: player.email,
				user 	: player.user,
				pass	: "password",
				game 	: gname,
				info 	: { pic: null, name: player.user, unix: ("aa"), location: "Faye 24", 
				bio: null, target: nextPlayer.user, kills: 0, dead: false, timeLastKill: moment().utc().format(), timeOffList: null, 
							pendKill: null, pendKillTime:null, pendDeath:null, pendDeathTime:null, pendKillDenied:false, pendingDeathPoint: null, confirmed: true, isSquad: false,  inLimbo: false  }
			}, function(e){});
			
		}

		//Make Squad
		for(var i=pCount; i<size; i++){
			var player = squadList[i - pCount];
			DB.addNewAccount({
				email 	: player.email,
				user 	: player.user,
				pass	: "password",
				game 	: gname,
				info 	: { pic: null, name: player.user, unix: ("aa"), location: "Faye 24", 
				bio: null, target: null, kills: null, dead: false, timeLastKill: null, timeOffList: null, 
							pendKill: null, pendKillTime:null, pendDeath:null, pendDeathTime:null, pendKillDenied:false, pendingDeathPoint: null, confirmed: true, isSquad: true,  inLimbo: false  }
			}, function(e){});
			
		}

		//Add Game
		DB.addNewGameForce({
			name 	  : gname,
			casedName : gname,
			owner     : owner,
			players   : nameList,
			started   : true,
			ended     : false,
			circle    : nameList,
			squadList : squadNameList,
			deathList : [],
			timeLimit : 48,
			modMessage : "Welcome to KAOS.",
			timeSquad : 12,  //Time until a listed player is removed off death list after target is gone 
			confirmLimit: 12, //Time until a pending kill goes through automatically   
			ownerEmail: "lol1@lol.com",
			endCount : 3 //The player count at which the game finishes        
		}, function(e,o){});

	}
}
