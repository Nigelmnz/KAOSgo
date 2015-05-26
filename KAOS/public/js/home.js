$(document).ready(function(){	
	var safe = true;
	var alert = $(".alert");

	//Display correct part
	$('#noGamePage').fadeIn();
	

	//NoGame Homepage//
		//Host button brings up host menu
		$('#btn-hostgame').click(function(){ 
			$('#joinGame').fadeOut(function(){
				$('#hostGame').fadeToggle()

			});
		});

		$('#btn-joingame').click(function(){ 
			$('#hostGame').fadeOut(function(){
				populateGameList(function(){
					$('#joinGame').fadeToggle()
				});

			});	

		});


		//Hosting Modal
		$('#btn-hostguide').on('click', function(e) {  
			e.preventDefault();
			$('#hostingGuide').modal({});
		});

		$('#btn-rulesguide').on('click', function(e) {  
			e.preventDefault();
			$('#williamsStandard').modal({});
		});


		$('#hostForm').on('submit', function(e) { 
	        e.preventDefault();  //prevent form from submitting

	        if(safe && validateHostForm()){
				safe = false;
				var n = sanitizeHTML($('#name-tf').val());
				var u = sanitizeHTML($('#url-tf').val());
				$.post("/ajax/newgame",{name: n, url: u}).done(function(o){
					safe = true;
					window.location.href = '/'+u;
				}).fail(function(e){
					safe = true;
					if (e.responseText == 'url-taken'){
				   		showError("Game URL is taken");
					}
				});		
			}
    	});

    	function validateHostForm(){
    		//Check for non-alphanumeric or empty
    		var reg = /^[a-z0-9\-]+$/i;
    		var url = $('#url-tf').val();
    		var name = $('#name-tf').val();
    		if(reg.test(url)){
    			if(name !== ''){
    				return true;
    			}else{
    				showError("Game name is blank");
    				return false;
    			}
    		}else{
    			showError("Game URL contains invalid characters");
    			return false;
    		}

    	}


		var populateGameList = function(callback){
			$.get("/ajax/listgames", function( data ) {
				$("#gameList").empty();

				for(var i=0; i < data.length; i++){
					var game = data[i];
					$("#gameList").append("<a href=\"/"+game.name+"\"class=\"list-group-item\"><div id=\"name\">"
							+game.casedName+
						"</div><div id=\"count\">Number of players: "
							+game.players.length+
						"</div><div style=\"clear: both;\"></div></a>");
				}

				callback();
			});

		};

		function showError(m)
		{
			alert.fadeOut(function(){
				$('.alert p').text(m);
			});
			alert.fadeIn();
		}

	

});