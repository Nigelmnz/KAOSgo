$(document).ready(function(){

// bind event listeners to button clicks //
	var that = this;
	var safe = true;

// handle user logout //
	$('#btn-logout').click(function(){ that.attemptLogout(); });
	$('#btn-acct').click(function(){ $('#settingsModal').modal({}); });
	$('#btn-changePass').click(function(){ 
		$('#passwordModal').modal({}); 
	});


	$('#confirmPass').click(function(){ 
		 var pass = $("#passchange-tf").val(); 
		 var passConf = $("#passconf-tf").val(); 

		 if(pass.length >= 6){
		 	if(pass === passConf){
		 		if(safe){
					 $.ajax({
						url: "/update-password",
						type: "POST",
						data: {pass : pass},
						success: function(data){
				 			showError("Your password has been changed!");
				 			$('#confirmPass').fadeOut();
						},
						error: function(jqXHR){
							console.log(jqXHR.responseText+' :: '+jqXHR.statusText);
						}
					});
				}
			}else{
				showError("Your passwords do not match.");
			}
		}else{
			showError("Pass should contain at least 6 chars.");
		}
	});

	$('#cancelPass').click(function(){ 
		$('#confirmPass').fadeIn();
		$('#passError').fadeOut();
	});


	function showError(m)
	{
		$('#passError h4').text(m);
		$('#passError').fadeIn();
	}

	this.attemptLogout = function()
	{
		var that = this;
		$.ajax({
			url: "/home",
			type: "POST",
			data: {type : "logout", info : null},
			success: function(data){
	 			// TODO: Have a confirmation show

	 			//Redirect
	 			window.location.href = '/';
			},
			error: function(jqXHR){
				console.log(jqXHR.responseText+' :: '+jqXHR.statusText);
			}
		});
	};

});
