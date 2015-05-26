$(document).ready(function(){
	var game;
	var player;
	var alert = $('.alert');
	var divClone = $("#document").clone(true);

	var isOwner = false;
	var isPlayer = false;
	var isSpec = false;
	var isSquad = false;

	//Used to stop multiple server POST's from being done at the same time
	//Each command will turn off safe, and switch it back upon completion
	var safe = true;
	var mode = 0; //Represents which tab is open on the players screen

	//Display
		refreshAll(function(){});
		
		//Timer in millisecs
		var refreshTimer = setInterval(function() {
	    	refreshAll(function(){});
		}, 60*1000);

	//Commands

		//Universal
			 $(document).on("click","#showRules",function(e){
				 $('#williamsStandard').modal({});

			 });

		//NavBar
			$('#innerNav a').click(function(){ 
				mode = parseInt(this.id);
				$(".mode").fadeOut();				
				refreshAll(function(){});

			});



		//Spectator Commands
			$('#btn-joingame').click(function(){
				gameCommand('/join', player.game === null, null, "Error: Already in a game.");

			});

		//Player Commands
			$('#btn-leavegame').click(function(){ 
				gameCommand("/leave", player.game == game.name, 
					function(){ window.location.href = '/'; }, null);

			});

			$('#btn-kill').click(function(){ 
				makeConfirm(function(){
					gameCommand("/kill", player.game == game.name, null, null);
				});

			});

			$('#btn-killConfirm').click(function(){ 
				makeConfirm(function(){
					gameCommand("/confirmkill", player.game == game.name, null, null);
				});

			});


			$('#btn-killDisagree').click(function(){ 
				makeConfirm(function(){
					gameCommand("/fightkill", player.game == game.name, null, null);
				});
			});

			$('#btn-conflictResolve').click(function(){ 
				gameCommand("/conflictresolved", player.game == game.name, null, null);

			});

			$('#btn-dead').click(function(){
				makeConfirmAdmin(function(){ 
					gameCommand("/dead", player.game == game.name, null, null);
				});

			});

			$(document).on("click","#showProfile",function(e){
				 showAccountModal(player.user);

			 });

			//TODO: Require e-mail verification
			$(document).on("submit",".profileForm",function(e){ 
		        e.preventDefault();  //prevent form from submitting

		        if(safe){
					safe = false;
					var form;
					if(isPlayer){
						form = $('#form1')[0];
					}else{
					    form = $('#form2')[0];
					}
				    var fd = new FormData(form);
				    var xhr = new XMLHttpRequest();
				    $(".loading").fadeIn();

				    //Will check email against regex before opening connection
				    var re = /^(([^<>()[\]\\.,;:\s@\"]+(\.[^<>()[\]\\.,;:\s@\"]+)*)|(\".+\"))@((\[[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\.[0-9]{1,3}\])|(([a-zA-Z\-0-9]+\.)+[a-zA-Z]{2,}))$/;
					if((form.email.value === '' || re.test(form.email.value)) && (sanitizeHTML(form.email.value) === form.email.value)){
					    xhr.open("POST", "/ajax/changeprofile", true);
					    xhr.onreadystatechange = function () {
					        if (xhr.status == 205) { //205 is used to avoid confusion with the constant 200's
					            showError("Profile Updated");
					        	$(".loading").fadeOut();
					      		safe = true;
					        }else if(xhr.status == 400){
					        	showError("Something went wrong. " + xhr.responseText);
					        	$(".loading").fadeOut();
					        	safe = true;
					        }
					    };
					    xhr.send(fd);	
					}else{
						showError("The inputted email is not valid.");
			        	$(".loading").fadeOut();
			      		safe = true;
					}
				}
	    	});



		//Admin/DeathSquad Commands

			//Admin
				//Will delete the current game
				$('#btn-deletegame').click(function(){ 
					makeConfirmAdmin(function(){ 
						gameCommand("/delete", player.game == game.name && player.user == game.owner, 
							function(){ window.location.href = '/'; }, null,null);
					});

				});

				//Will start the current game
				$('#btn-startgame').click(function(){ 
					makeConfirmAdmin(function(){ 
						gameCommand("/start", player.game == game.name && player.user == game.owner, 
							function(){ window.location.href = '/'; }, null,null);
					});

				});

				//Will end the current game
				$('#btn-endgame').click(function(){
					makeConfirmAdmin(function(){ 
						gameCommand("/end", player.game == game.name && player.user == game.owner, null, null,null);
					});

				});

	
				$('#promoteCall').click(function(){
					makeConfirmAdmin(function(){ 
						var p = $("#profile").attr("name");
						gameCommand("/promote", player.game == game.name && player.user == game.owner, null, null,p);
					});

				});

				$('#kickCall').click(function(){ 
					makeConfirmAdmin(function(){ 
						var p = $("#profile").attr("name");
						gameCommand("/kick", player.game == game.name && (isOwner || isSquad), 
							function(){ window.location.href = '/'; }, null, p);
					});

				});

				$('#confirmCall').click(function(){ 
					makeConfirmAdmin(function(){ 
						var p = $("#profile").attr("name");
						gameCommand("/confirm", player.game == game.name && (isOwner || isSquad), 
							function(){ window.location.href = '/'; }, null, p);
					});
				});

				//Bring up message editor, showing the current mesg
				$('#editModMesg').click(function(){ 
					$('#modMesgArea').text(game.modMessage);
					$('#modMessageModal').modal({});
				});

				//Change message
				$('#modMessageModal #confirmAction').click(function(){ 
					var mesg = sanitizeHTML($('#modMesgArea').val());
					gameCommand("/changeModMesg", player.game == game.name && isOwner, 
							null, null, mesg);
				});

				//Hosting Modal
				$(document).on("click","#showGuide",function(e){
					$('#hostingGuide').modal({});

			 	});


			//Both
				//TODO: Killing is currently band-aided. Should not refresh page on kill.
				//This is done to prevent multiple requests before the server has a chance to refresh
				$('#deathKillCall').click(function(){ 
					makeConfirm(function(){ 
						var p = $("#profile").attr("name");
						gameCommand("/elim", player.game == game.name && (isOwner || isSquad), 
							function(){ window.location.href = '/'; }, null, p);
					});

				});

				$('#killCall').click(function(){ 
					makeConfirm(function(){ 
						var p = $("#profile").attr("name");
						gameCommand("/elim", player.game == game.name && (isOwner || isSquad), 
							function(){ window.location.href = '/'; }, null, p);
					});

				});

				//Will load the modal for a clicked player
				 $(document).on("click","#player-btn",function(e){
					 var p = this.name;
					 showAccountModal(p);

				 });


	//Functions
		function showError(m)
		{

			$('.alert p').text(m);
			alert.fadeIn();
		}

		function populatePlayerList(andConfirms){
			var pl = $("#playerList p");
			var plList = $("#playerList");


			if(game.players.length == 0){
				plList.html("<h3>All alone.</h3>");
				if(andConfirms) $("#confirmList").html("<h3>All alone.</h3>");

			}else{
				$.get("/"+game.name+"/getRoster").done(function(o){
					var list = "";
					var list2 = "";
					for(i=0; i<o.length; i++){
						var player = o[i];
						var statustext = "";
						if(player.info.dead) statustext = "(Dead)";

						if(player.user !== game.owner){
							list += '<a id="player-btn" name="'+player.user+'" class="list-group-item">'+player.user+" | "+player.info.name+" | "+statustext+'</a>';
							if(andConfirms && !player.info.confirmed) list2 += '<a id="player-btn" name="'+player.user+'" class="list-group-item">'+player.user+" | "+player.info.name+'</a>'; 
						}
					}

					plList.html(list);

					//For confirmlist
					if(list2 == "") list2 = "<h3>All confirmed!</h3>";
					if(andConfirms) $("#confirmList").html(list2);
				});
			}
		}

		function populateSquadList(){;
			var plList = $("#squadList");


			if(game.squadList.length == 0){
				plList.html("<h3>All alone.</h3>");

			}else{
				$.get("/"+game.name+"/getSquadRoster").done(function(o){
					var list = "";
					for(i=0; i<o.length; i++){
						var player = o[i];
						list += '<a id="player-btn" name="'+player.user+'" class="list-group-item">'+player.user+" | "+player.info.name+'</a>';
					}

					plList.html(list);
				});
			}
		}

		function populateCircle(){
			var c = $("#circle");
			if(game.started){
				$.get("/"+game.name+"/getCircleRoster").done(function(o){
					var list = "";
					for(i=0; i<o.length; i++){
						var player = o[i];
						list += '<a id="player-btn" name="'+player.user+'" class="list-group-item">'+player.user+" | "+player.info.name+'</a>';
					}
					

					c.html(list);

				});
			}else{
				c.html("<h3>KAOS hasn't started yet.</h3>");
			}
		}

		function populateDeathList(){
			var c;
			if(isSquad){
				c = $("#squadSection #deathList");
			}else if(isOwner){
				c = $("#ownerSection #deathList");
			}

			if(game.started){
				$.get("/"+game.name+"/getdeathlist").done(function(o){
					var list = "";
					if(o.length == 0){
						c.html("<h3>All clear... For now.</h3>");
					}else{
						for(i=0; i<o.length; i++){
							var player = o[i];
							list += '<a id="player-btn" name="'+player.user+'" class="list-group-item">'+player.user+" | "+player.info.name+" | Time until freedom: "+timeLeft(player)+'</a>';
						}

						c.html(list);
					}

				});
			}else{
				c.html("<h3>All clear... For now.</h3>");
			}
		}

		//Note: Nested callbacks. Will only call main callback after both GETs are finished.
		function refreshData(callback){
			$.get("/ajax/whoami").done(function(o){
					player = o;

					//If there isn't an open session, leave
					if(player === ''){
						window.location.href = '/';
					}
				
				//Note: Gamename is gotten from url. Format is currently "/gamename". Substring() is used to remove the slash.
				$.get("/ajax/getgame",{game: window.location.pathname.substring(1)}).done(function(o){
						game = o;
						callback();
				});

			});
		}

		//TODO: Is there a better way to do this? 
		//TODO: Make prettier.
		function refreshView(){
			//Resets the document
			$("#document").replaceWith(divClone.clone(true));
			resetPage();

			//Check what relation the player has to the game
			isOwner  = false;
			isPlayer = false;
			isSpec   = false;
			isSquad  = false;

			if(player.game == game.name){ //A member
				if(player.user == game.owner){
					isOwner  = true;
				}else if(player.info.isSquad){
					isSquad = true;
				}else{
					isPlayer = true;				
				}				
			}else{ //A spectator
				isSpec   = true;
			}

			//Owner Stuff
				if(isOwner){

					switch(mode){
						case 0:
							//Populate Player List
							changeMode("#ownerSection","#playerMode",mode);
							if(game.started) $("#confirmSection").hide();
							populatePlayerList(!game.started);
							populateSquadList();
							getLeaders(true);


							break;

						case 1:
							changeMode("#ownerSection","#targetMode",mode);
							populateCircle();
							
							break;

						case 2:
							changeMode("#ownerSection","#deathMode",mode);
							populateDeathList();
							break;

						case 3:
							changeMode("#ownerSection","#infoMode",mode);
							generateInfo(true);
							generateEmails();
							break;

						case 4:

							changeMode("#ownerSection","#settingsMode",mode);

							//Displays reliant on end/start/nein
							if(game.ended){	
								$('#btn-startgame').hide();
								$('#btn-endgame').hide();
								$('#btn-deletegame').show();
							}else if(game.started){
								$('#btn-startgame').hide();
								$('#btn-endgame').show();
								$('#btn-deletegame').hide();

							}else{
								$('#btn-endgame').hide();
								$('#btn-startgame').show();
								$('#btn-deletegame').show();
							}

							break;

						default:
							break;

					}
					$('#squadSection').fadeOut();
					$('#spectatorSection').fadeOut();
					$('#gameSection').fadeOut();
					$('#ownerSection').fadeIn();
				}

			//Player Stuff
				if(isPlayer){

					switch(mode){
						case 0:
							changeMode("#gameSection","#gameMode",mode);
							getLeaders(false);

							if(player.info.confirmed || game.started){
								$("#unconfirmed").hide();
							}
							

							if(game.ended || !game.started){
								$('#btn-kill').hide();
								$('#btn-dead').hide();
								$('#elimSection').hide();
								$('#leavegame').show();
								if(!game.started){
									$('#living').html("<h2>No target... Yet.</h2>");
								}else if(game.ended){
									$('#living').html("<h2>Game over. If you were a finalist, you will be contacted by your moderator.");
									$('#btn-kill').hide();
									$('#btn-dead').hide();
									$('#gameSection #killCount').text("Kills: " + player.info.kills);	
									$('#confirmKill').hide();
									$('#deathDenied').hide();

								}

							}else if(game.started){
								$('#elimSection').show();
								if(player.info.dead){
									$('#living').html("<h2>You are dead. If you are still in the running, you may have a chance at finals. Await moderator contact.</h2>");
									$('#btn-kill').hide();
									$('#btn-dead').hide();

									if(player.info.pendKill){
										updateClock(player);
										$('#confirmDeath').show();
									}else{
										$('#confirmDeath').hide();
									}

									$('#leavegame').html("<h2>Waiting for game to end... Maybe you're still in the running?</h2>");
									// $('#leavegame').show();
									$('#confirmKill').hide();
									$('#deathDenied').hide();

								}else{
									//Do a get for the target's info. 
									insertProfile('#gameSection #targetInfo',player.info.target,function(o){});
									$('#leavegame').hide();
									$('#btn-kill').show();
									// $('#btn-dead').show();
									updateClock(player);


									// Deal with confirmation scenarios

									if(player.info.pendKill){
										$('#confirmDeath').show();
										$('#btn-kill').hide();
									}else{
										$('#confirmDeath').hide();
									}

									if(player.info.pendDeath){
										$('#confirmKill').show();
										$('#btn-kill').hide();
									}else{
										$('#confirmKill').hide();
									}

									if(player.info.pendKillDenied){
										$('#deathDenied').show();
									}else{
										$('#deathDenied').hide();

									}

								}

								$('#gameSection #killCount').text("Kills: " + player.info.kills);	
							}

							break;

						case 1:
							changeMode("#gameSection","#infoMode",mode);
							generateInfo(false);
							break;

						case 2:
							//Grab and fill acct fields with stuff
							//TODO!!!
							 $('#name-tf').prop('placeholder', "Current: "+player.info.name);
							 $('#room-tf').prop('placeholder', "Current: "+player.info.location);
							 $('#email-tf').prop('placeholder', "Current: "+player.email);

							changeMode("#gameSection","#settingsMode",mode);
							break;

						default:
							break;

					}

					$("#titleNav").css("visibility", "hidden");

					$('#spectatorSection').fadeOut(function(){
						$('#gameSection').fadeIn();
					});
					$('#squadSection').fadeOut();
					$('#ownerSection').fadeOut();
				}

			//Spectator Stuff
				if(isSpec){
					if(game.started){
						$('#btn-joingame').hide();
						$('#btn-gamefull').show();

					}else{
						$('#btn-joingame').show();
						$('#btn-gamefull').hide();
					}
					$("#titleNav").css("visibility", "visible");

					generateInfo(false);



					$('#spectatorSection').fadeIn();
					$('#gameSection').fadeOut();
					$('#ownerSection').fadeOut();
					$('#squadSection').fadeOut();
				}

			//Death Squad Stuff
				if(isSquad){
					switch(mode){
						case 0:
							changeMode("#squadSection","#deathMode",mode);
							if(game.ended){
								$('#squadSection #deathList').html("<h3>It's over.</h3>");
							}else{
								populateDeathList();
							}
							break;

						case 1:
							changeMode("#squadSection","#infoMode",mode);
							generateInfo(false);
							break;

						case 2:
							changeMode("#squadSection","#settingsMode",mode);
							break;

						default:
							break;

					}



					$('#spectatorSection').fadeOut();
					$('#gameSection').fadeOut();
					$('#ownerSection').fadeOut();
					$('#squadSection').fadeIn();
				}

			//Universal Stuff

				//Display Game Info
				if(game.ended){
					$('#subTitle').text("KAOS has ended.");

				}else if(game.started){
					$('#subTitle').text("KAOS has begun.");

				}else{
					$('#subTitle').text("KAOS has not begun.");
				}		
		}

		function refreshAll(callback){
			refreshData(function(){
				refreshView();
				callback();
			});
		}

		//Generic post function for simple game commands
		function gameCommand(cmd,verify,func,errMesg,data){
			if(verify){
				if(safe){
					safe = false;
					isServerSame(function(good){
						if(good){
							$.post(game.name+cmd,{game: game, player: player, data: data}).done(function(o){
								safe = true;
								if(func) func(); 
								else refreshAll(function(){});
							}).fail(function(e){
								safe = true;
								showError(e.responseText);
							});
						}else{
							safe = true;
							showError("Your circumstances have changed. Refresh and try again.");
						}
					});			
				}
			}else{
				if(errMesg) showError(errMesg);
				else showError("I am Error!");
			}	
		}

		//Just checks for consistancy in "dead" and "target". May need to be expanded.
		function isServerSame(callback){
			var oldP = player;

			refreshData(function(){
				callback((player.info.dead == oldP.info.dead) && (player.info.target == oldP.info.target) &&
					(player.info.pendDeath == oldP.info.pendDeath) && (player.info.pendKill == oldP.info.pendKill));
			});

		}

		function arraysEqual(a, b) {
		  if (a === b) return true;
		  if (a == null || b == null) return false;
		  if (a.length != b.length) return false;

		  for (var i = 0; i < a.length; ++i) {
		    if (a[i] !== b[i]) return false;
		  }
		  return true;
		}

		function resetPage(){
			$("#innerNav a").removeClass('active');
		}

		function changeMode(section,selector,mode){
			$(section + " #innerNav #" + mode).addClass('active');
			//Delay added to prevent visual stacking. (Fades in before another fades out)
			$(section + " " + selector).delay(400).fadeIn();
			$('.alert').fadeOut()
	
		}
		function insertProfile(location, p, callback){
			$.get("/ajax/whoisthis",{user: p}).done(function(o){
				var placeholder = "/images/emperor.jpg";
				if(o.info.pic){
					placeholder = o.info.pic;
				}

				if(isOwner || p === player.user ){
						$(location).html("<div id=\"profile\" name=\""+sanitizeHTML(o.user)+"\" class=\"row\">"
					  +"<div class=\"col-md-4 col-xs-4\"><img src=\""+placeholder+"\" class=\"img-rounded\"/></div>"
					  +"<div id=\"text\" class=\"col-md-8 col-xs-8\">"
					    +"<p id=\"target\">Name: "+sanitizeHTML(o.info.name)+"</p>"
					    +"<p id=\"location\">Room: "+sanitizeHTML(o.info.location)+"</p>"
					     +"<p id=\"target\">Email: "+o.email+"</p>"
					  +"</div></div>");
				}else{
					$(location).html("<div id=\"profile\" name=\""+sanitizeHTML(o.user)+"\" class=\"row\">"
					  +"<div class=\"col-md-4 col-xs-4\"><img src=\""+placeholder+"\" class=\"img-rounded\"/></div>"
					  +"<div id=\"text\" class=\"col-md-8 col-xs-8\">"
					    +"<p id=\"target\">Name: "+sanitizeHTML(o.info.name)+"</p>"
					    +"<p id=\"location\">Room: "+sanitizeHTML(o.info.location)+"</p>"
					  +"</div></div>");
				}

				callback(o);
			});

		}

		function showAccountModal(p){
			insertProfile('#insideAcctModal',p,function(data){
				var acc = data;
				var isNotSquad = (game.squadList.indexOf(acc.user) == -1);

				//Show appropriate buttons
				if(isOwner){
					if(!acc.info.dead && isNotSquad){
						if(!game.started){
							$('#promoteCall').show();
							if(!acc.info.confirmed){ 
								$('#confirmCall').show();
							}else{
								$('#confirmCall').hide();
							}
							$('#killCall').hide();
							$('#kickCall').show();		
						}else{
							$('#confirmCall').hide();
							$('#promoteCall').hide();
							$('#killCall').show();
							$('#kickCall').hide();
						}
					}else{
						$('#killCall').hide();
						$('#kickCall').show();
					}


				}else if(isSquad && player.user != data.user){
					if(!acc.info.dead){
						$('#deathKillCall').show();

					}else{
						$('#deathKillCall').hide();
					}
				}

				$('#accountModal').modal({});

			});
		}

		//*** Time Stuff***//
		//Right now takes a player object

		var diff = null; //Current time till listing for last called updateClock(player)
		var diffPendDeath = null;
		var diffPendKill = null;

		var deathTimer = setInterval(function() {
	    	tickClock();
		}, 1*1000);

		function updateServerClock(p,g){
			$.post(g.name+"/clockCheck",{game: g, user: p}).done(function(o){
 				player = o;
 				// updateClock(player);
			}).fail(function(e){

			});
		}

		//Works with player objects
		function updateClock(p){
			var limit;

			//Decide if player is counting down to on or off death list
			if(p.info.timeOffList){
				//Check if time is up
				limit = moment(p.info.timeOffList);
				if(limit.diff(moment().utc()) <=0){
					updateServerClock(p,game);
				}
				$("#timeMessage").text("Time until removed from Death List:");
			}else{
				limit = moment(p.info.timeLastKill).add("hours",game.timeLimit);
				$("#timeMessage").text("Time until placed on Death List:");
			}

			diff = limit.diff(moment().utc());

			if(p.info.pendKill){
				limit = moment(p.info.pendKillTime).add("hours",game.confirmLimit);
				diffPendKill = limit.diff(moment().utc());

				if(diffPendKill <=0){
					updateServerClock(p.info.target,game);
				}


			}

			if(p.info.pendDeath){
				limit = moment(p.info.pendDeathTime).add("hours",game.confirmLimit);
				diffPendDeath = limit.diff(moment().utc());
				if(diffPendDeath <=0){
					updateServerClock(p.user,game);
				}

			}

		}

		function tickClock(){
			var duration = moment.duration(diff);
			if(diff == null){
				message = "...";
			}else if(diff <= 0){
				if(player.info.timeOffList){
					message = "You're free. Refreshing timer...";
				}else{
					message = "Hide. They're coming for you.";
				}
			}else{
				diff -= 1000; //ms
				var duration = moment.duration(diff);
				if(duration.days() <= 0){
					message = duration.hours() + " Hrs, " + duration.minutes() + " Mins, " + duration.seconds() + " Secs ";
				}else{
					message = duration.days() + " Day, " + duration.hours() + " Hrs, " + duration.minutes() + " Mins, " + duration.seconds() + " Secs ";
				}
			}

			$('#timeLeft').text(message);

			if(player.info.pendKill){
				diffPendKill -= 1000;
				var duration = moment.duration(diffPendKill);
				message = "Time until auto-confirm: " + duration.hours() + ":" + duration.minutes() + ":" + duration.seconds();
				$('#pendKillTimer').text(message);

			}

			if(player.info.pendDeath){
				diffPendDeath -= 1000;
				var duration = moment.duration(diffPendDeath);
				message = "Time until auto-confirm: " + duration.hours() + ":" + duration.minutes() + ":" + duration.seconds();
				$('#pendDeathTimer').text(message);
			}

		}

		//Outputs time until off deathlist
		function timeLeft(p){
			var message = "None yet.";

			if(p.info.timeOffList){
				var limit = moment(p.info.timeOffList);
				var d = limit.diff(moment().utc());
				var message;

				var duration = moment.duration(d);
				if(duration.days() <= 0){
					message = "Hours: " + duration.hours() + " Minutes: " + duration.minutes();
				}
			
			}
			return message;

		}

		function makeConfirm(okFunction){
			$('#confirmModal #confirmAction').unbind('click').click(function(){ 
				okFunction();
			});

			$('#confirmModal').modal({});
		}

		function makeConfirmAdmin(okFunction){
			$('#confirmModalAdmin #confirmAction').unbind('click').click(function(){ 
				okFunction();
			});

			$('#confirmModalAdmin').modal({});
		}

		function generateInfo(isMod){
			$(".modMessage").html("<p>" + game.modMessage + "</p>");

			$(".info").html("<h2>Game Information</h2>"+
				"<p>Player Count : " + game.players.length + "</p>" +
				"<p>Moderator Contact: " + game.ownerEmail + "</p>" +
				"<p>Ruleset: Williams Standard </p>" +
				"<button id=\"showRules\" class=\"btn btn-primary\">Show Rules</button>"
				);

			if(isOwner){
				$(".info").append("<button id=\"showGuide\" class=\"btn btn-primary\">Guide to Hosting KAOS</button>");
			}
		}

		function generateEmails(){
			$.get("/"+game.name+"/email-list").done(function(o){
				var list = "";
				for(i=0; i<o.length; i++){
					var player = o[i];
					list += player.email;
					if(i !== o.length-1) list += ", ";
				}

				$("#emailList").html("<h3>" + list + "</h3>");
			});
		}

		function getLeaders(adminCall){
			if(game.started){
				$.get("/"+game.name+"/leaders").done(function(o){
					var list = "";
					if(adminCall){
						for(i=0; i<o.length; i++){
							var p = o[i];
							// if(p.user !== game.owner && !p.info.isSquad && p.info.kills > 0){
							// if(p.user !== game.owner && p.info.kills > 0){
							// 	var name = p.user + " | " + p.info.name;
							// 	list +="<p>"+ (i+1) + ". " + name + ": " + p.info.kills + " Kills" + "</p>";
							// } 	
							if(p.user !== game.owner && p.kills > 0){
								var name = p.user + " | " + p.name;
								list +="<p>"+ (i+1) + ". " + name + ": " + p.kills + " Kills" + "</p>";
							} 				
						}

						if(list === ""){
							list = "No kills yet!";
						}

						$("#adminleaders").html("<h3>" + list + "</h3>");
					}else{
						for(i=0; i<3; i++){
							var p = o[i];
							var name;
							if(p.user == player.user){
								name = "You";
							}else{
								name = "Not-you";
							}
							// list +="<p>"+ (i+1) + ". " + name + ": " + p.info.kills + " Kills" + "</p>"; 		
							list +="<p>"+ (i+1) + ". " + name + ": " + p.kills + " Kills" + "</p>"; 			
						}
						$("#leaders").html("<h3>" + list + "</h3>");
					}
				});
			}else{
				$("#leaders").html("<h3> Nothing yet.</h3>");
				$("#adminleaders").html("<h3> Nothing yet. </h3>");
			}
		}	

});